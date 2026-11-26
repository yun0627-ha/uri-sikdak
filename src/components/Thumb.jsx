import { useState } from 'react';

// 목록·달력용 작은 그림: 앱 아이콘(김 나는 냄비)으로 통일.
// photo 를 켜면 메뉴 사진을 보여줘요 (레시피 편집 · 상세 화면에서만)
export default function Thumb({ dish, size = 44, className = '', rounded = 'rounded-[10px]', photo = false }) {
  const [broken, setBroken] = useState(false);
  const box = size ? { width: size, height: size } : undefined;
  if (photo && dish?.photo && !broken) {
    return <img src={dish.photo} alt="" loading="lazy" draggable="false" onError={() => setBroken(true)}
      className={`shrink-0 object-cover bg-[#EEF0EB] ${rounded} ${className}`} style={box} />;
  }
  const s = size ? Math.round(size * 0.62) : 40;
  return (
    <span className={`shrink-0 grid place-items-center bg-sage-faint ${rounded} ${className}`} style={box} aria-hidden="true">
      <svg width={s} height={s} viewBox="0 0 40 40"><g transform="translate(0 1.5)" stroke="#97B594" strokeLinecap="round" fill="none"><path d="M10 17h20v6a6 6 0 0 1-6 6h-8a6 6 0 0 1-6-6z" fill="#97B594" stroke="none" /><path d="M7.5 17h25" strokeWidth="2.6" /><path d="M8.5 20.6h-2.2M31.5 20.6h2.2" strokeWidth="2.4" /><path d="M15.5 13c-1.3-1.5 1.3-2.7 0-4.2M20 12.4c-1.3-1.5 1.3-2.7 0-4.2M24.5 13c-1.3-1.5 1.3-2.7 0-4.2" strokeWidth="1.8" /></g></svg>
    </span>
  );
}
