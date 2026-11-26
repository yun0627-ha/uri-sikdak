import { useState } from 'react';
import { photosOf, usePhotoPref } from '../lib/photoPref.js';
import PhotoGallery from './PhotoGallery.jsx';

// 종류별 색 타일 + 흰 선 아이콘
const G = {
  main: { bg: '#C96A50', d: <><path d="M4 12h16a8 7 0 0 1-16 0z" /><path d="M7 12a5 4 0 0 1 10 0" /></> },
  soup: { bg: '#D4804F', d: <><path d="M5.5 11h13v4.5a3.5 3.5 0 0 1-3.5 3.5H9a3.5 3.5 0 0 1-3.5-3.5z" /><path d="M3.5 11h17M3.2 13.5h2.3M18.5 13.5h2.3" /><path d="M9.5 8c-.8-.9.8-1.6 0-2.5M14.5 8c-.8-.9.8-1.6 0-2.5" /></> },
  onebowl: { bg: '#D9B266', d: <><path d="M4 12h16a8 7 0 0 1-16 0z" /><path d="M8.5 9c-.8-.9.8-1.6 0-2.5M12 9c-.8-.9.8-1.6 0-2.5M15.5 9c-.8-.9.8-1.6 0-2.5" /></> },
  noodle: { bg: '#D9A35E', d: <><path d="M4 12h16a8 7 0 0 1-16 0z" /><path d="M13 12l6-8M16 12l5-6" /><path d="M7.5 15.5c1.5-1 3 1 4.5 0s3 1 4.5 0" /></> },
  side: { bg: '#93A876', d: <><path d="M6 18c0-7 5-12 13-12 0 8-5 12-13 12z" /><path d="M6 18l7-7" /></> },
  salad: { bg: '#86AE93', d: <><path d="M4 12h16a8 7 0 0 1-16 0z" /><path d="M9 12c-1.5-2.5-.5-5 2-6 1 2.5 0 4.5-2 6zM13 12c.5-2.5 2.5-4 5-3.5-.5 2.2-2.5 3.5-5 3.5z" /></> },
  dessert: { bg: '#D9908A', d: <><path d="M12 20c-3.3 0-5.5-2.2-5.5-5.2 0-3 2.4-4.6 3.4-7.8 1.6 1.2 2 3 1.9 4.2 1-.8 1.6-2 1.6-3.2 2.4 1.8 4.1 4.2 4.1 6.8 0 3-2.2 5.2-5.5 5.2z" /></> },
};

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
  const s = size ? Math.round(size * 0.5) : 40;
  return (
    <span className={`shrink-0 grid place-items-center ${rounded} ${className}`} style={{ ...box, background: g.bg }} aria-hidden="true">
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{g.d}</svg>
    </span>
  );
}
