export const trainers = {
  red: {"name":"레드","generation":1,"first":1,"last":151,"walking":"red.png","backFrames":5,"source":"emerald"},
  leaf: {"name":"리프","generation":1,"first":1,"last":151,"walking":"leaf.png","backFrames":5,"source":"emerald"},
  ethan: {"name":"심향","generation":2,"first":152,"last":251,"walking":"gold","backFrames":1,"source":"wilds"},
  kris: {"name":"크리스","generation":2,"first":152,"last":251,"walking":"kris","backFrames":1,"source":"wilds"},
  brendan: {"name":"휘웅","generation":3,"first":252,"last":386,"walking":"brendan/walking.png","backFrames":4,"source":"emerald"},
  may: {"name":"봄이","generation":3,"first":252,"last":386,"walking":"may/walking.png","backFrames":4,"source":"emerald"},
  lucas: {"name":"광휘","generation":4,"first":387,"last":493,"walking":"lucas","backFrames":1,"source":"wilds"},
  hilbert: {"name":"투지","generation":5,"first":494,"last":649,"walking":"hilbert","backFrames":1,"source":"wilds"},
  hilda: {"name":"투희","generation":5,"first":494,"last":649,"walking":"hilda","backFrames":1,"source":"wilds"},
  calem: {"name":"칼름","generation":6,"first":650,"last":721,"walking":"calem","backFrames":1,"source":"wilds"},
  serena: {"name":"세레나","generation":6,"first":650,"last":721,"walking":"serena","backFrames":1,"source":"wilds"},
  victor: {"name":"승재","generation":8,"first":810,"last":898,"walking":"victor","backFrames":1,"source":"wilds"},
  gloria: {"name":"우리","generation":8,"first":810,"last":898,"walking":"gloria","backFrames":1,"source":"wilds"},
} as const;
export type TrainerId = keyof typeof trainers;

// shortcut: 확인한 GIF 목록 고정, 지원 종 확대 시 재확인
export const animatedPokemon = new Set([...Array.from({ length: 649 }, (_, i) => i + 1),
  ...[651,652,653,654,656,658,661,662,663,664,665,666,667,668,669,670,671,672,674,675,679,681,682,684,685,686,687,688,691,692,693,694,696,697,698,700,702,703,704,705,706,707,708,709,712,713,714,715,716,717,718,719,720,721],
  ...[810,811,813,814,816,817,818,821,822,823,824,830,831,832,833,834,835,837,838,839,840,843,844,845,846,847,848,849,852,856,858,859,861,862,863,864,866,867,868,869,870,871,872,873,874,875,876,877,878,880,882,883,884,885,886,887,888,889,890,895,896,898],
]);
export function pokemonCandidates(character: TrainerId) {
  const { first, last } = trainers[character];
  return [...animatedPokemon].filter(id => id >= first && id <= last);
}
