import { useEffect, useRef, useState } from 'react';
import { useTable, useEditingPresence, editorsOf } from '../hooks/useTable.jsx';
import { EditingBanner, Icon, I, Spinner, focus, useToast } from './ui.jsx';
import { RECIPE_TYPES } from '../lib/constants.js';
import { clone, detectSource, emptyDish, uid } from '../lib/utils.js';
import { autoParse, fetchPhoto, shrinkImage, uploadPhoto } from '../lib/ai.js';
import { photosOf } from '../lib/photoPref.js';
import { supabase } from '../lib/supabase.js';

// 작은 글씨용 공통 스타일
const box = 'w-full rounded-xl bg-[#F4F5F2] border border-transparent px-3 text-[14px] text-ink placeholder:text-faintink focus:outline-none focus:border-sage focus:bg-white';
const card = 'rounded-2xl bg-white border border-line px-4 py-3.5';
const label = 'block text-[13px] font-semibold text-ink mb-2';
const chip = on => `shrink-0 h-8 px-3 rounded-full text-[12px] border transition-colors ${focus} ${on ? 'border-sage bg-sage-faint text-sage font-semibold' : 'border-line bg-white text-muted'}`;

// 재료: 한 줄에 하나 ("대파 1대", "통후추 약간")
const AMOUNT_WORDS = /^(약간|적당량|조금|한줌|한꼬집|취향껏|톡톡)$/;
export const ingToText = list => list.filter(i => i.name.trim()).map(i => [i.name, `${i.amount || ''}${i.unit || ''}`].filter(Boolean).join(' ')).join('\n');
export function textToIng(text) {
  return String(text || '').split('\n').map(l => l.replace(/^[-•·*\s]+/, '').trim()).filter(Boolean).map(line => {
    const m = line.match(/^(.*?)\s+([\d./~½¼⅓]+)\s*(.*)$/);
    if (m && m[1]) return { name: m[1].trim(), amount: m[2], unit: m[3].trim() };
    const parts = line.split(/\s+/);
    if (parts.length > 1 && AMOUNT_WORDS.test(parts[parts.length - 1])) return { name: parts.slice(0, -1).join(' '), amount: parts[parts.length - 1], unit: '' };
    return { name: line, amount: '', unit: '' };
  });
}
// 조리법: "1. ..." 번호로 구분
export const stepsToText = steps => steps.filter(s => s.trim()).map((s, i) => `${i + 1}. ${s}`).join('\n');
export function textToSteps(text) {
  const t = String(text || '').trim();
  if (!t) return [];
  const parts = /(^|\n)\s*\d+[.)]\s/.test(t) ? t.split(/(?:^|\n)\s*\d+[.)]\s*/) : t.split('\n');
  return parts.map(s => s.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
}

const toDraft = d => ({ id: d.id || uid('d'), photos: photosOf(d), title: d.title || '', type: d.type || 'main', servings: d.servings || 2, tags: d.tags || [],
  ing: ingToText(d.ingredients || []), steps: stepsToText(d.steps || []), memo: [d.tips?.cooking, d.tips?.tools, d.tips?.memo].filter(Boolean).join('\n') });
const fromDraft = d => ({ id: d.id, photo: d.photos[0] || '', photos: d.photos, title: d.title.trim(), type: d.type, servings: d.servings, tags: d.tags,
  ingredients: textToIng(d.ing), steps: textToSteps(d.steps), tips: { cooking: '', tools: '', memo: d.memo.trim() } });

function Grow({ value, onChange, placeholder, minRows = 4, ...rest }) {
  const ref = useRef(null);
  useEffect(() => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight + 2}px`; } }, [value]);
  return <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)} rows={minRows} placeholder={placeholder}
    className={box + ' py-2.5 leading-[1.7] resize-none overflow-hidden'} {...rest} />;
}

function TagEdit({ tags, onChange }) {
  const [v, setV] = useState('');
  const [open, setOpen] = useState(false);
  const add = () => { const t = v.trim().replace(/^#/, ''); if (t && !tags.includes(t)) onChange([...tags, t]); setV(''); setOpen(false); };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map(t => (
        <span key={t} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-full border border-[#E3C7D0] bg-[#FBF1F4] text-[12px] text-[#9A5368]">#{t}
          <button type="button" aria-label={`${t} 지우기`} onClick={() => onChange(tags.filter(x => x !== t))} className="h-4 w-4 grid place-items-center"><Icon d={I.x} size={11} /></button>
        </span>
      ))}
      {open
        ? <input autoFocus value={v} onChange={e => setV(e.target.value)} onBlur={add} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder="태그" className="h-7 w-24 rounded-full border border-line px-2.5 text-[12px] focus:outline-none focus:border-sage" />
        : <button type="button" aria-label="태그 추가" onClick={() => setOpen(true)} className="h-7 w-7 grid place-items-center rounded-full border border-[#E3C7D0] text-[#9A5368]"><Icon d={I.plus} size={13} /></button>}
    </div>
  );
}

// 레시피 입력 · 편집 (전체 화면). initial: { url, dishes } — 자동 분석 결과를 받아서 채워 둠
export default function RecipeForm({ recipe, initial, onClose, onSaved }) {
  const t = useTable();
  const toast = useToast();
  const editing = !!recipe;
  useEditingPresence(editing ? { kind: 'recipe', id: recipe.id, label: recipe.dishes[0]?.title } : null);
  const formEditors = editing ? editorsOf(t.others, 'recipe', recipe.id) : [];
  const [url, setUrl] = useState(recipe?.source_url || initial?.url || '');
  const [links, setLinks] = useState(recipe?.links || []);
  const [drafts, setDrafts] = useState(() => (recipe ? clone(recipe.dishes) : initial?.dishes?.length ? initial.dishes : [emptyDish()]).map(toDraft));
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [newLink, setNewLink] = useState('');
  const fileRef = useRef(null), photoRef = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const d = drafts[active] || drafts[0];
  const set = (k, v) => setDrafts(ds => ds.map((x, i) => i === active ? { ...x, [k]: v } : x));

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const analyze = async files => {
    setBusy(true); setErr('');
    try {
      const list = files ? [...files].slice(0, 4) : null;
      const images = list ? await Promise.all(list.map(f => shrinkImage(f))) : null;
      // 캡처는 레시피 사진으로도 저장 (상세 화면에서 전부 보이게)
      const ups = list ? Promise.all(list.map(f => uploadPhoto(supabase, f, 1400).catch(() => ''))) : null;
      const result = await autoParse(supabase, url.trim(), images);
      const caps = ups ? (await ups).filter(Boolean) : [];
      setDrafts(result.map(x => ({ ...toDraft(x), ...(caps.length ? { photos: caps } : {}) }))); setActive(0);
      toast(result.length > 1 ? `메뉴 ${result.length}개를 불러왔어요` : '레시피를 불러왔어요');
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const pickPhotos = async files => {
    setPhotoBusy(true);
    try {
      const urls = await Promise.all([...files].slice(0, 10).map(f => uploadPhoto(supabase, f, 1400)));
      set('photos', [...d.photos, ...urls].slice(0, 10));
    } catch (e) { toast(e.message); }
    setPhotoBusy(false);
  };
  const grabPhoto = async () => {
    setPhotoBusy(true);
    const p = await fetchPhoto(supabase, url.trim());
    if (p) set('photos', [p, ...d.photos]); else toast('이 링크에서는 사진을 찾지 못했어요. 직접 올려 주세요.');
    setPhotoBusy(false);
  };

  const dishes = drafts.map(fromDraft);
  const badIdx = dishes.findIndex(x => !x.title || !x.ingredients.length);
  const valid = !busy && !saving && badIdx === -1;
  const base = { source: detectSource(url.trim()), source_url: url.trim(), links };

  const save = async split => {
    if (!valid) { setErr(`${drafts.length > 1 ? `${badIdx + 1}번 메뉴: ` : ''}레시피명과 재료를 적어 주세요.`); return; }
    setSaving(true);
    try {
      if (editing) {
        if (split && dishes.length > 1) {
          const parts = await t.splitRecipe({ ...recipe, ...base }, dishes);
          toast(`메뉴 ${parts.length}개를 따로 저장했어요`); onSaved(parts[0].id, parts[0].dishes[0].id);
        } else {
          await t.updateRecipe({ ...recipe, ...base, dishes }); toast('레시피를 고쳤어요'); onSaved(recipe.id, dishes[Math.min(active, dishes.length - 1)].id);
        }
      } else {
        const list = split ? dishes.map(x => ({ ...base, dishes: [x] })) : [{ ...base, dishes }];
        const made = await t.addRecipes(list);
        if (!made.length) return;
        toast(`'${dishes[0].title}'${dishes.length > 1 ? ` 외 ${dishes.length - 1}개` : ''}를 저장했어요`);
        onSaved(made[0].id, made[0].dishes[0].id);
      }
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#FAFAF7] overflow-y-auto" role="dialog" aria-modal="true" aria-label="레시피 입력">
      <header className="sticky top-0 z-10 bg-[#FAFAF7]/95 backdrop-blur border-b border-line h-12 flex items-center justify-between px-2">
        <button type="button" onClick={onClose} aria-label="뒤로" className={`h-10 w-10 grid place-items-center rounded-full text-ink ${focus}`}><Icon d={I.left} size={20} /></button>
        <h1 className="text-[15px] font-semibold text-ink">{editing ? '레시피 편집' : '레시피 입력'}</h1>
        <button type="button" onClick={() => save(false)} disabled={saving} className={`h-8 px-3.5 mr-1 rounded-full bg-sage text-white text-[13px] font-medium disabled:opacity-40 ${focus}`}>{saving ? <Spinner size={14} /> : '저장'}</button>
      </header>

      <div className="mx-auto max-w-[640px] px-3 py-3 flex flex-col gap-2.5 pb-28">
        {formEditors.length > 0 && <EditingBanner people={formEditors} what="이 레시피를 함께 열어 두었어요" />}

        {/* 링크로 다시 불러오기 */}
        <div className={card + ' !py-3'}>
          <div className="flex gap-2">
            <input value={url} onChange={e => setUrl(e.target.value)} inputMode="url" placeholder="레시피 링크 (유튜브 · 블로그 · 인스타)" className={box + ' h-9'} />
            <button type="button" onClick={() => analyze()} disabled={busy || !url.trim()} className={`shrink-0 h-9 px-3 rounded-xl bg-sage text-white text-[13px] font-medium disabled:opacity-40 ${focus}`}>{busy ? <Spinner size={14} /> : '자동 분석'}</button>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { const f = e.target.files; if (f && f.length) analyze(f); e.target.value = ''; }} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="inline-flex items-center gap-1 text-[12px] text-sage"><Icon d={I.download} size={13} />캡처 사진으로 불러오기</button>
            {busy && <span className="text-[12px] text-muted">분석 중… (영상은 30초쯤)</span>}
          </div>
          {err && <p className="mt-2 text-[12px] text-[#9E4742]">{err}</p>}
        </div>

        {drafts.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {drafts.map((x, i) => (
              <button key={x.id} type="button" onClick={() => setActive(i)} className={chip(i === active)}>#{x.title || `메뉴 ${i + 1}`}</button>
            ))}
            <button type="button" onClick={() => { setDrafts(ds => ds.filter((_, i) => i !== active)); setActive(0); }} className="shrink-0 h-8 px-2.5 text-[12px] text-[#9E4742]">이 메뉴 빼기</button>
          </div>
        )}

        <div className={card}>
          <div className="mb-3 pb-3 border-b border-line">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] text-muted">사진 · 캡처 <span className="text-faintink">{d.photos.length ? `${d.photos.length}장 · 첫 장이 대표` : '상세 화면에 전부 보여요'}</span></span>
              {photoBusy && <Spinner size={14} />}
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {d.photos.map((p, i) => (
                <div key={p + i} className="relative shrink-0">
                  <img src={p} alt="" className="h-16 w-16 rounded-xl object-cover border border-line bg-[#EEF0EB]" />
                  <button type="button" aria-label={`${i + 1}번째 사진 빼기`} onClick={() => set('photos', d.photos.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 h-5 w-5 grid place-items-center rounded-full bg-ink/70 text-white"><Icon d={I.x} size={10} /></button>
                  {i > 0 && <button type="button" onClick={() => set('photos', [p, ...d.photos.filter((_, j) => j !== i)])} className="absolute bottom-0.5 left-0.5 right-0.5 h-4 rounded-md bg-white/85 text-[10px] text-ink">대표로</button>}
                </div>
              ))}
              <button type="button" onClick={() => photoRef.current?.click()} disabled={photoBusy} aria-label="사진 추가"
                className="shrink-0 h-16 w-16 rounded-xl border border-dashed border-[#C9D1C6] grid place-items-center text-sage disabled:opacity-40"><Icon d={I.plus} size={18} /></button>
              {!d.photos.length && /^https?:\/\//.test(url.trim()) && <button type="button" onClick={grabPhoto} disabled={photoBusy} className="shrink-0 self-center h-7 px-3 rounded-full border border-[#C9D6C4] text-[12px] text-sage disabled:opacity-40">링크에서 가져오기</button>}
            </div>
            <input ref={photoRef} type="file" accept="image/*" multiple hidden onChange={e => { const f = e.target.files; if (f && f.length) pickPhotos(f); e.target.value = ''; }} />
          </div>
          <label className={label} htmlFor="r-title">레시피명</label>
          <input id="r-title" value={d.title} maxLength={60} onChange={e => set('title', e.target.value)} placeholder="예: 인생 무뼈닭발" className={box + ' h-10'} />
          <div className="mt-3 pt-3 border-t border-line">
            <span className="block text-[12px] text-muted mb-1.5">카테고리</span>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
              {RECIPE_TYPES.map(x => <button key={x.id} type="button" onClick={() => set('type', x.id)} className={chip(d.type === x.id)}>{x.label}</button>)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
            <span className="text-[12px] text-muted">기준 인분</span>
            <div className="inline-flex items-center rounded-full border border-line">
              <button type="button" aria-label="줄이기" onClick={() => set('servings', Math.max(1, d.servings - 1))} className="h-7 w-7 grid place-items-center text-muted"><Icon d={I.minus} size={13} /></button>
              <span className="w-10 text-center text-[13px] tabular-nums">{d.servings}인분</span>
              <button type="button" aria-label="늘리기" onClick={() => set('servings', Math.min(20, d.servings + 1))} className="h-7 w-7 grid place-items-center text-muted"><Icon d={I.plus} size={13} /></button>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-line">
            <span className="block text-[12px] text-muted mb-1.5">태그</span>
            <TagEdit tags={d.tags} onChange={v => set('tags', v)} />
          </div>
          <div className="mt-3 pt-3 border-t border-line">
            <span className="block text-[12px] text-muted mb-1.5">참고 링크</span>
            {links.map((l, i) => (
              <div key={i} className="flex items-center gap-2 mb-1.5 text-[12px]">
                <span className="flex-1 truncate text-ink">{l.url}</span>
                <button type="button" aria-label="링크 삭제" onClick={() => setLinks(links.filter((_, j) => j !== i))} className="text-faintink"><Icon d={I.x} size={12} /></button>
              </div>
            ))}
            {linkOpen ? (
              <div className="flex gap-2">
                <input autoFocus value={newLink} onChange={e => setNewLink(e.target.value)} inputMode="url" placeholder="https://" className={box + ' h-9'} />
                <button type="button" onClick={() => { const u = newLink.trim(); if (/^https?:\/\//.test(u)) setLinks([...links, { url: u, label: u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] }]); setNewLink(''); setLinkOpen(false); }} className="shrink-0 h-9 px-3 rounded-xl border border-line text-[13px]">추가</button>
              </div>
            ) : <button type="button" onClick={() => setLinkOpen(true)} className="inline-flex items-center gap-1 h-8 px-3 rounded-full border border-[#E8C9A0] text-[12px] text-[#B07A35]"><Icon d={I.plus} size={12} />링크 추가</button>}
          </div>
        </div>

        <div className={card}>
          <span className={label}>재료</span>
          <Grow value={d.ing} onChange={v => set('ing', v)} placeholder={'한 줄에 하나씩\n무뼈닭발 400g\n대파 1대\n고춧가루 2큰술'} />
        </div>

        <div className={card}>
          <span className={label + ' !mb-0.5'}>조리법</span>
          <p className="text-[11px] text-faintink mb-2">1. 2. 3. 번호로 구분하면 단계별로 표시돼요</p>
          <Grow value={d.steps} onChange={v => set('steps', v)} placeholder={'1. 끓는 물에 데쳐 주세요.\n2. 찬물에 헹궈 물기를 빼요.'} minRows={5} />
        </div>

        <div className={card}>
          <span className={label}>메모</span>
          <Grow value={d.memo} onChange={v => set('memo', v)} placeholder="팁, 불 조절, 다음에 바꿔 볼 점" minRows={2} />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button type="button" onClick={() => { setDrafts(ds => [...ds, toDraft(emptyDish())]); setActive(drafts.length); }} className="h-8 px-3 rounded-full border border-dashed border-[#C9D1C6] text-[12px] text-sage">+ 같은 링크에 메뉴 추가</button>
          {drafts.length > 1 && <button type="button" onClick={() => save(true)} disabled={saving} className="h-8 px-3 rounded-full border border-line text-[12px] text-ink">메뉴별로 따로 저장 ({drafts.length}개)</button>}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 bg-[#FAFAF7]/95 backdrop-blur border-t border-line px-3 py-2.5" style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom))' }}>
        <div className="mx-auto max-w-[640px] flex gap-2">
          <button type="button" onClick={onClose} className="h-11 px-5 rounded-xl border border-line bg-white text-[14px]">취소</button>
          <button type="button" onClick={() => save(false)} disabled={saving} className="flex-1 h-11 rounded-xl bg-sage text-white text-[14px] font-semibold disabled:opacity-40">{saving ? '저장 중…' : drafts.length > 1 ? '한 레시피로 저장' : '저장하기'}</button>
        </div>
      </div>
    </div>
  );
}
