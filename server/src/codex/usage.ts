import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { realpath } from 'node:fs/promises';
import { relative, isAbsolute } from 'node:path';
import type { SessionView } from '../../../shared/session.ts';

export interface SessionFile { file: string; sessionId: string }
function windowsFiles(files: SessionFile[], release = false): Promise<unknown> {
  if (process.platform !== 'win32') return Promise.reject(new Error('Windows required'));
  return new Promise((resolve, reject) => {
    const child = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', fileURLToPath(new URL('./file-usage.ps1', import.meta.url)), ...(release ? ['-Release'] : [])],
      { windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024 }, (error, stdout) => {
        if (error) { reject(new Error('파일 사용 조회 또는 삭제에 실패했습니다. 사용 중 여부와 남은 기록을 확인해주세요.')); return; }
        try { resolve(JSON.parse(stdout)); } catch { reject(new Error('파일 사용 상태를 확인할 수 없습니다.')); }
      });
    child.stdin!.on('error', () => {});
    child.stdin!.end(JSON.stringify(files));
  });
}
export async function usage(files: SessionFile[]) {
  const result = new Map<string, SessionView['usage']>();
  if (!files.length) return result;
  try {
    const rows = await windowsFiles(files) as { sessionId: string; usage: SessionView['usage'] }[];
    for (const row of rows) {
      const previous = result.get(row.sessionId);
      result.set(row.sessionId, previous === 'active' || row.usage === 'active' ? 'active' : previous === 'unknown' || row.usage !== 'inactive' ? 'unknown' : 'inactive');
    }
  } catch { for (const entry of files) result.set(entry.sessionId, 'unknown'); }
  return result;
}
export async function releaseFiles(root: string, files: SessionFile[]) {
  if (!files.length) throw new Error('삭제할 세션 기록을 찾을 수 없습니다.');
  const directory = await realpath(root);
  for (const entry of files) {
    const path = relative(directory, await realpath(entry.file));
    if (isAbsolute(path) || path === '..' || path.startsWith('..\\') || path.startsWith('../') || !path.endsWith('.jsonl')) throw new Error('세션 폴더 밖의 파일은 삭제할 수 없습니다.');
  }
  const state = await usage(files);
  if ([...state.values()].some(value => value !== 'inactive')) throw new Error('사용 중이거나 사용 여부를 확인할 수 없는 세션은 놓아줄 수 없습니다.');
  await windowsFiles(files, true);
}
