import { useEffect, useMemo, useState } from 'react';
import { useTable } from '../hooks/useTable.jsx';
import { focus, Icon, I, useToast } from './ui.jsx';
import { norm, shortDate } from '../lib/utils.js';

export const PERIODS = [['week', '이번 주'], ['month', '이번 달'], ['someday', '언젠가']];

// 먹고싶어요를 이번 주 · 이번 달 · 언젠가로 나눠요. 기간이 지나도 못 먹은 건 '언젠가'로 넘어가요.
export function useWishBuckets() {
  const t = useTable();
  return useMemo(() => {
    const wk = t.periodKey('week'), mk = t.periodKey('month');
    const b = { week: [], month: [], someday: [] };
    t.wishes.forEach(w => {
      const current = (w.period === 'week' && w.period_key === wk) || (w.period === 'month' && w.period_key === mk);
      if (current) b[w.period].push(w);
      else if (!w.done_date) b.someday.push(w);
    });
    const order = (x, y) => (!!x.done_date - !!y.done_date) || ((y.votes?.length || 0) - (x.votes?.length || 0)) || String(x.created_at).localeCompare(String(y.created_at));
    Object.values(b).forEach(l => l.sort(order));
    const left = b.week.filter(w => !w.done_date).length + b.month.filter(w => !w.done_date).length;
    return { ...b, left };
  }, [t.wishes, t.periodKey('week'), t.periodKey('month')]);
}

export default function WishSheet({ onClose, onPlace }) {
  const t = useTable();
  const toast = useToast();
  const buckets = useWishBuckets();
  const [tab, setTab] = useState(buckets.week.some(w => !w.done_date) ? 'week' : 'month');
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [period, setPeriod] = useState('month');
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const list = buckets[tab];
  const done = list.filter(w => w.done_date).length;
  const submit = async e => {
    e.preventDefault();
    if (!title.trim()) return;
    await t.addWish(title, period);
    toast(`'${title.trim()}' 먹고싶어요에 올렸어요`);
    setTitle(''); setAdding(false); setTab(period);
  };
  const names = w => (w.votes || []).map(uid => t.profileOf(uid)?.nickname).filter(Boolean);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#2E352F]/30" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="먹고싶어요" className="fade-in w-full sm:max-w-[560px] max-h-[85%] flex flex-col bg-[#FBFCFA] rounded-t-[28px] border border-line shadow-[0_-20px_60px_-20px_rgba(46,53,47,.35)]">
        <div className="pt-2.5 flex justify-center"><span className="h-1.5 w-10 rounded-full bg-[#D8DDD4]" /></div>
        <div className="px-4 pt-2 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-ink">🙋 먹고싶어요</h2>
          <div className="flex items-center gap-1">
            {!adding && <button type="button" onClick={() => setAdding(true)} className={`h-8 px-3 rounded-full bg-sage text-white text-[12px] font-medium inline-flex items-center gap-1 ${focus}`}><Icon d={I.plus} size={13} />올리기</button>}
            <button type="button" onClick={onClose} aria-label="닫기" className={`h-8 w-8 grid place-items-center rounded-full text-muted hover:text-ink ${focus}`}><Icon d={I.x} size={16} /></button>
          </div>
        </div>

        {adding && (
          <form onSubmit={submit} className="mx-4 mt-2 rounded-2xl border border-line bg-white p-2.5">
            <div className="flex gap-1.5">
              <input value={title} onChange={e => setTitle(e.target.value)} maxLength={60} autoFocus autoComplete="off" name="wish-title-nofill"
                placeholder="예: 마라탕, 엄마표 김치찜" aria-label="먹고 싶은 메뉴"
                className="flex-1 min-w-0 h-9 rounded-full border border-line px-3 text-base sm:text-[14px] focus:outline-none focus:border-sage" />
              <button type="submit" disabled={!title.trim()} className={`h-9 px-3.5 rounded-full bg-sage text-white text-[13px] font-medium disabled:opacity-40 ${focus}`}>올리기</button>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <span className="text-[12px] text-muted mr-1">언제쯤?</span>
              {PERIODS.map(([v, l]) => (
                <button key={v} type="button" onClick={() => setPeriod(v)} aria-pressed={period === v}
                  className={`h-7 px-2.5 rounded-full text-[12px] border ${period === v ? 'bg-sage-soft border-[#C9D6C4] text-sage-dark font-semibold' : 'border-line text-muted'}`}>{l}</button>
              ))}
              <button type="button" onClick={() => { setAdding(false); setTitle(''); }} className="ml-auto text-[12px] text-faintink h-7 px-1">취소</button>
            </div>
          </form>
        )}

        <div className="px-4 mt-3 flex gap-1" role="tablist">
          {PERIODS.map(([v, l]) => {
            const n = buckets[v].filter(w => !w.done_date).length;
            return (
              <button key={v} type="button" role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
                className={`h-7 px-3 rounded-full text-[12px] border ${tab === v ? 'bg-sage text-white border-sage font-medium' : 'border-line text-muted bg-white'}`}>{l} {n > 0 && n}</button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-2.5 pb-6">
          {list.length ? (
            <ul className="flex flex-col gap-1.5">
              {list.map(w => {
                const mine = w.votes?.includes(t.me);
                const who = names(w);
                const canDel = w.created_by === t.me || t.canWrite;
                return (
                  <li key={w.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${w.done_date ? 'bg-[#F4F6F2]' : 'bg-sage-faint'}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[14px] truncate ${w.done_date ? 'text-faintink line-through' : 'text-ink font-medium'}`}>{w.title}</p>
                      <p className="text-[11px] text-muted truncate">
                        {w.done_date ? <span className="text-sage">✓ {shortDate(w.done_date)}에 먹음</span> : who.length ? `🙋 ${who.join(' · ')}` : '아직 아무도 안 골랐어요'}
                        {tab === 'someday' && w.period !== 'someday' && !w.done_date && <span className="text-faintink"> · 지난 {w.period === 'week' ? '주' : '달'}에서 넘어옴</span>}
                      </p>
                    </div>
                    {!w.done_date && (
                      <>
                        <button type="button" onClick={() => t.toggleWishVote(w)} aria-pressed={mine} aria-label={mine ? '먹고싶어요 취소' : '나도 먹고싶어요'}
                          className={`shrink-0 h-8 px-2.5 rounded-full text-[12px] border transition-colors ${focus} ${mine ? 'bg-sage text-white border-sage' : 'bg-white border-line text-muted'}`}>🙋 {w.votes?.length || 0}</button>
                        {t.canWrite && <button type="button" onClick={() => onPlace(w)} className={`shrink-0 h-8 px-2.5 rounded-full text-[12px] bg-white border border-[#C9D6C4] text-sage font-medium inline-flex items-center gap-1 ${focus}`}><Icon d={I.cal} size={13} />달력에</button>}
                      </>
                    )}
                    {w.done_date && t.canWrite && <button type="button" onClick={() => t.updateWish(w, { done_date: null })} className="shrink-0 text-[11px] text-faintink h-7 px-1.5">되돌리기</button>}
                    {canDel && <button type="button" onClick={() => { t.deleteWish(w); toast(`'${w.title}'을(를) 지웠어요`); }} aria-label={`${w.title} 지우기`} className="shrink-0 h-7 w-7 grid place-items-center rounded-full text-faintink hover:text-[#9E4742]"><Icon d={I.x} size={13} /></button>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-8 text-center text-[13px] text-muted leading-relaxed">
              {tab === 'someday' ? '언젠가 먹고 싶은 메뉴를 모아 두는 곳이에요.' : `${tab === 'week' ? '이번 주' : '이번 달'}에 먹고 싶은 메뉴를 올려 보세요.`}<br />
              <button type="button" onClick={() => { setPeriod(tab); setAdding(true); }} className="mt-2 text-sage font-medium">+ 올리기</button>
            </p>
          )}
          {tab !== 'someday' && list.length > 0 && (
            <div className="mt-3">
              <div className="h-1.5 rounded-full bg-[#E8EFE6] overflow-hidden"><div className="h-full bg-sage-check transition-all" style={{ width: `${Math.round(done / list.length * 100)}%` }} /></div>
              <p className="mt-1 text-[11px] text-muted">{tab === 'week' ? '이번 주' : '이번 달'} {list.length}개 중 {done}개 먹었어요</p>
            </div>
          )}
          {t.canWrite && list.some(w => !w.done_date) && <p className="mt-2 text-[11px] text-faintink">'달력에'를 누르고 날짜를 누르면 그날 메뉴로 들어가요.</p>}
        </div>
      </div>
    </div>
  );
}

// 먹고싶어요 메뉴와 같은 이름의 레시피가 있으면 연결
export function findRecipeFor(recipes, title) {
  for (const r of recipes) for (const d of r.dishes) if (norm(d.title) === norm(title)) return { r, d };
  return null;
}
