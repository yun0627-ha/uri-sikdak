import { useState } from 'react';
import { Icon, I } from './ui.jsx';

// 레시피 상세 사진: 평소엔 접어 두고, 펼치면 자르지 않고 전부 보이게 (여러 장이면 옆으로 넘기기, 누르면 크게)
export default function PhotoGallery({ photos }) {
  const [idx, setIdx] = useState(0);
  const [big, setBig] = useState(null);
  const [open, setOpen] = useState(false);
  if (!photos.length) return null;
  const toggle = (
    <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
      className="w-full h-10 mb-2 flex items-center justify-center gap-1.5 rounded-full border border-line bg-white text-[13px] text-muted hover:text-ink">
      <Icon d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5zM4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 17.5M15.5 8.5h.01" size={15} />
      {open ? '사진 접기' : `사진 ${photos.length}장 보기`}
      <Icon d={I.down} size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  );
  if (!open) return <div className="mb-3">{toggle}</div>;
  return (
    <div className="relative mb-3">
      {toggle}
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
          <span className="absolute top-[3.25rem] right-3 h-6 px-2 rounded-full bg-black/45 text-white text-[12px] grid place-items-center tabular-nums">{idx + 1}/{photos.length}</span>
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
