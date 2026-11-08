import { createReadStream } from 'node:fs';
import { win32, posix } from 'node:path';
import type { SessionRecord } from '../../../shared/session.ts';

export const validId = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
export function emptyLog() {
  return { offset: 0, pending: Buffer.alloc(0), sessionId: null as string | null, projectName: null as string | null,
    lastObservedAt: null as string | null, complete: false, malformed: false, modified: 0,
    activity: { kind: 'unknown', label: '활동 기록 없음', at: null, toolCalls: 0 } as SessionRecord['activity'] };
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
        const at = typeof row.timestamp === 'string' && Number.isFinite(Date.parse(row.timestamp)) ? new Date(row.timestamp).toISOString() : null;
        if (at) state.lastObservedAt = at;
        if (row.type === 'event_msg' && ['task_started', 'turn_aborted'].includes(row.payload?.type)) state.complete = false;
        if (row.type === 'event_msg' && row.payload?.type === 'task_complete') state.complete = true;
        let kind: SessionRecord['activity']['kind'] | null = null, label = '';
        if (row.type === 'event_msg') {
          if (row.payload?.type === 'task_started') { kind = 'started'; label = '새 응답 시작'; state.activity.toolCalls = 0; }
          if (row.payload?.type === 'task_complete') { kind = 'complete'; label = '응답 완료 기록'; }
          if (row.payload?.type === 'turn_aborted') { kind = 'aborted'; label = '응답 중단 기록'; }
        }
        if (row.type === 'response_item') {
          const type = row.payload?.type;
          if (['function_call', 'custom_tool_call'].includes(type)) {
            kind = 'tool'; state.activity.toolCalls++;
            const name = typeof row.payload.name === 'string' ? row.payload.name : '';
            label = /apply_patch|edit_file|write_file/.test(name) ? '파일 수정 도구 호출' : /playwright|browser/.test(name) ? '화면 확인 도구 호출' : /search|web/.test(name) ? '자료 조회 도구 호출' : '도구 호출';
          }
          if (['function_call_output', 'custom_tool_call_output'].includes(type)) { kind = 'result'; label = '도구 결과 기록'; }
          if (type === 'message' && row.payload.role === 'assistant') { kind = 'message'; label = '응답 메시지 기록'; }
        }
        if (kind) state.activity = { kind, label, at, toolCalls: state.activity.toolCalls };
      } catch { state.malformed = true; }
    }
    state.pending = Buffer.from(bytes.subarray(start));
  }
  state.offset = size;
  state.modified = modified;
  return state;
}
