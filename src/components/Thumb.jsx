import { useState } from 'react';
import { rtype } from '../lib/constants.js';
import { Icon, I } from './ui.jsx';

// 메뉴 사진. 사진이 없으면 메뉴 종류 색으로 된 네모에 냄비 아이콘
export default function Thumb({ dish, size = 44, className = '', rounded = 'rounded-[10px]' }) {
  const [broken, setBroken] = useState(false);
  const c = rtype(dish?.type);
  const box = size ? { width: size, height: size } : undefined;
  if (dish?.photo && !broken) {
    return <img src={dish.photo} alt="" loading="lazy" draggable="false" onError={() => setBroken(true)}
      className={`shrink-0 object-cover bg-[#EEF0EB] ${rounded} ${className}`} style={box} />;
  }
  return (
    <span className={`shrink-0 grid place-items-center ${rounded} ${className}`} style={{ ...box, background: c.bg, color: c.fg }} aria-hidden="true">
      <Icon d={I.chef} size={size ? Math.round(size * 0.42) : 28} />
    </span>
  );
}
