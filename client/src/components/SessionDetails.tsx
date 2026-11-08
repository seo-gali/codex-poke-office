import { useEffect, useRef, useState } from 'react';
import type { SessionView } from '../../../shared/session.ts';
import { labels, usageLabels } from './HabitatScene.tsx';
import { PokemonAgent } from './PokemonAgent.tsx';
import { Trainer } from './Trainer.tsx';
import type { TrainerId } from '../../../shared/trainers.ts';
import type { SafariMap } from './safari.ts';

export const time = (value: string | null) => value ? new Date(value).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '확인되지 않음';
export function SessionDetails({ session, map, still, onClose, onRelease, trainer }: { session?: SessionView; map: SafariMap; still: boolean; onClose: () => void; onRelease: (session: SessionView) => void; trainer: TrainerId }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [panel, setPanel] = useState<'info' | 'dex' | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  useEffect(() => { setPanel(null); setCopyMessage(''); }, [session?.sessionId]);
  useEffect(() => {
    if (session && !dialog.current!.open) dialog.current!.showModal();
    if (!session) dialog.current!.close();
  }, [session]);
  async function copyId() {
    try { await navigator.clipboard.writeText(session!.sessionId); setCopyMessage('세션 ID를 복사했습니다.'); }
    catch { setCopyMessage('복사하지 못했습니다. 정보 보기에서 ID를 확인해주세요.'); }
  }
  const battlefield = ({ desert: 'desert', rockybeach: 'beach', wetland: 'river', peak: 'mountain', savannah: 'meadow' } as Record<string, string>)[map.id] ?? 'forest';
  return <dialog ref={dialog} className="encounter-dialog" aria-labelledby="encounter-title" onCancel={onClose}>
    {session && <>
      <div className="encounter-scene">
        <img className="battle-background" src={`https://play.pokemonshowdown.com/fx/bg-${battlefield}.png`} alt="" referrerPolicy="no-referrer" />
        <div className="encounter-card"><h2 id="encounter-title">{session.pokemon.name}</h2><span className={`usage-badge ${session.usage}`}>{usageLabels[session.usage] ?? '확인 불가'}</span><p>{session.projectName ?? '프로젝트 미확인'}</p></div>
        <div className="encounter-pokemon"><PokemonAgent pokemon={session.pokemon} still={still} /></div>
        <div className="encounter-trainer"><Trainer direction="up" battle character={trainer} /></div>
        <span className="encounter-area">{map.name}</span>
      </div>
      <div className="encounter-menu"><p>야생의 <strong>{session.pokemon.name}</strong> 세션을 만났다!<br /><small>{labels[session.observation]}</small></p><div className="encounter-actions">
        <button type="button" className="return-button" onClick={onClose}>탐험으로 돌아가기</button>
        <button type="button" className="return-button" id="encounter-info-toggle" aria-expanded={panel === 'info'} aria-controls="encounter-info" onClick={() => setPanel(panel === 'info' ? null : 'info')}>정보 보기</button>
        <button type="button" className="return-button" id="encounter-dex-toggle" aria-expanded={panel === 'dex'} aria-controls="encounter-dex" onClick={() => setPanel(panel === 'dex' ? null : 'dex')}>도감 보기</button>
        <button type="button" className="release-button" disabled={session.usage !== 'inactive'} onClick={() => onRelease(session)}>포켓몬 놓아주기 ↗</button>
      </div>
        {panel === 'info' && <section className="encounter-info" id="encounter-info" aria-labelledby="encounter-info-toggle"><dl className="encounter-metadata"><div><dt>프로젝트</dt><dd>{session.projectName ?? '확인되지 않음'}</dd></div><div><dt>세션 ID</dt><dd className="mono">{session.sessionId}</dd></div><div><dt>마지막 로그 이벤트</dt><dd>{time(session.lastObservedAt)}</dd></div><div><dt>파일 수정 시각</dt><dd>{time(session.lastFileModifiedAt)}</dd></div></dl>
          <div className="info-copy"><button type="button" className="return-button" onClick={copyId}>세션 ID 복사</button><span className="copy-message" role="status">{copyMessage}</span></div>
          <p className="encounter-note">{session.usage === 'active' ? 'Codex가 이 기록을 열고 있어 놓아줄 수 없습니다.' : session.usage === 'inactive' ? '놓아주기는 확인 후 원본 대화 JSONL을 영구 삭제합니다.' : '사용 여부를 확인할 수 없어 놓아주기가 제한됩니다.'} 활동·완료 기록은 프로세스의 현재 상태를 뜻하지 않습니다.</p>
        </section>}
        {panel === 'dex' && <section className="pokedex-panel" id="encounter-dex" aria-labelledby="encounter-dex-toggle"><PokemonAgent pokemon={session.pokemon} still={still} /><div><small>도감 No. {String(session.pokemon.id).padStart(3, '0')}</small><h3>{session.pokemon.name}</h3><p className="pokemon-types">{session.pokemon.types.length ? session.pokemon.types.join(' · ') : '타입 정보가 없습니다.'}</p><p>{session.pokemon.description ?? '한국어 도감 설명이 없습니다.'}</p></div></section>}
      </div>
    </>}
  </dialog>;
}
