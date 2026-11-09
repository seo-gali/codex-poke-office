import { useEffect, useRef, useState } from 'react';
import type { SessionView } from '../../../shared/session.ts';
import { PokemonAgent } from './PokemonAgent.tsx';
import { ActivityBall } from './ActivityBall.tsx';

export const labels = { 'recent-event': '최근 활동 감지', 'turn-complete': '응답 완료 기록', quiet: '새 기록 없음', unknown: '상태 미확인' };
export const usageLabels = { active: '사용 중', inactive: '사용 안 함', unknown: '확인 불가' };
export const time = (value: string | null) => value ? new Date(value).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '확인되지 않음';

export function SessionDetails({ session, still, onClose, onRelease }: { session?: SessionView; still: boolean; onClose: () => void; onRelease: (session: SessionView) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [copyMessage, setCopyMessage] = useState('');
  useEffect(() => { setCopyMessage(''); }, [session?.sessionId]);
  useEffect(() => {
    if (session && !dialog.current!.open) dialog.current!.showModal();
    if (!session) dialog.current!.close();
  }, [session]);
  async function copyId() {
    try { await navigator.clipboard.writeText(session!.sessionId); setCopyMessage('세션 ID를 복사했습니다.'); }
    catch { setCopyMessage('복사하지 못했습니다. 아래 세션 ID를 확인해주세요.'); }
  }
  return <dialog ref={dialog} className="pokedex-dialog" aria-labelledby="dex-title" onCancel={onClose}>
    {session && <>
      <header className="dex-header"><span className="dex-lens" aria-hidden="true" /><span className="dex-lights" aria-hidden="true">● ● ●</span><strong>POKÉDEX</strong><button type="button" onClick={onClose} aria-label="도감 닫기">✕</button></header>
      <div className="dex-body">
        <div className="dex-display"><small>No. {String(session.pokemon.id).padStart(3, '0')}</small><PokemonAgent pokemon={session.pokemon} still={still} /><span>포켓몬 관찰 화면</span></div>
        <section className="dex-entry"><div className="dex-heading"><div><small>POKÉMON DATA</small><h2 id="dex-title">{session.pokemon.name}</h2></div><ActivityBall records={session.activity.records} /></div>
          <div className="dex-types">{session.pokemon.types.length ? session.pokemon.types.map(type => <span key={type}>{type}</span>) : <span>타입 미확인</span>}</div>
          <p className="dex-description">{session.pokemon.description ?? '한국어 도감 설명을 아직 가져오지 못했습니다.'}</p>
          <dl className="dex-stats"><div><dt>누적 활동 기록</dt><dd>{session.activity.records.toLocaleString('ko-KR')}회</dd></div><div><dt>이번 응답 도구</dt><dd>{session.activity.toolCalls.toLocaleString('ko-KR')}회</dd></div><div><dt>파일 사용 여부</dt><dd><i className={`usage-dot ${session.usage}`} /> {usageLabels[session.usage]}</dd></div><div><dt>마지막 활동</dt><dd>{session.activity.label}</dd></div></dl>
          <p className="dex-project">{session.projectName ?? '프로젝트 미확인'} · {session.shortId}<br /><small>{labels[session.observation]}</small></p>
        </section>
        <details className="dex-session" key={session.sessionId}><summary>세션 정보</summary><dl><div><dt>세션 ID</dt><dd className="mono">{session.sessionId}</dd></div><div><dt>마지막 로그 이벤트</dt><dd>{time(session.lastObservedAt)}</dd></div><div><dt>파일 수정 시각</dt><dd>{time(session.lastFileModifiedAt)}</dd></div></dl><button type="button" className="return-button" onClick={copyId}>세션 ID 복사</button><span role="status" className="dex-copy">{copyMessage}</span><p>활동 기록과 파일 사용 여부는 별도 정보입니다. 놓아주기는 확인 후 원본 대화 JSONL을 삭제합니다.</p></details>
      </div>
      <footer className="dex-actions"><button type="button" className="return-button" onClick={onClose}>연구소로 돌아가기</button><button type="button" className="release-button" disabled={session.usage !== 'inactive'} onClick={() => onRelease(session)}>포켓몬 놓아주기 ↗</button></footer>
    </>}
  </dialog>;
}
