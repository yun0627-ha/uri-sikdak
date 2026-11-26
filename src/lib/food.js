import { addDays, fmtAmount, parseAmount, toKey } from './utils.js';

// 재료 이름으로 그림 · 보관 장소 · 대략의 보관 기간(일) 짐작하기
// 위에서부터 먼저 맞는 것을 써요 (예: '냉동 만두'는 냉동, '배추'는 채소)
const FOODS = [
  [/냉동|만두|아이스크림|얼음/, '🧊', 'freezer', null],
  [/새우|오징어|낙지|문어|주꾸미|조개|홍합|꽃게|전복/, '🦐', 'freezer', null],
  [/고등어|연어|생선|삼치|갈치|대구|참치회|명태|동태/, '🐟', 'fridge', 2],
  [/게맛살|어묵|맛살/, '🍢', 'fridge', 7],
  [/소고기|돼지|삼겹|목살|앞다리|닭|고기|갈비|차돌|베이컨|햄|소시지|불고기/, '🥩', 'fridge', 3],
  [/계란|달걀|메추리알/, '🥚', 'fridge', 21],
  [/우유|요거트|요구르트|생크림/, '🥛', 'fridge', 7],
  [/치즈/, '🧀', 'fridge', 21],
  [/버터/, '🧈', 'fridge', 60],
  [/두부/, '🫘', 'fridge', 5],
  [/김치|깍두기|장아찌|피클/, '🫙', 'fridge', null],
  [/양파/, '🧅', 'room', 30],
  [/마늘|생강/, '🧄', 'fridge', 14],
  [/고구마/, '🍠', 'room', 21],
  [/감자/, '🥔', 'room', 30],
  [/당근|무$|^무 /, '🥕', 'fridge', 14],
  [/버섯/, '🍄', 'fridge', 5],
  [/토마토/, '🍅', 'fridge', 7],
  [/고추|피망|파프리카|청양/, '🌶️', 'fridge', 7],
  [/오이|애호박|호박|가지/, '🥒', 'fridge', 7],
  [/대파|쪽파|부추|배추|상추|양배추|시금치|깻잎|콩나물|숙주|채소|야채|브로콜리|미나리|청경채/, '🥬', 'fridge', 7],
  [/사과|배$|귤|딸기|바나나|과일|포도|레몬|라임|복숭아|수박|참외|키위/, '🍎', 'fridge', 10],
  [/빵|식빵|베이글|또띠아/, '🍞', 'room', 4],
  [/쌀|현미|잡곡/, '🍚', 'room', null],
  [/라면|파스타|스파게티|국수|우동|소면|당면|떡/, '🍜', 'room', null],
  [/간장|된장|고추장|쌈장|케첩|마요|소스|드레싱|식초|기름|오일|설탕|소금|후추|가루|맛술|물엿|올리고당|양념|육수|다시다/, '🧂', 'room', null],
  [/주스|콜라|사이다|음료|맥주|와인|소주|탄산수/, '🧃', 'fridge', null],
];

export function guessFood(name) {
  const n = String(name || '').trim();
  const hit = FOODS.find(([re]) => re.test(n));
  return hit ? { emoji: hit[1], place: hit[2], days: hit[3] } : { emoji: '🥫', place: 'fridge', days: null };
}
export const foodEmoji = name => guessFood(name).emoji;
export const guessExpires = (name, place) => {
  const g = guessFood(name);
  return place === 'fridge' && g.place === 'fridge' && g.days ? toKey(addDays(new Date(), g.days)) : null;
};

export const PLACES = [
  { id: 'fridge', label: '냉장', bg: '#E6EEE3' },
  { id: 'freezer', label: '냉동', bg: '#E4ECF2' },
  { id: 'room', label: '실온', bg: '#F6EED9' },
];
export const placeOf = id => PLACES.find(p => p.id === id) || PLACES[0];

// "2개" + "1개" → "3개", 단위가 다르면 "2개 + 300g"
export function mergeAmount(a, b) {
  if (!a) return b || '';
  if (!b) return a;
  const re = /^([\d./]+)\s*(.*)$/;
  const x = String(a).match(re), y = String(b).match(re);
  if (x && y && x[2].trim() === y[2].trim()) {
    const p = parseAmount(x[1]), q = parseAmount(y[1]);
    if (p != null && q != null) return `${fmtAmount(p + q)}${x[2].trim()}`;
  }
  return `${a} + ${b}`.slice(0, 30);
}

// 유통기한 표시: 3일 이내만 색으로 강조
export function dday(expires, today = new Date()) {
  if (!expires) return null;
  const [y, m, d] = expires.split('-').map(Number);
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const n = Math.round((new Date(y, m - 1, d) - t0) / 86400000);
  if (n < 0) return { n, label: '지남', tone: 'r' };
  if (n === 0) return { n, label: '오늘까지', tone: 'r' };
  if (n <= 1) return { n, label: 'D-1', tone: 'r' };
  if (n <= 3) return { n, label: `D-${n}`, tone: 'y' };
  return { n, label: '여유', tone: 'g' };
}
