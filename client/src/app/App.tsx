import { useEffect, useState } from 'react';
import type { Snapshot, SessionView } from '../../../shared/session.ts';
import { HabitatScene } from '../components/HabitatScene.tsx';
import { SessionDetails } from '../components/SessionDetails.tsx';
import { ReleaseDialog } from '../components/ReleaseDialog.tsx';
import { safariMaps, mapFor } from '../components/safari.ts';
import { trainers } from '../../../shared/trainers.ts';
import type { TrainerId } from '../../../shared/trainers.ts';

export function App() {
  const [snapshot, setSnapshot] = useState<Snapshot>({ sessions: [], error: null });
  const [connection, setConnection] = useState('연결 중');
  const [updated, setUpdated] = useState<Date | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [releaseTarget, setReleaseTarget] = useState<SessionView | null>(null);
  const [background, setBackground] = useState('forest');
  const [areaCount, setAreaCount] = useState(() => { const saved = Number(localStorage.getItem('poke-office-area-count') ?? 1); return Number.isInteger(saved) && saved >= 1 && saved <= safariMaps.length ? saved : 1; });
  useEffect(() => { localStorage.setItem('poke-office-area-count', String(areaCount)); }, [areaCount]);
  const [trainer, setTrainer] = useState<TrainerId>(() => { const saved = localStorage.getItem('poke-office-trainer'); return saved && Object.hasOwn(trainers, saved) ? saved as TrainerId : 'brendan'; });
  useEffect(() => { localStorage.setItem('poke-office-trainer', trainer); }, [trainer]);
  const [still, setStill] = useState(document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const events = new EventSource('/api/events');
    events.onopen = () => setConnection('연결됨');
    events.onmessage = event => { setSnapshot(JSON.parse(event.data)); setUpdated(new Date()); };
    events.onerror = () => setConnection('연결 끊김 · 재연결 중');
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const visibility = () => setStill(document.hidden || media.matches);
    document.addEventListener('visibilitychange', visibility); media.addEventListener('change', visibility);
    return () => { events.close(); document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', visibility); };
  }, []);
  const allSessions = snapshot.sessions.map(session => ({ ...session, pokemon: session.pokemon[trainer] }));
  const sessions = allSessions.filter(s => filter === 'all' || s.usage === filter);
  const active = allSessions.find(s => s.sessionId === selected);
  const areas = safariMaps.slice(0, areaCount);
  const map = areas.find(m => m.id === background)!;
  const mapSessions = sessions.filter(s => mapFor(s, areaCount) === areas.indexOf(map));
  return <>
    <header className="topbar"><a className="brand" href="/"><span className="pokeball" /><span>Codex <strong>Poké Office</strong><small>로컬 Codex 세션</small></span></a><div className="header-meta"><span className={`connection ${connection === '연결됨' ? 'online' : ''}`} role="status"><span className="status-dot" />{connection}</span><span className="local-tag">LOCAL ONLY</span></div></header>
    <main><div className="page-heading"><div><h1>Codex Poké Office</h1></div><div className="session-count"><strong>{snapshot.sessions.length.toLocaleString('ko-KR')}</strong><span>세션 포켓몬<small>사용 중 {snapshot.sessions.filter(s => s.usage === 'active').length} · 사용 안 함 {snapshot.sessions.filter(s => s.usage === 'inactive').length}</small></span></div></div>
      {(snapshot.error || connection.startsWith('연결 끊김')) && <div role="alert" className="error-banner">{snapshot.error ?? `로컬 서버에 연결할 수 없습니다. ${location.origin} · 자동 재연결 중`}</div>}
      <div className="workspace"><section className="scene-panel" aria-labelledby="habitat-title"><div className="panel-heading"><div className="habitat-tabs"><h2 id="habitat-title">{map.name}</h2><span className="tiny-badge">{mapSessions.length}</span></div><div className="scene-options"><label>캐릭터 <select className="background-select" aria-label="캐릭터 선택" value={trainer} onChange={event => { setTrainer(event.target.value as TrainerId); setSelected(null); }}>{Object.entries(trainers).map(([id, character]) => <option key={id} value={id}>{character.name} · {character.generation}세대</option>)}</select></label><select className="background-select" aria-label="사파리 구역 이동" value={background} onChange={event => { setBackground(event.target.value); setSelected(null); }}>{areas.map((area, index) => <option key={area.id} value={area.id}>{area.name} · {sessions.filter(s => mapFor(s, areaCount) === index).length}마리</option>)}</select></div></div>
        <HabitatScene key={map.id} sessions={allSessions} visibleIds={new Set(sessions.map(s => s.sessionId))} selected={active?.sessionId ?? null} onSelect={setSelected} still={still} map={map} trainer={trainer} onMapChange={setBackground} areaCount={areaCount} onAddArea={() => setAreaCount(count => Math.min(safariMaps.length, count + 1))} />
        <div className="scene-footer"><div className="filters">{([['all', '모두'], ['active', '사용 중'], ['inactive', '사용 안 함']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setFilter(value); setSelected(null); }}>{label}</button>)}</div><span>드래그 · 휠로 지도 조절</span></div></section>
        <SessionDetails session={active} map={map} still={still} onClose={() => setSelected(null)} onRelease={setReleaseTarget} trainer={trainer} /></div>
      <footer className="page-footer"><span><i className="status-dot" />기록은 이 컴퓨터에만 머물러요</span><span>{updated ? `${updated.toLocaleTimeString('ko-KR')} 갱신` : '첫 기록을 기다리는 중'}</span></footer>
    </main>
    <ReleaseDialog session={releaseTarget} onClose={() => setReleaseTarget(null)} onReleased={() => setSelected(null)} />
  </>;
}
