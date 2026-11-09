import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { SessionView } from '../../../shared/session.ts';
import { PokemonAgent } from './PokemonAgent.tsx';
import { time, usageLabels } from './SessionDetails.tsx';
import { Trainer } from './Trainer.tsx';
import { ActivityBall } from './ActivityBall.tsx';
import { trainers } from '../../../shared/trainers.ts';
import type { TrainerId } from '../../../shared/trainers.ts';

type Place = { u: number; v: number };
const clamp = (n: number) => Math.min(.97, Math.max(.03, n));
const point = ({ u, v }: Place) => ({ x: 400 + 260 * u - 70 * v, y: 355 + 100 * u + 145 * v });
const onFloor = (x: number, y: number): Place => ({ u: clamp((145 * (x - 400) + 70 * (y - 355)) / 44700), v: clamp((-100 * (x - 400) + 260 * (y - 355)) / 44700) });
const actorId = (session: SessionView) => `${session.sessionId}:${session.pokemon.id}`;
function hash(key: string) { let n = 2166136261; for (const c of key) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; }
function spawn(key: string, index: number, count: number): Place {
  const columns = Math.ceil(Math.sqrt(count)), seed = hash(key);
  return { u: (index % columns + .3 + (seed % 40) / 100) / columns, v: (Math.floor(index / columns) + .3 + (seed % 37) / 100) / Math.ceil(count / columns) };
}
const working = (s: SessionView) => s.usage === 'active' && s.observation === 'recent-event' && !['unknown', 'complete', 'aborted'].includes(s.activity.kind);

export function ResearchCamp({ sessions, filter, still, onSelect, trainer }: { sessions: SessionView[]; filter: 'all' | 'active' | 'inactive'; still: boolean; onSelect: (id: string) => void; trainer: TrainerId }) {
  const floor = useRef<HTMLDivElement>(null), room = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [places, setPlaces] = useState<Record<string, Place>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const drag = useRef<{ key: string; pointer: number; startX: number; startY: number; dx: number; dy: number; moved: boolean } | null>(null);
  const held = useRef<Record<string, number>>({}), suppressClick = useRef(false);
  const ordered = [...sessions].sort((a, b) => hash(actorId(a)) - hash(actorId(b)));
  const actors = ordered.map(actorId).join('|');
  const width = 1024, height = 683;
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setScale(Math.max(.7, Math.min(entry.contentRect.width / width, entry.contentRect.height / height, 1.35))));
    observer.observe(floor.current!); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const keys = actors ? actors.split('|') : [];
    setPlaces(previous => Object.fromEntries(keys.map((key, i) => [key, previous[key] ?? spawn(key, i, keys.length)])));
    if (still || !keys.length) return;
    const timer = setInterval(() => setPlaces(previous => {
      const next = { ...previous };
      for (const key of keys) {
        if (drag.current?.key === key || Date.now() < (held.current[key] ?? 0) || Math.random() < .25) continue;
        const p = previous[key]; if (!p) continue;
        const candidate = { u: clamp(p.u + (Math.random() - .5) * .4), v: clamp(p.v + (Math.random() - .5) * .4) }, target = point(candidate);
        if (keys.some(other => { if (other === key || !next[other]) return false; const p = point(next[other]); return Math.hypot(p.x - target.x, p.y - target.y) < Math.min(56, 240 / Math.sqrt(keys.length)); })) continue;
        next[key] = candidate;
      }
      return next;
    }), 3500);
    return () => clearInterval(timer);
  }, [actors, still]);
  const pointer = (e: PointerEvent<HTMLButtonElement>) => { const b = room.current!.getBoundingClientRect(); return { x: (e.clientX - b.left) / scale, y: (e.clientY - b.top) / scale }; };
  function start(e: PointerEvent<HTMLButtonElement>, key: string) {
    if (e.button !== 0 || drag.current) return;
    const b = e.currentTarget.getBoundingClientRect(), p = pointer(e);
    const dx = (b.left + b.width / 2 - e.clientX) / scale, dy = (b.bottom - e.clientY) / scale;
    drag.current = { key, pointer: e.pointerId, startX: e.clientX, startY: e.clientY, dx, dy, moved: false };
    setDragging(key); setPlaces(previous => ({ ...previous, [key]: onFloor(p.x + dx, p.y + dy) }));
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current; if (!d || d.pointer !== e.pointerId) return;
    if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 5) d.moved = true;
    if (!d.moved) return;
    const p = pointer(e); setPlaces(previous => ({ ...previous, [d.key]: onFloor(p.x + d.dx, p.y + d.dy) }));
  }
  function finish(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current; if (!d || d.pointer !== e.pointerId) return;
    held.current[d.key] = Date.now() + 10000; suppressClick.current = d.moved;
    drag.current = null; setDragging(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setTimeout(() => { suppressClick.current = false; }, 0);
  }
  const visible = sessions.filter(s => filter === 'all' || s.usage === filter);
  const records = [...visible].sort((a, b) => (Date.parse(b.activity.at ?? '') || 0) - (Date.parse(a.activity.at ?? '') || 0) || a.sessionId.localeCompare(b.sessionId));
  return <div className="research-camp">
    <div className="camp-summary"><strong>포켓몬 연구소</strong><span>최근 활동 {visible.filter(s => s.observation === 'recent-event').length} · 응답 완료 기록 {visible.filter(s => s.activity.kind === 'complete').length}</span></div>
    <div className="camp-layout"><div ref={floor} className="camp-floor" aria-label="세션 포켓몬 작업 구역">
      <div className="lab-viewport" style={{ width: width * scale, height: height * scale }}><div ref={room} className="lab-room" data-still={still} style={{ width, height, transform: `scale(${scale})` }}>
        <img className="lab-background" src="/lab/oak-lab.png" alt="원통형 회복 장치, 몬스터볼 연구대와 나무 바닥이 있는 입체 포켓몬 연구소" />
        <span className="lab-chamber-glow" data-working={!still && visible.some(working)} aria-hidden="true" />
        {ordered.map((session, index) => {
          if (filter !== 'all' && session.usage !== filter) return null;
          const key = actorId(session), position = point(places[key] ?? spawn(key, index, ordered.length));
          const size = Math.min(96, 360 / Math.ceil(Math.sqrt(sessions.length))), active = working(session);
          return <button className="camp-station" type="button" key={key} data-session={session.sessionId} data-working={active && !still} data-dragging={dragging === key} style={{ left: position.x - size / 2, top: position.y - size, width: size, height: size, zIndex: dragging === key ? 1000 : Math.round(position.y) }} aria-label={`${session.pokemon.name} · ${session.projectName} · ${session.activity.label}`} title="드래그·방향키로 이동 / 클릭·Enter로 도감 열기" onPointerDown={e => start(e, key)} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onClick={() => { if (!suppressClick.current) onSelect(session.sessionId); }} onKeyDown={e => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
            e.preventDefault(); const dx = e.key === 'ArrowLeft' ? -15 : e.key === 'ArrowRight' ? 15 : 0, dy = e.key === 'ArrowUp' ? -15 : e.key === 'ArrowDown' ? 15 : 0;
            held.current[key] = Date.now() + 10000; setPlaces(previous => ({ ...previous, [key]: onFloor(position.x + dx, position.y + dy) }));
          }}>
            <span className={`camp-speech ${session.activity.kind}`}>{session.activity.label}</span>
            <span className="camp-platform"><PokemonAgent pokemon={session.pokemon} still={still} /></span>
            <span className="camp-state"><ActivityBall records={session.activity.records} /></span>
            <strong className="camp-pokemon-name">{session.pokemon.name}<i className={`usage-dot ${session.usage}`} /></strong>
          </button>;
        })}
        <div className="camp-trainer" style={{ left: 250, top: 410, zIndex: 498 }}><span className={`camp-trainer-sprite ${trainers[trainer].source === 'emerald' ? 'narrow' : ''}`}><Trainer character={trainer} /></span><strong>나 · {trainers[trainer].name}</strong></div>
        {!visible.length && <p className="camp-empty">표시할 세션 포켓몬이 없어요</p>}
      </div></div>
    </div><aside className="camp-log" aria-label="최근 캠프 활동"><h3>연구 노트 <span>{visible.length}</span></h3>{records.map(session => <button type="button" key={session.sessionId} data-session={session.sessionId} onClick={() => onSelect(session.sessionId)}><ActivityBall records={session.activity.records} /><span><strong>{session.pokemon.name}</strong><span>{session.activity.label}</span><small>{session.projectName ?? '프로젝트 미확인'} · {session.shortId}</small><small>누적 활동 {session.activity.records}회</small><small className="camp-activity-count">이번 응답 도구 {session.activity.toolCalls}회 · {usageLabels[session.usage]}</small>{session.activity.at && <small>{time(session.activity.at)}</small>}</span></button>)}<p>드래그·방향키로 옮기고 클릭하면 도감이 열려요.<br />활동 볼: 0 / 1–19 / 20–99 / 100회 이상<br />최근 활동과 파일 사용 여부는 별도 정보입니다.</p></aside></div>
  </div>;
}
