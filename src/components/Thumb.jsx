import { useState } from 'react';
import { photosOf, usePhotoPref } from '../lib/photoPref.js';
import PhotoGallery from './PhotoGallery.jsx';

// 연한 색 칸 + 같은 계열 진한 선 아이콘 (base 색에서 자동으로 만들어요)
const mix = (hex, to, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t) + to * t).toString(16).padStart(2, '0')).join('');
const tone = hex => ({ bg: mix(hex, 255, 0.8), fg: mix(hex, 0, 0.1) });
function Tile({ base, size, rounded, className, children }) {
  const { bg, fg } = tone(base);
  const box = size ? { width: size, height: size } : {};
  const s = size ? Math.round(size * 0.52) : 40;
  return (
    <span className={`shrink-0 grid place-items-center ${rounded} ${className}`} style={{ ...box, background: bg }} aria-hidden="true">
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
    </span>
  );
}

// 종류별 아이콘
const G = {
  main: { bg: '#C96A50', d: <><path d="M4 12h16a8 7 0 0 1-16 0z" /><path d="M7 12a5 4 0 0 1 10 0" /></> },
  soup: { bg: '#D4804F', d: <><path d="M5.5 11h13v4.5a3.5 3.5 0 0 1-3.5 3.5H9a3.5 3.5 0 0 1-3.5-3.5z" /><path d="M3.5 11h17M3.2 13.5h2.3M18.5 13.5h2.3" /><path d="M9.5 8c-.8-.9.8-1.6 0-2.5M14.5 8c-.8-.9.8-1.6 0-2.5" /></> },
  onebowl: { bg: '#D9B266', d: <><path d="M4 12h16a8 7 0 0 1-16 0z" /><path d="M8.5 9c-.8-.9.8-1.6 0-2.5M12 9c-.8-.9.8-1.6 0-2.5M15.5 9c-.8-.9.8-1.6 0-2.5" /></> },
  noodle: { bg: '#D9A35E', d: <><path d="M4 12h16a8 7 0 0 1-16 0z" /><path d="M13 12l6-8M16 12l5-6" /><path d="M7.5 15.5c1.5-1 3 1 4.5 0s3 1 4.5 0" /></> },
  side: { bg: '#93A876', d: <><path d="M6 18c0-7 5-12 13-12 0 8-5 12-13 12z" /><path d="M6 18l7-7" /></> },
  salad: { bg: '#86AE93', d: <><path d="M4 12h16a8 7 0 0 1-16 0z" /><path d="M9 12c-1.5-2.5-.5-5 2-6 1 2.5 0 4.5-2 6zM13 12c.5-2.5 2.5-4 5-3.5-.5 2.2-2.5 3.5-5 3.5z" /></> },
  dessert: { bg: '#D9908A', d: <><path d="M12 20c-3.3 0-5.5-2.2-5.5-5.2 0-3 2.4-4.6 3.4-7.8 1.6 1.2 2 3 1.9 4.2 1-.8 1.6-2 1.6-3.2 2.4 1.8 4.1 4.2 4.1 6.8 0 3-2.2 5.2-5.5 5.2z" /></> },
};

// 레시피 없이 직접 적은 일정 (장보기 · 약속 등): 카테고리 이름과 제목으로 아이콘 고르기
const E = [
  [/장보기|장 보기|마트|시장|쇼핑|코스트코/, '#7FA3B5', <><path d="M3.5 5h2.2l2 9.5h9.8l1.9-7H7" /><circle cx="9.5" cy="18.5" r="1.3" /><circle cx="16" cy="18.5" r="1.3" /></>],
  [/생일|케이크|기념일|파티/, '#D9908A', <><path d="M5 12h14v7H5z" /><path d="M5 15.5c1.2 1 2.3 1 3.5 0s2.3-1 3.5 0 2.3 1 3.5 0 2.3-1 3.5 0" /><path d="M12 12V9M12 6.8c-.8-.8 0-1.6 0-2.3" /></>],
  [/여행|캠핑|휴가/, '#86AE93', <><rect x="4.5" y="8" width="15" height="11" rx="2" /><path d="M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M9 11.5v4M15 11.5v4" /></>],
  [/배달|치킨|피자|포장/, '#D9A35E', <><path d="M4 9h16l-1.5 10h-13z" /><path d="M8 9a4 4 0 0 1 8 0" /></>],
  [/외식|약속|모임|만남|회식|손님/, '#A98DB5', <><path d="M8 4v6a2 2 0 0 1-4 0V4M6 10v10" /><path d="M17 20V4c-2 1-3 3.5-3 6.5V13h3" /></>],
];
const MEAL_ICON = ['#97B594', <><path d="M4 12h16a8 7 0 0 1-16 0z" /><path d="M9 5l2.5 5M15 5l-2.5 5" /></>];
const ETC_ICON = ['#8C9AA6', <><rect x="4" y="5.5" width="16" height="14" rx="2.5" /><path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5" /></>];
export function EventThumb({ cat, title = '', size = 44, rounded = 'rounded-[10px]', className = '' }) {
  const text = `${cat?.label || ''} ${title}`;
  const hit = E.find(([re]) => re.test(text));
  const [bg, d] = hit ? [hit[1], hit[2]] : cat?.grp === 'meal' ? MEAL_ICON : ETC_ICON;
  return <Tile base={bg} size={size} rounded={rounded} className={className}>{d}</Tile>;
}

// 목록·달력용 작은 그림. photo 를 켜거나, 설정에서 '사진으로 보기'를 켜면 메뉴 사진
export default function Thumb({ dish, size = 44, className = '', rounded = 'rounded-[10px]', photo = false }) {
  // size 0 + photo: 레시피 상세 화면의 큰 사진 (여러 장이면 넘겨 보기)
  if (photo && size === 0) return <PhotoGallery key={dish?.id} photos={photosOf(dish)} />;
  return <SmallThumb dish={dish} size={size} className={className} rounded={rounded} photo={photo} />;
}

function SmallThumb({ dish, size, className, rounded, photo }) {
  const pref = usePhotoPref();
  const [broken, setBroken] = useState(false);
  const box = size ? { width: size, height: size } : undefined;
  const src = photosOf(dish)[0];
  if ((photo || pref) && src && !broken) {
    return <img src={src} alt="" loading="lazy" draggable="false" onError={() => setBroken(true)}
      className={`shrink-0 object-cover bg-[#EEF0EB] ${rounded} ${className}`} style={box} />;
  }
  const g = G[dish?.type] || G.main;
  return <Tile base={g.bg} size={size} rounded={rounded} className={className}>{g.d}</Tile>;
}
