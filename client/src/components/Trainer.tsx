import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

export function Trainer({ direction = 'down', walking = false, battle = false }: { direction?: string; walking?: boolean; battle?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!walking) return;
    const timer = setInterval(() => setStep(value => 1 - value), 160);
    return () => clearInterval(timer);
  }, [walking]);
  const facing = direction === 'up' ? 1 : direction === 'left' || direction === 'right' ? 2 : 0;
  const frame = walking ? [3, 5, 7][facing] + step : facing;
  if (!failed) return <span className={`trainer trainer-art ${walking ? 'walking' : ''}`} role="img" aria-label="내 트레이너" style={{ transform: direction === 'right' ? 'scaleX(-1)' : undefined }}>
    <img src={`https://raw.githubusercontent.com/pret/pokeemerald/master/graphics/${battle ? 'trainers/back_pics/brendan.png' : 'object_events/pics/people/brendan/walking.png'}`} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)}
      style={(battle ? { width: '100%', height: '400%', left: 0, top: 0 } : { width: '900%', height: '100%', left: `${-frame * 100}%`, top: 0 }) as CSSProperties} />
  </span>;
  const back = direction === 'up';
  return <svg className={`trainer ${walking ? 'walking' : ''}`} viewBox="0 0 16 24" shapeRendering="crispEdges" aria-label="내 트레이너" role="img" style={{ transform: direction === 'left' ? 'scaleX(-1)' : undefined }}>
    <ellipse cx="8" cy="23" rx="6" ry="1" fill="#20342d88" />
    <path d="M4 18h3v5H3v-2h1zm5 0h3v3h1v2H9z" fill="#293345" />
    <path d="M4 11h8v8H4z" fill="#448ab2" /><path d="M2 12h2v6H2zm10 0h2v6h-2z" fill="#ecc6a1" />
    <path d="M5 3h6v2h2v6h-2v2H5v-2H3V5h2z" fill={back ? '#675046' : '#ecc6a1'} />
    <path d="M4 1h8v2h2v4H2V3h2z" fill="#3f5f91" /><path d="M3 3h9v2H3z" fill="#7db5c0" /><path d="M7 1h3v2H7z" fill="#efdbab" />
    {back ? <path d="M5 12h6v7H5zM4 14h8v4H4z" fill="#c17e52" /> : <><path d="M4 7h8v2H4z" fill="#675046" /><path d="M5 9h1v1H5zm5 0h1v1h-1z" fill="#252b39" /><path d="M6 13h4v5H6z" fill="#dce6dd" /></>}
  </svg>;
}
