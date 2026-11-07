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
    blocked: [[0, 0, 39, 60], [65, 0, 35, 20], [66, 26, 34, 42], [35, 86, 65, 14], [0, 80, 12, 20]], spots: points([26, 70], [52, 27], [50, 77], [20, 82], [57, 69], [48, 15], [75, 75], [58, 48]) },
  { id: 'wetland', name: '늪지 에리어', description: '푸른 물가와 진흙길, 깊은 갈대숲', start: { x: 46, y: 69 },
    blocked: [[60, 29, 40, 50], [45, 44, 15, 22], [0, 43, 31, 32], [80, 0, 20, 26], [0, 0, 34, 22], [54, 7, 23, 16]], spots: points([20, 79], [44, 83], [49, 27], [34, 30], [56, 80], [37, 17], [84, 88], [41, 62]) },
  { id: 'desert', name: '사막 에리어', description: '모래 언덕과 바위 너머의 작은 오아시스', start: { x: 50, y: 65 },
    blocked: [[0, 22, 26, 33], [26, 0, 12, 10], [59, 11, 10, 16], [76, 31, 10, 13]], spots: points([34, 76], [78, 66], [45, 24], [22, 70], [80, 85], [68, 45], [18, 14], [56, 58]) },
  { id: 'peak', name: '산봉우리 에리어', description: '돌계단과 바위가 이어진 높은 지대', start: { x: 48, y: 27 },
    blocked: [[0, 50, 28, 50], [45, 46, 55, 54], [23, 6, 21, 23], [45, 0, 55, 20]], spots: points([15, 30], [60, 30], [83, 31], [21, 43], [35, 38], [47, 34], [73, 27], [91, 32]) },
  { id: 'rockybeach', name: '바위 해안 에리어', description: '잔잔한 물결과 해안 절벽의 산책로', start: { x: 48, y: 55 },
    blocked: [[0, 73, 100, 27], [52, 26, 48, 47], [3, 26, 25, 28], [0, 0, 100, 13]], spots: points([30, 58], [44, 28], [80, 21], [9, 21], [43, 62], [62, 20], [36, 42], [91, 21]) },
  { id: 'savannah', name: '사바나 에리어', description: '탁 트인 모래 평원과 드문드문 솟은 바위', start: { x: 48, y: 65 },
    blocked: [[40, 72, 25, 28], [75, 72, 25, 28], [0, 72, 25, 28], [67, 47, 33, 23], [76, 0, 24, 12]], spots: points([22, 28], [73, 23], [66, 58], [47, 52], [32, 67], [60, 40], [15, 49], [70, 38]) },
];
export const mapImage = (map: SafariMap) => `/maps/${map.id}.png`;
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
