import { join } from 'node:path';
import { loadJson, saveJson } from './assignments.ts';
import type { Pokemon } from '../../../shared/session.ts';
import { pokemonSprite } from '../../../shared/trainers.ts';

const types: Record<string, string> = { normal: '노말', fire: '불꽃', water: '물', electric: '전기', grass: '풀', ice: '얼음', fighting: '격투', poison: '독', ground: '땅', flying: '비행', psychic: '에스퍼', bug: '벌레', rock: '바위', ghost: '고스트', dragon: '드래곤', dark: '악', steel: '강철', fairy: '페어리' };
function sprite(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'raw.githubusercontent.com' && url.pathname.startsWith('/PokeAPI/sprites/') && !url.search ? url.href : null;
  } catch { return null; }
}
export async function pokemonCache(directory: string, api: string, changed: (pokemon: Pokemon) => void) {
  const file = join(directory, 'pokemon-cache.json');
  const cache = await loadJson(file);
  const retry = new Map<string, number>();
  const pending = new Map<number, Promise<Pokemon>>();
  let saving = Promise.resolve();
  const peek = (id: number): Pokemon => {
    const saved = cache[id] as Pokemon | undefined;
    const valid = saved?.id === id && typeof saved.name === 'string' && (saved.spriteUrl === null || sprite(saved.spriteUrl));
    if (valid && /[가-힣]/.test(saved.name) && [pokemonSprite(id), pokemonSprite(id, false)].includes(saved.spriteUrl!) && Array.isArray(saved.types) && saved.types.every(type => Object.values(types).includes(type)) && (saved.description === null || typeof saved.description === 'string')) return { id, name: saved.name, spriteUrl: pokemonSprite(id), types: saved.types, description: saved.description, heightDm: Number.isInteger(saved.heightDm) && saved.heightDm! > 0 ? saved.heightDm : null };
    return { id, name: `포켓몬 #${id}`, spriteUrl: pokemonSprite(id), types: [], description: null, heightDm: null };
  };
  const get = async (id: number): Promise<Pokemon> => {
    const fallback = peek(id);
    const resources = [
      ...(!fallback.types.length || fallback.heightDm === null ? ['pokemon'] : []),
      ...(fallback.name === `포켓몬 #${id}` ? ['pokemon-species'] : []),
    ].filter(resource => Date.now() >= (retry.get(`${resource}/${id}`) ?? 0));
    if (!resources.length) return fallback;
    if (pending.has(id)) return pending.get(id)!;
    const request = (async () => { try {
      let value = fallback;
      await Promise.all(resources.map(async resource => {
        let patch: Partial<Pokemon>;
        try {
          const response = await fetch(`${api}/${resource}/${id}`, { signal: AbortSignal.timeout(5000), redirect: 'error' });
          if (!response.ok) throw new Error('PokéAPI');
          const body = await response.json();
          if (body.id !== id) throw new Error('Invalid pokemon');
          if (resource === 'pokemon') {
            if (!Number.isInteger(body.height) || body.height <= 0) throw new Error('Invalid pokemon height');
            if (!Array.isArray(body.types) || !body.types.length || !body.types.every((entry: { type?: { name?: string } }) => typeof entry.type?.name === 'string' && Object.hasOwn(types, entry.type.name))) throw new Error('Pokemon type unavailable');
            patch = { heightDm: body.height, types: body.types.map((entry: { type: { name: string } }) => types[entry.type.name]) };
          } else {
            const name = Array.isArray(body.names) ? body.names.find((entry: { language?: { name?: string } }) => entry.language?.name === 'ko')?.name : null;
            if (typeof name !== 'string' || !/[가-힣]/.test(name)) throw new Error('Invalid pokemon name');
            const description = Array.isArray(body.flavor_text_entries) ? body.flavor_text_entries.find((entry: { language?: { name?: string } }) => entry.language?.name === 'ko')?.flavor_text : null;
            patch = { name, description: typeof description === 'string' ? description.replace(/[\n\f]/g, ' ') : null };
          }
        } catch { retry.set(`${resource}/${id}`, Date.now() + 60000); return; }
        value = { ...value, ...patch }; cache[id] = value; changed(value);
      }));
      if (value !== fallback) {
        try { await (saving = saving.catch(() => {}).then(() => saveJson(file, cache))); }
        catch { console.error('포켓몬 캐시를 저장하지 못했습니다. data 폴더를 확인하세요.'); }
      }
      return value;
    } finally { pending.delete(id); } })();
    pending.set(id, request);
    return request;
  };
  return { get, peek };
}
