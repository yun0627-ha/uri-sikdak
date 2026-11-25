import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTable } from '../hooks/useTable.jsx';
import { Avatar, Icon, I, IconButton, cls } from '../components/ui.jsx';
import { rtype } from '../lib/constants.js';
import { todayKey } from '../lib/utils.js';
import { avgStars, reviewsFor } from '../lib/reviews.js';

const pad = n => String(n).padStart(2, '0');

export default function Stats() {
  const t = useTable();
  const nav = useNavigate();
  const [ym, setYm] = useState(todayKey().slice(0, 7));
  const [y, mo] = ym.split('-').map(Number);
  const shift = d => { const x = new Date(y, mo - 1 + d, 1); setYm(`${x.getFullYear()}-${pad(x.getMonth() + 1)}`); };
  const open = (rid, did) => nav(`../recipes/${rid}?d=${encodeURIComponent(did || '')}`, { relative: 'path' });

  const evs = t.events.filter(e => e.date.startsWith(ym));
  const meals = evs.filter(e => t.getCat(e.category_id).grp === 'meal');
  const fromRecipe = meals.filter(e => e.recipe_id);
  const eatCat = t.categories.find(c => c.label.startsWith('외식'));
  const eatout = eatCat ? evs.filter(e => e.category_id === eatCat.id).length : 0;
  const counts = {};
  meals.forEach(e => { counts[e.title] = counts[e.title] || { n: 0, e }; counts[e.title].n++; });
  const top = Object.entries(counts).sort((a, b) => b[1].n - a[1].n).slice(0, 5);
  const maxN = top[0]?.[1].n || 1;
  const byCat = t.categories.map(c => ({ c, n: evs.filter(e => e.category_id === c.id).length })).filter(x => x.n);
  const typeN = {};
  fromRecipe.forEach(e => { const { dish } = t.findDish(e.recipe_id, e.dish_id); if (dish) typeN[dish.type] = (typeN[dish.type] || 0) + 1; });
  const types = Object.entries(typeN).sort((a, b) => b[1] - a[1]);
  const typeTotal = types.reduce((s, [, n]) => s + n, 0) || 1;
  const best = t.recipes.flatMap(r => r.dishes.map(d => ({ r, d, a: avgStars(t.reviews, r.id, d.id), n: reviewsFor(t.reviews, r.id, d.id).length }))).filter(x => x.a).sort((a, b) => b.a - a.a || b.n - a.n).slice(0, 3);
  const byPerson = t.members.map(m => ({ m, n: evs.filter(e => e.created_by === m.user_id).length })).filter(x => x.n).sort((a, b) => b.n - a.n);

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <button type="button" onClick={() => nav('..', { relative: 'path' })} className="mb-3 inline-flex items-center gap-0.5 h-9 pl-1 pr-3 rounded-full text-[14px] text-muted hover:text-ink hover:bg-white"><Icon d={I.left} />달력</button>
      <section className="rounded-[28px] border border-line bg-white" aria-label="먹은 기록 통계">
        <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-2">
          <h2 className="text-[17px] font-semibold text-ink">{y}년 {mo}월 먹은 기록</h2>
          <div className="flex items-center">
            <IconButton label="이전 달" onClick={() => shift(-1)} className="h-8 w-8"><Icon d={I.left} size={16} /></IconButton>
            <IconButton label="다음 달" onClick={() => shift(1)} className="h-8 w-8"><Icon d={I.right} size={16} /></IconButton>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 px-4 pb-4">
          {[['식사', meals.length, '끼'], ['레시피로', fromRecipe.length, '끼'], [eatCat ? eatCat.label.split('/')[0] : '기록한 날', eatCat ? eatout : new Set(evs.map(e => e.date)).size, eatCat ? '번' : '일']].map(([l, n, u]) => (
            <div key={l} className="rounded-2xl bg-canvas px-3 py-2.5">
              <p className="text-[13px] text-muted">{l}</p>
              <p className="text-[22px] font-bold text-ink tabular-nums leading-tight">{n}<span className="text-[13px] font-medium text-muted ml-0.5">{u}</span></p>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 flex flex-col gap-5">
          {!evs.length && <p className="text-sm text-muted">이 달은 아직 기록이 없어요.</p>}
          {top.length > 0 && (
            <div>
              <p className="text-[13px] font-medium text-sage mb-2">많이 먹은 메뉴</p>
              <ul className="flex flex-col gap-1.5">
                {top.map(([title, { n, e }], i) => (
                  <li key={title}>
                    <button type="button" disabled={!e.recipe_id} onClick={() => e.recipe_id && open(e.recipe_id, e.dish_id)} className="w-full text-left flex items-center gap-2.5">
                      <span className="w-4 text-[13px] text-faintink tabular-nums">{i + 1}</span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-baseline justify-between gap-2 text-[14px]"><span className="truncate text-ink">{title}</span><span className="text-muted tabular-nums shrink-0">{n}번</span></span>
                        <span className="mt-1 block h-1.5 rounded-full bg-line overflow-hidden"><span className="block h-full rounded-full bg-sage-check" style={{ width: `${(n / maxN) * 100}%` }} /></span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {byCat.length > 0 && (
            <div>
              <p className="text-[13px] font-medium text-sage mb-2">끼니 · 일정</p>
              <div className="flex flex-wrap gap-1.5">{byCat.map(({ c, n }) => <span key={c.id} className={cls.pill} style={{ background: c.bg, color: c.fg }}>{c.label} {n}</span>)}</div>
            </div>
          )}
          {types.length > 0 && (
            <div>
              <p className="text-[13px] font-medium text-sage mb-2">메뉴 종류</p>
              <div className="flex h-3 rounded-full overflow-hidden">{types.map(([ty, n]) => <span key={ty} title={`${rtype(ty).label} ${n}`} style={{ width: `${(n / typeTotal) * 100}%`, background: rtype(ty).fg, opacity: .55 }} />)}</div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted">{types.map(([ty, n]) => <span key={ty} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: rtype(ty).fg, opacity: .55 }} />{rtype(ty).label} {n}</span>)}</div>
            </div>
          )}
          {byPerson.length > 0 && (
            <div>
              <p className="text-[13px] font-medium text-sage mb-2">누가 메뉴를 많이 올렸나</p>
              <ul className="flex flex-col gap-1">{byPerson.map(({ m, n }) => <li key={m.user_id} className="flex items-center gap-2 text-[14px]"><Avatar p={m.profiles} size={22} /><span className="flex-1">{m.profiles?.nickname}</span><span className="text-muted tabular-nums">{n}개</span></li>)}</ul>
            </div>
          )}
          {best.length > 0 && (
            <div>
              <p className="text-[13px] font-medium text-sage mb-2">가족 별점 높은 메뉴</p>
              <ul>{best.map(({ r, d, a, n }) => (
                <li key={`${r.id}|${d.id}`}><button type="button" onClick={() => open(r.id, d.id)} className="w-full text-left flex items-center justify-between gap-2 py-1.5 text-[14px] hover:text-sage">
                  <span className="truncate">{d.title}</span><span className="shrink-0 text-[13px] text-[#9A7428]">★ {a.toFixed(1)} <span className="text-faintink">({n})</span></span>
                </button></li>
              ))}</ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
