import { useState } from 'react';
import type { Pokemon } from '../../../shared/session.ts';
import { pokemonSprite } from '../../../shared/trainers.ts';

export function PokemonAgent({ pokemon, still = false }: { pokemon: Pokemon; still?: boolean }) {
  const [failed, setFailed] = useState<string[]>([]);
  const sources = still ? [pokemonSprite(pokemon.id, false)] : [pokemon.spriteUrl, `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${pokemon.id}.gif`, pokemonSprite(pokemon.id, false)];
  const url = sources.find((value): value is string => Boolean(value && !failed.includes(value)));
  return url ? <img className={`sprite ${!still && url.endsWith('.png') ? 'sprite-idle' : ''}`} src={url} alt={pokemon.name} draggable={false} referrerPolicy="no-referrer" onError={() => setFailed(values => [...values, url])} /> :
    <span className="sprite-placeholder" role="img" aria-label="이미지 없음"><span>?</span><small>#{pokemon.id}</small></span>;
}
