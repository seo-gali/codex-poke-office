import { useEffect, useRef, useState } from 'react';
import type { SessionView } from '../../../shared/session.ts';
import { PokemonAgent } from './PokemonAgent.tsx';
import { Trainer } from './Trainer.tsx';
import { distance, mapImage, symbols, walkable } from './safari.ts';
import type { SafariMap } from './safari.ts';

export const labels = { 'recent-event': '최근 활동 감지', 'turn-complete': '응답 완료 기록', quiet: '새 기록 없음', unknown: '상태 미확인' };
export const usageLabels = { active: '사용 중', inactive: '사용 안 함', unknown: '확인 불가' };
const directions: Record<string, [number, number, string]> = { arrowup: [0, -1, 'up'], w: [0, -1, 'up'], arrowdown: [0, 1, 'down'], s: [0, 1, 'down'], arrowleft: [-1, 0, 'left'], a: [-1, 0, 'left'], arrowright: [1, 0, 'right'], d: [1, 0, 'right'] };

export function HabitatScene({ sessions, visibleIds, selected, onSelect, still, map }: { sessions: SessionView[]; visibleIds: Set<string>; selected: string | null; onSelect: (id: string) => void; still: boolean; map: SafariMap }) {
  const view = useRef<HTMLDivElement>(null);
  const keys = useRef(new Set<string>());
  const [size, setSize] = useState({ width: 600, height: 450 });
  const [player, setPlayer] = useState({ ...map.start, direction: 'down', walking: false });
  const [mapFailed, setMapFailed] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const encounters = symbols(sessions, map).filter(s => visibleIds.has(s.session.sessionId));
  const nearby = encounters.filter(s => distance(player, s.point) <= 14).sort((a, b) => distance(player, a.point) - distance(player, b.point))[0];
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(view.current!);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (selected) keys.current.clear();
    const down = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('dialog, select, input, textarea') || selected) return;
      const key = event.key.toLowerCase();
      if (directions[key]) { event.preventDefault(); keys.current.add(key); }
      if (key === 'e' && !event.repeat && nearby) { event.preventDefault(); onSelect(nearby.session.sessionId); }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    const timer = setInterval(() => {
      if (selected || document.hidden || mapFailed) return;
      const held = [...keys.current].map(key => directions[key]).filter(Boolean);
      const dx = Math.sign(held.reduce((sum, value) => sum + value[0], 0));
      const dy = Math.sign(held.reduce((sum, value) => sum + value[1], 0));
      setPlayer(previous => {
        if (!dx && !dy) return previous.walking ? { ...previous, walking: false } : previous;
        const step = dx && dy ? 1.1 : 1.6;
        let x = previous.x, y = previous.y;
        if (walkable(map, { x: x + dx * step, y })) x += dx * step;
        if (walkable(map, { x, y: y + dy * step })) y += dy * step;
        return { x, y, direction: held.at(-1)![2], walking: x !== previous.x || y !== previous.y };
      });
    }, 80);
    return () => { clearInterval(timer); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, [selected, nearby?.session.sessionId, onSelect, map, mapFailed]);
  const width = Math.max(1, size.width, size.height * 4 / 3);
  const height = width * .75;
  const cameraX = Math.max(size.width - width, Math.min(0, size.width / 2 - width * player.x / 100));
  const cameraY = Math.max(size.height - height, Math.min(0, size.height / 2 - height * player.y / 100));
  return <div className="safari-view" ref={view} aria-label="사파리 탐험">
    <div className="safari-stage" style={{ width, height, left: cameraX, top: cameraY }}>
      <img className="safari-map-image" src={mapImage(map)} alt={`${map.name} 지도`} referrerPolicy="no-referrer" onError={() => setMapFailed(true)} />
      {mapFailed ? <p className="map-error" role="alert">맵을 불러올 수 없습니다.<br />인터넷 연결을 확인하거나 다른 구역을 선택하세요.</p> : <>
        {encounters.map(({ session, point }) => <button type="button" className={`safari-symbol ${nearby?.session.sessionId === session.sessionId ? 'nearby' : ''}`} key={session.sessionId}
          style={{ left: `${point.x}%`, top: `${point.y}%` }} aria-label={`${session.pokemon.name} · ${session.projectName} · ${session.shortId} · ${usageLabels[session.usage] ?? '확인 불가'}`}
          onClick={() => distance(player, point) <= 14 ? onSelect(session.sessionId) : setHint(`${session.pokemon.name}에게 조금 더 가까이 가보세요.`)}>
          <PokemonAgent pokemon={session.pokemon} still /><span className="symbol-name">{session.pokemon.name}<i className={`usage-dot ${session.usage}`} /></span>
        </button>)}
        <div className="player" style={{ left: `${player.x}%`, top: `${player.y}%` }} aria-label="플레이어 위치"><span className="player-label">나</span><Trainer direction={player.direction} walking={player.walking && !still} /></div>
      </>}
      <div className="map-nameplate"><span>{map.name}</span><small>고정 심볼 {encounters.length}</small></div>
      {!encounters.length && !mapFailed && <p className="empty map-empty">이 구역에는 표시할 세션 포켓몬이 없어요.<br /><small>다른 구역이나 표시 필터를 골라보세요.</small></p>}
    </div>
    <div className="explore-hud"><span className="explore-message" aria-live="polite">{nearby ? `${nearby.session.pokemon.name} 곁에 왔어요. 말 걸어볼까요?` : hint ?? '방향키 · WASD로 걸어서 세션 포켓몬을 만나보세요.'}</span><button type="button" className="interact-button" disabled={!nearby || !!selected || mapFailed} onClick={() => nearby && onSelect(nearby.session.sessionId)}>E · 말 걸기</button></div>
    <div className="touch-pad" aria-label="이동 버튼">{([['arrowup', '↑', '위로 이동'], ['arrowleft', '←', '왼쪽 이동'], ['arrowdown', '↓', '아래로 이동'], ['arrowright', '→', '오른쪽 이동']] as const).map(([key, label, name]) => <button key={key} type="button" className={key} aria-label={name}
      onPointerDown={event => { event.preventDefault(); keys.current.add(key); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={() => keys.current.delete(key)} onPointerCancel={() => keys.current.delete(key)}>{label}</button>)}</div>
  </div>;
}
