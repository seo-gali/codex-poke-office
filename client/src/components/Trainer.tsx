import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import { trainers } from '../../../shared/trainers.ts';
import type { TrainerId } from '../../../shared/trainers.ts';
const spriteSheets = new Map<string, Promise<string>>();
function transparentSheet(url: string) {
  if (!spriteSheets.has(url)) spriteSheets.set(url, new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        // 인덱스 팔레트의 불투명 배경만 복원
        const [red, green, blue, alpha] = pixels.data;
        if (alpha !== 0) {
          for (let i = 0; i < pixels.data.length; i += 4) {
            if (pixels.data[i] === red && pixels.data[i + 1] === green && pixels.data[i + 2] === blue) pixels.data[i + 3] = 0;
          }
        }
        context.putImageData(pixels, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch { reject(new Error('트레이너 이미지를 표시할 수 없습니다.')); }
    };
    image.onerror = () => reject(new Error('트레이너 이미지를 불러올 수 없습니다.'));
    image.src = url;
  }));
  return spriteSheets.get(url)!;
}

export function Trainer({ direction = 'down', walking = false, battle = false, character = 'brendan' }: { direction?: string; walking?: boolean; battle?: boolean; character?: TrainerId }) {
  const [sheet, setSheet] = useState<{ url: string; source: string | null }>({ url: '', source: null });
  const [step, setStep] = useState(0);
  const config = trainers[character];
  const wilds = config.source === 'wilds';
  const url = wilds ? `https://raw.githubusercontent.com/SheerSt/pokewilds/main/player/${config.walking}-${battle ? 'back' : 'walking'}.png` : `https://raw.githubusercontent.com/pret/pokeemerald/master/graphics/${battle ? `trainers/back_pics/${character}.png` : `object_events/pics/people/${config.walking}`}`;
  useEffect(() => {
    let current = true;
    transparentSheet(url).then(source => { if (current) setSheet({ url, source }); }, () => { if (current) setSheet({ url, source: null }); });
    return () => { current = false; };
  }, [url]);
  useEffect(() => {
    if (!walking) return;
    const timer = setInterval(() => setStep(value => 1 - value), 160);
    return () => clearInterval(timer);
  }, [walking]);
  const facing = direction === 'up' ? 1 : direction === 'left' ? (wilds ? 3 : 2) : direction === 'right' ? 2 : 0;
  const frame = wilds ? facing + (walking ? step * 4 : 0) : walking ? [3, 5, 7][facing] + step : facing;
  if (sheet.url === url && sheet.source) return <span className={`trainer trainer-art ${walking ? 'walking' : ''}`} role="img" aria-label={`내 트레이너 · ${config.name}`} style={{ transform: !wilds && direction === 'right' ? 'scaleX(-1)' : undefined }}>
    <img src={sheet.source} alt="" referrerPolicy="no-referrer"
      style={(battle ? { width: '100%', height: `${config.backFrames * 100}%`, left: 0, top: 0 } : { width: wilds ? '800%' : '900%', height: '100%', left: `${-frame * 100}%`, top: 0 }) as CSSProperties} />
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
