import { createReadStream } from 'node:fs';
import { win32, posix } from 'node:path';

export const validId = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
export function emptyLog() {
  return { offset: 0, pending: Buffer.alloc(0), sessionId: null as string | null, projectName: null as string | null,
    lastObservedAt: null as string | null, complete: false, malformed: false, modified: 0 };
}
export type LogState = ReturnType<typeof emptyLog>;

export async function readLog(file: string, size: number, modified: number, previous?: LogState) {
  const state = !previous || size < previous.offset || (size === previous.offset && modified !== previous.modified) ? emptyLog() : previous;
  if (size === state.offset) return state;
  const stream = createReadStream(file, { start: state.offset, end: size - 1 });
  for await (const chunk of stream) {
    const bytes = Buffer.concat([state.pending, chunk]);
    let start = 0, end: number;
    while ((end = bytes.indexOf(10, start)) !== -1) {
      const line = bytes.subarray(start, end).toString('utf8').trim();
      start = end + 1;
      if (!line) continue;
      try {
        const row = JSON.parse(line);
        if (!row || typeof row !== 'object') throw new Error('Invalid record');
        if (row.type === 'session_meta') {
          if (!validId(row.payload?.id) || (state.sessionId && state.sessionId !== row.payload.id)) throw new Error('Invalid session');
          state.sessionId = row.payload.id;
          const cwd = row.payload.cwd;
          state.projectName = typeof cwd === 'string' ? posix.basename(win32.basename(cwd)) || null : null;
        }
        if (typeof row.timestamp === 'string' && Number.isFinite(Date.parse(row.timestamp))) state.lastObservedAt = new Date(row.timestamp).toISOString();
        if (row.type === 'event_msg' && ['task_started', 'turn_aborted'].includes(row.payload?.type)) state.complete = false;
        if (row.type === 'event_msg' && row.payload?.type === 'task_complete') state.complete = true;
      } catch { state.malformed = true; }
    }
    state.pending = Buffer.from(bytes.subarray(start));
  }
  state.offset = size;
  state.modified = modified;
  return state;
}
