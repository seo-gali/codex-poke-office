import { join } from 'node:path';
import { loadJson, saveJson } from './assignments.ts';
import type { Pokemon } from '../../../shared/session.ts';

function sprite(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'raw.githubusercontent.com' && url.pathname.startsWith('/PokeAPI/sprites/') && !url.search ? url.href : null;
  } catch { return null; }
}
export async function pokemonCache(directory: string, api: string) {
  const file = join(directory, 'pokemon-cache.json');
  const cache = await loadJson(file);
  const retry = new Map<number, number>();
  const pending = new Map<number, Promise<Pokemon>>();
  let saving = Promise.resolve();
  return async (id: number): Promise<Pokemon> => {
    const saved = cache[id] as Pokemon | undefined;
    const valid = saved?.id === id && typeof saved.name === 'string' && (saved.spriteUrl === null || sprite(saved.spriteUrl));
    if (valid && /[가-힣]/.test(saved.name)) return { id, name: saved.name, spriteUrl: sprite(saved.spriteUrl) };
    const fallback = { id, name: `포켓몬 #${id}`, spriteUrl: valid ? sprite(saved.spriteUrl) : null };
    if (Date.now() < (retry.get(id) ?? 0)) return fallback;
    if (pending.has(id)) return pending.get(id)!;
    const request = (async () => { try {
      const responses = await Promise.all(['pokemon', 'pokemon-species'].map(resource => fetch(`${api}/${resource}/${id}`, { signal: AbortSignal.timeout(5000), redirect: 'error' })));
      if (responses.some(response => !response.ok)) throw new Error('PokéAPI');
      const [body, species] = await Promise.all(responses.map(response => response.json()));
      const name = Array.isArray(species.names) ? species.names.find((entry: { language?: { name?: string } }) => entry.language?.name === 'ko')?.name : null;
      if (body.id !== id || species.id !== id || typeof name !== 'string' || !/[가-힣]/.test(name)) throw new Error('Invalid pokemon');
      const value = { id, name, spriteUrl: sprite(body.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default) ?? sprite(body.sprites?.front_default) };
      cache[id] = value;
      await (saving = saving.catch(() => {}).then(() => saveJson(file, cache)));
      return value;
    } catch {
      retry.set(id, Date.now() + 60000);
      return fallback;
    } finally { pending.delete(id); } })();
    pending.set(id, request);
    return request;
  };
}
