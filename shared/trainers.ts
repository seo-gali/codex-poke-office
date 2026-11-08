export const trainers = {
  red: { name: '레드', generation: 1, first: 1, last: 151, walking: 'red.png', backFrames: 5 },
  leaf: { name: '리프', generation: 1, first: 1, last: 151, walking: 'leaf.png', backFrames: 5 },
  brendan: { name: '휘웅', generation: 3, first: 252, last: 386, walking: 'brendan/walking.png', backFrames: 4 },
  may: { name: '봄이', generation: 3, first: 252, last: 386, walking: 'may/walking.png', backFrames: 4 },
} as const;
export type TrainerId = keyof typeof trainers;
