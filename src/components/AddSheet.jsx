import { useEffect, useMemo, useState } from 'react';
import { useTable, useEditingPresence } from '../hooks/useTable.jsx';
import { cls, focus, Icon, I, TypePill, useToast } from './ui.jsx';
import CategoryModal from './CategoryModal.jsx';
import { RECIPE_TYPES } from '../lib/constants.js';
import { dishToShopping, longDate, recipeTitle, shortDate } from '../lib/utils.js';
import { avgStars } from '../lib/reviews.js';

// "어떤 메뉴를 먹을까?" — 내 레시피북에서 고르거나, 약속처럼 직접 적기
export default function AddSheet({ date: initDate, initRecipe, onClose }) {
  const t = useTable();
  const toast = useToast();
  const [catOpen, setCatOpen] = useState(false);
  const [date, setDate] = useState(initDate);
  useEditingPresence({ kind: 'day', id: date, label: shortDate(date) });
  const firstMeal = t.categories.find(c => c.grp === 'meal')?.id || t.categories[0]?.id;
  const [catId, setCatId] = useState((t.categories.find(c => c.label === '저녁') || {}).id || firstMeal);
  const cat = t.getCat(catId);
  const recipeOk = cat.grp === 'meal';
  const [tab, setTab] = useState(recipeOk ? 'book' : 'manual');
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [withCart, setWithCart] = useState(false);
  const [title, setTitle] = useState(''), [note, setNote] = useState('');
  // 검색칸을 누르면 위쪽(제목·끼니·탭)을 접어서, 키보드가 올라와도 메뉴 목록이 보이게
  const [searchOn, setSearchOn] = useState(false);
  const closeSearch = () => { setSearchOn(false); document.activeElement?.blur?.(); };
  useEffect(() => { if (!recipeOk) setTab('manual'); }, [recipeOk]);
  useEffect(() => {
    if (catOpen) return undefined;
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [catOpen, onClose]);

  const query = q.trim().replace(/^#/, '');
  const dishes = useMemo(() => t.recipes.flatMap(r => r.dishes.map(d => ({ r, d })))
    .filter(({ r, d }) => (type === 'all' || (type === 'fav' ? t.isFav(r.id, d.id) : d.type === type))
      && (!query || d.title.includes(query) || d.tags.some(x => x.includes(query)) || d.ingredients.some(i => i.name.includes(query))))
    .sort((a, b) => (initRecipe ? (b.r.id === initRecipe) - (a.r.id === initRecipe) : 0) || (t.isFav(b.r.id, b.d.id) - t.isFav(a.r.id, a.d.id)) || avgStars(t.reviews, b.r.id, b.d.id) - avgStars(t.reviews, a.r.id, a.d.id)),
  [t.recipes, t.favorites, t.reviews, type, query, initRecipe]);

  const pick = async ({ r, d }) => {
    const ev = await t.addEvent({ date, category_id: catId, title: d.title, recipe_id: r.id, dish_id: d.id });
    if (!ev) return;
    let n = 0;
    if (withCart) n = await t.addShopping(dishToShopping(r, d, { servings: d.servings, excludeBasic: true, isBasic: t.isBasic, date }));
    toast(`${shortDate(date)} ${cat.label}에 '${d.title}'${n ? ` · 재료 ${n}개 담음` : ''}`, { label: '되돌리기', fn: () => t.deleteEvent(ev) });
    onClose();
  };
  const submitManual = async e => {
    e.preventDefault();
    if (!title.trim()) return;
    const ev = await t.addEvent({ date, category_id: catId, title: title.trim().slice(0, 60), note: note.trim() });
    if (!ev) return;
    toast(`${shortDate(date)} ${cat.label}에 '${ev.title}'`, { label: '되돌리기', fn: () => t.deleteEvent(ev) });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#2E352F]/30" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div role="dialog" aria-modal="true" aria-label="메뉴 추가"
          className={`fade-in w-full sm:max-w-[560px] ${searchOn ? 'h-[96%]' : 'h-[88%]'} flex flex-col transition-[height] bg-[#FBFCFA] rounded-t-[32px] border border-line shadow-[0_-20px_60px_-20px_rgba(46,53,47,.35)]`}>
          <div className="pt-3 flex justify-center"><span className="h-1.5 w-12 rounded-full bg-[#D8DDD4]" /></div>
          {searchOn ? (
            <div className="px-3 pt-1 pb-2 flex items-center gap-1 border-b border-line">
              <button type="button" onClick={closeSearch} aria-label="검색 닫기" className={`h-8 w-8 grid place-items-center rounded-full text-muted hover:text-ink ${focus}`}><Icon d={I.left} size={18} /></button>
              <p className="flex-1 text-[13px] text-muted">{shortDate(date)} <b className="font-semibold" style={{ color: cat.fg }}>{cat.label}</b>에 넣을 메뉴</p>
              <button type="button" onClick={closeSearch} className="h-8 px-3 rounded-full text-[13px] text-sage">완료</button>
            </div>
          ) : (<>
          <div className="px-6 pt-3 text-center">
            <h2 className="text-[20px] font-bold text-ink">어떤 메뉴를 먹을까?</h2>
            <label className="relative mt-1 inline-flex items-center gap-1 text-[14px] text-muted cursor-pointer hover:text-ink">
              {longDate(date)}<Icon d={I.down} size={14} />
              <input type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="날짜 바꾸기" />
            </label>
          </div>
          <div className="px-5 pt-4 flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="끼니 · 카테고리">
            {t.categories.map(c => {
              const on = c.id === catId;
              return (
                <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => setCatId(c.id)}
                  className={`h-10 px-4 rounded-full text-[14px] border-2 transition-colors ${focus} ${on ? 'font-semibold' : 'border-transparent bg-[#EEF0EB] text-muted hover:text-ink'}`}
                  style={on ? { background: c.bg, color: c.fg, borderColor: c.fg + '99' } : undefined}>
                  {c.grp !== 'meal' && <span className="inline-block h-2 w-2 rounded-full mr-1.5 align-middle" style={{ background: c.fg, opacity: .6 }} />}{c.label}
                </button>
              );
            })}
            <button type="button" aria-label="카테고리 추가 · 편집" onClick={() => setCatOpen(true)}
              className={`h-10 w-10 grid place-items-center rounded-full border-2 border-dashed border-[#B9C8B5] text-sage hover:bg-sage-faint ${focus}`}><Icon d={I.plus} size={16} /></button>
          </div>
          <div className="mt-5 grid grid-cols-2 border-b border-line" role="tablist">
            {[['book', '내 레시피북'], ['manual', '직접 입력']].map(([v, l]) => {
              const disabled = v === 'book' && !recipeOk;
              return (
                <button key={v} type="button" role="tab" aria-selected={tab === v} disabled={disabled} onClick={() => setTab(v)}
                  className={`h-12 text-[15px] border-b-[3px] -mb-px transition-colors ${tab === v ? 'border-sage text-ink font-semibold' : 'border-transparent text-muted'} ${disabled ? 'opacity-35 cursor-not-allowed' : 'hover:text-ink'}`}>{l}</button>
              );
            })}
          </div>
          </>)}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 pt-3 pb-8">
            {tab === 'book' ? (
              <>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-faintink"><Icon d={I.search} size={18} /></span>
                  <input value={q} onChange={e => setQ(e.target.value)} onFocus={() => setSearchOn(true)} enterKeyHint="search" onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} placeholder="레시피 검색 (요리명 · #태그 · 재료)" aria-label="레시피 검색"
                    className="w-full h-11 rounded-2xl border border-line bg-white pl-11 pr-4 text-base sm:text-[15px] placeholder:text-faintink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/15" />
                </div>
                <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
                  {[{ id: 'all', label: '전체', bg: '#E8EFE6', fg: '#46604A' }, { id: 'fav', label: '♥ 즐겨찾기', bg: '#F7E8E6', fg: '#9E4742' }, ...RECIPE_TYPES].map(x => (
                    <button key={x.id} type="button" onClick={() => setType(x.id)}
                      className={`shrink-0 h-7 px-3 rounded-full text-[13px] border ${type === x.id ? 'border-transparent font-semibold' : 'border-line bg-white text-muted'}`}
                      style={type === x.id ? { background: x.bg, color: x.fg } : undefined}>{x.label}</button>
                  ))}
                </div>
                {!searchOn && <label className="mt-3 flex items-center gap-2 text-[13px] text-muted cursor-pointer select-none">
                  <input type="checkbox" checked={withCart} onChange={e => setWithCart(e.target.checked)} className="h-4 w-4 accent-[#58765B]" />
                  고른 메뉴의 재료를 장바구니에도 담기 <span className="text-faintink">(기본 양념 제외)</span>
                </label>}
                <ul className="mt-3 flex flex-col gap-2">
                  {dishes.map(({ r, d }) => {
                    const a = avgStars(t.reviews, r.id, d.id);
                    return (
                      <li key={`${r.id}|${d.id}`}>
                        <button type="button" onClick={() => pick({ r, d })}
                          className={`w-full text-left flex items-center gap-4 rounded-2xl border border-line bg-white px-4 py-3 hover:border-[#BFCFBA] active:bg-sage-faint transition-colors ${focus}`}>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[15px] text-ink font-medium truncate">{t.isFav(r.id, d.id) && <span className="text-[#C0524C] mr-1">♥</span>}{d.title}</span>
                            <span className="mt-1 flex items-center gap-1.5">
                              <TypePill type={d.type} className="!text-[13px] !px-2" />
                              {a > 0 && <span className="text-[13px] font-semibold text-[#9A7428]">★ {a.toFixed(1)}</span>}
                              {r.dishes.length > 1 && <span className="text-[13px] text-faintink truncate">{recipeTitle(r)}</span>}
                            </span>
                          </span>
                          <span className="h-8 w-8 shrink-0 grid place-items-center rounded-full bg-sage-faint text-sage"><Icon d={I.plus} size={16} /></span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {!dishes.length && <p className="py-10 text-center text-sm text-muted">{query ? `'${query}'에 맞는 레시피가 없어요.` : '레시피북이 비어 있어요.'}<br />'직접 입력'으로 적어도 돼요.</p>}
              </>
            ) : (
              <form onSubmit={submitManual} className="flex flex-col gap-4">
                {!recipeOk && <p className="rounded-2xl px-4 py-3 text-[13px]" style={{ background: cat.bg, color: cat.fg }}>'{cat.label}'은(는) 레시피 없이 직접 적어요.</p>}
                <div>
                  <label className={cls.label} htmlFor="m-title">{recipeOk ? '메뉴' : '내용'}</label>
                  <input id="m-title" value={title} maxLength={60} onChange={e => setTitle(e.target.value)} className={cls.input + ' h-12 rounded-2xl'} placeholder={recipeOk ? '예: 엄마표 떡볶이, 배달 치킨' : '예: 친구들과 저녁 · 써브웨이'} autoFocus />
                </div>
                <div>
                  <label className={cls.label} htmlFor="m-note">메모 <span className="text-faintink font-normal">(선택)</span></label>
                  <input id="m-note" value={note} onChange={e => setNote(e.target.value)} className={cls.input + ' h-12 rounded-2xl'} placeholder="장소, 시간, 누구랑" />
                </div>
                <button type="submit" disabled={!title.trim()} className={cls.primary + ' h-12 text-[15px]'}>{shortDate(date)} {cat.label}에 추가</button>
              </form>
            )}
          </div>
        </div>
      </div>
      {catOpen && <CategoryModal onClose={() => { setCatOpen(false); if (!t.categories.some(c => c.id === catId)) setCatId(firstMeal); }} />}
    </>
  );
}
