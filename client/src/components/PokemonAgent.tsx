import { useEffect, useState } from 'react';
import type { Pokemon } from '../../../shared/session.ts';

export function PokemonAgent({ pokemon, still = false, eventAt, animate = false }: { pokemon: Pokemon; still?: boolean; eventAt?: string | null; animate?: boolean }) {
  const [failed, setFailed] = useState<string[]>([]);
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    setMoving(!still);
    const timer = setTimeout(() => setMoving(false), 1200);
    return () => clearTimeout(timer);
  }, [still, eventAt, pokemon.id]);
  const sprite = ((!moving && !animate) || still) && pokemon.spriteUrl?.endsWith('.gif') ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png` : pokemon.spriteUrl;
  const url = [sprite, `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`].find(value => value && !failed.includes(value));
  return url ? <img className="sprite" src={url} alt={pokemon.name} referrerPolicy="no-referrer" onError={() => setFailed(values => [...values, url])} /> :
    <span className="sprite-placeholder" role="img" aria-label="이미지 없음"><span>?</span><small>#{pokemon.id}</small></span>;
}
