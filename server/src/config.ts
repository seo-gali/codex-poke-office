import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

if (existsSync('.env')) loadEnvFile('.env');
function positive(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name}: 양수가 필요합니다`);
  return value;
}
const host = process.env.HOST ?? '127.0.0.1';
if (host !== '127.0.0.1') throw new Error('HOST는 127.0.0.1이어야 합니다');
const port = positive('PORT', 4100), clientPort = positive('CLIENT_PORT', 5173);
if (![port, clientPort].every(p => Number.isInteger(p) && p <= 65535) || port === clientPort) throw new Error('서로 다른 유효한 포트가 필요합니다');
const api = new URL(process.env.POKEAPI_BASE_URL ?? 'https://pokeapi.co/api/v2');
if (!['http:', 'https:'].includes(api.protocol) || api.username || api.password) throw new Error('POKEAPI_BASE_URL이 올바르지 않습니다');
export const config = {
  host, port, clientPort,
  sessions: join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'sessions'),
  data: resolve('data'),
  interval: positive('SESSION_SCAN_INTERVAL_MS', 2000),
  lookback: positive('SESSION_LOOKBACK_HOURS', 24) * 3600000,
  api: api.href.replace(/\/$/, ''),
};
