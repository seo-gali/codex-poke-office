import type { SessionView } from '../../../shared/session.ts';

export type Point = { x: number; y: number };
type Rect = readonly [number, number, number, number];
export interface SafariMap {
  id: string;
  name: string;
  description: string;
  start: Point;
  blocked: Rect[];
  spots: Point[];
}
const points = (...pairs: [number, number][]) => pairs.map(([x, y]) => ({ x, y }));
export const safariMaps: SafariMap[] = [
  { id: 'forest', name: '숲 에리어', description: '나무 그늘 사이로 이어지는 수풀길', start: { x: 50, y: 68 },
    blocked: [[0, 0, 39, 60], [66, 26, 34, 37], [35, 86, 65, 14]], spots: points([26, 70], [52, 27], [79, 16], [50, 77], [20, 82], [57, 69], [48, 15], [75, 75]) },
  { id: 'wetland', name: '늪지 에리어', description: '푸른 물가와 진흙길, 깊은 갈대숲', start: { x: 46, y: 69 },
    blocked: [[60, 29, 40, 47], [0, 43, 31, 27], [80, 0, 20, 26]], spots: points([20, 79], [44, 83], [68, 15], [49, 27], [34, 30], [56, 80], [14, 18], [84, 88]) },
  { id: 'desert', name: '사막 에리어', description: '모래 언덕과 바위 너머의 작은 오아시스', start: { x: 50, y: 65 },
    blocked: [[0, 22, 26, 33], [26, 0, 12, 10], [59, 11, 10, 16], [76, 31, 10, 13]], spots: points([34, 76], [78, 66], [45, 24], [22, 70], [80, 85], [68, 45], [18, 14], [56, 58]) },
  { id: 'peak', name: '산봉우리 에리어', description: '돌계단과 바위가 이어진 높은 지대', start: { x: 48, y: 27 },
    blocked: [[0, 56, 28, 44], [29, 39, 71, 61], [30, 6, 14, 18], [52, 0, 33, 15]], spots: points([15, 30], [60, 25], [83, 31], [21, 15], [23, 43], [47, 34], [73, 27], [91, 21]) },
  { id: 'rockybeach', name: '바위 해안 에리어', description: '잔잔한 물결과 해안 절벽의 산책로', start: { x: 48, y: 55 },
    blocked: [[0, 71, 100, 29], [60, 28, 40, 42], [9, 26, 20, 23], [0, 0, 100, 13]], spots: points([30, 58], [49, 28], [80, 21], [9, 21], [43, 62], [62, 21], [36, 42], [91, 21]) },
  { id: 'savannah', name: '사바나 에리어', description: '탁 트인 모래 평원과 드문드문 솟은 바위', start: { x: 48, y: 65 },
    blocked: [[40, 79, 20, 21], [0, 72, 25, 28], [67, 47, 33, 23], [76, 0, 24, 12]], spots: points([22, 28], [73, 23], [82, 79], [47, 52], [32, 67], [62, 77], [15, 49], [88, 40]) },
];
export const mapImage = (map: SafariMap) => `https://www.serebii.net/pokearth/maps/johto-hgss/60-${map.id}.png`;
export const mapFor = (session: SessionView) => parseInt(session.sessionId.slice(-8), 16) % safariMaps.length;
export function walkable(map: SafariMap, point: Point) {
  // shortcut: 스크린샷 지형의 사각형 충돌, 정밀한 지형 이동이 필요할 때 타일 충돌로 교체
  return point.x >= 4 && point.x <= 96 && point.y >= 8 && point.y <= 92 && !map.blocked.some(([x, y, width, height]) => point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height);
}
export const distance = (a: Point, b: Point) => Math.hypot((a.x - b.x) * 4 / 3, a.y - b.y);
export function symbols(sessions: SessionView[], map: SafariMap) {
  const index = safariMaps.indexOf(map);
  const reserved: Point[] = [];
  return sessions.filter(s => mapFor(s) === index).map(session => {
    const candidates = [...map.spots];
    for (let y = 15; y <= 85; y += 14) for (let x = 12; x <= 90; x += 16) candidates.push({ x, y });
    const point = candidates.find(p => walkable(map, p) && reserved.every(other => distance(other, p) > 12));
    if (!point) return { session, point: map.start };
    reserved.push(point);
    return { session, point };
  });
}
