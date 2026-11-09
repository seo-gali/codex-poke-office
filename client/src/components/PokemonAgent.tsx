import { useState } from 'react';
import type { Pokemon } from '../../../shared/session.ts';
import { pokemonSprite } from '../../../shared/trainers.ts';

type Bounds = { url: string; width: number; height: number; left: number; top: number; right: number; bottom: number };
const boundsCache = new Map<string, Bounds>();
export const pokemonDrawSize = (pokemon: Pokemon) => pokemon.heightDm === null ? 48 : Math.max(42, Math.min(72, 34 + pokemon.heightDm * 1.4));

export function PokemonAgent({ pokemon, still = false, magnification = 1 }: { pokemon: Pokemon; still?: boolean; magnification?: number }) {
  const [failed, setFailed] = useState<string[]>([]);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const sources = still ? [pokemonSprite(pokemon.id, false)] : [pokemon.spriteUrl, `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${pokemon.id}.gif`, pokemonSprite(pokemon.id, false)];
  const url = sources.find((value): value is string => Boolean(value && !failed.includes(value)));
  const size = pokemonDrawSize(pokemon) * magnification;
  const b = bounds?.url === url ? bounds : url ? boundsCache.get(url) : null;
  const factor = b ? 100 / Math.max(b.right - b.left + 1, b.bottom - b.top + 1) : 1;
  return <span className="pokemon-figure" style={{ width: size, aspectRatio: '1' }} data-size={size} data-normalized={Boolean(b)}>
    {url ? <img className={`sprite ${!still && url.endsWith('.png') ? 'sprite-idle' : ''}`} src={url} alt={pokemon.name} draggable={false} crossOrigin="anonymous" referrerPolicy="no-referrer" style={b ? { width: `${b.width * factor}%`, height: `${b.height * factor}%`, left: `${(100 - (b.right - b.left + 1) * factor) / 2 - b.left * factor}%`, top: `${100 - (b.bottom + 1) * factor}%` } : { width: '100%', height: '100%' }} onLoad={e => {
      const saved = boundsCache.get(url); if (saved) { setBounds(saved); return; }
      const image = e.currentTarget, canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (data[(y * canvas.width + x) * 4 + 3] > 16) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
      if (right < left) { setFailed(values => [...values, url]); return; }
      const value = { url, width: canvas.width, height: canvas.height, left, top, right, bottom };
      boundsCache.set(url, value); setBounds(value);
    }} onError={() => setFailed(values => [...values, url])} /> : <span className="sprite-placeholder" role="img" aria-label="이미지 없음"><span>?</span><small>#{pokemon.id}</small></span>}
  </span>;
}
