export const trainers = {
  red: {"name":"레드","generation":1,"first":1,"last":151,"walking":"red.png","source":"emerald"},
  leaf: {"name":"리프","generation":1,"first":1,"last":151,"walking":"leaf.png","source":"emerald"},
  ethan: {"name":"심향","generation":2,"first":152,"last":251,"source":"pokengine","overworld":"01f3plll"},
  kris: {"name":"크리스","generation":2,"first":152,"last":251,"source":"pokengine","overworld":"01xid4wg"},
  brendan: {"name":"휘웅","generation":3,"first":252,"last":386,"walking":"brendan/walking.png","source":"emerald"},
  may: {"name":"봄이","generation":3,"first":252,"last":386,"walking":"may/walking.png","source":"emerald"},
  lucas: {"name":"광휘","generation":4,"first":387,"last":493,"source":"pokengine","overworld":"012pha2i"},
  hilbert: {"name":"투지","generation":5,"first":494,"last":649,"source":"pokengine","overworld":"0133xp9e"},
  hilda: {"name":"투희","generation":5,"first":494,"last":649,"source":"pokengine","overworld":"01uhbo4g"},
  calem: {"name":"칼름","generation":6,"first":650,"last":721,"source":"pokengine","overworld":"01jw8ze2"},
  serena: {"name":"세레나","generation":6,"first":650,"last":721,"source":"pokengine","overworld":"014qszl8"},
  elio: {"name":"영태","generation":7,"first":722,"last":809,"source":"pokengine","overworld":"01qbqk2v"},
  selene: {"name":"미월","generation":7,"first":722,"last":809,"source":"pokengine","overworld":"01fnklmw"},
  victor: {"name":"승재","generation":8,"first":810,"last":905,"source":"pokengine","overworld":"01p5eh81"},
  gloria: {"name":"우리","generation":8,"first":810,"last":905,"source":"pokengine","overworld":"01arym2u"},
} as const;
export type TrainerId = keyof typeof trainers;

// shortcut: 확인한 GIF 목록 고정, 지원 종 확대 시 재확인
export const animatedPokemon = new Set([...Array.from({ length: 649 }, (_, i) => i + 1),
  ...[651,652,653,654,656,658,661,662,663,664,665,666,667,668,669,670,671,672,674,675,679,681,682,684,685,686,687,688,691,692,693,694,696,697,698,700,702,703,704,705,706,707,708,709,712,713,714,715,716,717,718,719,720,721],
  ...[722,725,727,728,729,730,731,732,733,734,735,736,737,738,739,740,742,743,744,745,746,748,749,750,751,752,753,754,755,756,759,760,761,762,764,767,769,770,771,772,773,774,775,776,777,778,779,780,781,782,783,784,785,786,787,789,790,791,792,793,794,795,796,797,798,800,801,802,804,805,806,807,808,809],
  ...[810,811,813,814,816,817,818,821,822,823,824,830,831,832,833,834,835,837,838,839,840,843,844,845,846,847,848,849,852,856,858,859,861,862,863,864,866,867,868,869,870,871,872,873,874,875,876,877,878,880,882,883,884,885,886,887,888,889,890,895,896,898],
]);
export function pokemonCandidates(character: TrainerId) {
  const { first, last } = trainers[character];
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

export function pokemonSprite(id: number, moving = true) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${moving ? animatedPokemon.has(id) ? 'versions/generation-v/black-white/animated/' : 'other/showdown/' : ''}${id}.${moving ? 'gif' : 'png'}`;
}
