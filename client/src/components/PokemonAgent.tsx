import { useState } from 'react';
import type { Pokemon } from '../../../shared/session.ts';

export function PokemonAgent({ pokemon, still = false }: { pokemon: Pokemon; still?: boolean }) {
  const [failed, setFailed] = useState<string[]>([]);
  const sprite = still && pokemon.spriteUrl?.endsWith('.gif') ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png` : pokemon.spriteUrl;
  const url = sprite && !failed.includes(sprite) ? sprite : null;
  return url ? <img className="sprite" src={url} alt={pokemon.name} referrerPolicy="no-referrer" onError={() => setFailed(values => [...values, url])} /> :
    <span className="sprite-placeholder" role="img" aria-label="이미지 없음"><span>?</span><small>#{pokemon.id}</small></span>;
}
