import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTable, editorsOf } from '../hooks/useTable.jsx';
import { ByLine, cls, Empty, HeartButton, Icon, I, TagInput, TypePill, focus } from '../components/ui.jsx';
import RecipeForm from '../components/RecipeForm.jsx';
import Thumb from '../components/Thumb.jsx';
import { fetchPhoto } from '../lib/ai.js';
import { supabase } from '../lib/supabase.js';
import { RECIPE_TYPES, rtype } from '../lib/constants.js';
import { fridgeMatch } from '../lib/utils.js';
import { avgStars } from '../lib/reviews.js';

export default function Recipes() {
  const t = useTable();
  const nav = useNavigate();
  const [mode, setMode] = useState('all'); // all | fridge
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [form, setForm] = useState(false);
  // 보기 방식: 목록 / 사진 (기기에 기억)
  const [look, setLookRaw] = useState(() => { try { return localStorage.getItem('recipe-look') || 'photo'; } catch (e) { return 'photo'; } });
  const setLook = v => { setLookRaw(v); try { localStorage.setItem('recipe-look', v); } catch (e) { /* 무시 */ } };
  // 예전에 저장한 레시피는 링크에서 대표 사진을 조금씩 채워요 (한 번만 시도)
  const tried = useRef(new Set());
  useEffect(() => {
    if (!t.canWrite) return;
    const todo = t.recipes.filter(r => r.source_url && !tried.current.has(r.id) && r.dishes.every(d => !d.photo && !d.photoTried)).slice(0, 3);
    todo.forEach(async r => {
      tried.current.add(r.id);
      const photo = await fetchPhoto(supabase, r.source_url);
      await t.updateRecipe({ ...r, dishes: r.dishes.map(d => ({ ...d, photo: d.photo || photo, photoTried: true })) });
    });
  }, [t.recipes, t.canWrite]);
  const fridge = t.settings.fridge || [];
  const query = q.trim().replace(/^#/, '');

  const all = t.recipes.flatMap(r => r.dishes.map((d, i) => ({ r, d, i })));
  const fav = x => t.isFav(x.r.id, x.d.id);
  const typeOk = x => type === 'all' || (type === 'fav' ? fav(x) : x.d.type === type);
  const textOk = ({ d }) => !query || d.title.includes(query) || d.tags.some(x => x.includes(query)) || rtype(d.type).label.includes(query) || d.ingredients.some(i => i.name.includes(query));
  let rows = all.filter(typeOk).filter(textOk).map(x => ({ ...x, hits: query ? [...new Set(x.d.ingredients.filter(i => i.name.includes(query)).map(i => i.name))] : [] }));
  if (mode === 'fridge') {
    rows = fridge.length ? rows.map(x => ({ ...x, m: fridgeMatch(x.d, fridge, t.isBasic) })).filter(x => x.m.have.length)
      .sort((a, b) => (b.m.have.length / (b.m.total || 1)) - (a.m.have.length / (a.m.total || 1)) || a.m.missing.length - b.m.missing.length) : [];
  } else {
    rows.sort((a, b) => fav(b) - fav(a) || avgStars(t.reviews, b.r.id, b.d.id) - avgStars(t.reviews, a.r.id, a.d.id));
  }
  const count = id => all.filter(x => id === 'all' || (id === 'fav' ? fav(x) : x.d.type === id)).length;
  const open = (r, d) => nav(`${r.id}?d=${encodeURIComponent(d.id)}`);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-line bg-white p-0.5" role="tablist" aria-label="보기">
          {[['all', '레시피북'], ['fridge', '냉털 검색']].map(([v, l]) => (
            <button key={v} type="button" role="tab" aria-selected={mode === v} onClick={() => setMode(v)}
              className={`h-9 px-4 rounded-full text-[14px] font-medium ${mode === v ? 'bg-sage text-white' : 'text-muted hover:text-ink'}`}>{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-full border border-line bg-white p-0.5" role="tablist" aria-label="보기 방식">
            {[['list', 'M8 6h13|M8 12h13|M8 18h13|M3.5 6h.01|M3.5 12h.01|M3.5 18h.01', '목록'], ['photo', 'M4 4h7v7H4z|M13 4h7v7h-7z|M4 13h7v7H4z|M13 13h7v7h-7z', '사진']].map(([v, d, l]) => (
              <button key={v} type="button" role="tab" aria-selected={look === v} aria-label={`${l}으로 보기`} onClick={() => setLook(v)}
                className={`h-8 w-9 grid place-items-center rounded-full ${look === v ? 'bg-sage-soft text-sage-dark' : 'text-faintink'}`}><Icon d={d} size={16} /></button>
            ))}
          </div>
          {t.canWrite && <button type="button" onClick={() => setForm(true)} className={cls.primary}><Icon d={I.plus} size={16} />새 레시피</button>}
        </div>
      </div>

      {mode === 'fridge' ? (
        <div className={cls.card + ' p-4'}>
          <p className="text-[15px] font-semibold text-ink">냉장고에 뭐가 있나요?</p>
          <p className="text-[13px] text-muted mt-0.5 mb-3">있는 재료를 적으면 바로 만들 수 있는 순서로 보여드려요. 기본 양념은 있다고 칠게요. (가족과 함께 써요)</p>
          <TagInput tags={fridge} onChange={v => t.updateSettings({ fridge: v })} placeholder="두부, 달걀, 대파 (Enter로 추가)" disabled={!t.canWrite} />
          {fridge.length > 0 && t.canWrite && <button type="button" onClick={() => t.updateSettings({ fridge: [] })} className="mt-2 text-[13px] text-muted hover:text-ink h-7">모두 지우기</button>}
        </div>
      ) : (
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-faintink"><Icon d={I.search} size={18} /></span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="요리명, #태그, 재료로 검색 (예: 닭)" aria-label="레시피 검색"
            className="w-full h-12 rounded-2xl border border-line bg-white pl-11 pr-10 text-base sm:text-[15px] placeholder:text-faintink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/15" />
          {q && <button type="button" aria-label="검색어 지우기" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 grid place-items-center rounded-full text-faintink hover:text-ink"><Icon d={I.x} size={15} /></button>}
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap" role="tablist" aria-label="메뉴 종류">
        {[{ id: 'fav', label: '♥ 즐겨찾기', bg: '#F7E8E6', fg: '#9E4742' }, { id: 'all', label: '전체', bg: '#E8EFE6', fg: '#46604A' }, ...RECIPE_TYPES].map(x => {
          const on = type === x.id;
          return (
            <button key={x.id} type="button" role="tab" aria-selected={on} onClick={() => setType(x.id)}
              className={`shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-full text-[13px] border transition-colors ${focus} ${on ? 'border-transparent font-semibold' : 'border-line bg-white text-muted hover:text-ink'}`}
              style={on ? { background: x.bg, color: x.fg } : undefined}>
              {x.label}<span className="text-[13px] tabular-nums opacity-60">{count(x.id)}</span>
            </button>
          );
        })}
      </div>

      {!rows.length && (
        <Empty>
          {mode === 'fridge' ? (fridge.length ? '이 재료로 만들 수 있는 레시피가 아직 없어요.' : '위에 재료를 적어 보세요. 예: 두부, 달걀, 대파')
            : type === 'fav' ? '아직 즐겨찾기한 레시피가 없어요.\n레시피의 ♡를 누르면 여기에 모여요.'
            : query ? `'${query}'에 맞는 레시피가 없어요.` : t.recipes.length ? '이 종류의 레시피가 아직 없어요.' : "첫 레시피를 넣어 보세요.\n'새 레시피'에서 영상 설명이나 캡처를 넣으면 AI가 정리해 줘요."}
        </Empty>
      )}

      {look === 'photo' && mode !== 'fridge' ? (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-2.5 gap-y-3.5">
          {rows.map(({ r, d }) => {
            const a = avgStars(t.reviews, r.id, d.id);
            return (
              <li key={`${r.id}|${d.id}`}>
                <div role="button" tabIndex={0} onClick={() => open(r, d)} onKeyDown={e => { if (e.key === 'Enter') open(r, d); }} className={`cursor-pointer rounded-2xl ${focus}`}>
                  <div className="relative">
                    <Thumb dish={d} size={0} rounded="rounded-2xl" className="w-full aspect-square" />
                    <HeartButton on={t.isFav(r.id, d.id)} onClick={() => t.toggleFav(r.id, d.id)} size={16} className="!absolute top-1 right-1 !h-8 !w-8 bg-white/80 backdrop-blur" />
                  </div>
                  <p className="mt-1.5 px-0.5 text-[14px] font-semibold text-ink leading-snug truncate">{d.title}</p>
                  <p className="px-0.5 flex items-center gap-1.5 text-[12px] text-muted">
                    <span className="truncate">{rtype(d.type).label}</span>
                    {a > 0 && <span className="shrink-0 font-semibold text-[#9A7428]">★ {a.toFixed(1)}</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ r, d, i, hits, m }) => {
          const a = avgStars(t.reviews, r.id, d.id);
          const editing = editorsOf(t.others, 'recipe', r.id);
          return (
            <li key={`${r.id}|${d.id}`}>
              <div role="button" tabIndex={0} onClick={() => open(r, d)} onKeyDown={e => { if (e.key === 'Enter') open(r, d); }}
                className={`${cls.card} h-full flex flex-col cursor-pointer hover:border-[#C5D2C0] transition-colors px-4 pt-3 pb-3.5 ${focus}`}>
                <div className="flex items-start gap-3">
                  <Thumb dish={d} size={56} rounded="rounded-xl" className="mt-0.5" />
                  <div className="flex-1 min-w-0 pt-1">
                    <h3 className="text-[16px] font-semibold text-ink leading-snug">{d.title}</h3>
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <TypePill type={d.type} className="!text-[13px] !px-2" />
                      {a > 0 && <span className="text-[13px] font-semibold text-[#9A7428]">★ {a.toFixed(1)}</span>}
                      {r.dishes.length > 1 && <span className="text-[13px] text-faintink">한 영상 메뉴 {i + 1}/{r.dishes.length}</span>}
                      {editing.length > 0 && <span className="text-[13px] text-[#9A7428]">✎ {editing[0].nickname} 편집 중</span>}
                    </div>
                  </div>
                  <HeartButton on={t.isFav(r.id, d.id)} onClick={() => t.toggleFav(r.id, d.id)} className="-mr-1.5 -mt-0.5" />
                </div>
                {m ? (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-sage font-medium">있는 재료 {m.have.length}/{m.total}</span>
                      {!m.missing.length && <span className="text-sage">바로 만들 수 있어요</span>}
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-line overflow-hidden"><div className="h-full rounded-full bg-sage-check" style={{ width: `${(m.have.length / (m.total || 1)) * 100}%` }} /></div>
                    {m.missing.length > 0 && <p className="mt-1.5 text-[13px] text-muted truncate">더 필요: {m.missing.map(x => x.name).join(', ')}</p>}
                  </div>
                ) : hits.length > 0 ? <p className="mt-2 text-[13px] text-sage">재료 일치 · {hits.join(', ')}</p>
                  : d.tags.length > 0 && <p className="mt-2 text-[13px] text-faintink truncate">{d.tags.slice(0, 3).map(x => '#' + x).join(' ')}</p>}
                <div className="mt-auto pt-2.5 flex items-center justify-between gap-2">
                  <span className="text-[13px] text-faintink truncate">{r.imported_from ? `${r.imported_from.table}에서 가져옴` : r.source_url ? r.source : ''}</span>
                  <ByLine p={t.profileOf(r.created_by)} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      )}
      {form && <RecipeForm onClose={() => setForm(false)} onSaved={(rid, did) => { setForm(false); nav(`${rid}?d=${encodeURIComponent(did)}`); }} />}
    </div>
  );
}
