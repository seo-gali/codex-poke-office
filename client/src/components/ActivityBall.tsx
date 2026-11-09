export function ActivityBall({ records }: { records: number }) {
  const [id, name] = records >= 100 ? ['master-ball', '마스터볼'] : records >= 20 ? ['ultra-ball', '하이퍼볼'] : records > 0 ? ['great-ball', '슈퍼볼'] : ['poke-ball', '몬스터볼'];
  const label = `${name} · 누적 활동 ${records}회`;
  return <img className="activity-ball" src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${id}.png`} alt={label} title={`${label} (0 / 1–19 / 20–99 / 100회 이상)`} referrerPolicy="no-referrer" />;
}
