import { mkdtemp, mkdir, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const directory = await mkdtemp(join(tmpdir(), 'poke-haven-browser-'));
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaa00000000';
const sessions = join(directory, 'codex', 'sessions');
await mkdir(sessions, { recursive: true });
await mkdir(join(directory, 'data'));
await writeFile(join(sessions, 'synthetic.jsonl'), JSON.stringify({ type: 'session_meta', timestamp: new Date().toISOString(), payload: { id, cwd: 'D:\\synthetic\\browser-check', base_instructions: 'PRIVATE_BROWSER_FIXTURE' } }) + '\n');
await writeFile(join(directory, 'data', 'assignments.json'), JSON.stringify({ [id]: 25 }));
await writeFile(join(directory, 'data', 'pokemon-cache.json'), JSON.stringify({ 25: { id: 25, name: 'pikachu', spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' } }));
await symlink(resolve('dist'), join(directory, 'dist'), 'junction');
assert.ok(sessions.startsWith(directory));
const child = spawn(process.execPath, [resolve('server/src/index.ts')], { cwd: directory, env: { ...process.env, HOST: '127.0.0.1', PORT: '4191', CLIENT_PORT: '5191', CODEX_HOME: join(directory, 'codex'), SESSION_SCAN_INTERVAL_MS: '500' }, windowsHide: true, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill());
child.on('exit', code => process.exit(code ?? 0));
