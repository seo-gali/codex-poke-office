import { useEffect, useRef, useState } from 'react';
import type { SessionView } from '../../../shared/session.ts';
import { PokemonAgent } from './PokemonAgent.tsx';
import { Trainer } from './Trainer.tsx';
import type { TrainerId } from './Trainer.tsx';
import { distance, mapImage, symbols, walkable } from './safari.ts';
import type { SafariMap } from './safari.ts';

export const labels = { 'recent-event': '최근 활동 감지', 'turn-complete': '응답 완료 기록', quiet: '새 기록 없음', unknown: '상태 미확인' };
export const usageLabels = { active: '사용 중', inactive: '사용 안 함', unknown: '확인 불가' };
const directions: Record<string, [number, number, string]> = { arrowup: [0, -1, 'up'], w: [0, -1, 'up'], arrowdown: [0, 1, 'down'], s: [0, 1, 'down'], arrowleft: [-1, 0, 'left'], a: [-1, 0, 'left'], arrowright: [1, 0, 'right'], d: [1, 0, 'right'] };

export function HabitatScene({ sessions, visibleIds, selected, onSelect, still, map, trainer }: { sessions: SessionView[]; visibleIds: Set<string>; selected: string | null; onSelect: (id: string) => void; still: boolean; map: SafariMap; trainer: TrainerId }) {
  const view = useRef<HTMLDivElement>(null);
  const keys = useRef(new Set<string>());
  const [size, setSize] = useState({ width: 600, height: 450 });
  const [player, setPlayer] = useState({ ...map.start, direction: 'down', walking: false });
  const [mapFailed, setMapFailed] = useState(false);
  const [camera, setCamera] = useState({ zoom: 1.25, follow: true, x: map.start.x, y: map.start.y });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ pointer: number; mouseX: number; mouseY: number; x: number; y: number } | null>(null);
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
  const availableHeight = Math.max(1, size.height - 88);
  const fitWidth = Math.max(1, Math.min(size.width, availableHeight * 4 / 3));
  const width = fitWidth * camera.zoom;
  const height = width * .75;
  const cameraX = width <= size.width ? (size.width - width) / 2 : Math.max(size.width - width, Math.min(0, size.width / 2 - width * (camera.follow ? player.x : camera.x) / 100));
  const cameraY = height <= availableHeight ? (availableHeight - height) / 2 : Math.max(availableHeight - height, Math.min(0, availableHeight / 2 - height * (camera.follow ? player.y : camera.y) / 100));
  function zoomAt(value: number, mouseX = size.width / 2, mouseY = availableHeight / 2) {
    const zoom = Math.min(4, Math.max(1, value));
    const nextWidth = fitWidth * zoom, nextHeight = nextWidth * .75;
    const worldX = (mouseX - cameraX) / width, worldY = (mouseY - cameraY) / height;
    setCamera({ zoom, follow: false, x: (worldX + (size.width / 2 - mouseX) / nextWidth) * 100, y: (worldY + (availableHeight / 2 - mouseY) / nextHeight) * 100 });
  }
  useEffect(() => {
    const element = view.current!;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const bounds = element.getBoundingClientRect();
      zoomAt(camera.zoom * Math.exp(-event.deltaY * .0015), event.clientX - bounds.left, event.clientY - bounds.top);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [camera.zoom, cameraX, cameraY, fitWidth, size.width, availableHeight]);
  return <div className={`safari-view ${dragging ? 'dragging' : ''}`} ref={view} aria-label="사파리 탐험"
    onPointerDown={event => {
      if (event.button !== 0 || (event.target as HTMLElement).closest('button, select, a, .explore-hud, .map-controls') || selected) return;
      drag.current = { pointer: event.pointerId, mouseX: event.clientX, mouseY: event.clientY, x: (size.width / 2 - cameraX) / width * 100, y: (availableHeight / 2 - cameraY) / height * 100 };
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      if (!drag.current || drag.current.pointer !== event.pointerId) return;
      const origin = drag.current;
      setCamera(previous => ({ ...previous, follow: false, x: Math.min(100, Math.max(0, origin.x - (event.clientX - origin.mouseX) / width * 100)), y: Math.min(100, Math.max(0, origin.y - (event.clientY - origin.mouseY) / height * 100)) }));
    }} onPointerUp={() => { drag.current = null; setDragging(false); }} onPointerCancel={() => { drag.current = null; setDragging(false); }}>
    <div className="safari-stage" style={{ width, height, left: cameraX, top: cameraY }}>
      <img className="safari-map-image" src={mapImage(map)} alt={`${map.name} 지도`} referrerPolicy="no-referrer" onError={() => setMapFailed(true)} />
      {mapFailed ? <p className="map-error" role="alert">맵을 불러올 수 없습니다.<br />인터넷 연결을 확인하거나 다른 구역을 선택하세요.</p> : <>
        {encounters.map(({ session, point }) => <button type="button" className={`safari-symbol ${nearby?.session.sessionId === session.sessionId ? 'nearby' : ''}`} key={session.sessionId}
          style={{ left: `${point.x}%`, top: `${point.y}%` }} aria-label={`${session.pokemon.name} · ${session.projectName} · ${session.shortId} · ${usageLabels[session.usage] ?? '확인 불가'}`}
          onClick={() => onSelect(session.sessionId)}>
          <PokemonAgent pokemon={session.pokemon} still={still} /><span className="symbol-name">{session.pokemon.name}<i className={`usage-dot ${session.usage}`} /></span>
        </button>)}
        <div className="player" style={{ left: `${player.x}%`, top: `${player.y}%` }} aria-label="플레이어 위치"><span className="player-label">나</span><Trainer direction={player.direction} walking={player.walking && !still} character={trainer} /></div>
      </>}
      {!encounters.length && !mapFailed && <p className="empty map-empty">이 구역에는 표시할 세션 포켓몬이 없어요.<br /><small>다른 구역이나 표시 필터를 골라보세요.</small></p>}
    </div>
    <div className="map-controls" aria-label="지도 보기 조절"><button type="button" aria-label="지도 축소" disabled={camera.zoom <= 1} onClick={() => zoomAt(camera.zoom / 1.25)}>−</button><output aria-label="지도 배율">{Math.round(camera.zoom * 100)}%</output><button type="button" aria-label="지도 확대" disabled={camera.zoom >= 4} onClick={() => zoomAt(camera.zoom * 1.25)}>+</button><button type="button" onClick={() => setCamera({ zoom: 1, follow: false, x: 50, y: 50 })}>전체 맵</button><button type="button" aria-pressed={camera.follow} onClick={() => setCamera({ zoom: Math.max(1.5, camera.zoom), follow: true, x: player.x, y: player.y })}>내 캐릭터</button></div>
    <div className="explore-hud"><span className="explore-message" aria-live="polite">{nearby ? `${nearby.session.pokemon.name} · E키로 말 걸기` : '포켓몬 클릭으로 정보 보기 · 방향키 / WASD로 이동'}</span><button type="button" className="interact-button" disabled={!nearby || !!selected || mapFailed} onClick={() => nearby && onSelect(nearby.session.sessionId)}>E · 말 걸기</button></div>
    <div className="touch-pad" aria-label="이동 버튼">{([['arrowup', '↑', '위로 이동'], ['arrowleft', '←', '왼쪽 이동'], ['arrowdown', '↓', '아래로 이동'], ['arrowright', '→', '오른쪽 이동']] as const).map(([key, label, name]) => <button key={key} type="button" className={key} aria-label={name}
      onPointerDown={event => { event.preventDefault(); keys.current.add(key); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={() => keys.current.delete(key)} onPointerCancel={() => keys.current.delete(key)}>{label}</button>)}</div>
  </div>;
}
