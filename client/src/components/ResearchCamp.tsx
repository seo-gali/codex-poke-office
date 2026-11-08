import { useEffect, useRef, useState } from 'react';
import type { SessionView } from '../../../shared/session.ts';
import { PokemonAgent } from './PokemonAgent.tsx';
import { time, usageLabels } from './SessionDetails.tsx';
import { Trainer } from './Trainer.tsx';
import { trainers } from '../../../shared/trainers.ts';
import type { TrainerId } from '../../../shared/trainers.ts';

function spot(session: SessionView) {
  let value = 2166136261;
  for (const char of `${session.sessionId}:${session.pokemon.id}`) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

export function ResearchCamp({ sessions, filter, still, onSelect, trainer }: { sessions: SessionView[]; filter: 'all' | 'active' | 'inactive'; still: boolean; onSelect: (id: string) => void; trainer: TrainerId }) {
  const floor = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const ordered = [...sessions].sort((a, b) => spot(a) - spot(b));
  const columns = Math.min(3, Math.max(2, Math.ceil(Math.sqrt(sessions.length))));
  const rows = Math.max(2, Math.ceil(sessions.length / columns));
  const wide = columns * 4 + 2, deep = rows * 4 + 2;
  const width = (wide + deep) * 32 + 100, height = (wide + deep) * 18 + 190;
  const point = (u: number, v: number) => ({ x: deep * 32 + 50 + (u - v) * 32, y: 130 + (u + v) * 18 });
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setScale(Math.max(.7, Math.min(entry.contentRect.width / width, entry.contentRect.height / height, 1.35))));
    observer.observe(floor.current!);
    return () => observer.disconnect();
  }, [width, height]);
  const visible = sessions.filter(s => filter === 'all' || s.usage === filter);
  const records = [...visible].sort((a, b) => (Date.parse(b.activity.at ?? '') || 0) - (Date.parse(a.activity.at ?? '') || 0) || a.sessionId.localeCompare(b.sessionId));
  const recent = visible.filter(s => s.observation === 'recent-event').length;
  const prop = (name: string, u: number, v: number, size = 128, mirror = false) => {
    const p = point(u, v);
    return <image key={`${name}:${u}:${v}`} href={`/lab/${name}.png`} x={mirror ? -p.x - size / 2 : p.x - size / 2} y={p.y - size + 8} width={size} height={size} transform={mirror ? 'scale(-1 1)' : undefined} />;
  };
  const front = point(wide, deep), left = point(0, deep), right = point(wide, 0);
  return <div className="research-camp">
    <div className="camp-summary"><strong>동료들의 연구실</strong><span>최근 활동 {recent} · 응답 완료 기록 {visible.filter(s => s.activity.kind === 'complete').length}</span></div>
    <div className="camp-layout"><div ref={floor} className="camp-floor" aria-label="세션 포켓몬 작업 구역">
      <div className="lab-viewport" style={{ width: width * scale, height: height * scale }}>
        <div className="lab-room" style={{ width, height, transform: `scale(${scale})` }}>
          <svg className="lab-architecture" viewBox={`0 0 ${width} ${height}`} aria-label="아이소메트릭 연구실의 바닥과 벽" role="img">
            <defs><filter id="lab-blue-tile"><feColorMatrix type="matrix" values=".7 0 0 0 .04 0 .8 0 0 .04 0 0 .85 0 .04 0 0 0 1 0" /></filter></defs>
            <polygon points={`${left.x},${left.y} ${front.x},${front.y} ${right.x},${right.y} ${right.x},${right.y + 14} ${front.x},${front.y + 14} ${left.x},${left.y + 14}`} fill="#263f58" stroke="#5f9da4" strokeWidth="2" />
            {Array.from({ length: wide * deep }, (_, index) => {
              const p = point(index % wide, Math.floor(index / wide));
              return <image key={index} href="/lab/floor.png" x={p.x - 36} y={p.y - 22} width="73" height="82" filter={(index % wide + Math.floor(index / wide)) % 2 ? 'url(#lab-blue-tile)' : undefined} />;
            })}
            {Array.from({ length: deep / 2 }, (_, i) => { const p = point(0, i * 2); return <image key={`l${i}`} href="/lab/wall.png" x={p.x - 92} y={p.y - 86} width="128" height="128" />; })}
            {Array.from({ length: wide / 2 }, (_, i) => { const p = point(i * 2, 0); return <image key={`r${i}`} href="/lab/wall.png" x={-p.x - 92} y={p.y - 86} width="128" height="128" transform="scale(-1 1)" />; })}
            <polyline points={`${left.x},${left.y - 84} ${point(0, 0).x},46 ${right.x},${right.y - 84}`} fill="none" stroke="#8eafb8" strokeWidth="5" />
            <polyline points={`${left.x},${left.y - 8} ${point(0, 0).x},122 ${right.x},${right.y - 8}`} fill="none" stroke="#56939b" strokeWidth="14" />
            {prop('bookshelf', 1, 2)}{prop('cabinet', 1, 6)}{prop('sink', 1, deep - 3)}
            {prop('board', 4, 0, 96, true)}{prop('window', wide - 3, 0, 96, true)}{prop('clock', 1, 0, 64, true)}
          </svg>
          <div className="lab-sign" style={{ left: point(0, 0).x - 74 }}><span>POKÉ LAB</span><small>연구 캠프</small></div>
          {ordered.map((session, index) => {
            if (filter !== 'all' && session.usage !== filter) return null;
            const p = point(3 + index % columns * 4, 3 + Math.floor(index / columns) * 4);
            const working = session.usage === 'active' && session.observation === 'recent-event' && !['unknown', 'complete', 'aborted'].includes(session.activity.kind);
            return <button className="camp-station" type="button" key={session.sessionId} data-session={session.sessionId} data-working={working && !still} style={{ left: p.x - 95, top: p.y - 128, zIndex: Math.round(p.y) }} aria-label={`${session.pokemon.name} · ${session.projectName} · ${session.activity.label}`} onClick={() => onSelect(session.sessionId)}>
              <span className={`camp-speech ${session.activity.kind}`} key={`${session.activity.kind}:${session.activity.at}`}>{session.activity.kind === 'complete' ? '✓ ' : working ? '✦ ' : ''}{session.activity.label}</span>
              <span className="camp-platform">
                <img className="lab-desk" src="/lab/desk.png" alt="" />
                <img className="lab-monitor" src="/lab/monitor.png" alt="" />
                <img className="lab-keyboard" src="/lab/keyboard.png" alt="" />
                <span className="lab-screen-light" aria-hidden="true" />
                <span className="camp-work-sparks" aria-hidden="true">✧</span>
                <PokemonAgent pokemon={session.pokemon} still={still || !working} />
              </span>
              <strong className="camp-pokemon-name">{session.pokemon.name}<i className={`usage-dot ${session.usage}`} /></strong>
            </button>;
          })}
          <div className="camp-trainer" style={{ left: front.x - 72, top: front.y - 102, zIndex: Math.round(front.y) }}>
            <span className={`camp-trainer-sprite ${trainers[trainer].source === 'emerald' ? 'narrow' : ''}`}><Trainer character={trainer} /></span>
            <strong>나 · {trainers[trainer].name}</strong>
          </div>
          {!visible.length && <p className="camp-empty">표시할 세션 포켓몬이 없어요</p>}
        </div>
      </div>
    </div><aside className="camp-log" aria-label="최근 캠프 활동"><h3>연구 노트 <span>{visible.length}</span></h3>{records.map(session => <button type="button" key={session.sessionId} data-session={session.sessionId} onClick={() => onSelect(session.sessionId)}><i className={`usage-dot ${session.usage}`} /><span><strong>{session.pokemon.name}</strong><span>{session.activity.label}</span><small>{session.projectName ?? '프로젝트 미확인'} · {session.shortId}</small><small className="camp-activity-count">이번 응답 도구 {session.activity.toolCalls}회 · {usageLabels[session.usage]}</small>{session.activity.at && <small>{time(session.activity.at)}</small>}</span></button>)}<p>도구 호출과 응답 기록이 작업대에 반영돼요.<br />최근 기록과 파일 사용 여부는 별도로 표시됩니다.</p><a className="lab-credit" href="https://just-uris.itch.io/free-demo-back-to-school-pack" target="_blank" rel="noreferrer">공간 도트 · uris (@imaghuris)</a></aside></div>
  </div>;
}
