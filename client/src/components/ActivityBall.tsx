export const activityBalls = [
  [0, 'poke-ball', '몬스터볼'], [1, 'premier-ball', '프레미어볼'], [10, 'great-ball', '슈퍼볼'],
  [20, 'net-ball', '네트볼'], [50, 'dusk-ball', '다크볼'], [100, 'ultra-ball', '하이퍼볼'],
  [200, 'repeat-ball', '리피트볼'], [400, 'timer-ball', '타이머볼'], [700, 'quick-ball', '퀵볼'],
  [1000, 'luxury-ball', '럭셔리볼'], [2000, 'master-ball', '마스터볼'],
] as const;

export function ActivityBall({ records }: { records: number }) {
  const [, id, name] = activityBalls.findLast(([minimum]) => records >= minimum)!;
  const label = `${name} · 누적 활동 ${records}회`;
  return <img className="activity-ball" src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${id}.png`} alt={label} title={label} referrerPolicy="no-referrer" />;
}
