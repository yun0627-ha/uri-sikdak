import { useState } from 'react';
import { Icon, I } from './ui.jsx';

// 레시피 상세 사진: 자르지 않고 전부 보이게, 여러 장이면 옆으로 넘기기. 누르면 크게
export default function PhotoGallery({ photos }) {
  const [idx, setIdx] = useState(0);
  const [big, setBig] = useState(null);
  if (!photos.length) return null;
  return (
    <div className="relative mb-3">
      <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-[24px] border border-line bg-[#F1F2EE]"
        onScroll={e => { const el = e.currentTarget; setIdx(Math.round(el.scrollLeft / el.clientWidth)); }}>
        {photos.map((p, i) => (
          <button key={p + i} type="button" onClick={() => setBig(p)} className="shrink-0 w-full snap-center grid place-items-center" aria-label={`사진 ${i + 1} 크게 보기`}>
            <img src={p} alt="" loading={i ? 'lazy' : 'eager'} draggable="false" className="block w-full h-auto max-h-[78vh] object-contain" />
          </button>
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <span className="absolute top-2.5 right-3 h-6 px-2 rounded-full bg-black/45 text-white text-[12px] grid place-items-center tabular-nums">{idx + 1}/{photos.length}</span>
          <div className="mt-2 flex justify-center gap-1">{photos.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-4 bg-sage' : 'w-1.5 bg-[#D5DAD2]'}`} />)}</div>
        </>
      )}
      {big && (
        <div className="fixed inset-0 z-[60] bg-black/90 grid place-items-center" role="dialog" aria-modal="true" onClick={() => setBig(null)}>
          <img src={big} alt="" className="max-w-full max-h-full object-contain" />
          <button type="button" aria-label="닫기" className="absolute top-3 right-3 h-10 w-10 grid place-items-center rounded-full bg-white/15 text-white"><Icon d={I.x} size={20} /></button>
        </div>
      )}
    </div>
  );
}
