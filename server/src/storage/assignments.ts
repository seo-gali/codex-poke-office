import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomInt } from 'node:crypto';
import { validId } from '../codex/parse.ts';
import { pokemonCandidates, trainers } from '../../../shared/trainers.ts';
import type { TrainerId } from '../../../shared/trainers.ts';

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
  const stored = await loadJson(file);
  const values: Record<string, Partial<Record<TrainerId, number>>> = {};
  for (const [id, value] of Object.entries(stored)) {
    if (!validId(id)) throw new Error('포켓몬 배정 파일이 올바르지 않습니다');
    if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 1025) {
      const character = (Object.keys(trainers) as TrainerId[]).find(character => pokemonCandidates(character).includes(value));
      values[id] = character ? { [character]: value } : {};
    } else if (value && typeof value === 'object' && !Array.isArray(value) && Object.entries(value).every(([key, number]) => Object.hasOwn(trainers, key) && typeof number === 'number' && pokemonCandidates(key as TrainerId).includes(number))) {
      values[id] = value;
    } else throw new Error('포켓몬 배정 파일이 올바르지 않습니다');
  }
  return async (sessionId: string, character: TrainerId) => {
    if (!validId(sessionId)) throw new Error('세션 ID가 올바르지 않습니다');
    if (!Object.hasOwn(trainers, character)) throw new Error('캐릭터가 올바르지 않습니다');
    const previous = values[sessionId] ?? {};
    if (!previous[character]) {
      const candidates = pokemonCandidates(character).filter(id => !Object.values(previous).includes(id));
      const next = { ...previous, [character]: candidates[randomInt(candidates.length)] };
      await saveJson(file, { ...values, [sessionId]: next });
      values[sessionId] = next;
    }
    return values[sessionId][character]!;
  };
}
