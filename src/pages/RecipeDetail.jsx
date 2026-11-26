import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTable, editorsOf } from '../hooks/useTable.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { Avatar, ByLine, Check, cls, EditingBanner, Empty, focus, HeartButton, Icon, I, IconButton, RoundCheck, SectionTitle, Stepper, TypePill, useToast } from '../components/ui.jsx';
import RecipeForm from '../components/RecipeForm.jsx';
import CookingMode from '../components/CookingMode.jsx';
import AddSheet from '../components/AddSheet.jsx';
import { STAR, rtype } from '../lib/constants.js';
import { detectSource, dishToShopping, fmtAmount, hostOf, isHttps, norm, scaleAmount, todayKey } from '../lib/utils.js';
import { avgStars, reviewsFor } from '../lib/reviews.js';

const PLATFORM = { YouTube: { bg: '#F3DEDB', fg: '#9E3B36' }, Instagram: { bg: '#F3E0E8', fg: '#8A3F5E' }, TikTok: { bg: '#E6E9EC', fg: '#2E352F' }, 블로그: { bg: '#E3ECE5', fg: '#3B5440' } };
const isVideo = s => s === 'YouTube' || s === 'TikTok' || s === 'Instagram';

export default function RecipeDetail() {
  const { recipeId } = useParams();
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const t = useTable();
  const toast = useToast();
  const recipe = t.recipes.find(r => r.id === recipeId);
  const dishId = sp.get('d');
  const dish = recipe ? (recipe.dishes.find(d => d.id === dishId) || recipe.dishes[0]) : null;
  const [servings, setServings] = useState(dish?.servings || 2);
  const [hideBasic, setHideBasic] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [modal, setModal] = useState(null); // form | cook | plan
  const [linksOpen, setLinksOpen] = useState(false);
  const [newLink, setNewLink] = useState('');
  useEffect(() => { if (dish) setServings(dish.servings); }, [dish?.id]);

  if (!recipe || !dish) return <Empty>레시피를 찾을 수 없어요. 지워졌을 수 있어요.{'\n'}<button type="button" onClick={() => nav('..', { relative: 'path' })} className="mt-2 text-sage underline">레시피 목록으로</button></Empty>;

  const editors = editorsOf(t.others, 'recipe', recipe.id);
  const ratio = servings / dish.servings;
  const amountOf = i => [scaleAmount(i.amount, ratio), i.unit].filter(Boolean).join(' ');
  const ingredients = dish.ingredients.filter(i => i.name.trim() && !(hideBasic && t.isBasic(i.name)));
  const inCart = name => t.shopping.find(s => norm(s.name) === norm(name));
  const notAdded = dish.ingredients.filter(i => i.name.trim() && !t.isBasic(i.name) && !inCart(i.name));
  const cartItems = t.shopping.filter(s => dish.ingredients.some(i => norm(i.name) === norm(s.name)));
  const addToCart = async names => {
    const items = dishToShopping(recipe, dish, { servings, excludeBasic: false, isBasic: t.isBasic, only: names });
    const n = await t.addShopping(items);
    if (n) toast(n === 1 ? `'${items[0].name}'을(를) 장바구니에 담았어요` : `재료 ${n}개를 장바구니에 담았어요`, { label: '장바구니', fn: () => nav('../../shopping', { relative: 'path' }) });
  };
  const toggleCart = i => {
    const item = inCart(i.name);
    if (!item) return addToCart([i.name]);
    t.deleteShopping(item);
    toast(`'${i.name}'을(를) 뺐어요`, { label: '되돌리기', fn: () => t.restoreShopping(item) });
  };
  const links = [
    ...(recipe.source_url ? [{ url: recipe.source_url, label: `원문 · ${recipe.source}`, src: recipe.source }] : []),
    ...(recipe.links || []).map((l, idx) => ({ ...l, idx, src: detectSource(l.url) })),
  ];
  const addLink = e => {
    e.preventDefault();
    const u = newLink.trim();
    if (!isHttps(u)) { toast('https://로 시작하는 주소를 넣어 주세요.'); return; }
    if (!recipe.source_url) t.updateRecipe({ ...recipe, source_url: u, source: detectSource(u) });
    else t.updateRecipe({ ...recipe, links: [...(recipe.links || []), { url: u, label: hostOf(u) }] });
    setNewLink('');
  };
  const pf = PLATFORM[recipe.source] || PLATFORM['블로그'];
  const author = t.profileOf(recipe.created_by);

  return (
    <div className="mx-auto w-full max-w-[760px]">
      <div className="flex items-center justify-between gap-2 mb-3">
        <button type="button" onClick={() => nav(-1)} className={`inline-flex items-center gap-0.5 h-9 pl-1 pr-3 rounded-full text-sm text-muted hover:text-ink hover:bg-white ${focus}`}><Icon d={I.left} />뒤로</button>
        <div className="flex items-center gap-1">
          <HeartButton on={t.isFav(recipe.id, dish.id)} onClick={() => t.toggleFav(recipe.id, dish.id)} />
          {t.canWrite && <IconButton label="캘린더에 추가" onClick={() => setModal('plan')}><Icon d={I.cal} size={18} /></IconButton>}
          {t.canWrite && <IconButton label="편집" onClick={() => editors.length ? toast(`${editors[0].nickname}님이 고치는 중이에요. 잠시 뒤에 해 주세요.`) : setModal('form')} className={editors.length ? 'opacity-40' : ''}><Icon d={I.edit} size={18} /></IconButton>}
        </div>
      </div>
      {editors.length > 0 && <div className="mb-3"><EditingBanner people={editors} what="이 레시피를 고치고 있어요"
        action={t.canWrite && <button type="button" onClick={() => setModal('form')} className="shrink-0 h-8 px-3 rounded-full text-[13px] bg-white/70 hover:bg-white">그래도 편집</button>} /></div>}

      {recipe.dishes.length > 1 && (
        <div className="mb-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="이 레시피의 메뉴">
          <span className="shrink-0 text-[13px] text-muted mr-1">메뉴 {recipe.dishes.length}</span>
          {recipe.dishes.map(d => {
            const on = d.id === dish.id;
            return (
              <button key={d.id} type="button" role="tab" aria-selected={on} onClick={() => setSp({ d: d.id }, { replace: true })} title={d.title}
                className={`shrink-0 max-w-[15rem] truncate h-8 px-3.5 rounded-full text-[13px] border ${focus} ${on ? 'bg-sage-soft border-[#D3E0CE] text-sage-dark font-semibold' : 'bg-white border-line text-muted hover:text-ink'}`}>#{d.title}</button>
            );
          })}
        </div>
      )}

      <article className="rounded-[28px] border border-line bg-white px-5 sm:px-8 pt-6 pb-8">
        <div className="flex items-start justify-between gap-3">
          <TypePill type={dish.type} className="px-3 py-1" />
          <button type="button" onClick={() => setModal('cook')} className={cls.primary + ' h-9'}><Icon d={I.chef} size={15} />요리 모드</button>
        </div>
        <h1 className="mt-4 text-[26px] sm:text-[32px] leading-tight font-bold text-ink">{dish.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {author && <ByLine p={author} prefix="올린 사람 · " />}
          {recipe.imported_from && <span className="text-[13px] text-faintink">{recipe.imported_from.table}에서 가져옴</span>}
        </div>
        {dish.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{dish.tags.map(x => <span key={x} className="h-8 inline-flex items-center px-3 rounded-full border border-line text-[13px] text-muted">#{x}</span>)}</div>}
        <nav aria-label="바로가기" className="sticky top-0 z-10 -mx-5 sm:-mx-8 mt-4 px-5 sm:px-8 py-2 bg-white/95 backdrop-blur border-b border-line flex gap-1.5 overflow-x-auto no-scrollbar">
          {[['sec-ing', '재료'], ['sec-steps', '순서'], ['sec-tips', '팁'], ['sec-review', '별점'], ['sec-cart', '장보기'], ['sec-links', '링크']].map(([id, l]) => (
            <button key={id} type="button" onClick={() => { if (id === 'sec-links') setLinksOpen(true); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 20); }}
              className={`shrink-0 h-8 px-3.5 rounded-full text-[13px] bg-canvas border border-line text-ink hover:border-sage ${focus}`}>{l}</button>
          ))}
        </nav>

        {recipe.dishes.length > 1 && t.canWrite && (
          <div className="mt-4 rounded-2xl border border-dashed border-[#C9D1C6] px-4 py-3 flex flex-wrap items-center gap-2">
            <p className="flex-1 min-w-[12rem] text-[13px] text-muted">한 링크에 메뉴 {recipe.dishes.length}개가 함께 들어 있어요.</p>
            {confirm === 'split' ? (
              <>
                <button type="button" onClick={() => setConfirm(null)} className={cls.ghost + ' h-8'}>취소</button>
                <button type="button" onClick={async () => { await t.splitRecipe(recipe); setConfirm(null); toast(`메뉴 ${recipe.dishes.length}개를 각각의 레시피로 나눴어요`); }} className={cls.primary + ' h-8'}>{recipe.dishes.length}개로 나누기</button>
              </>
            ) : <button type="button" onClick={() => setConfirm('split')} className={cls.soft}><Icon d={I.split} size={13} />메뉴별로 따로 보관</button>}
          </div>
        )}

        <div id="sec-ing" className="scroll-mt-16" />
        <SectionTitle right={<Stepper value={servings} onChange={setServings} suffix="인분" />}>재료</SectionTitle>
        <div className="rounded-2xl border border-line px-4 sm:px-5 py-2">
          <ul>
            {ingredients.map((i, k) => {
              const item = inCart(i.name);
              return (
                <li key={k} className="flex items-center gap-2.5 py-1.5 text-[15px] leading-relaxed">
                  <span className="h-1.5 w-1.5 rounded-full bg-sage-check shrink-0" />
                  <span className="flex-1 text-ink">{i.name} <span className="text-[#5A6259] tabular-nums">{amountOf(i)}</span>{t.isBasic(i.name) && <span className="ml-1.5 text-[13px] text-faintink">기본 양념</span>}</span>
                  {t.canWrite && (
                    <button type="button" onClick={() => toggleCart(i)} aria-pressed={!!item} aria-label={item ? `${i.name} 장바구니에서 빼기` : `${i.name} 장바구니에 담기`}
                      className={`shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[13px] border transition-colors ${focus} ${item ? 'bg-sage-faint border-[#D5E2D0] text-sage font-medium' : 'border-line text-muted hover:border-sage hover:text-sage'}`}>
                      <Icon d={item ? I.check : I.cart} size={13} sw={item ? 2.4 : 1.8} />{item ? (item.checked ? '샀음' : '담음') : '장바구니'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-1 py-2 border-t border-line flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted">
            <span>기준 {dish.servings}인분{servings !== dish.servings && <span className="text-sage"> → {servings}인분 (×{fmtAmount(ratio)})</span>}</span>
            <div className="flex items-center gap-3">
              <Check checked={hideBasic} onChange={setHideBasic}>기본 양념 숨기기</Check>
              {t.canWrite && <button type="button" disabled={!notAdded.length} onClick={() => addToCart(notAdded.map(i => i.name))} className={cls.soft + ' disabled:opacity-40'}><Icon d={I.cart} size={13} />{notAdded.length ? `모두 담기 ${notAdded.length}` : '다 담았어요'}</button>}
            </div>
          </div>
        </div>

        <div id="sec-steps" className="scroll-mt-16" />
        <SectionTitle>조리 순서</SectionTitle>
        <ol className="rounded-2xl border border-line px-5 py-4 flex flex-col gap-4">
          {dish.steps.map((s, i) => (
            <li key={i} className="flex gap-3.5">
              <span className="h-7 w-7 shrink-0 rounded-full bg-sage text-white text-[13px] font-semibold grid place-items-center tabular-nums">{i + 1}</span>
              <p className="text-[15px] leading-relaxed text-ink pt-0.5">{s}</p>
            </li>
          ))}
          {!dish.steps.length && <p className="text-sm text-muted">등록된 조리 순서가 없어요.</p>}
        </ol>

        <div id="sec-tips" className="scroll-mt-16" />
        <SectionTitle>메모 & 팁</SectionTitle>
        <div className="rounded-2xl border border-line divide-y divide-line">
          {[['cooking', '조리 팁'], ['tools', '화력 · 도구 팁'], ['memo', '메모']].map(([k, l]) => (
            <div key={k} className="px-5 py-3.5">
              <p className="text-[13px] font-medium text-sage mb-1">{l}</p>
              <p className={`text-[15px] leading-relaxed whitespace-pre-line ${dish.tips?.[k] ? 'text-ink' : 'text-faintink'}`}>{dish.tips?.[k] || '아직 없어요. 편집에서 추가할 수 있어요.'}</p>
            </div>
          ))}
        </div>

        <div id="sec-review" className="scroll-mt-16" />
        <ReviewSection recipe={recipe} dish={dish} />

        <div id="sec-cart" className="scroll-mt-16" />
        <SectionTitle right={<button type="button" onClick={() => nav('../../shopping', { relative: 'path' })} className="inline-flex items-center gap-0.5 text-[13px] text-muted hover:text-sage h-8">장바구니<Icon d={I.right} size={14} /></button>}>재료 장보기</SectionTitle>
        <div className="rounded-2xl border border-line">
          {cartItems.length ? (
            <ul>
              {cartItems.map(item => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-line last:border-0">
                  <RoundCheck checked={item.checked} onChange={() => t.toggleShopping(item)} label={`${item.name} 구매 완료`} disabled={!t.canWrite} />
                  <div className="flex-1">
                    <p className={`text-[15px] ${item.checked ? 'text-faintink line-through' : 'text-ink'}`}>{item.name} <span className="text-[13px] text-muted tabular-nums">{[item.amount, item.unit].filter(Boolean).join(' ')}</span></p>
                    <p className="text-[13px] text-faintink">{item.checked ? '구매 완료' : '장바구니에 담겨 있어요'}</p>
                  </div>
                  {t.canWrite && <button type="button" aria-label={`${item.name} 빼기`} onClick={() => t.deleteShopping(item)} className="h-8 w-8 grid place-items-center rounded-full text-faintink hover:text-[#9E4742] hover:bg-[#F7E8E6]"><Icon d={I.x} size={14} /></button>}
                </li>
              ))}
            </ul>
          ) : <p className="px-5 py-6 text-[14px] text-muted leading-relaxed">아직 담은 재료가 없어요.<br />위 재료 옆 <span className="text-sage font-medium">장바구니</span>를 누르면 여기에 담겨요.</p>}
        </div>

        <div id="sec-links" className="scroll-mt-16" />
        <button type="button" onClick={() => setLinksOpen(o => !o)} aria-expanded={linksOpen}
          className={`mt-8 w-full flex items-center justify-between gap-2 h-12 rounded-2xl border border-line px-4 hover:bg-canvas ${focus}`}>
          <span className="flex items-center gap-2.5 text-[17px] font-semibold text-ink"><span className="w-1 h-5 rounded-full bg-sage" />참고 링크<span className="text-[13px] font-normal text-muted tabular-nums">{links.length}</span></span>
          <Icon d={I.down} size={18} className={`text-muted transition-transform ${linksOpen ? 'rotate-180' : ''}`} />
        </button>
        {linksOpen && (
          <div className="fade-in mt-2 rounded-2xl border border-line">
            <ul className="divide-y divide-line">
              {links.map((l, k) => {
                const c = PLATFORM[l.src] || PLATFORM['블로그'];
                return (
                  <li key={k} className="flex items-center gap-1 pr-2">
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className={`flex-1 min-w-0 flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-sage-faint ${focus}`}>
                      <span className="h-8 w-8 shrink-0 rounded-full grid place-items-center" style={{ background: c.bg, color: c.fg }}><Icon d={isVideo(l.src) ? I.video : I.link} size={15} /></span>
                      <span className="min-w-0"><span className="block text-[14px] text-ink truncate">{l.label}</span><span className="block text-[13px] text-muted truncate">{l.url}</span></span>
                      <Icon d={I.ext} size={15} className="ml-auto text-faintink shrink-0" />
                    </a>
                    {l.idx != null && t.canWrite && <IconButton label="링크 삭제" onClick={() => t.updateRecipe({ ...recipe, links: recipe.links.filter((_, j) => j !== l.idx) })} className="h-8 w-8"><Icon d={I.x} size={14} /></IconButton>}
                  </li>
                );
              })}
            </ul>
            {t.canWrite && (
              <form onSubmit={addLink} className={`flex gap-2 p-3 ${links.length ? 'border-t border-line' : ''}`}>
                <input value={newLink} onChange={e => setNewLink(e.target.value)} placeholder="참고한 링크 붙여넣기 (https://…)" inputMode="url" className={cls.input + ' rounded-full'} aria-label="참고 링크 주소" />
                <button type="submit" disabled={!newLink.trim()} className={cls.primary + ' shrink-0'}><Icon d={I.plus} size={15} />추가</button>
              </form>
            )}
          </div>
        )}
      </article>

      {recipe.source_url && (
        <a href={recipe.source_url} target="_blank" rel="noopener noreferrer"
          className={`mt-5 flex items-center justify-center gap-2 h-14 rounded-full text-[16px] font-semibold hover:brightness-[.97] ${focus}`} style={{ background: pf.bg, color: pf.fg }}>
          <Icon d={isVideo(recipe.source) ? I.video : I.link} size={19} sw={2} />{recipe.source}에서 보기
        </a>
      )}
      {t.canWrite && (confirm === 'delete' ? (
        <div className="fade-in mt-3 rounded-full border border-[#D9A9A5] bg-[#FCF6F5] pl-5 pr-2 h-14 flex items-center gap-2 text-[14px] text-[#9E4742]">
          <span className="flex-1 truncate">정말 삭제할까요? 달력 일정은 남아요.</span>
          <button type="button" onClick={() => setConfirm(null)} className="h-10 px-4 rounded-full text-muted hover:bg-white">취소</button>
          <button type="button" onClick={async () => { await t.deleteRecipe(recipe.id); toast('레시피를 삭제했어요'); nav('..', { relative: 'path', replace: true }); }} className="h-10 px-5 rounded-full bg-[#9E4742] text-white font-medium">삭제</button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirm('delete')} className={`mt-3 w-full flex items-center justify-center gap-2 h-14 rounded-full border border-[#D9A9A5] bg-white text-[16px] text-[#9E4742] hover:bg-[#FCF6F5] ${focus}`}>
          <Icon d={I.trash} size={18} />레시피 삭제
        </button>
      ))}

      {modal === 'form' && <RecipeForm recipe={recipe} onClose={() => setModal(null)} onSaved={(rid, did) => { setModal(null); if (rid !== recipe.id) nav(`../${rid}?d=${encodeURIComponent(did)}`, { relative: 'path', replace: true }); else setSp({ d: did }, { replace: true }); }} />}
      {modal === 'cook' && <CookingMode dish={dish} servings={servings} hideBasic={hideBasic} isBasic={t.isBasic} onClose={() => setModal(null)} />}
      {modal === 'plan' && <AddSheet date={todayKey()} initRecipe={recipe.id} onClose={() => setModal(null)} />}
    </div>
  );
}

function ReviewSection({ recipe, dish }) {
  const t = useTable();
  const { profile } = useAuth();
  const toast = useToast();
  const list = reviewsFor(t.reviews, recipe.id, dish.id).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  const mine = list.find(r => r.user_id === t.me);
  const [stars, setStars] = useState(mine?.stars || 0);
  const [text, setText] = useState(mine?.text || '');
  useEffect(() => { setStars(mine?.stars || 0); setText(mine?.text || ''); }, [dish.id, mine?.updated_at]);
  const avg = avgStars(t.reviews, recipe.id, dish.id);
  const changed = stars !== (mine?.stars || 0) || text.trim() !== (mine?.text || '');
  const save = async () => {
    if (!stars || !changed) return;
    await t.setReview(recipe.id, dish.id, { stars, text: text.trim().slice(0, 80) });
    toast(mine ? '한줄평을 고쳤어요' : '한줄평을 남겼어요');
  };
  return (
    <>
      <SectionTitle right={avg ? <span className="inline-flex items-center gap-1 text-[13px] font-bold text-[#9A7428]"><CuteStar on size={13} />{avg.toFixed(1)}<span className="text-[12px] font-normal text-muted">{list.length}명</span></span> : null}>별점 · 한줄평</SectionTitle>
      <div className="rounded-2xl border border-line">
        {list.map(r => {
          const p = t.profileOf(r.user_id) || { nickname: '?', tint: '#EFEFEF' };
          return (
            <div key={r.user_id} className="flex gap-2 px-3 py-2 border-b border-line">
              <Avatar p={p} size={22} />
              <div className="flex-1 min-w-0">
                <p className="flex items-center gap-1.5 text-[12px]"><span className="text-ink font-semibold">{p.nickname}</span><MiniStars n={r.stars} />{r.updated_at && <span className="ml-auto text-[11px] text-faintink tabular-nums">{reviewDate(r.updated_at)}</span>}</p>
                {r.text && <p className="text-[13px] text-ink mt-0.5 leading-snug">{r.text}</p>}
              </div>
            </div>
          );
        })}
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium text-sage">{profile?.nickname}의 평가</p>
            <div className="flex items-center" role="radiogroup" aria-label="별점">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n}점`} onClick={() => setStars(n === stars ? 0 : n)}
                  className={`h-8 w-7 grid place-items-center rounded-full active:scale-90 transition-transform ${focus}`}><CuteStar on={n <= stars} size={20} /></button>
              ))}
            </div>
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <input value={text} maxLength={80} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); }}
              placeholder="한줄평 (예: 또 해줘! 간은 싱겁게)" aria-label="한줄평" className={cls.input + ' rounded-full !h-8 !text-[13px] !px-3'} />
            <button type="button" disabled={!stars || !changed} onClick={save} className={cls.primary + ' shrink-0 !h-8 !px-3 !text-[12px]'}>{mine ? '수정' : '남기기'}</button>
          </div>
          {mine && <button type="button" onClick={() => { t.setReview(recipe.id, dish.id, null); toast('내 평가를 지웠어요'); }} className="mt-1 text-[12px] text-faintink hover:text-[#9E4742] h-6">내 평가 지우기</button>}
        </div>
      </div>
    </>
  );
}

// 평가 날짜: 올해면 11/26, 지난해면 2025.11.26
const reviewDate = iso => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.getFullYear() === new Date().getFullYear() ? `${d.getMonth() + 1}/${d.getDate()}` : `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
};

// 동글동글한 별 (모서리가 둥근 별)
const STAR_PATH = 'M12 3.2l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.5l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z';
function CuteStar({ on, size = 14 }) {
  const c = on ? STAR : '#DDE2DA';
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0"><path d={STAR_PATH} fill={c} stroke={c} strokeWidth="2.6" strokeLinejoin="round" /></svg>;
}
const MiniStars = ({ n }) => (
  <span className="inline-flex items-center gap-[1px]" aria-label={`별 ${n}개`}>{[1, 2, 3, 4, 5].map(i => <CuteStar key={i} on={i <= n} size={11} />)}</span>
);
