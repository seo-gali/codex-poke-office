import { useEffect, useRef, useState } from 'react';
import type { SessionView } from '../../../shared/session.ts';

export function ReleaseDialog({ session, onClose, onReleased }: { session: SessionView | null; onClose: () => void; onReleased: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setError(null);
    if (session) dialog.current!.showModal(); else dialog.current!.close();
  }, [session]);
  async function release() {
    if (!session || busy) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/sessions/${session.sessionId}`, { method: 'DELETE', headers: { 'X-Confirm-Session': session.sessionId } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? '놓아주기에 실패했습니다. 다시 확인해주세요.');
      onReleased(); onClose();
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="release-dialog" aria-labelledby="release-title" onCancel={event => { if (busy) event.preventDefault(); else onClose(); }}>
    <h2 id="release-title">정말 놓아줄까요?</h2><p><strong>{session?.pokemon.name}</strong> · {session?.projectName}<br /><span className="mono">{session?.shortId}</span></p>
    <p>이 세션의 원본 대화 JSONL을 영구 삭제합니다. 삭제한 기록으로는 대화를 이어갈 수 없습니다.</p><p className="hint">Codex 목록의 색인 정보는 남을 수 있습니다. 사용 중인 기록은 삭제하지 않습니다.</p>
    {error && <p role="alert" className="error-banner">{error}</p>}
    <div className="dialog-actions"><button type="button" disabled={busy} onClick={onClose}>곁에 두기</button><button type="button" className="release-button" disabled={busy} onClick={release}>{busy ? '기록을 확인하는 중…' : '기록 삭제하고 놓아주기'}</button></div>
  </dialog>;
}
