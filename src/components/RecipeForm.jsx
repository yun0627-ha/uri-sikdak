import { useEffect, useRef, useState } from 'react';
import { useTable, useEditingPresence, editorsOf } from '../hooks/useTable.jsx';
import { cls, EditingBanner, Icon, I, IconButton, Modal, Spinner, Stepper, TagInput, focus, useToast } from './ui.jsx';
import { RECIPE_TYPES, rtype } from '../lib/constants.js';
import { clone, detectSource, emptyDish, sleep } from '../lib/utils.js';
import { buildPrompt, parsePasted } from '../lib/ai.js';

function DishForm({ dish, onChange }) {
  const set = (k, v) => onChange({ ...dish, [k]: v });
  const setIng = (i, k, v) => set('ingredients', dish.ingredients.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const setStep = (i, v) => set('steps', dish.steps.map((x, j) => j === i ? v : x));
  const moveStep = (i, d) => { const j = i + d; if (j < 0 || j >= dish.steps.length) return; const s = [...dish.steps]; [s[i], s[j]] = [s[j], s[i]]; set('steps', s); };
  const moveIng = (i, d) => { const j = i + d; if (j < 0 || j >= dish.ingredients.length) return; const s = [...dish.ingredients]; [s[i], s[j]] = [s[j], s[i]]; set('ingredients', s); };
  const addLink = 'mt-2 inline-flex items-center gap-1 h-8 px-3 rounded-full text-[13px] text-sage bg-sage-faint hover:bg-sage-soft';
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
        <div>
          <label className={cls.label} htmlFor={`t-${dish.id}`}>요리명</label>
          <input id={`t-${dish.id}`} value={dish.title} maxLength={60} onChange={e => set('title', e.target.value)} className={cls.input} placeholder="예: 명란 솜밥" />
        </div>
        <div><span className={cls.label}>기준 인분</span><Stepper value={dish.servings} onChange={v => set('servings', v)} suffix="인분" /></div>
      </div>
      <div>
        <span className={cls.label}>메뉴 종류</span>
        <div className="flex flex-wrap gap-1.5">
          {RECIPE_TYPES.map(x => {
            const on = dish.type === x.id;
            return <button key={x.id} type="button" aria-pressed={on} onClick={() => set('type', x.id)}
              className={`h-8 px-3 rounded-full text-[13px] border ${focus} ${on ? 'font-semibold border-transparent' : 'border-line text-muted hover:bg-canvas'}`}
              style={on ? { background: x.bg, color: x.fg } : undefined}>{x.label}</button>;
          })}
        </div>
      </div>
      <div><span className={cls.label}>태그</span><TagInput tags={dish.tags} onChange={v => set('tags', v)} /></div>
      <div>
        <span className={cls.label}>재료</span>
        <div className="flex flex-col gap-1.5">
          {dish.ingredients.map((ing, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_28px_32px] gap-1.5 items-center">
              <input value={ing.name} onChange={e => setIng(i, 'name', e.target.value)} className={cls.input} placeholder="재료명" aria-label={`재료 ${i + 1} 이름`} />
              <input value={ing.amount} onChange={e => setIng(i, 'amount', e.target.value)} className={cls.input} placeholder="수량" aria-label={`재료 ${i + 1} 수량`} />
              <input value={ing.unit} onChange={e => setIng(i, 'unit', e.target.value)} className={cls.input} placeholder="단위" aria-label={`재료 ${i + 1} 단위`} />
              <IconButton label="위로" onClick={() => moveIng(i, -1)} className="h-7 w-7" disabled={i === 0}><Icon d="M18 15l-6-6-6 6" size={14} /></IconButton>
              <IconButton label="재료 삭제" onClick={() => set('ingredients', dish.ingredients.length > 1 ? dish.ingredients.filter((_, j) => j !== i) : [{ name: '', amount: '', unit: '' }])} className="h-8 w-8"><Icon d={I.x} size={14} /></IconButton>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => set('ingredients', [...dish.ingredients, { name: '', amount: '', unit: '' }])} className={addLink}><Icon d={I.plus} size={13} />재료 추가</button>
      </div>
      <div>
        <span className={cls.label}>조리 순서</span>
        <ol className="flex flex-col gap-1.5">
          {dish.steps.map((s, i) => (
            <li key={i} className="grid grid-cols-[28px_minmax(0,1fr)_28px_32px] gap-1.5 items-start">
              <span className="mt-2 h-6 w-6 rounded-full bg-sage-soft text-sage text-[13px] font-semibold grid place-items-center tabular-nums">{i + 1}</span>
              <textarea value={s} onChange={e => setStep(i, e.target.value)} rows={2} aria-label={`${i + 1}단계`} className={cls.input + ' h-auto py-2 resize-y leading-relaxed'} placeholder="조리 과정을 적어 주세요" />
              <IconButton label="위로" onClick={() => moveStep(i, -1)} className="h-7 w-7 mt-1.5" disabled={i === 0}><Icon d="M18 15l-6-6-6 6" size={14} /></IconButton>
              <IconButton label="단계 삭제" onClick={() => set('steps', dish.steps.length > 1 ? dish.steps.filter((_, j) => j !== i) : [''])} className="h-8 w-8 mt-1"><Icon d={I.x} size={14} /></IconButton>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => set('steps', [...dish.steps, ''])} className={addLink}><Icon d={I.plus} size={13} />단계 추가</button>
      </div>
      <div>
        <span className={cls.label}>메모 & 팁</span>
        <div className="flex flex-col gap-1.5">
          {[['cooking', '조리 팁'], ['tools', '화력 · 도구 팁'], ['memo', '개인 메모']].map(([k, l]) => (
            <textarea key={k} value={dish.tips[k] || ''} onChange={e => set('tips', { ...dish.tips, [k]: e.target.value })} rows={2} aria-label={l} className={cls.input + ' h-auto py-2 resize-y leading-relaxed'} placeholder={l} />
          ))}
        </div>
      </div>
    </div>
  );
}

// 새 레시피 · 편집. 링크 + 글/캡처 → AI 정리, 메뉴 여러 개면 탭으로, 메뉴별로 나눠 저장 가능
export default function RecipeForm({ recipe, onClose, onSaved }) {
  const t = useTable();
  const toast = useToast();
  const editing = !!recipe;
  useEditingPresence(editing ? { kind: 'recipe', id: recipe.id, label: recipe.dishes[0]?.title } : null);
  const formEditors = editing ? editorsOf(t.others, 'recipe', recipe.id) : [];
  const [url, setUrl] = useState(recipe?.source_url || '');
  const [dishes, setDishes] = useState(() => recipe ? clone(recipe.dishes) : [emptyDish()]);
  const [active, setActive] = useState(0);
  const [answer, setAnswer] = useState('');
  const [showSrc, setShowSrc] = useState(!editing);
  const [phase, setPhase] = useState('idle'); // idle | filling | error | done
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [manualPrompt, setManualPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const busy = phase === 'filling';
  const setDish = (i, d) => setDishes(ds => ds.map((x, j) => j === i ? d : x));

  const fill = async src => {
    setDishes([]);
    for (let di = 0; di < src.length; di++) {
      const d = src[di];
      setDishes(ds => [...ds, { ...d, title: '', tags: [], ingredients: [], steps: [], tips: { cooking: '', tools: '', memo: '' } }]); setActive(di);
      await sleep(200); if (!alive.current) return false;
      setDishes(ds => ds.map((x, j) => j === di ? { ...x, title: d.title, type: d.type, servings: d.servings, tags: d.tags } : x));
      for (const ing of d.ingredients) { await sleep(60); if (!alive.current) return false; setDishes(ds => ds.map((x, j) => j === di ? { ...x, ingredients: [...x.ingredients, ing] } : x)); }
      for (const st of d.steps) { await sleep(110); if (!alive.current) return false; setDishes(ds => ds.map((x, j) => j === di ? { ...x, steps: [...x.steps, st] } : x)); }
      setDishes(ds => ds.map((x, j) => j === di ? { ...x, tips: { ...d.tips, memo: '' },
        ingredients: x.ingredients.length ? x.ingredients : [{ name: '', amount: '', unit: '' }], steps: x.steps.length ? x.steps : [''] } : x));
      await sleep(180);
    }
    setActive(0); return true;
  };
  const copyPrompt = async () => {
    const p = buildPrompt(url.trim());
    try { await navigator.clipboard.writeText(p); setCopied(true); setManualPrompt(''); toast('정리 요청문을 복사했어요. Claude에 붙여 넣으세요.'); }
    catch (e) { setManualPrompt(p); }
  };
  const applyAnswer = async () => {
    let result;
    try { result = parsePasted(answer); }
    catch (e) { setPhase('error'); setMsg(e.message); return; }
    setPhase('filling'); setMsg('');
    if (await fill(result)) {
      setPhase('done'); setAnswer('');
      setMsg(result.length > 1 ? `메뉴 ${result.length}개를 채웠어요. 탭을 눌러 각각 확인하고 저장하세요.` : '채웠어요. 확인하고 고친 뒤 저장하세요.');
    }
  };

  const cleaned = dishes.map(d => ({ ...d, title: d.title.trim(),
    ingredients: d.ingredients.filter(i => i.name.trim()).map(i => ({ name: i.name.trim(), amount: String(i.amount || '').trim(), unit: String(i.unit || '').trim() })),
    steps: d.steps.map(s => s.trim()).filter(Boolean),
    tips: { cooking: (d.tips.cooking || '').trim(), tools: (d.tips.tools || '').trim(), memo: (d.tips.memo || '').trim() } }));
  const badIdx = cleaned.findIndex(d => !d.title || !d.ingredients.length);
  const valid = !busy && !saving && dishes.length > 0 && badIdx === -1;
  const base = { source: detectSource(url.trim()), source_url: url.trim(), links: recipe?.links || [] };

  const save = async split => {
    if (!valid) return;
    setSaving(true);
    try {
      if (editing) {
        if (split && cleaned.length > 1) {
          const parts = await t.splitRecipe({ ...recipe, ...base }, cleaned);
          toast(`메뉴 ${parts.length}개를 각각의 레시피로 저장했어요`);
          onSaved(parts[0].id, parts[0].dishes[0].id);
        } else {
          await t.updateRecipe({ ...recipe, ...base, dishes: cleaned });
          toast('레시피를 고쳤어요');
          onSaved(recipe.id, cleaned[Math.min(active, cleaned.length - 1)].id);
        }
      } else {
        const list = split ? cleaned.map(d => ({ ...base, dishes: [d] })) : [{ ...base, dishes: cleaned }];
        const made = await t.addRecipes(list);
        if (!made.length) return;
        toast(split ? `메뉴 ${made.length}개를 각각의 레시피로 저장했어요` : `'${cleaned[0].title}'${cleaned.length > 1 ? ` 외 ${cleaned.length - 1}개` : ''}를 저장했어요`);
        onSaved(made[0].id, made[0].dishes[0].id);
      }
    } finally { if (alive.current) setSaving(false); }
  };
  const removeDish = i => { setDishes(ds => ds.filter((_, j) => j !== i)); setActive(a => Math.max(0, a >= i ? a - 1 : a)); };

  return (
    <Modal title={editing ? '레시피 편집' : '새 레시피 추가'} onClose={onClose} size="lg"
      footer={<>
        <span className="flex-1 text-[13px] text-faintink">{busy ? '' : badIdx !== -1 ? `${dishes.length > 1 ? `${badIdx + 1}번 메뉴: ` : ''}요리명과 재료 1개 이상이 필요해요` : ''}</span>
        <button type="button" onClick={onClose} className={cls.ghost}>취소</button>
        {dishes.length > 1 && <button type="button" onClick={() => save(true)} disabled={!valid} className={cls.ghost}><Icon d={I.split} size={15} />메뉴별로 나눠 저장 ({dishes.length}개)</button>}
        <button type="button" onClick={() => save(false)} disabled={!valid} className={cls.primary}>{saving && <Spinner />}{dishes.length > 1 ? '한 레시피로 저장' : '저장'}</button>
      </>}>
      {formEditors.length > 0 && <div className="mb-3"><EditingBanner people={formEditors} what="이 레시피를 함께 열어 두었어요" /></div>}
      <div className="rounded-2xl border border-line bg-canvas/60 p-3.5">
        <label className={cls.label} htmlFor="src-url">레시피 링크 <span className="font-normal text-faintink">(원문 바로가기로 저장돼요)</span></label>
        <input id="src-url" value={url} onChange={e => setUrl(e.target.value)} className={cls.input + ' rounded-full'} placeholder="유튜브, 블로그, 인스타그램 링크" inputMode="url" />
        {editing && !showSrc ? (
          <button type="button" onClick={() => setShowSrc(true)} className="mt-2 text-[13px] text-sage h-7">Claude로 다시 정리하기</button>
        ) : (
          <div className="mt-4">
            <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink"><Icon d={I.spark} size={15} className="text-sage" />Claude로 정리하기 <span className="text-[13px] font-normal text-muted">추가 비용 없음</span></p>
            <ol className="mt-2 flex flex-col gap-3">
              <li className="flex gap-2.5">
                <span className="h-6 w-6 shrink-0 rounded-full bg-sage text-white text-[13px] font-semibold grid place-items-center">1</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-ink leading-relaxed">요청문을 복사해서 Claude 채팅에 붙여 넣고, 영상 설명 · 자막 · 본문을 이어 붙이거나 캡처를 첨부해 보내요.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={copyPrompt} className={cls.primary + ' h-9'}><Icon d={copied ? I.check : I.copy} size={15} />{copied ? '복사됨 · 다시 복사' : '정리 요청문 복사'}</button>
                    <a href="https://claude.ai/new" target="_blank" rel="noopener noreferrer" className={cls.ghost + ' h-9'}><Icon d={I.ext} size={14} />Claude 열기</a>
                  </div>
                  {manualPrompt && (
                    <div className="mt-2">
                      <p className="text-[13px] text-[#9E4742]">자동 복사가 막혀 있어요. 아래 글을 길게 눌러 직접 복사해 주세요.</p>
                      <textarea readOnly value={manualPrompt} rows={5} onFocus={e => e.target.select()} className={cls.input + ' mt-1 h-auto py-2 text-[13px] leading-relaxed'} aria-label="정리 요청문" />
                    </div>
                  )}
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="h-6 w-6 shrink-0 rounded-full bg-sage text-white text-[13px] font-semibold grid place-items-center">2</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-ink leading-relaxed">Claude의 답을 통째로 복사해서 여기에 붙여 넣어요.</p>
                  <textarea value={answer} onChange={e => { setAnswer(e.target.value); if (phase === 'error') setPhase('idle'); }} rows={3}
                    className={cls.input + ' mt-2 h-auto py-2.5 leading-relaxed resize-y rounded-2xl font-mono text-[13px]'} placeholder={'```json\n{"dishes": [ ... ]}\n```'} aria-label="Claude 답 붙여넣기" />
                  <button type="button" onClick={applyAnswer} disabled={busy || !answer.trim()} className={cls.primary + ' mt-2 h-10'}>{busy ? <Spinner /> : <Icon d={I.download} size={15} />}채워 넣기</button>
                </div>
              </li>
            </ol>
          </div>
        )}
        {phase === 'error' && <p className="mt-2 text-[13px] text-[#9E4742]">{msg}</p>}
        {phase === 'filling' && <p className="mt-2 flex items-center gap-2 text-[13px] text-sage"><Spinner size={14} />채우는 중…</p>}
        {phase === 'done' && msg && <p className="fade-in mt-2 text-[13px] text-sage">{msg}</p>}
      </div>

      <div className="mt-5 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="메뉴">
        {dishes.map((d, i) => {
          const on = i === active;
          return (
            <div key={d.id} className={`shrink-0 flex items-center h-8 rounded-full border transition-colors ${on ? 'bg-sage-soft border-[#D3E0CE]' : 'bg-white border-line'}`}>
              <button type="button" role="tab" aria-selected={on} onClick={() => setActive(i)}
                className={`max-w-[12rem] truncate h-8 pl-3.5 ${dishes.length > 1 && !busy ? 'pr-1' : 'pr-3.5'} text-[13px] ${on ? 'text-sage-dark font-semibold' : 'text-muted hover:text-ink'}`}
                style={on ? { color: rtype(d.type).fg } : undefined}>#{d.title || '새 메뉴'}</button>
              {dishes.length > 1 && !busy && <button type="button" aria-label={`${d.title || '새 메뉴'} 삭제`} onClick={() => removeDish(i)} className="h-6 w-6 mr-1 grid place-items-center rounded-full text-faintink hover:text-[#9E4742]"><Icon d={I.x} size={11} /></button>}
            </div>
          );
        })}
        {!busy && <button type="button" onClick={() => { setDishes(ds => [...ds, emptyDish()]); setActive(dishes.length); }}
          className="shrink-0 h-8 px-3 inline-flex items-center gap-1 rounded-full border border-dashed border-[#C9D1C6] text-[13px] text-sage hover:bg-sage-faint"><Icon d={I.plus} size={12} />메뉴 추가</button>}
      </div>
      {dishes.length > 1 && <p className="mt-2 text-[13px] text-muted">한 링크에 메뉴가 여러 개면 탭으로 묶어 한 레시피로 두거나, '메뉴별로 나눠 저장'으로 따로 보관할 수 있어요.</p>}
      <div className="pt-4">
        {dishes[active] ? <DishForm key={dishes[active].id} dish={dishes[active]} onChange={d => setDish(active, d)} />
          : <p className="text-sm text-muted py-6 text-center">정리한 내용을 채우는 중…</p>}
      </div>
    </Modal>
  );
}
