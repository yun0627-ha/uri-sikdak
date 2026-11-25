import { WEEKDAYS, RTYPE } from './constants.js';

// ---- 날짜 ----
const pad = n => String(n).padStart(2, '0');
export const toKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const startOfWeek = (d, weekStart = 0) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return addDays(x, -((x.getDay() - weekStart + 7) % 7)); };
export const labelDate = k => { const d = fromKey(k); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`; };
export const longDate = k => { const d = fromKey(k); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`; };
export const shortDate = k => { const d = fromKey(k); return `${d.getMonth() + 1}/${d.getDate()}`; };
export const todayKey = () => toKey(new Date());

// ---- 기타 ----
export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}`;
export const clone = o => JSON.parse(JSON.stringify(o));
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const norm = s => String(s || '').replace(/\s/g, '');
export const hostOf = u => { try { return new URL(u).host.replace(/^www\./, ''); } catch (e) { return u; } };
export const isHttps = u => /^https?:\/\/\S+\.\S+/.test(String(u || '').trim());

export const detectSource = url => {
  const u = (url || '').toLowerCase();
  if (!u) return '직접 입력';
  if (u.includes('youtu')) return 'YouTube';
  if (u.includes('instagram')) return 'Instagram';
  if (u.includes('tiktok')) return 'TikTok';
  return '블로그';
};

// ---- 수량 ----
export const parseAmount = s => {
  const t = String(s ?? '').trim();
  if (/^\d+\/\d+$/.test(t)) { const [a, b] = t.split('/').map(Number); return b ? a / b : null; }
  if (/^\d*\.?\d+$/.test(t)) return parseFloat(t);
  return null;
};
export const fmtAmount = n => { const r = Math.round(n * 10) / 10; return Number.isInteger(r) ? String(r) : r.toFixed(1); };
export const scaleAmount = (amount, ratio) => { const n = parseAmount(amount); return n == null ? amount : fmtAmount(n * ratio); };

// ---- 레시피 ----
export const emptyDish = () => ({ id: uid('d'), title: '', type: 'main', servings: 2, tags: [], ingredients: [{ name: '', amount: '', unit: '' }], steps: [''], tips: { cooking: '', tools: '', memo: '' } });
export const recipeTitle = r => r.dishes.length > 1 ? `${r.dishes[0].title} 외 ${r.dishes.length - 1}개` : (r.dishes[0]?.title || '이름 없음');

// AI 답을 앱의 메뉴 구조로 다듬기 (믿을 수 없는 값은 버림)
export function normalizeDishes(out) {
  const arr = out && Array.isArray(out.dishes) ? out.dishes : Array.isArray(out) ? out : [];
  const str = v => (typeof v === 'string' || typeof v === 'number') ? String(v).trim() : '';
  return arr.slice(0, 6).map(d => ({
    id: uid('d'), title: str(d && d.title).slice(0, 60), type: d && RTYPE[d.type] ? d.type : 'main',
    servings: Math.min(20, Math.max(1, parseInt(d && d.servings, 10) || 2)),
    tags: (Array.isArray(d && d.tags) ? d.tags : []).map(t => str(t).replace(/^#/, '')).filter(Boolean).slice(0, 6),
    ingredients: (Array.isArray(d && d.ingredients) ? d.ingredients : []).slice(0, 40)
      .map(i => typeof i === 'string' ? { name: i.trim().slice(0, 40), amount: '', unit: '' } : { name: str(i && i.name).slice(0, 40), amount: str(i && i.amount).slice(0, 12), unit: str(i && i.unit).slice(0, 10) })
      .filter(i => i.name),
    steps: (Array.isArray(d && d.steps) ? d.steps : []).map(x => str(x).replace(/^\d+[.)]\s*/, '').slice(0, 400)).filter(Boolean).slice(0, 30),
    tips: { cooking: str(d && d.tips && d.tips.cooking).slice(0, 400), tools: str(d && d.tips && d.tips.tools).slice(0, 400), memo: '' },
  })).filter(d => d.title && (d.ingredients.length || d.steps.length));
}

export const makeIsBasic = basics => { const set = new Set((basics || []).map(norm)); return name => set.has(norm(name)); };

export function dishToShopping(recipe, dish, { servings, excludeBasic, isBasic, date, only }) {
  const ratio = (servings || dish.servings) / (dish.servings || 1);
  return dish.ingredients
    .filter(i => i.name.trim() && !(excludeBasic && isBasic(i.name)) && (!only || only.includes(i.name)))
    .map(i => ({ name: i.name.trim(), amount: scaleAmount(i.amount, ratio), unit: i.unit || '', sources: [{ recipe_id: recipe.id, title: dish.title, date: date || null }] }));
}

// 냉털: 재료 이름이 서로 포함되면 같은 재료로 봄 ('닭' ↔ '닭가슴살')
export const hasIng = (fridge, name) => fridge.some(f => { const a = norm(f), b = norm(name); return a && (b.includes(a) || a.includes(b)); });
export function fridgeMatch(dish, fridge, isBasic) {
  const need = dish.ingredients.filter(i => i.name.trim() && !isBasic(i.name));
  const have = need.filter(i => hasIng(fridge, i.name));
  return { have, missing: need.filter(i => !have.includes(i)), total: need.length };
}
