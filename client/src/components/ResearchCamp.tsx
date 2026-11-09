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
const places = [[.44, .52], [.61, .58], [.76, .77], [.51, .74], [.36, .67], [.59, .88]];
const working = (session: SessionView) => session.usage === 'active' && session.observation === 'recent-event' && !['unknown', 'complete', 'aborted'].includes(session.activity.kind);

export function ResearchCamp({ sessions, filter, still, onSelect, trainer }: { sessions: SessionView[]; filter: 'all' | 'active' | 'inactive'; still: boolean; onSelect: (id: string) => void; trainer: TrainerId }) {
  const floor = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const ordered = [...sessions].sort((a, b) => spot(a) - spot(b));
  const width = 1024, height = 683;
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setScale(Math.max(.7, Math.min(entry.contentRect.width / width, entry.contentRect.height / height, 1.35))));
    observer.observe(floor.current!);
    return () => observer.disconnect();
  }, []);
  const visible = sessions.filter(s => filter === 'all' || s.usage === filter);
  const records = [...visible].sort((a, b) => (Date.parse(b.activity.at ?? '') || 0) - (Date.parse(a.activity.at ?? '') || 0) || a.sessionId.localeCompare(b.sessionId));
  const recent = visible.filter(s => s.observation === 'recent-event').length;
  return <div className="research-camp">
    <div className="camp-summary"><strong>포켓몬 연구소</strong><span>최근 활동 {recent} · 응답 완료 기록 {visible.filter(s => s.activity.kind === 'complete').length}</span></div>
    <div className="camp-layout"><div ref={floor} className="camp-floor" aria-label="세션 포켓몬 작업 구역">
      <div className="lab-viewport" style={{ width: width * scale, height: height * scale }}>
        <div className="lab-room" style={{ width, height, transform: `scale(${scale})` }}>
          <img className="lab-background" src="/lab/oak-lab.png" alt="원통형 회복 장치, 몬스터볼 연구대와 나무 바닥이 있는 입체 포켓몬 연구소" />
          <span className="lab-chamber-glow" data-working={!still && visible.some(working)} aria-hidden="true" />
          {ordered.map((session, index) => {
            if (filter !== 'all' && session.usage !== filter) return null;
            const columns = Math.ceil(Math.sqrt(sessions.length));
            const u = (index % columns + .5) / columns, v = (Math.floor(index / columns) + .5) / Math.ceil(sessions.length / columns);
            const [x, y] = sessions.length <= places.length ? places[index] : [.43 + .36 * u - .16 * v, .46 + .22 * u + .23 * v];
            const size = sessions.length <= places.length ? 96 : Math.min(96, 360 / columns);
            const active = working(session);
            return <button className="camp-station" type="button" key={session.sessionId} data-session={session.sessionId} data-working={active && !still} style={{ left: x * width - size / 2, top: y * height - size, width: size, height: size, zIndex: Math.round(y * height) }} aria-label={`${session.pokemon.name} · ${session.projectName} · ${session.activity.label}`} onClick={() => onSelect(session.sessionId)}>
              <span className={`camp-speech ${session.activity.kind}`}>{session.activity.label}</span>
              <span className="camp-platform"><PokemonAgent pokemon={session.pokemon} still={still || !active} /></span>
              <span className={`camp-state ${session.activity.kind}`} aria-hidden="true">{active ? '✦' : session.activity.kind === 'complete' ? '✓' : '·'}</span>
              <strong className="camp-pokemon-name">{session.pokemon.name}<i className={`usage-dot ${session.usage}`} /></strong>
            </button>;
          })}
          <div className="camp-trainer" style={{ left: 250, top: 410, zIndex: 498 }}>
            <span className={`camp-trainer-sprite ${trainers[trainer].source === 'emerald' ? 'narrow' : ''}`}><Trainer character={trainer} /></span>
            <strong>나 · {trainers[trainer].name}</strong>
          </div>
          {!visible.length && <p className="camp-empty">표시할 세션 포켓몬이 없어요</p>}
        </div>
      </div>
    </div><aside className="camp-log" aria-label="최근 캠프 활동"><h3>연구 노트 <span>{visible.length}</span></h3>{records.map(session => <button type="button" key={session.sessionId} data-session={session.sessionId} onClick={() => onSelect(session.sessionId)}><i className={`usage-dot ${session.usage}`} /><span><strong>{session.pokemon.name}</strong><span>{session.activity.label}</span><small>{session.projectName ?? '프로젝트 미확인'} · {session.shortId}</small><small className="camp-activity-count">이번 응답 도구 {session.activity.toolCalls}회 · {usageLabels[session.usage]}</small>{session.activity.at && <small>{time(session.activity.at)}</small>}</span></button>)}<p>도구 호출과 응답 기록이 연구소에 반영돼요.<br />최근 기록과 파일 사용 여부는 별도로 표시됩니다.</p></aside></div>
  </div>;
}
