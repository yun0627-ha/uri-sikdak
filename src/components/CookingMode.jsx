import { useEffect, useState } from 'react';
import { cls, Icon, I } from './ui.jsx';
import { scaleAmount } from '../lib/utils.js';

// 요리 모드: 큰 글씨로 한 단계씩 (화면 꺼짐 방지 시도)
export default function CookingMode({ dish, servings, hideBasic, isBasic, onClose }) {
  const [i, setI] = useState(0);
  const [showIng, setShowIng] = useState(false);
  const n = dish.steps.length;
  useEffect(() => {
    const h = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI(x => Math.min(n - 1, x + 1));
      if (e.key === 'ArrowLeft') setI(x => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', h);
    let lock = null;
    navigator.wakeLock?.request('screen').then(l => { lock = l; }).catch(() => {});
    return () => { window.removeEventListener('keydown', h); lock?.release?.().catch(() => {}); };
  }, [n, onClose]);
  const ratio = servings / dish.servings;
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" role="dialog" aria-modal="true" aria-label="요리 모드">
      <div className="flex items-center justify-between gap-3 px-5 sm:px-8 h-16 border-b border-line">
        <div className="min-w-0"><p className="text-[13px] text-sage">요리 모드 · {servings}인분</p><h2 className="text-lg font-semibold truncate">{dish.title}</h2></div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowIng(s => !s)} className={cls.ghost + ' lg:hidden'}>{showIng ? '순서 보기' : '재료 보기'}</button>
          <button type="button" onClick={onClose} className={cls.ghost}>닫기</button>
        </div>
      </div>
      <div className="flex-1 grid lg:grid-cols-[360px_minmax(0,1fr)] overflow-hidden">
        <div className={`${showIng ? 'block' : 'hidden'} lg:block border-r border-line bg-canvas/50 overflow-y-auto px-6 sm:px-8 py-6`}>
          <h3 className="text-sm font-semibold text-muted mb-2">재료</h3>
          <ul>
            {dish.ingredients.filter(x => !(hideBasic && isBasic(x.name))).map((x, k) => (
              <li key={k} className="flex items-baseline justify-between gap-3 py-3 text-xl border-b border-line last:border-0">
                <span className="text-ink">{x.name}</span><span className="tabular-nums text-[#5A6259] whitespace-nowrap">{[scaleAmount(x.amount, ratio), x.unit].filter(Boolean).join(' ')}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={`${showIng ? 'hidden' : 'flex'} lg:flex flex-col overflow-y-auto px-6 sm:px-12 py-8`}>
          {n ? (
            <>
              <div className="flex gap-1.5 mb-8">
                {dish.steps.map((_, k) => <button key={k} type="button" aria-label={`${k + 1}단계로`} onClick={() => setI(k)} className={`h-1.5 flex-1 rounded-full ${k <= i ? 'bg-sage' : 'bg-line'}`} />)}
              </div>
              <p className="text-base font-medium text-sage tabular-nums">{i + 1} / {n} 단계</p>
              <p key={i} className="fade-in mt-4 text-[28px] sm:text-[40px] leading-[1.45] font-medium text-ink max-w-[24em]">{dish.steps[i]}</p>
              <div className="mt-auto pt-10 flex gap-3">
                <button type="button" disabled={i === 0} onClick={() => setI(i - 1)} className={cls.ghost + ' h-14 px-6 text-base flex-1 sm:flex-none'}><Icon d={I.left} />이전</button>
                {i < n - 1
                  ? <button type="button" onClick={() => setI(i + 1)} className={cls.primary + ' h-14 px-8 text-base flex-1 sm:flex-none'}>다음<Icon d={I.right} /></button>
                  : <button type="button" onClick={onClose} className={cls.primary + ' h-14 px-8 text-base flex-1 sm:flex-none'}>완성!</button>}
              </div>
            </>
          ) : <p className="text-xl text-muted">등록된 조리 순서가 없어요.</p>}
        </div>
      </div>
    </div>
  );
}
