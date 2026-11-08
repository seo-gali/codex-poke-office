import { join } from 'node:path';
import { loadJson, saveJson } from './assignments.ts';
import type { Pokemon } from '../../../shared/session.ts';
import { animatedPokemon } from '../../../shared/trainers.ts';

const types: Record<string, string> = { normal: '노말', fire: '불꽃', water: '물', electric: '전기', grass: '풀', ice: '얼음', fighting: '격투', poison: '독', ground: '땅', flying: '비행', psychic: '에스퍼', bug: '벌레', rock: '바위', ghost: '고스트', dragon: '드래곤', dark: '악', steel: '강철', fairy: '페어리' };
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
    if (valid && /[가-힣]/.test(saved.name) && saved.spriteUrl?.endsWith('.gif') && Array.isArray(saved.types) && saved.types.every(type => Object.values(types).includes(type)) && (saved.description === null || typeof saved.description === 'string')) return { id, name: saved.name, spriteUrl: sprite(saved.spriteUrl), types: saved.types, description: saved.description };
    const fallback = { id, name: `포켓몬 #${id}`, spriteUrl: null, types: [], description: null };
    if (Date.now() < (retry.get(id) ?? 0)) return fallback;
    if (pending.has(id)) return pending.get(id)!;
    const request = (async () => { try {
      const responses = await Promise.all(['pokemon', 'pokemon-species'].map(resource => fetch(`${api}/${resource}/${id}`, { signal: AbortSignal.timeout(5000), redirect: 'error' })));
      if (responses.some(response => !response.ok)) throw new Error('PokéAPI');
      const [body, species] = await Promise.all(responses.map(response => response.json()));
      const name = Array.isArray(species.names) ? species.names.find((entry: { language?: { name?: string } }) => entry.language?.name === 'ko')?.name : null;
      if (body.id !== id || species.id !== id || typeof name !== 'string' || !/[가-힣]/.test(name)) throw new Error('Invalid pokemon');
      const spriteUrl = animatedPokemon.has(id) ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif` : null;
      if (!spriteUrl?.endsWith('.gif') || !Array.isArray(body.types) || !body.types.every((entry: { type?: { name?: string } }) => typeof entry.type?.name === 'string' && Object.hasOwn(types, entry.type.name))) throw new Error('Animated sprite or type unavailable');
      const description = Array.isArray(species.flavor_text_entries) ? species.flavor_text_entries.find((entry: { language?: { name?: string } }) => entry.language?.name === 'ko')?.flavor_text : null;
      const value = { id, name, spriteUrl, types: body.types.map((entry: { type: { name: string } }) => types[entry.type.name]), description: typeof description === 'string' ? description.replace(/[\n\f]/g, ' ') : null };
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
