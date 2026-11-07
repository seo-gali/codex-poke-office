import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, appendFile, readFile, utimes, open, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Snapshot } from '../shared/session.ts';
import { releaseFiles } from '../server/src/codex/usage.ts';

async function listen(server: Server) {
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  return (server.address() as { port: number }).port;
}
async function freePort() {
  const server = createServer(); const port = await listen(server);
  await new Promise<void>(done => server.close(() => done())); return port;
}
async function until(check: () => Promise<boolean>, message: string) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise(done => setTimeout(done, 100));
  }
  assert.fail(message);
}
const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'];
const secretMarker = 'PRIVATE_FIXTURE_CONTENT';
function record(type: string, payload: unknown, timestamp = new Date().toISOString()) { return JSON.stringify({ type, payload, timestamp }) + '\n'; }
function metadata(id: string) { return record('session_meta', { id, cwd: 'D:\\private-parent\\sample-project', base_instructions: secretMarker }); }

test('실제 HTTP/SSE 경로: 탐색, 신규/동일 ID, 증분, 손상, 장애, 재시작 및 비노출', { timeout: 60000 }, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'poke-office-e2e-'));
  const root = join(directory, 'codex', 'sessions', 'nested'); await mkdir(root, { recursive: true });
  const port = await freePort(), clientPort = await freePort();
  let apiFails = true, requested = 0;
  const mock = createServer((request, response) => {
    assert.match(request.url!, /^\/pokemon(?:-species)?\/\d+$/);
    requested++;
    if (apiFails) { response.writeHead(503).end(); return; }
    const id = Number(request.url!.split('/').at(-1));
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(request.url!.startsWith('/pokemon-species/') ? { id, names: [{ language: { name: 'en' }, name: `test-${id}` }, { language: { name: 'ko' }, name: `테스트${id}` }], private: secretMarker } : { id, name: `test-${id}`, sprites: { front_default: null }, private: secretMarker }));
  });
  const apiPort = await listen(mock); t.after(() => { mock.closeAllConnections(); mock.close(); });
  let output = '';
  function start() {
    const child = spawn(process.execPath, [resolve('server/src/index.ts')], { cwd: directory, env: {
      ...process.env, HOST: '127.0.0.1', PORT: String(port), CLIENT_PORT: String(clientPort), CODEX_HOME: join(directory, 'codex'),
      SESSION_SCAN_INTERVAL_MS: '100', SESSION_LOOKBACK_HOURS: '24', POKEAPI_BASE_URL: `http://127.0.0.1:${apiPort}`,
    }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { output += data; });
    return child;
  }
  let child = start(); t.after(() => { child.kill(); });
  const base = `http://127.0.0.1:${port}`;
  async function snapshot(): Promise<Snapshot> { return await (await fetch(`${base}/api/sessions`)).json(); }
  await until(async () => { try { return (await fetch(`${base}/api/health`)).ok; } catch { return false; } }, '서버 실행 실패');
  assert.equal((await snapshot()).sessions.length, 0);
  const streamController = new AbortController(); t.after(() => streamController.abort());
  const events = await fetch(`${base}/api/events`, { signal: streamController.signal });
  assert.match(events.headers.get('content-type')!, /text\/event-stream/);
  const reader = events.body!.getReader(); let received = '';
  const reading = (async () => { try { for (;;) { const chunk = await reader.read(); if (chunk.done) break; received += new TextDecoder().decode(chunk.value); } } catch { /* 테스트 연결 종료 */ } })();
  const firstFile = join(root, 'one.jsonl');
  await writeFile(firstFile, metadata(ids[0]) + record('event_msg', { type: 'task_started', message: secretMarker }));
  await writeFile(join(root, 'two.jsonl'), metadata(ids[1]) + record('event_msg', { type: 'task_complete' }));
  await writeFile(join(root, 'old.jsonl'), metadata('44444444-4444-4444-8444-444444444444'));
  const old = new Date(Date.now() - 25 * 3600000); await utimes(join(root, 'old.jsonl'), old, old);
  await until(async () => (await snapshot()).sessions.length === 2, '두 세션 발견 실패');
  const initial = await snapshot();
  assert.equal(initial.sessions[0].projectName, 'sample-project');
  assert.equal(initial.sessions.find(s => s.sessionId === ids[0])!.observation, 'recent-event');
  assert.equal(initial.sessions.find(s => s.sessionId === ids[1])!.observation, 'turn-complete');
  assert.equal(initial.sessions[0].pokemon.spriteUrl, null);
  assert.match(initial.sessions[0].pokemon.name, /^포켓몬 #\d+$/);
  assert.ok(requested > 0, 'API 장애 요청 미실행');
  const before = Object.fromEntries(initial.sessions.map(s => [s.sessionId, s.pokemon.id]));
  assert.deepEqual(Object.keys(initial.sessions[0]).sort(), ['sessionId', 'shortId', 'projectName', 'pokemon', 'lastObservedAt', 'lastFileModifiedAt', 'observation', 'usage'].sort());
  const partial = record('event_msg', { type: 'task_complete' });
  await appendFile(firstFile, partial.slice(0, 15));
  await until(async () => (await snapshot()).sessions.find(s => s.sessionId === ids[0])?.observation === 'unknown', '부분 JSONL 상태 확인 실패');
  await appendFile(firstFile, partial.slice(15));
  await until(async () => (await snapshot()).sessions.find(s => s.sessionId === ids[0])?.observation === 'turn-complete', '부분 레코드 복구 실패');
  await writeFile(join(root, 'same-id.jsonl'), metadata(ids[0]) + record('event_msg', { type: 'task_started' }));
  await until(async () => (await snapshot()).sessions.find(s => s.sessionId === ids[0])?.observation === 'recent-event', '동일 ID 기록 반영 실패');
  assert.equal((await snapshot()).sessions.length, 2);
  assert.equal((await snapshot()).sessions.find(s => s.sessionId === ids[0])!.pokemon.id, before[ids[0]]);
  await appendFile(join(root, 'two.jsonl'), 'broken record\n');
  await until(async () => (await snapshot()).sessions.find(s => s.sessionId === ids[1])?.observation === 'unknown', '손상 기록 격리 실패');
  await writeFile(join(root, 'no-id.jsonl'), 'not json\n');
  await until(async () => !!(await snapshot()).error, 'ID 미확인 오류 누락');
  assert.equal((await snapshot()).sessions.length, 2);
  apiFails = true;
  await writeFile(join(root, 'three.jsonl'), metadata(ids[2]));
  await until(async () => (await snapshot()).sessions.length === 3, '신규 세션/API 장애 처리 실패');
  const third = (await snapshot()).sessions.find(s => s.sessionId === ids[2])!;
  assert.ok(third.pokemon.id >= 1 && third.pokemon.id <= 1025);
  await until(async () => received.includes(ids[2]), 'SSE 신규 세션 알림 누락');
  for (const content of [JSON.stringify(await snapshot()), received, await readFile(join(directory, 'data', 'assignments.json'), 'utf8')]) {
    assert.ok(!content.includes(secretMarker) && !content.includes('private-parent'), '원문 또는 전체 경로 노출');
  }
  assert.equal((await fetch(`${base}/api/sessions`, { headers: { Origin: 'https://untrusted.example' } })).status, 403);
  assert.equal((await fetch(`${base}/api/sessions`, { method: 'POST' })).status, 405);
  streamController.abort(); await reading;
  child.kill(); await once(child, 'exit');
  apiFails = false;
  const mapping = JSON.parse(await readFile(join(directory, 'data', 'assignments.json'), 'utf8'));
  const cachedId = mapping[ids[0]];
  await writeFile(join(directory, 'data', 'pokemon-cache.json'), JSON.stringify({ [cachedId]: { id: cachedId, name: 'old-english-name', spriteUrl: null } }));
  child = start();
  await until(async () => { try { return (await snapshot()).sessions.length === 3; } catch { return false; } }, '재시작 실패');
  for (const s of (await snapshot()).sessions) assert.equal(s.pokemon.id, mapping[s.sessionId]);
  for (const s of (await snapshot()).sessions) assert.equal(s.pokemon.name, `테스트${s.pokemon.id}`);
  assert.equal((await snapshot()).sessions[0].pokemon.spriteUrl, null);
  const cache = await readFile(join(directory, 'data', 'pokemon-cache.json'), 'utf8');
  assert.ok(!cache.includes(secretMarker));
  if (process.platform === 'win32') {
    const release = (id: string, origin = base, confirmed = true) => fetch(`${base}/api/sessions/${id}`, { method: 'DELETE', headers: { Origin: origin, ...(confirmed ? { 'X-Confirm-Session': id } : {}) } });
    assert.equal((await release(ids[2], 'https://untrusted.example')).status, 403);
    assert.equal((await release(ids[2], base, false)).status, 403);
    const held = await open(join(root, 'three.jsonl'), 'r');
    try { assert.equal((await release(ids[2])).status, 409); await access(join(root, 'three.jsonl')); }
    finally { await held.close(); }
    await until(async () => (await snapshot()).sessions.find(s => s.sessionId === ids[2])?.usage === 'inactive', '미사용 파일 상태 확인 실패');
    assert.equal((await release(ids[0])).status, 200);
    await assert.rejects(access(firstFile)); await assert.rejects(access(join(root, 'same-id.jsonl')));
    await access(join(root, 'two.jsonl')); await access(join(root, 'three.jsonl'));
    assert.equal((await snapshot()).sessions.length, 2);
    assert.equal((await release(ids[0])).status, 409);
    const outside = join(directory, 'outside.jsonl'); await writeFile(outside, metadata(ids[2]));
    await assert.rejects(releaseFiles(join(directory, 'codex', 'sessions'), [{ file: outside, sessionId: ids[2] }]));
    await access(outside);
    const mismatch = join(root, 'mismatch.jsonl'); await writeFile(mismatch, metadata(ids[2]));
    await assert.rejects(releaseFiles(join(directory, 'codex', 'sessions'), [{ file: mismatch, sessionId: ids[1] }]));
    await access(mismatch);
    console.log('PASS: confirmed deletion, all matching files, open-file protection, wrong-ID and outside-root protection');
  }
  assert.ok(!output.includes(secretMarker)); assert.ok(requested > 0);
  console.log('PASS: 3 sessions, SSE, same-ID mapping, partial recovery, corruption isolation, API failure, restart, privacy');
});
