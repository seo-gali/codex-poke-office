import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import { trainers } from '../../../shared/trainers.ts';
import type { TrainerId } from '../../../shared/trainers.ts';
const spriteSheets = new Map<string, Promise<string>>();
function transparentSheet(url: string, portrait?: { columns: number; rows: number; front: boolean }) {
  if (!spriteSheets.has(url)) spriteSheets.set(url, new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d')!;
        context.imageSmoothingEnabled = false;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        // 원본 시트 왼쪽 위의 팔레트 표식 제외
        if (url.endsWith('/hilbert_back.png')) context.clearRect(0, 0, 6, 12);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        // 인덱스 팔레트의 불투명 배경만 복원
        const [red, green, blue, alpha] = pixels.data.subarray((canvas.width - 1) * 4, canvas.width * 4);
        if (alpha !== 0) {
          for (let i = 0; i < pixels.data.length; i += 4) {
            if (pixels.data[i] === red && pixels.data[i + 1] === green && pixels.data[i + 2] === blue) pixels.data[i + 3] = 0;
          }
        }
        context.putImageData(pixels, 0, 0);
        if (portrait) {
          const frame = document.createElement('canvas'); frame.width = frame.height = 64;
          const target = frame.getContext('2d')!; target.imageSmoothingEnabled = false;
          const width = canvas.width / portrait.columns, height = canvas.height / portrait.rows;
          if (portrait.front) {
            const scale = 64 / Math.max(width, height);
            target.drawImage(canvas, 0, 0, width, height, (64 - width * scale) / 2, 64 - height * scale, width * scale, height * scale);
          } else target.drawImage(canvas, 0, 0, width, Math.min(width, height), 0, 0, 64, 64);
          resolve(frame.toDataURL('image/png')); return;
        }
        resolve(canvas.toDataURL('image/png'));
      } catch { reject(new Error('트레이너 이미지를 표시할 수 없습니다.')); }
    };
    image.onerror = () => reject(new Error('트레이너 이미지를 불러올 수 없습니다.'));
    image.src = url;
  }));
  return spriteSheets.get(url)!;
}

export function Trainer({ battle = false, character = 'brendan' }: { battle?: boolean; character?: TrainerId }) {
  const [sheet, setSheet] = useState<{ url: string; source: string | null }>({ url: '', source: null });
  const config = trainers[character];
  const grid = config.source === 'pokengine' && !battle;
  const url = grid ? `https://pokengine.b-cdn.net/play/images/trainers/overworlds/${config.overworld}.webp` : config.source === 'pokengine' ? config.back : `https://raw.githubusercontent.com/pret/pokeemerald/master/graphics/${battle ? `trainers/back_pics/${character}.png` : `object_events/pics/people/${config.walking}`}`;
  useEffect(() => {
    let current = true;
    transparentSheet(url, battle ? { columns: 'backColumns' in config ? config.backColumns : 1, rows: config.backFrames, front: 'front' in config } : undefined).then(source => { if (current) setSheet({ url, source }); }, () => { if (current) setSheet({ url, source: null }); });
    return () => { current = false; };
  }, [url]);
  if (sheet.url === url && sheet.source) return <span className="trainer trainer-art" role="img" aria-label={`내 트레이너 · ${config.name}`}>
    <img src={sheet.source} alt="" referrerPolicy="no-referrer"
      style={(battle ? { width: '100%', height: '100%', left: 0, top: 0 } : { width: grid ? '300%' : '900%', height: grid ? '400%' : '100%', left: 0, top: 0 }) as CSSProperties} />
  </span>;
  const failed = sheet.url === url;
  return <span className={`trainer ${failed ? 'trainer-error' : 'trainer-loading'}`} role={failed ? 'img' : 'status'} aria-label={`${config.name} ${failed ? '이미지를 불러올 수 없습니다' : '불러오는 중'}`} title={failed ? '이미지 로딩 실패 · 새로고침해 주세요' : undefined}>{failed ? '!' : <span className="pokeball" aria-hidden="true" />}</span>;
}
