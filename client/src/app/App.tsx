import { useEffect, useState } from 'react';
import type { Snapshot, SessionView } from '../../../shared/session.ts';
import { ResearchCamp } from '../components/ResearchCamp.tsx';
import { SessionDetails } from '../components/SessionDetails.tsx';
import { ReleaseDialog } from '../components/ReleaseDialog.tsx';
import { trainers } from '../../../shared/trainers.ts';
import type { TrainerId } from '../../../shared/trainers.ts';

export function App() {
  const [snapshot, setSnapshot] = useState<Snapshot>({ sessions: [], error: null });
  const [connection, setConnection] = useState('연결 중');
  const [updated, setUpdated] = useState<Date | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [releaseTarget, setReleaseTarget] = useState<SessionView | null>(null);
  const [trainer, setTrainer] = useState<TrainerId>(() => { const saved = localStorage.getItem('poke-office-trainer'); return saved && Object.hasOwn(trainers, saved) ? saved as TrainerId : 'brendan'; });
  const [switching, setSwitching] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  async function changeTrainer(character: TrainerId) {
    if (character === trainer) return;
    setSwitching(true); setChangeError(null); setSelected(null);
    try {
      const response = await fetch(`/api/trainers/${character}/shuffle`, { method: 'POST', headers: { 'X-Shuffle-Trainer': character } });
      if (!response.ok) throw new Error('재배정 실패');
      setSnapshot(await response.json()); setTrainer(character);
    } catch { setChangeError('포켓몬을 새로 배정하지 못했습니다. 잠시 후 캐릭터를 다시 선택해주세요.'); }
    finally { setSwitching(false); }
  }
  useEffect(() => { localStorage.setItem('poke-office-trainer', trainer); }, [trainer]);
  const [still, setStill] = useState(document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const events = new EventSource(`/api/events?trainer=${trainer}`);
    events.onopen = () => setConnection('연결됨');
    events.onmessage = event => { setSnapshot(JSON.parse(event.data)); setUpdated(new Date()); };
    events.onerror = () => setConnection('연결 끊김 · 재연결 중');
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const visibility = () => setStill(document.hidden || media.matches);
    document.addEventListener('visibilitychange', visibility); media.addEventListener('change', visibility);
    return () => { events.close(); document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', visibility); };
  }, [trainer]);
  const allSessions = snapshot.sessions.map(session => ({ ...session, pokemon: session.pokemon[trainer] }));
  const sessions = allSessions.filter(s => filter === 'all' || s.usage === filter);
  const active = allSessions.find(s => s.sessionId === selected);
  return <>
    <header className="topbar"><a className="brand" href="/"><span className="pokeball" /><span>Codex <strong>Poké Office</strong><small>로컬 Codex 세션</small></span></a><div className="header-meta"><span className={`connection ${connection === '연결됨' ? 'online' : ''}`} role="status"><span className="status-dot" />{connection}</span><span className="local-tag">LOCAL ONLY</span></div></header>
    <main><div className="page-heading"><div><h1>Codex Poké Office</h1></div><div className="session-count"><strong>{snapshot.sessions.length.toLocaleString('ko-KR')}</strong><span>세션 포켓몬<small>사용 중 {snapshot.sessions.filter(s => s.usage === 'active').length} · 사용 안 함 {snapshot.sessions.filter(s => s.usage === 'inactive').length}</small></span></div></div>
      {(changeError || snapshot.error || connection.startsWith('연결 끊김')) && <div role="alert" className="error-banner">{changeError ?? snapshot.error ?? `로컬 서버에 연결할 수 없습니다. ${location.origin} · 자동 재연결 중`}</div>}
      <div className="workspace"><section className="scene-panel" aria-labelledby="habitat-title"><div className="panel-heading"><div className="habitat-tabs"><h2 id="habitat-title">연구 캠프</h2><span className="tiny-badge">{sessions.length}</span></div><label className="scene-options">트레이너 <select className="background-select" aria-label="트레이너 선택" value={trainer} disabled={switching} aria-busy={switching} onChange={event => void changeTrainer(event.target.value as TrainerId)}>{Object.entries(trainers).map(([id, character]) => <option key={id} value={id}>{character.name} · {character.generation}세대</option>)}</select></label></div>
        <ResearchCamp sessions={allSessions} filter={filter} still={still} onSelect={setSelected} trainer={trainer} />
        <div className="scene-footer"><div className="filters">{([['all', '모두'], ['active', '사용 중'], ['inactive', '사용 안 함']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setFilter(value); setSelected(null); }}>{label}</button>)}</div><a href="https://github.com/seo-gali/codex-poke-office#트레이너-출처" target="_blank" rel="noreferrer">도트 출처</a></div></section>
        <SessionDetails session={active} still={still} onClose={() => setSelected(null)} onRelease={setReleaseTarget} trainer={trainer} /></div>
      <footer className="page-footer"><span><i className="status-dot" />기록은 이 컴퓨터에만 머물러요</span><span>{updated ? `${updated.toLocaleTimeString('ko-KR')} 갱신` : '첫 기록을 기다리는 중'}</span></footer>
    </main>
    <ReleaseDialog session={releaseTarget} onClose={() => setReleaseTarget(null)} onReleased={() => setSelected(null)} />
  </>;
}
