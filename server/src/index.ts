import { createServer } from 'node:http';
import type { ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { config } from './config.ts';
import { discover } from './codex/discover.ts';
import { readLog } from './codex/parse.ts';
import type { LogState } from './codex/parse.ts';
import { assignments } from './storage/assignments.ts';
import { pokemonCache } from './storage/pokemon.ts';
import { usage, releaseFiles } from './codex/usage.ts';
import { validId } from './codex/parse.ts';
import type { Pokemon, Snapshot, SessionRecord } from '../../shared/session.ts';
import { trainers } from '../../shared/trainers.ts';
import type { TrainerId } from '../../shared/trainers.ts';

const assign = await assignments(config.data);
const pokemon = await pokemonCache(config.data, config.api, refreshPokemon);
const logs = new Map<string, LogState>();
const clients = new Map<ServerResponse, TrainerId>();
let snapshot: Snapshot = { sessions: [], error: null };
let encoded = JSON.stringify(snapshot);
let stopping = false;
let updating = false;
let currentScan: Promise<void> | null = null;
let checkingUsage = false;
function publish() {
  const next = JSON.stringify(snapshot);
  if (next === encoded) return;
  encoded = next;
  for (const client of clients.keys()) client.write(`data: ${encoded}\n\n`);
}
async function hydrate(character: TrainerId) {
  const ids = [...new Set(snapshot.sessions.map(s => s.pokemon[character].id))];
  await Promise.all(ids.map(id => pokemon.get(id)));
}
function refreshPokemon(value: Pokemon) {
  for (const session of snapshot.sessions) {
    for (const character of Object.keys(trainers) as TrainerId[]) if (session.pokemon[character].id === value.id) session.pokemon[character] = value;
  }
  publish();
}
async function checkUsage() {
  if (checkingUsage) return;
  checkingUsage = true;
  try {
    const states = await usage([...logs].filter(([, state]) => state.sessionId).map(([file, state]) => ({ file, sessionId: state.sessionId! })));
    for (const session of snapshot.sessions) session.usage = states.get(session.sessionId) ?? 'unknown';
    publish();
  } finally { checkingUsage = false; }
}
async function scan() {
  const sessions: SessionRecord[] = [];
  let error: string | null = null;
  try {
    const files = await discover(config.sessions, config.lookback);
    const present = new Set(files.map(f => f.file));
    for (const file of logs.keys()) if (!present.has(file)) logs.delete(file);
    for (const { file, info } of files) {
      let state = logs.get(file);
      try { state = await readLog(file, info.size, info.mtimeMs, state); logs.set(file, state); }
      catch { if (state) state.malformed = true; else error = '일부 기록을 읽을 수 없습니다. 세션 ID 확인 전에는 배정하지 않습니다.'; }
      if (!state?.sessionId) { error = '세션 ID를 확인할 수 없는 기록이 있습니다.'; continue; }
      const existing = sessions.find(s => s.sessionId === state!.sessionId);
      if (existing && Date.parse(existing.lastFileModifiedAt!) >= info.mtimeMs) continue;
      if (existing) sessions.splice(sessions.indexOf(existing), 1);
      const choices = {} as Record<TrainerId, Pokemon>;
      for (const character of Object.keys(trainers) as TrainerId[]) {
        const id = await assign.get(state.sessionId, character);
        choices[character] = pokemon.peek(id);
      }
      sessions.push({
        sessionId: state.sessionId, shortId: `${state.sessionId.slice(0, 8)}…${state.sessionId.slice(-4)}`,
        projectName: state.projectName, pokemon: choices,
        lastObservedAt: state.lastObservedAt, lastFileModifiedAt: info.mtime.toISOString(),
        observation: state.malformed || state.pending.length || !state.lastObservedAt ? 'unknown' : state.complete ? 'turn-complete' :
          Date.now() - Date.parse(state.lastObservedAt) <= 60000 ? 'recent-event' : 'quiet',
        usage: snapshot.sessions.find(s => s.sessionId === state!.sessionId)?.usage ?? 'unknown', activity: { ...state.activity },
      });
    }
    // shortcut: 초기 버전은 전체 폴더 재탐색, 실제 탐색 지연이 발생할 때 디렉터리 감시로 교체
  } catch { error = '로컬 세션 또는 저장 파일을 읽을 수 없습니다. CODEX_HOME과 data 폴더를 확인하세요.'; }
  snapshot = { sessions, error };
  publish();
  void checkUsage();
  for (const character of new Set(clients.values())) void hydrate(character);
}
function scheduleScan() {
  currentScan = scan().finally(() => {
    currentScan = null;
    if (!stopping && !updating) timer = setTimeout(scheduleScan, config.interval);
  });
}

const allowedHosts = new Set([`${config.host}:${config.port}`, `${config.host}:${config.clientPort}`]);
const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (!allowedHosts.has(request.headers.host ?? '') || (request.headers.origin && ![...allowedHosts].some(h => request.headers.origin === `http://${h}`))) {
    response.writeHead(403).end(); return;
  }
  const path = new URL(request.url ?? '/', `http://${config.host}`).pathname;
  const shuffle = request.method === 'POST' && /^\/api\/trainers\/[^/]+\/shuffle$/.test(path);
  if (shuffle || request.method === 'DELETE' && path.startsWith('/api/sessions/')) {
    const id = shuffle ? path.split('/')[3] : path.slice('/api/sessions/'.length);
    const valid = shuffle ? Object.hasOwn(trainers, id) && request.headers['x-shuffle-trainer'] === id : validId(id) && request.headers['x-confirm-session'] === id;
    if (!valid || ![...allowedHosts].some(h => request.headers.origin === `http://${h}`)) { response.writeHead(403).end(); return; }
    if (updating) { response.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({ error: '다른 기록을 처리하고 있습니다. 잠시 후 다시 시도해주세요.' })); return; }
    updating = true;
    clearTimeout(timer);
    try {
      await currentScan;
      if (shuffle) {
        const character = id as TrainerId;
        await assign.shuffle(snapshot.sessions.map(s => s.sessionId), character);
        for (const session of snapshot.sessions) session.pokemon[character] = pokemon.peek(await assign.get(session.sessionId, character));
        publish();
      }
      else {
        const session = snapshot.sessions.find(s => s.sessionId === id);
        if (!session || session.usage !== 'inactive') throw new Error('사용 안 함으로 확인된 세션만 놓아줄 수 있습니다.');
        const files = [...logs].filter(([, state]) => state.sessionId === id).map(([file]) => ({ file, sessionId: id }));
        await releaseFiles(config.sessions, files);
        for (const entry of files) logs.delete(entry.file);
      }
      if (!shuffle) await scan();
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end(shuffle ? encoded : JSON.stringify({ ok: true }));
      if (shuffle) void hydrate(id as TrainerId);
    } catch (error) {
      response.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({ error: shuffle ? '포켓몬을 새로 배정하지 못했습니다. 로컬 저장 파일을 확인해주세요.' : (error as Error).message }));
    } finally {
      updating = false;
      if (!stopping) timer = setTimeout(scheduleScan, config.interval);
    }
    return;
  }
  if (request.method !== 'GET') { response.writeHead(405).end(); return; }
  if (path === '/api/events') {
    const character = new URL(request.url!, `http://${config.host}`).searchParams.get('trainer') ?? 'brendan';
    if (!Object.hasOwn(trainers, character)) { response.writeHead(400).end(); return; }
    response.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    response.write(`retry: 3000\ndata: ${encoded}\n\n`);
    clients.set(response, character as TrainerId);
    void hydrate(character as TrainerId);
    request.on('close', () => clients.delete(response));
    return;
  }
  if (path === '/api/sessions' || path === '/api/health') {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(path === '/api/sessions' ? encoded : JSON.stringify({ ok: !snapshot.error, error: snapshot.error })); return;
  }
  const asset = path === '/' ? 'index.html' : /^\/assets\/[\w.-]+\.(js|css)$/.test(path) || path === '/lab/oak-lab.png' ? path.slice(1) : null;
  if (!asset) { response.writeHead(404).end(); return; }
  try {
    const content = await readFile(resolve('dist', asset));
    response.writeHead(200, { 'Content-Type': ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' } as Record<string, string>)[extname(asset)] });
    response.end(content);
  } catch { response.writeHead(404).end('먼저 npm run build를 실행하세요.'); }
});
server.on('error', () => { console.error('로컬 서버를 시작할 수 없습니다. 포트 사용 여부를 확인하세요.'); process.exit(1); });
server.listen(config.port, config.host, () => console.log(`Codex Poké Office API http://${config.host}:${config.port}`));
let timer: ReturnType<typeof setTimeout>;
scheduleScan();
const heartbeat = setInterval(() => { for (const client of clients.keys()) client.write(': heartbeat\n\n'); }, 15000);
const vite = process.argv.includes('--dev') ? await (await import('vite')).createServer() : null;
await vite?.listen();
vite?.printUrls();
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, async () => {
  stopping = true; clearTimeout(timer); clearInterval(heartbeat);
  for (const client of clients.keys()) client.end();
  await vite?.close(); server.close();
});
