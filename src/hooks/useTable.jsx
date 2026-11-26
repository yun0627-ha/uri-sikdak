import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from './useAuth.jsx';
import { useToast } from '../components/ui.jsx';
import { DEFAULT_SETTINGS } from '../lib/constants.js';
import { addDays, toKey, makeIsBasic, norm, parseAmount, fmtAmount, startOfWeek } from '../lib/utils.js';
import { guessExpires, guessFood, mergeAmount } from '../lib/food.js';

/*
  한 식탁의 모든 데이터를 불러오고, Supabase Realtime 으로 가족의 변경을 바로 반영해요.
  - 쓰기는 먼저 화면에 반영(낙관적 업데이트)하고, 실패하면 다시 불러와요.
  - presence 로 "누가 지금 무엇을 고치는 중인지" 알려요.
*/
const TableCtx = createContext(null);
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const byId = (a, b) => a.id === b.id;
const sortRecipes = list => [...list].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

export function TableProvider({ tableId, children }) {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error
  const [table, setTable] = useState(null);
  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [events, setEvents] = useState([]);
  const [shopping, setShopping] = useState([]);
  const [fridge, setFridge] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [notes, setNotes] = useState([]);
  const [wishes, setWishes] = useState([]);
  const [peers, setPeers] = useState([]);
  const chRef = useRef(null), editingRef = useRef(null);

  const loadMembers = useCallback(async () => {
    const { data } = await supabase.from('table_members').select('user_id, role, joined_at, profiles(nickname, tint)').eq('table_id', tableId);
    if (data) setMembers(data);
  }, [tableId]);

  const load = useCallback(async () => {
    const since = toKey(addDays(new Date(), -400));
    const [t, c, r, e, s, rv, f, nt, w, fr] = await Promise.all([
      supabase.from('tables').select('*').eq('id', tableId).maybeSingle(),
      supabase.from('categories').select('*').eq('table_id', tableId).order('position'),
      supabase.from('recipes').select('*').eq('table_id', tableId).order('created_at', { ascending: false }),
      supabase.from('events').select('*').eq('table_id', tableId).gte('date', since).order('date').limit(5000),
      supabase.from('shopping_items').select('*').eq('table_id', tableId).order('created_at'),
      supabase.from('reviews').select('*').eq('table_id', tableId),
      supabase.from('favorites').select('*').eq('table_id', tableId).eq('user_id', user.id),
      supabase.from('day_notes').select('*').eq('table_id', tableId).gte('date', since).order('created_at'),
      supabase.from('wishes').select('*').eq('table_id', tableId).order('created_at'),
      supabase.from('fridge_items').select('*').eq('table_id', tableId).order('created_at'),
    ]);
    if (t.error) { setStatus('error'); return; }
    if (!t.data) { setStatus('notfound'); return; }
    setTable(t.data); setCategories(c.data || []); setRecipes(r.data || []); setEvents(e.data || []);
    setShopping(s.data || []); setReviews(rv.data || []); setFavorites(f.data || []);
    setNotes(nt.data || []); setWishes(w.data || []); setFridge(fr.data || []);
    await loadMembers();
    setStatus('ready');
  }, [tableId, user.id, loadMembers]);

  useEffect(() => { setStatus('loading'); load(); }, [load]);

  // 실시간 반영 + 접속 중인 사람
  useEffect(() => {
    const ch = supabase.channel(`table-${tableId}`, { config: { presence: { key: user.id } } });
    const apply = (setter, same, sort) => p => {
      if (p.eventType === 'DELETE') { setter(list => list.filter(x => !same(x, p.old))); return; }
      if (p.new.table_id && p.new.table_id !== tableId) return;
      setter(list => {
        const i = list.findIndex(x => same(x, p.new));
        const next = i >= 0 ? list.map((x, j) => j === i ? p.new : x) : [...list, p.new];
        return sort ? sort(next) : next;
      });
    };
    const filter = `table_id=eq.${tableId}`;
    const watch = (tbl, setter, same, sort) => {
      ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: tbl, filter }, apply(setter, same, sort));
      ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: tbl, filter }, apply(setter, same, sort));
      ch.on('postgres_changes', { event: 'DELETE', schema: 'public', table: tbl }, apply(setter, same, sort));
    };
    watch('events', setEvents, byId);
    watch('recipes', setRecipes, byId, sortRecipes);
    watch('shopping_items', setShopping, byId);
    watch('categories', setCategories, byId, list => [...list].sort((a, b) => a.position - b.position));
    watch('reviews', setReviews, byId);
    watch('day_notes', setNotes, byId);
    watch('wishes', setWishes, byId);
    watch('fridge_items', setFridge, byId);
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'table_members', filter }, () => loadMembers());
    ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tables', filter: `id=eq.${tableId}` }, p => setTable(p.new));
    ch.on('presence', { event: 'sync' }, () => {
      const st = ch.presenceState();
      setPeers(Object.values(st).flat());
    });
    ch.subscribe(async s => {
      if (s === 'SUBSCRIBED') await ch.track({ user_id: user.id, nickname: profile?.nickname || '', tint: profile?.tint || '#E3ECE5', editing: editingRef.current });
    });
    chRef.current = ch;
    return () => { supabase.removeChannel(ch); chRef.current = null; };
  }, [tableId, user.id, profile?.nickname, profile?.tint, loadMembers]);

  const setEditing = useCallback(ed => {
    editingRef.current = ed;
    chRef.current?.track({ user_id: user.id, nickname: profile?.nickname || '', tint: profile?.tint || '#E3ECE5', editing: ed }).catch(() => {});
  }, [user.id, profile?.nickname, profile?.tint]);

  const others = useMemo(() => peers.filter(p => p.user_id && p.user_id !== user.id)
    .filter((p, i, arr) => arr.findIndex(q => q.user_id === p.user_id) === i), [peers, user.id]);

  // ---- 공통 ----
  const myRole = members.find(m => m.user_id === user.id)?.role || null;
  const canWrite = myRole === 'owner' || myRole === 'editor';
  const settings = { ...DEFAULT_SETTINGS, ...(table?.settings || {}) };
  // 먹고싶어요 기간: 이번 주(주 시작일) · 이번 달(YYYY-MM) · 언젠가('')
  const periodKey = (p, d = new Date()) => p === 'week' ? toKey(startOfWeek(d, settings.weekStart)) : p === 'month' ? toKey(d).slice(0, 7) : '';
  const isBasic = useMemo(() => makeIsBasic(settings.basics), [JSON.stringify(settings.basics)]);
  const run = async (promise, msg = '저장하지 못했어요. 다시 불러올게요.') => {
    const { error } = await promise;
    if (error) { console.error(error); toast(error.code === '42501' ? '이 식탁은 보기만 할 수 있어요.' : msg); load(); throw error; }
  };
  const guard = () => { if (!canWrite) { toast('이 식탁은 보기만 할 수 있어요.'); return false; } return true; };

  // ---- 일정 ----
  const addEvent = async ev => {
    if (!guard()) return null;
    const row = { id: newId(), table_id: tableId, note: '', recipe_id: null, dish_id: null, ...ev, created_by: user.id, created_at: new Date().toISOString() };
    setEvents(l => [...l, row]);
    await run(supabase.from('events').insert(row)).catch(() => {});
    // 먹고싶어요에 같은 메뉴가 있으면 '먹음'으로
    const w = wishes.find(x => !x.done_date && norm(x.title) === norm(row.title));
    if (w) updateWish(w, { done_date: row.date });
    return row;
  };
  const deleteEvent = async e => {
    if (!guard()) return;
    setEvents(l => l.filter(x => x.id !== e.id));
    await run(supabase.from('events').delete().eq('id', e.id)).catch(() => {});
  };
  const restoreEvent = async e => {
    setEvents(l => [...l.filter(x => x.id !== e.id), e]);
    await run(supabase.from('events').upsert(e)).catch(() => {});
  };
  // 하루 안의 메뉴 순서 바꾸기 (꾹 눌러서 끌기). ids: 새 순서
  const reorderEvents = async ids => {
    if (!guard()) return;
    const at = new Map(ids.map((id, i) => [id, i]));
    setEvents(l => l.map(e => at.has(e.id) ? { ...e, pos: at.get(e.id) } : e));
    await Promise.all(ids.map((id, i) => run(supabase.from('events').update({ pos: i }).eq('id', id)).catch(() => {})));
  };

  // ---- 레시피 ----
  const clean = r => ({ id: r.id, table_id: tableId, source: r.source, source_url: r.source_url || '', links: r.links || [], dishes: r.dishes, imported_from: r.imported_from || null });
  const addRecipes = async list => {
    if (!guard()) return [];
    const now = Date.now();
    const rows = list.map((r, i) => ({ ...clean({ ...r, id: r.id || newId() }), created_by: user.id, created_at: new Date(now - i).toISOString() }));
    setRecipes(l => sortRecipes([...rows, ...l]));
    await run(supabase.from('recipes').insert(rows.map(({ created_by, ...x }) => ({ ...x, created_at: x.created_at })))).catch(() => {});
    return rows;
  };
  const updateRecipe = async r => {
    if (!guard()) return;
    setRecipes(l => l.map(x => x.id === r.id ? { ...x, ...r } : x));
    await run(supabase.from('recipes').update({ source: r.source, source_url: r.source_url || '', links: r.links || [], dishes: r.dishes }).eq('id', r.id)).catch(() => {});
  };
  const deleteRecipe = async id => {
    if (!guard()) return;
    setRecipes(l => l.filter(x => x.id !== id));
    setEvents(l => l.map(e => e.recipe_id === id ? { ...e, recipe_id: null, dish_id: null } : e));
    await run(supabase.from('recipes').delete().eq('id', id)).catch(() => {});
  };
  // 메뉴 여러 개 → 메뉴별 레시피 (달력 일정 연결도 옮김)
  const splitRecipe = async (r, partsIn) => {
    if (!guard()) return [];
    const dishes = partsIn || r.dishes;
    const [first, ...rest] = dishes;
    await updateRecipe({ ...r, dishes: [first] });
    const made = await addRecipes(rest.map(d => ({ ...r, id: newId(), dishes: [d] })));
    for (const m of made) {
      const did = m.dishes[0].id;
      const evs = events.filter(e => e.recipe_id === r.id && e.dish_id === did);
      if (evs.length) {
        setEvents(l => l.map(e => evs.some(x => x.id === e.id) ? { ...e, recipe_id: m.id } : e));
        await run(supabase.from('events').update({ recipe_id: m.id }).in('id', evs.map(e => e.id))).catch(() => {});
      }
    }
    return [{ ...r, dishes: [first] }, ...made];
  };

  // ---- 장바구니 (같은 재료는 합치기) ----
  const addShopping = async items => {
    if (!guard()) return 0;
    let list = [...shopping]; const inserts = [], updates = [];
    for (const it of items) {
      const ex = list.find(i => !i.checked && norm(i.name) === norm(it.name) && (i.unit || '') === (it.unit || ''));
      if (ex) {
        const a = parseAmount(ex.amount), b = parseAmount(it.amount);
        const amount = a != null && b != null ? fmtAmount(a + b) : ex.amount === it.amount ? ex.amount : [ex.amount, it.amount].filter(Boolean).join(' + ');
        const upd = { ...ex, amount, sources: [...(ex.sources || []), ...(it.sources || [])] };
        list = list.map(i => i.id === ex.id ? upd : i); updates.push(upd);
      } else {
        const row = { id: newId(), table_id: tableId, checked: false, sources: [], amount: '', unit: '', ...it, created_by: user.id, created_at: new Date().toISOString() };
        list.push(row); inserts.push(row);
      }
    }
    setShopping(list);
    if (inserts.length) await run(supabase.from('shopping_items').insert(inserts.map(({ created_by, ...x }) => x))).catch(() => {});
    for (const u of updates) await run(supabase.from('shopping_items').update({ amount: u.amount, sources: u.sources }).eq('id', u.id)).catch(() => {});
    return items.length;
  };
  const toggleShopping = async item => {
    if (!guard()) return;
    setShopping(l => l.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i));
    await run(supabase.from('shopping_items').update({ checked: !item.checked }).eq('id', item.id)).catch(() => {});
  };
  const deleteShopping = async item => {
    if (!guard()) return;
    setShopping(l => l.filter(i => i.id !== item.id));
    await run(supabase.from('shopping_items').delete().eq('id', item.id)).catch(() => {});
  };
  const restoreShopping = async item => { setShopping(l => [...l, item]); await run(supabase.from('shopping_items').upsert(item)).catch(() => {}); };
  const clearChecked = async () => {
    if (!guard()) return;
    const ids = shopping.filter(i => i.checked).map(i => i.id);
    setShopping(l => l.filter(i => !i.checked));
    if (ids.length) await run(supabase.from('shopping_items').delete().in('id', ids)).catch(() => {});
  };

  // 장바구니에서 산 걸 체크하면 냉장고로 (같은 재료가 있으면 양을 합쳐요). 되돌리기 함수를 돌려줘요
  const buyShopping = async item => {
    if (!guard()) return null;
    const amt = [item.amount, item.unit].filter(Boolean).join('');
    setShopping(l => l.map(i => i.id === item.id ? { ...i, checked: true } : i));
    await run(supabase.from('shopping_items').update({ checked: true }).eq('id', item.id)).catch(() => {});
    const uncheck = async () => {
      setShopping(l => l.map(i => i.id === item.id ? { ...i, checked: false } : i));
      await run(supabase.from('shopping_items').update({ checked: false }).eq('id', item.id)).catch(() => {});
    };
    const ex = fridge.find(f => norm(f.name) === norm(item.name));
    if (ex) {
      await updateFridge(ex, { amount: mergeAmount(ex.amount, amt) });
      return async () => { await uncheck(); await updateFridge(ex, { amount: ex.amount }); };
    }
    const place = guessFood(item.name).place;
    const [row] = await addFridge([{ name: item.name, amount: amt, place, expires: guessExpires(item.name, place) }]);
    return async () => { await uncheck(); if (row) await deleteFridge(row); };
  };

  // ---- 냉장고 ----
  const addFridge = async items => {
    if (!guard()) return [];
    const rows = items.map(it => ({ id: newId(), table_id: tableId, name: it.name.trim().slice(0, 40), amount: (it.amount || '').slice(0, 30), place: it.place || 'fridge', expires: it.expires || null, created_by: user.id, created_at: new Date().toISOString() }));
    setFridge(l => [...l, ...rows]);
    await run(supabase.from('fridge_items').insert(rows)).catch(() => {});
    return rows;
  };
  const updateFridge = async (f, patch) => {
    if (!guard()) return;
    setFridge(l => l.map(x => x.id === f.id ? { ...x, ...patch } : x));
    await run(supabase.from('fridge_items').update(patch).eq('id', f.id)).catch(() => {});
  };
  const deleteFridge = async f => {
    if (!guard()) return;
    setFridge(l => l.filter(x => x.id !== f.id));
    await run(supabase.from('fridge_items').delete().eq('id', f.id)).catch(() => {});
  };
  const restoreFridge = async f => {
    setFridge(l => [...l.filter(x => x.id !== f.id), f]);
    await run(supabase.from('fridge_items').upsert(f)).catch(() => {});
  };

  // ---- 별점 · 즐겨찾기 (사람마다) ----
  // 한줄평: 한 사람이 여러 개 남길 수 있어요
  const addReview = async (recipeId, dishId, { stars, text }) => {
    const now = new Date().toISOString();
    const row = { id: newId(), table_id: tableId, recipe_id: recipeId, dish_id: dishId, user_id: user.id, stars, text: (text || '').slice(0, 80), created_at: now, updated_at: now };
    setReviews(l => [...l, row]);
    await run(supabase.from('reviews').insert(row)).catch(() => {});
  };
  const updateReview = async (r, { stars, text }) => {
    const patch = { stars, text: (text || '').slice(0, 80), updated_at: new Date().toISOString() };
    setReviews(l => l.map(x => x.id === r.id ? { ...x, ...patch } : x));
    await run(supabase.from('reviews').update(patch).eq('id', r.id)).catch(() => {});
  };
  const deleteReview = async r => {
    setReviews(l => l.filter(x => x.id !== r.id));
    await run(supabase.from('reviews').delete().eq('id', r.id)).catch(() => {});
  };
  const restoreReview = async r => {
    setReviews(l => [...l.filter(x => x.id !== r.id), r]);
    await run(supabase.from('reviews').upsert(r)).catch(() => {});
  };
  const isFav = (recipeId, dishId) => favorites.some(f => f.recipe_id === recipeId && f.dish_id === dishId);
  const toggleFav = async (recipeId, dishId) => {
    const key = { user_id: user.id, recipe_id: recipeId, dish_id: dishId };
    if (isFav(recipeId, dishId)) {
      setFavorites(l => l.filter(f => !(f.recipe_id === recipeId && f.dish_id === dishId)));
      await run(supabase.from('favorites').delete().match(key)).catch(() => {});
    } else {
      setFavorites(l => [...l, { ...key, table_id: tableId }]);
      await run(supabase.from('favorites').insert({ ...key, table_id: tableId })).catch(() => {});
    }
  };

  // ---- 날짜별 한마디 ----
  const addNote = async (date, text) => {
    const row = { id: newId(), table_id: tableId, date, user_id: user.id, text: text.trim().slice(0, 200), likes: [], created_at: new Date().toISOString() };
    if (!row.text) return;
    setNotes(l => [...l, row]);
    await run(supabase.from('day_notes').insert(row)).catch(() => {});
  };
  const deleteNote = async n => {
    setNotes(l => l.filter(x => x.id !== n.id));
    await run(supabase.from('day_notes').delete().eq('id', n.id)).catch(() => {});
  };
  const toggleNoteLike = async n => {
    const likes = n.likes?.includes(user.id) ? n.likes.filter(x => x !== user.id) : [...(n.likes || []), user.id];
    setNotes(l => l.map(x => x.id === n.id ? { ...x, likes } : x));
    await run(supabase.from('day_notes').update({ likes }).eq('id', n.id)).catch(() => {});
  };

  // ---- 먹고싶어요 ----
  const addWish = async (title, period) => {
    const t2 = title.trim().slice(0, 60);
    if (!t2) return;
    const row = { id: newId(), table_id: tableId, title: t2, period, period_key: periodKey(period), created_by: user.id, votes: [user.id], done_date: null, recipe_id: null, dish_id: null, created_at: new Date().toISOString() };
    setWishes(l => [...l, row]);
    await run(supabase.from('wishes').insert(row)).catch(() => {});
  };
  const updateWish = async (w, patch) => {
    setWishes(l => l.map(x => x.id === w.id ? { ...x, ...patch } : x));
    await run(supabase.from('wishes').update(patch).eq('id', w.id)).catch(() => {});
  };
  const toggleWishVote = w => updateWish(w, { votes: w.votes?.includes(user.id) ? w.votes.filter(x => x !== user.id) : [...(w.votes || []), user.id] });
  const deleteWish = async w => {
    setWishes(l => l.filter(x => x.id !== w.id));
    await run(supabase.from('wishes').delete().eq('id', w.id)).catch(() => {});
  };

  // ---- 카테고리 ----
  const addCategory = async c => {
    if (!guard()) return;
    const row = { id: newId(), table_id: tableId, position: (categories.at(-1)?.position ?? 0) + 1, ...c };
    setCategories(l => [...l, row]);
    await run(supabase.from('categories').insert(row)).catch(() => {});
  };
  const updateCategory = async c => {
    if (!guard()) return;
    setCategories(l => l.map(x => x.id === c.id ? c : x));
    await run(supabase.from('categories').update({ label: c.label, grp: c.grp, bg: c.bg, fg: c.fg }).eq('id', c.id)).catch(() => {});
  };
  const deleteCategory = async c => {
    if (!guard()) return;
    setCategories(l => l.filter(x => x.id !== c.id));
    setEvents(l => l.filter(e => e.category_id !== c.id));
    await run(supabase.from('events').delete().eq('category_id', c.id)).catch(() => {});
    await run(supabase.from('categories').delete().eq('id', c.id)).catch(() => {});
  };
  const moveCategory = async (c, dir) => {
    if (!guard()) return;
    const i = categories.findIndex(x => x.id === c.id), j = i + dir;
    if (i < 0 || j < 0 || j >= categories.length) return;
    const a = categories[i], b = categories[j];
    setCategories(l => l.map(x => x.id === a.id ? { ...x, position: b.position } : x.id === b.id ? { ...x, position: a.position } : x).sort((p, q) => p.position - q.position));
    await run(supabase.from('categories').update({ position: b.position }).eq('id', a.id)).catch(() => {});
    await run(supabase.from('categories').update({ position: a.position }).eq('id', b.id)).catch(() => {});
  };

  // ---- 식탁 · 멤버 ----
  const updateTable = async patch => {
    if (!guard()) return;
    setTable(t => ({ ...t, ...patch }));
    await run(supabase.from('tables').update(patch).eq('id', tableId)).catch(() => {});
  };
  const updateSettings = patch => updateTable({ settings: { ...(table?.settings || {}), ...patch } });
  const rotateCode = async which => { await run(supabase.rpc('rotate_codes', { t: tableId, which })).catch(() => {}); load(); };
  const setMemberRole = async (userId, role) => {
    setMembers(l => l.map(m => m.user_id === userId ? { ...m, role } : m));
    await run(supabase.from('table_members').update({ role }).match({ table_id: tableId, user_id: userId })).catch(() => {});
  };
  const removeMember = async userId => {
    setMembers(l => l.filter(m => m.user_id !== userId));
    await run(supabase.from('table_members').delete().match({ table_id: tableId, user_id: userId })).catch(() => {});
  };
  const deleteTable = async () => { await run(supabase.from('tables').delete().eq('id', tableId)); };

  // ---- 조회 도우미 ----
  const catMap = useMemo(() => Object.fromEntries(categories.map((c, i) => [c.id, { ...c, order: i }])), [categories]);
  const getCat = id => catMap[id] || { id, label: '기타', grp: 'life', bg: '#EFEFEF', fg: '#5C5F5B', order: 99 };
  // 하루 안 메뉴 순서: 직접 바꾼 순서(pos)가 먼저, 없으면 끼니 카테고리 순서
  const evKey = e => (e.pos ?? null) !== null ? e.pos : 100 + getCat(e.category_id).order;
  const evCmp = (a, b) => evKey(a) - evKey(b) || String(a.created_at).localeCompare(String(b.created_at));
  const profileOf = uid => {
    const m = members.find(x => x.user_id === uid);
    return m?.profiles ? { nickname: m.profiles.nickname, tint: m.profiles.tint } : uid === user.id && profile ? profile : null;
  };
  const findDish = (rid, did) => {
    const r = recipes.find(x => x.id === rid);
    return r ? { recipe: r, dish: r.dishes.find(d => d.id === did) || r.dishes[0] } : {};
  };

  const value = {
    status, table, settings, members, categories, recipes, events, shopping, fridge, reviews, favorites, notes, wishes,
    me: user.id, myRole, canWrite, periodKey, isOwner: myRole === 'owner', others, setEditing, isBasic, getCat, profileOf, findDish, reload: load,
    addEvent, deleteEvent, restoreEvent, reorderEvents, evCmp, addRecipes, updateRecipe, deleteRecipe, splitRecipe,
    addShopping, toggleShopping, deleteShopping, restoreShopping, clearChecked, buyShopping,
    addFridge, updateFridge, deleteFridge, restoreFridge,
    addNote, deleteNote, toggleNoteLike, addWish, updateWish, toggleWishVote, deleteWish,
    addReview, updateReview, deleteReview, restoreReview, isFav, toggleFav, addCategory, updateCategory, deleteCategory, moveCategory,
    updateTable, updateSettings, rotateCode, setMemberRole, removeMember, deleteTable,
  };
  return <TableCtx.Provider value={value}>{children}</TableCtx.Provider>;
}

export const useTable = () => useContext(TableCtx);
export const editorsOf = (others, kind, id) => others.filter(o => o.editing && o.editing.kind === kind && (id == null || o.editing.id === id));

// 화면이 열려 있는 동안 "고치는 중"으로 알림
export function useEditingPresence(ed) {
  const { setEditing } = useTable();
  const key = ed ? `${ed.kind}|${ed.id}` : '';
  useEffect(() => { if (!ed) return undefined; setEditing(ed); return () => setEditing(null); }, [key]);
}
