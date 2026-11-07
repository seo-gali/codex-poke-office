import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomInt } from 'node:crypto';
import { validId } from '../codex/parse.ts';

export async function loadJson(file: string): Promise<Record<string, unknown>> {
  try {
    const value = JSON.parse(await readFile(file, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid object');
    return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw new Error('로컬 저장 파일을 읽을 수 없습니다. data 폴더의 JSON 형식을 확인하세요.');
  }
}
export async function saveJson(file: string, value: unknown) {
  await writeFile(`${file}.tmp`, JSON.stringify(value, null, 2), 'utf8');
  await rename(`${file}.tmp`, file);
}
export async function assignments(directory: string) {
  await mkdir(directory, { recursive: true });
  const file = join(directory, 'assignments.json');
  const values = await loadJson(file);
  if (!Object.entries(values).every(([key, value]) => validId(key) && Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 1025)) throw new Error('포켓몬 배정 파일이 올바르지 않습니다');
  return async (sessionId: string) => {
    if (!validId(sessionId)) throw new Error('세션 ID가 올바르지 않습니다');
    if (!Object.hasOwn(values, sessionId)) {
      const id = randomInt(1, 1026);
      await saveJson(file, { ...values, [sessionId]: id });
      values[sessionId] = id;
    }
    return values[sessionId] as number;
  };
}
