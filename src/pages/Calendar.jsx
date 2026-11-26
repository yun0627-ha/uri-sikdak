import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTable, editorsOf } from '../hooks/useTable.jsx';
import { ByLine, cls, focus, Icon, I, IconButton, Pill, useToast } from '../components/ui.jsx';
import AddSheet from '../components/AddSheet.jsx';
import WishSheet, { useWishBuckets, findRecipeFor } from '../components/WishSheet.jsx';
import { WEEKDAYS, SHOP_COLOR } from '../lib/constants.js';
import { addDays, fromKey, labelDate, longDate, shortDate, startOfWeek, toKey, todayKey } from '../lib/utils.js';

const VIEW_KEY = 'cal-view';
export const NOTE_DOT = '#E9A55B'; // 날짜별 한마디 표시 (눈에 띄게 주황)

export default function Calendar() {
  const t = useTable();
  const toast = useToast();
  const nav = useNavigate();
  const today = todayKey();
  const ws = t.settings.weekStart;
  const [view, setViewRaw] = useState(() => { try { return sessionStorage.getItem(VIEW_KEY) || t.settings.defaultView; } catch (e) { return t.settings.defaultView; } });
  const setView = v => { setViewRaw(v); try { sessionStorage.setItem(VIEW_KEY, v); } catch (e) { /* 무시 */ } };
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(today);
  const [sheet, setSheet] = useState(null);
  // 레시피 서랍: 화면 아래에 떠서 달력과 함께 보여요. 칩을 위로 끌어 날짜에 놓거나, 칩 → 날짜 순서로 누르기
  const meals = t.categories.filter(c => c.grp === 'meal');
  const [trayOpen, setTrayOpen] = useState(false);
  const [trayCat, setTrayCat] = useState(() => (meals.find(c => c.label === '저녁') || meals[0])?.id || null);
  const [armed, setArmed] = useState(null);
  const [drag, setDrag] = useState(null);
  const calRef = useRef(null);
  const [wishOpen, setWishOpen] = useState(false);
  const wish = useWishBuckets();

  const byDate = useMemo(() => {
    const m = {};
    t.events.forEach(e => { (m[e.date] = m[e.date] || []).push(e); });
    Object.values(m).forEach(l => l.sort((a, b) => t.getCat(a.category_id).order - t.getCat(b.category_id).order));
    return m;
  }, [t.events, t.categories]);
  const noteByDate = useMemo(() => {
    const m = {};
    t.notes.forEach(n => { m[n.date] = (m[n.date] || 0) + 1; });
    return m;
  }, [t.notes]);
  const shopByDate = useMemo(() => {
    const m = {};
    if (!t.settings.showShopOnCalendar) return m;
    t.shopping.filter(i => !i.checked).forEach(i => new Set((i.sources || []).map(s => s.date).filter(Boolean)).forEach(d => { m[d] = (m[d] || 0) + 1; }));
    return m;
  }, [t.shopping, t.settings.showShopOnCalendar]);

  const dropOn = async (date, item) => {
    if (!trayCat || !t.categories.some(c => c.id === trayCat)) { toast('서랍 위에서 넣을 끼니를 먼저 골라 주세요.'); return; }
    const cat = t.getCat(trayCat);
    const ev = await t.addEvent({ date, category_id: trayCat, title: item.d.title, recipe_id: item.r?.id || null, dish_id: item.r ? item.d.id : null });
    if (ev) toast(`${shortDate(date)} ${cat.label}에 '${item.d.title}'`, { label: '되돌리기', fn: () => t.deleteEvent(ev) });
    setSelected(date);
  };
  const select = k => {
    if (armed) { dropOn(k, armed); setArmed(null); return; }
    setSelected(k);
    if (!trayOpen && window.innerWidth < 1024) setTimeout(() => document.getElementById('day-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 30);
  };
  const placeWish = w => {
    const m = findRecipeFor(t.recipes, w.title);
    setArmed({ key: `wish-${w.id}`, r: m?.r || null, d: m?.d || { title: w.title }, wish: w });
    setWishOpen(false);
  };
  const openTray = () => { setTrayOpen(true); calRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  const move = dir => setCursor(c => view === 'month' ? new Date(c.getFullYear(), c.getMonth() + dir, 1) : addDays(c, dir * 14));
  const start = view === 'month' ? startOfWeek(new Date(cursor.getFullYear(), cursor.getMonth(), 1), ws) : startOfWeek(cursor, ws);
  let days = Array.from({ length: view === 'month' ? 42 : 14 }, (_, i) => addDays(start, i));
  if (view === 'month' && days[35].getMonth() !== cursor.getMonth()) days = days.slice(0, 35);
  const weeks = Array.from({ length: days.length / 7 }, (_, w) => days.slice(w * 7, w * 7 + 7));
  const first = days[0], last = days[days.length - 1];
  const big = view === 'month' ? `${cursor.getMonth() + 1}월` : first.getMonth() === last.getMonth() ? `${first.getMonth() + 1}월` : `${first.getMonth() + 1}-${last.getMonth() + 1}월`;
  const small = view === 'month' ? `${cursor.getFullYear()}년` : `${shortDate(toKey(first))} – ${shortDate(toKey(last))}`;

  // 이번 달 요약 (통계 화면으로)
  const ym = today.slice(0, 7);
  const monthEvs = t.events.filter(e => e.date.startsWith(ym));
  const monthMeals = monthEvs.filter(e => t.getCat(e.category_id).grp === 'meal').length;
  const eatCat = t.categories.find(c => c.label.startsWith('외식'));
  const monthOut = eatCat ? monthEvs.filter(e => e.category_id === eatCat.id).length : 0;

  return (
    <div className={`grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] items-start ${trayOpen ? 'pb-40' : ''}`}>
      <section aria-label="식단 캘린더" className="px-1 sm:px-2" ref={calRef}>
        <StartGuide onOpenTray={openTray} />
        <div className="mb-3 grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-1.5">
          <Link to="stats" className={`flex items-center justify-between gap-1 rounded-xl bg-white/70 border border-line px-3 h-9 text-[12px] whitespace-nowrap text-muted hover:border-[#C5D2C0] ${focus}`}>
            <span className="truncate"><b className="text-ink font-semibold">{Number(ym.slice(5))}월</b> · 식사 {monthMeals}끼{eatCat ? ` · ${eatCat.label.split('/')[0]} ${monthOut}` : ''}</span>
            <span className="shrink-0 inline-flex items-center text-sage">통계<Icon d={I.right} size={13} /></span>
          </Link>
          <button type="button" onClick={() => setWishOpen(true)} className={`flex items-center justify-between gap-1 rounded-xl bg-sage-soft border border-[#C9D6C4] px-3 h-9 text-[12px] whitespace-nowrap text-sage-dark font-semibold ${focus}`}>
            <span className="truncate">🙋 먹고싶어요 {wish.left > 0 && wish.left}</span><Icon d={I.right} size={13} className="shrink-0" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 whitespace-nowrap">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-[20px] font-bold text-ink tabular-nums">{big}</span>
            <span className="text-[12px] text-muted tabular-nums truncate">{small}</span>
            <button type="button" onClick={() => { setCursor(new Date()); setSelected(today); }} className={`shrink-0 h-6 px-2 rounded-full text-[12px] text-sage bg-sage-faint ${focus}`}>오늘</button>
          </div>
          <div className="flex items-center shrink-0">
            <div className="inline-flex rounded-full bg-white border border-line p-0.5 mr-0.5" role="tablist" aria-label="보기 방식">
              {[['2w', '2주'], ['month', '한 달']].map(([v, l]) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => { setView(v); setCursor(fromKey(selected)); }}
                  className={`h-7 px-2.5 rounded-full text-[12px] font-medium ${view === v ? 'bg-sage text-white' : 'text-muted hover:text-ink'}`}>{l}</button>
              ))}
            </div>
            <IconButton label="이전" onClick={() => move(-1)} className="!h-8 !w-8"><Icon d={I.left} size={18} /></IconButton>
            <IconButton label="다음" onClick={() => move(1)} className="!h-8 !w-8"><Icon d={I.right} size={18} /></IconButton>
          </div>
        </div>

        <div className="mt-4 -mx-1 sm:mx-0">
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1">
            {[0, 1, 2, 3, 4, 5, 6].map(j => (j + ws) % 7).map(i => <div key={i} className={`text-center text-[12px] py-1 ${i === 0 ? 'text-[#C0524C]' : i === 6 ? 'text-[#4A6F92]' : 'text-muted'}`}>{WEEKDAYS[i]}</div>)}
          </div>
          {weeks.map((wk, wi) => (
            <div key={wi} className={`grid grid-cols-7 gap-0.5 sm:gap-1 py-2 ${wi < weeks.length - 1 ? 'border-b border-dashed border-[#D6DCD2]' : ''}`}>
              {wk.map(d => {
                const k = toKey(d);
                return <DayCell key={k} d={d} k={k} inMonth={view !== 'month' || d.getMonth() === cursor.getMonth()} past={k < today} today={today}
                  list={byDate[k] || []} shop={shopByDate[k] || 0} notes={noteByDate[k] || 0} selected={selected} month={view === 'month'} onSelect={select}
                  armed={!!armed} over={drag?.over === k}
                  onOpenRecipe={(rid, did) => nav(`recipes/${rid}?d=${encodeURIComponent(did || '')}`)} />;
              })}
            </div>
          ))}
          {view === 'month' && <p className="mt-1 px-1 text-[13px] text-faintink">점 하나가 메뉴 하나예요. 날짜를 누르면 메뉴가 보여요.</p>}
        </div>
      </section>

      <div id="day-panel">
        <DayPanel date={selected} onAdd={() => setSheet({ date: selected })} onOpenTray={openTray} trayOpen={trayOpen} />
      </div>

      {t.canWrite && !(armed?.wish && !trayOpen) && (trayOpen
        ? <RecipeTray trayCat={trayCat} setTrayCat={setTrayCat} meals={meals} armed={armed} setArmed={setArmed} setDrag={setDrag} onDrop={dropOn} onClose={() => { setTrayOpen(false); setArmed(null); }} />
        : <button type="button" onClick={openTray} className={`fixed z-30 right-4 bottom-[80px] sm:bottom-24 inline-flex items-center gap-1.5 h-11 pl-3.5 pr-4 rounded-full bg-sage text-white text-[13px] font-semibold shadow-[0_10px_30px_-10px_rgba(46,53,47,.5)] hover:bg-sage-dark ${focus}`}>
            <Icon d={I.book} size={16} />레시피 서랍
          </button>)}

      {armed?.wish && !trayOpen && (
        <div className="fade-in fixed z-30 inset-x-3 bottom-[84px] sm:left-1/2 sm:-translate-x-1/2 sm:w-[420px] flex items-center gap-2 rounded-2xl bg-ink text-white pl-4 pr-2 py-2 text-[13px] shadow-lg">
          <span className="flex-1 min-w-0 truncate">'{armed.d.title}' · 넣을 날짜를 누르세요 <span className="text-white/60">({t.getCat(trayCat).label})</span></span>
          <button type="button" onClick={() => { setArmed(null); setWishOpen(true); }} className="shrink-0 h-8 px-3 rounded-full bg-white/15 text-[12px]">취소</button>
        </div>
      )}
      {wishOpen && <WishSheet onClose={() => setWishOpen(false)} onPlace={placeWish} />}
      {drag && (
        <div className="fixed z-[60] pointer-events-none -translate-x-1/2 -translate-y-[130%] rounded-full bg-ink text-white text-[13px] px-3.5 py-2 shadow-lg" style={{ left: drag.x, top: drag.y }}>
          {drag.item.d.title}{drag.over ? ` → ${shortDate(drag.over)}` : ''}
        </div>
      )}
      {sheet && <AddSheet date={sheet.date} onClose={() => setSheet(null)} />}
    </div>
  );
}

// 처음 만든 식탁: 3단계 안내 (다 하면 사라져요)
function StartGuide({ onOpenTray }) {
  const t = useTable();
  const key = `guide-done-${t.table.id}`;
  const [hidden, setHidden] = useState(() => { try { return !!localStorage.getItem(key); } catch (e) { return false; } });
  const steps = [
    { done: t.recipes.length > 0, title: '레시피 넣기', sub: "레시피 탭 › '새 레시피'", to: 'recipes' },
    { done: t.events.length > 0, title: '달력에 놓기', sub: '레시피 서랍에서 날짜로', action: onOpenTray },
    { done: t.members.length > 1, title: '가족 초대', sub: '설정 › 가족 초대 QR', to: 'settings' },
  ];
  const allDone = steps.every(s => s.done);
  useEffect(() => { if (allDone) { try { localStorage.setItem(key, '1'); } catch (e) { /* 무시 */ } } }, [allDone]);
  if (hidden || allDone || !t.canWrite) return null;
  return (
    <div className="mb-3 rounded-[18px] border border-line bg-white px-3 py-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-ink">시작하기</p>
        <button type="button" onClick={() => { setHidden(true); try { localStorage.setItem(key, '1'); } catch (e) { /* 무시 */ } }} className="text-[12px] text-muted h-7 px-1.5">닫기</button>
      </div>
      <ol className="mt-1 grid grid-cols-3 gap-1.5">
        {steps.map((s, i) => {
          const body = (
            <>
              <span className={`h-5 w-5 shrink-0 rounded-full grid place-items-center text-[11px] font-semibold ${s.done ? 'bg-sage-check text-white' : 'bg-sage-faint text-sage'}`}>{s.done ? <Icon d={I.check} size={11} sw={2.6} /> : i + 1}</span>
              <span className={`min-w-0 text-left text-[12px] leading-tight font-medium ${s.done ? 'text-faintink line-through' : 'text-ink'}`}>{s.title}</span>
            </>
          );
          const c = `flex items-center gap-1.5 rounded-xl border border-line px-2 py-2 h-full ${s.done ? 'bg-canvas/60' : 'hover:border-sage'} ${focus}`;
          return <li key={i}>{s.to ? <Link to={s.to} className={c}>{body}</Link> : <button type="button" onClick={s.action} className={c + ' w-full'}>{body}</button>}</li>;
        })}
      </ol>
    </div>
  );
}

// 칩: 메뉴 이름 (무조건 한 줄, 넘치면 잘라요)
function EventChip({ e }) {
  const c = useTable().getCat(e.category_id);
  return (
    <span className="block w-full rounded-md px-[4px] py-[3px] text-[10px] sm:text-[11px] font-semibold leading-[1.3] text-left whitespace-nowrap overflow-hidden"
      style={{ background: c.bg, color: c.fg }} title={`${c.label} · ${e.title}`}>{e.title}</span>
  );
}

// 날짜 한 칸. 2주: 메뉴 칩 / 한 달: 끼니 색 점(선택하면 칩)
function DayCell({ d, k, inMonth, list, shop, notes, today, selected, onSelect, onOpenRecipe, month, past, armed, over }) {
  const t = useTable();
  const sel = k === selected, isToday = k === today, dow = d.getDay();
  const showChips = !month || sel;
  const max = sel ? 99 : 4;
  const shown = list.slice(0, shop ? max - 1 : max), more = list.length + (shop ? 1 : 0) - max;
  const numColor = dow === 0 ? 'text-[#C0524C]' : dow === 6 ? 'text-[#4A6F92]' : 'text-ink';
  return (
    <div role="button" tabIndex={0} data-date={k} aria-pressed={sel} aria-label={`${labelDate(k)}, ${list.length ? list.map(e => e.title).join(', ') : '비어 있음'}${notes ? `, 한마디 ${notes}개` : ''}`}
      onClick={() => onSelect(k)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(k); } }}
      className={`relative flex flex-col items-center rounded-[14px] px-[2px] sm:px-1 pt-1 pb-2 cursor-pointer transition-colors ${month ? 'min-h-[52px] sm:min-h-[76px]' : 'min-h-[108px] sm:min-h-[150px]'}
        ${over ? 'bg-sage-soft ring-2 ring-sage' : sel ? 'bg-[#E8ECE4]' : armed ? 'hover:bg-sage-soft' : 'hover:bg-white/70'} ${armed && !over ? 'outline outline-1 outline-dashed outline-[#C9D1C6]' : ''} ${focus}`}>
      <span className={`relative grid place-items-center h-7 w-7 sm:h-8 sm:w-8 rounded-full text-[14px] sm:text-[15px] tabular-nums ${isToday ? 'bg-sage-check text-white font-bold' : `${numColor} font-semibold ${(!inMonth || past) && !sel ? 'opacity-35' : ''}`}`}>{d.getDate()}{notes > 0 && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-[#F7F8F5]" style={{ background: NOTE_DOT }} aria-hidden="true" />}</span>
      {showChips ? (
        <span className={`mt-1 flex flex-col gap-[3px] w-full ${!inMonth && !sel ? 'opacity-40' : past && !sel ? 'opacity-70' : ''}`}>
          {shop > 0 && <span className="block w-full rounded-md px-0.5 py-[2px] text-[11px] font-medium text-center border border-dashed bg-white/80" style={{ color: SHOP_COLOR.fg, borderColor: SHOP_COLOR.fg + '55' }}>장볼 {shop}</span>}
          {shown.map(e => sel && e.recipe_id
            ? <button key={e.id} type="button" onClick={ev => { ev.stopPropagation(); onOpenRecipe(e.recipe_id, e.dish_id); }} aria-label={`${e.title} 레시피 보기`}
                className={`block w-full rounded-md shadow-[0_1px_0_rgba(46,53,47,.08)] hover:brightness-[.96] ${focus}`}><EventChip e={e} /></button>
            : <EventChip key={e.id} e={e} />)}
          {more > 0 && <span className="text-[11px] text-muted font-medium text-center">+{more}</span>}
        </span>
      ) : list.length > 0 && (
        <span className={`mt-1.5 flex flex-wrap justify-center gap-[3px] max-w-[44px] ${!inMonth ? 'opacity-40' : ''}`} aria-hidden="true">
          {list.slice(0, 6).map(e => <span key={e.id} className="h-2 w-2 rounded-full" style={{ background: t.getCat(e.category_id).fg, opacity: .65 }} />)}
          {list.length > 6 && <span className="text-[13px] leading-none text-muted">+</span>}
        </span>
      )}
    </div>
  );
}

// 레시피 서랍 (화면 아래에 떠 있음)
function RecipeTray({ trayCat, setTrayCat, meals, armed, setArmed, setDrag, onDrop, onClose }) {
  const t = useTable();
  const items = useMemo(() => {
    const all = t.recipes.flatMap(r => r.dishes.map(d => ({ r, d, key: `${r.id}|${d.id}` })));
    const recent = [...t.events].filter(e => e.recipe_id).sort((a, b) => b.date.localeCompare(a.date)).map(e => `${e.recipe_id}|${e.dish_id}`);
    const rank = x => (t.isFav(x.r.id, x.d.id) ? 0 : 1000) + (recent.indexOf(x.key) === -1 ? 500 : recent.indexOf(x.key));
    return all.sort((a, b) => rank(a) - rank(b)).slice(0, 30);
  }, [t.recipes, t.events, t.favorites]);
  const g = useRef(null);

  const down = (e, item) => { g.current = { item, x0: e.clientX, y0: e.clientY, dragging: false, id: e.pointerId, el: e.currentTarget }; };
  const moveP = e => {
    const s = g.current; if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
    if (!s.dragging) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { s.dragging = true; try { s.el.setPointerCapture(e.pointerId); } catch (er) { /* 무시 */ } setArmed(null); }
      else return;
    }
    e.preventDefault();
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-date]')?.getAttribute('data-date') || null;
    setDrag({ item: s.item, x: e.clientX, y: e.clientY, over });
  };
  const up = e => {
    const s = g.current; g.current = null;
    if (!s || s.id !== e.pointerId) return;
    if (s.dragging) {
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-date]')?.getAttribute('data-date');
      setDrag(null);
      if (over) onDrop(over, s.item);
    } else setArmed(a => a && a.key === s.item.key ? null : s.item);
  };
  const cancel = () => { g.current = null; setDrag(null); };

  return (
    <div className="fixed z-30 inset-x-0 bottom-[76px] sm:bottom-24 px-2 sm:px-0 sm:left-1/2 sm:-translate-x-1/2 sm:w-[600px]">
      <div className="fade-in rounded-[24px] border border-line bg-white/95 backdrop-blur px-3 sm:px-4 pt-3 pb-3 shadow-[0_-10px_40px_-15px_rgba(46,53,47,.35)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1 overflow-x-auto no-scrollbar" role="radiogroup" aria-label="넣을 끼니">
            {meals.map(c => (
              <button key={c.id} type="button" role="radio" aria-checked={trayCat === c.id} onClick={() => setTrayCat(c.id)}
                className={`shrink-0 h-8 px-3 rounded-full text-[13px] border ${trayCat === c.id ? 'font-semibold border-transparent' : 'border-line text-muted'}`}
                style={trayCat === c.id ? { background: c.bg, color: c.fg } : undefined}>{c.label}</button>
            ))}
          </div>
          <IconButton label="서랍 닫기" onClick={onClose} className="shrink-0"><Icon d={I.x} size={17} /></IconButton>
        </div>
        <p className="mt-1 text-[13px] text-muted">{armed ? <b className="text-sage">'{armed.d.title}' — 넣을 날짜를 누르세요</b> : '칩을 위로 끌어 날짜에 놓거나, 칩을 누르고 날짜를 누르세요'}</p>
        {items.length ? (
          <div className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {items.map(it => {
              const on = armed?.key === it.key;
              return (
                <button key={it.key} type="button" onPointerDown={e => down(e, it)} onPointerMove={moveP} onPointerUp={up} onPointerCancel={cancel}
                  style={{ touchAction: 'pan-x' }} aria-pressed={on}
                  className={`shrink-0 select-none h-10 px-4 rounded-full text-[14px] border transition-colors ${on ? 'bg-sage text-white border-sage' : 'bg-canvas border-line text-ink hover:border-sage'}`}>
                  {t.isFav(it.r.id, it.d.id) && <span className={on ? 'text-white mr-1' : 'text-[#C0524C] mr-1'}>♥</span>}{it.d.title}
                </button>
              );
            })}
          </div>
        ) : <p className="mt-2 text-[13px] text-faintink">레시피를 저장하면 여기에 나와요.</p>}
      </div>
    </div>
  );
}

// 선택한 날짜의 끼니 목록 — 오른쪽에 누가 올린 메뉴인지
function DayPanel({ date, onAdd, onOpenTray, trayOpen }) {
  const t = useTable();
  const toast = useToast();
  const nav = useNavigate();
  const list = t.events.filter(e => e.date === date).sort((a, b) => t.getCat(a.category_id).order - t.getCat(b.category_id).order);
  const adding = editorsOf(t.others, 'day', date);
  const remove = e => { t.deleteEvent(e); toast(`'${e.title}'을(를) 뺐어요`, { label: '되돌리기', fn: () => t.restoreEvent(e) }); };
  return (
    <section className="rounded-[22px] border border-line bg-white" aria-label="선택한 날짜">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <h2 className="text-[15px] font-semibold text-ink">{longDate(date)}</h2>
        {t.canWrite && <button type="button" onClick={onAdd} className={cls.primary + ' h-8 px-4 text-[13px]'}>추가</button>}
      </div>
      {adding.length > 0 && <p className="mx-6 mb-2 text-[13px] text-[#7D6420]">✎ {adding.map(p => p.nickname).join(', ')}님이 이 날 메뉴를 추가하는 중이에요</p>}
      {list.length ? (
        <ul className="px-3 pb-3">
          {list.map(e => {
            const c = t.getCat(e.category_id);
            const { recipe, dish } = e.recipe_id ? t.findDish(e.recipe_id, e.dish_id) : {};
            return (
              <li key={e.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-line last:border-0">
                <span className="w-1 self-stretch rounded-full shrink-0" style={{ background: c.fg, opacity: .35 }} />
                <button type="button" disabled={!recipe} onClick={() => recipe && nav(`recipes/${recipe.id}?d=${encodeURIComponent(dish.id)}`)}
                  className={`flex-1 min-w-0 text-left rounded-lg ${recipe ? 'cursor-pointer' : 'cursor-default'} ${focus}`}>
                  <p className="text-[15px] text-ink font-medium leading-snug">{e.title}{recipe && <Icon d={I.right} size={14} className="inline ml-0.5 text-faintink" />}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Pill c={c} />
                    {e.note && <span className="text-[13px] text-muted">{e.note}</span>}
                  </div>
                </button>
                <ByLine p={t.profileOf(e.created_by)} />
                {t.canWrite && <button type="button" aria-label={`${e.title} 빼기`} onClick={() => remove(e)}
                  className="h-8 w-8 grid place-items-center rounded-full text-faintink hover:text-[#9E4742] hover:bg-[#F7E8E6]"><Icon d={I.x} size={14} /></button>}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="px-5 pb-5 pt-1 text-[13px] text-muted leading-relaxed">
          아직 등록된 식단이 없어요.
          {t.canWrite && !trayOpen && <button type="button" onClick={onOpenTray} className="mt-2 flex items-center gap-1 text-sage"><Icon d={I.book} size={15} />레시피 서랍에서 끌어다 놓기</button>}
        </div>
      )}
      <DayNotes date={date} />
    </section>
  );
}

// 날짜별 한마디: "이날 메뉴 바꿔요", "치킨 어때?" 같은 짧은 대화
function DayNotes({ date }) {
  const t = useTable();
  const [text, setText] = useState('');
  const list = t.notes.filter(n => n.date === date).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const send = async e => {
    e.preventDefault();
    if (!text.trim()) return;
    const v = text; setText('');
    await t.addNote(date, v);
  };
  const time = iso => { const d = new Date(iso); return isNaN(d) ? '' : `${d.getHours() < 12 ? '오전' : '오후'} ${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const mine = n => n.user_id === t.me;
  return (
    <div className="mx-4 mb-3 pt-2.5 border-t border-dashed border-[#D6DCD2]">
      <p className="mb-1.5 text-[12px] font-semibold text-sage">한마디{list.length > 0 && ` ${list.length}`}</p>
      {list.length > 0 && (
        <ul className="mb-1 flex flex-col gap-1.5">
          {list.map(n => {
            const me = mine(n);
            const p = t.profileOf(n.user_id) || { nickname: '?' };
            const liked = n.likes?.includes(t.me);
            const likes = n.likes?.length || 0;
            return (
              <li key={n.id} className="flex flex-col items-start">
                <span className="mb-0.5 ml-1 text-[12px] text-muted">{p.nickname}{me && ' (나)'}</span>
                <div className="flex items-end gap-1.5 max-w-[92%]">
                  <button type="button" onClick={() => t.toggleNoteLike(n)} aria-label={liked ? '좋아요 취소' : '좋아요'}
                    className={`min-w-0 text-left px-3 py-1.5 text-[14px] text-sage-dark leading-snug break-words rounded-[4px_14px_14px_14px] ${me ? 'bg-sage-soft' : 'bg-sage-faint'}`}>
                    {n.text}{likes > 0 && <span className="ml-1 text-[12px] text-sage">👍{likes > 1 ? likes : ''}</span>}
                  </button>
                  <span className="shrink-0 flex flex-col items-start text-[11px] leading-tight text-faintink">
                    {(me || t.canWrite) && <button type="button" onClick={() => t.deleteNote(n)} className="hover:text-[#9E4742]">지우기</button>}
                    <span>{time(n.created_at)}</span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={send} className="flex items-center gap-2 border-b border-[#C9D6C4] focus-within:border-sage">
        <input value={text} onChange={e => setText(e.target.value)} maxLength={200} autoComplete="off" name="day-note-nofill" enterKeyHint="send"
          placeholder={list.length ? '한마디 남기기…' : '한마디 남기기 · 이날 메뉴 바꿔요 🙏'} aria-label="한마디 남기기"
          className="flex-1 min-w-0 h-9 bg-transparent px-0.5 text-[14px] placeholder:text-faintink focus:outline-none" />
        <button type="submit" disabled={!text.trim()} className="shrink-0 h-9 px-1 text-[13px] font-semibold text-sage disabled:opacity-40">보내기</button>
      </form>
      {list.length > 0 && <p className="mt-1 ml-0.5 text-[11px] text-faintink">말풍선을 누르면 👍</p>}
    </div>
  );
}
