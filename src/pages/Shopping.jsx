import { useState } from 'react';
import { useTable } from '../hooks/useTable.jsx';
import { Icon, I, RoundCheck, focus, useToast } from '../components/ui.jsx';
import { shortDate } from '../lib/utils.js';
import { PLACES, dday, foodEmoji, guessExpires, guessFood, placeOf } from '../lib/food.js';

const TAB_KEY = 'shop-tab';
const TONE = { r: 'bg-[#F7E3E0] text-[#A04A40]', y: 'bg-[#F6EED9] text-[#8A6A23]', g: 'bg-[#E6EEE3] text-[#4F6B4C]' };
const rowCls = 'flex items-center gap-3 bg-white border border-line rounded-2xl px-3.5 py-3';

// 재료 그림 칸 (보관 장소 색)
const Tile = ({ name, place = 'fridge', dim }) => (
  <span className={`h-9 w-9 shrink-0 grid place-items-center rounded-[10px] text-[18px] leading-none ${dim ? 'opacity-50' : ''}`} style={{ background: placeOf(place).bg }} aria-hidden="true">{foodEmoji(name)}</span>
);
const GroupHead = ({ children, right }) => (
  <div className="flex items-center justify-between px-1 mt-2 mb-1 text-[12px] text-faintink">{children}{right}</div>
);

export default function Shopping() {
  const t = useTable();
  const [tab, setTabRaw] = useState(() => { try { return sessionStorage.getItem(TAB_KEY) || 'cart'; } catch (e) { return 'cart'; } });
  const setTab = v => { setTabRaw(v); try { sessionStorage.setItem(TAB_KEY, v); } catch (e) { /* 무시 */ } };
  const left = t.shopping.filter(i => !i.checked).length;
  return (
    <div className="mx-auto w-full max-w-[720px] flex flex-col gap-2.5">
      <div className="flex rounded-full bg-[#EEF1EB] p-1" role="tablist" aria-label="장바구니 · 냉장고">
        {[['cart', '장바구니', left], ['fridge', '냉장고', t.fridge.length]].map(([id, label, n]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`flex-1 h-9 rounded-full text-[13px] transition-colors ${focus} ${tab === id ? 'bg-white text-sage-dark font-semibold shadow-[0_1px_2px_rgba(46,53,47,.08)]' : 'text-muted'}`}>
            {label}{n > 0 && <span className="ml-1 tabular-nums">{n}</span>}
          </button>
        ))}
      </div>
      {tab === 'cart' ? <Cart /> : <Fridge />}
    </div>
  );
}

// 품목 + 수량 한 줄 입력
function AddBar({ placeholder, onAdd }) {
  const [name, setName] = useState(''), [amt, setAmt] = useState('');
  const submit = async e => {
    e.preventDefault();
    if (!name.trim()) return;
    await onAdd(name.trim(), amt.trim());
    setName(''); setAmt('');
  };
  return (
    <form onSubmit={submit} className="flex items-center gap-2 bg-white border border-line rounded-2xl pl-3 pr-1.5 py-1.5">
      <input value={name} onChange={e => setName(e.target.value)} placeholder={placeholder} autoComplete="off" aria-label="품목"
        className="flex-[2] min-w-0 h-8 bg-transparent text-[14px] placeholder:text-faintink focus:outline-none" />
      <span className="w-px h-5 bg-line" />
      <input value={amt} onChange={e => setAmt(e.target.value)} placeholder="수량" autoComplete="off" aria-label="수량"
        className="flex-1 min-w-0 h-8 bg-transparent text-[14px] placeholder:text-faintink focus:outline-none" />
      <button type="submit" disabled={!name.trim()} aria-label="추가" className={`shrink-0 h-8 w-8 grid place-items-center rounded-full bg-sage text-white disabled:opacity-40 ${focus}`}><Icon d={I.plus} size={16} /></button>
    </form>
  );
}

function Cart() {
  const t = useTable();
  const toast = useToast();
  const todo = t.shopping.filter(i => !i.checked), done = t.shopping.filter(i => i.checked);
  const add = async (name, amt) => {
    const m = amt.match(/^([\d./]+)\s*(.*)$/);
    await t.addShopping([{ name, amount: m ? m[1] : amt, unit: m ? m[2] : '', sources: [] }]);
  };
  const copyList = async () => {
    const text = todo.map(i => `- ${i.name} ${[i.amount, i.unit].filter(Boolean).join('')}`.trim()).join('\n');
    try { await navigator.clipboard.writeText(text || '(비어 있음)'); toast('장바구니 목록을 복사했어요'); } catch (er) { toast('복사가 막혀 있어요'); }
  };
  const check = async i => {
    if (i.checked) { t.toggleShopping(i); return; }
    const undo = await t.buyShopping(i);
    if (undo) toast(`'${i.name}'을(를) 냉장고에 넣었어요`, { label: '되돌리기', fn: undo });
  };
  const Row = ({ i }) => {
    const who = t.profileOf(i.created_by)?.nickname;
    const from = (i.sources || []).map(s => `${s.title}${s.date ? ` ${shortDate(s.date)}` : ''}`).join(', ') || '직접 추가';
    return (
      <li className={rowCls}>
        <RoundCheck checked={i.checked} onChange={() => check(i)} label={`${i.name} 샀어요`} disabled={!t.canWrite} />
        <Tile name={i.name} place={guessFood(i.name).place} dim={i.checked} />
        <div className="flex-1 min-w-0">
          <p className={`text-[15px] truncate ${i.checked ? 'line-through text-faintink' : 'text-ink font-medium'}`}>{i.name}
            <span className="ml-1.5 font-normal text-[12px] text-faintink tabular-nums">{[i.amount, i.unit].filter(Boolean).join(' ')}</span></p>
          <p className="text-[12px] text-faintink truncate">{from}{who ? ` · ${who}` : ''}</p>
        </div>
        {t.canWrite && <button type="button" aria-label={`${i.name} 빼기`} onClick={() => { t.deleteShopping(i); toast(`'${i.name}'을(를) 뺐어요`, { label: '되돌리기', fn: () => t.restoreShopping(i) }); }}
          className="h-7 w-7 -mr-1 grid place-items-center rounded-full text-faintink hover:text-[#9E4742] hover:bg-[#F7E8E6]"><Icon d={I.x} size={13} /></button>}
      </li>
    );
  };
  return (
    <>
      {t.canWrite && <AddBar placeholder="살 것 (예: 대파)" onAdd={add} />}
      <GroupHead right={todo.length > 0 && <button type="button" onClick={copyList} className="inline-flex items-center gap-1 h-6 hover:text-ink"><Icon d={I.copy} size={12} />목록 복사</button>}>
        <span>살 것 {todo.length}</span>
      </GroupHead>
      {todo.length ? <ul className="flex flex-col gap-2">{todo.map(i => <Row key={i.id} i={i} />)}</ul>
        : <p className="px-1 py-3 text-[13px] text-muted leading-relaxed">다 샀어요. 레시피 재료 옆 '장바구니'로 담거나 위에서 직접 추가하세요.</p>}
      {done.length > 0 && <>
        <GroupHead right={t.canWrite && <button type="button" onClick={t.clearChecked} className="h-6 hover:text-[#9E4742]">모두 지우기</button>}>
          <span>산 것 {done.length}</span>
        </GroupHead>
        <ul className="flex flex-col gap-2">{done.map(i => <Row key={i.id} i={i} />)}</ul>
      </>}
      {t.canWrite && todo.length > 0 && <p className="mt-1 text-center text-[12px] text-faintink">산 것을 체크하면 냉장고로 들어가요</p>}
    </>
  );
}

function Fridge() {
  const t = useTable();
  const toast = useToast();
  const [open, setOpen] = useState(null);
  const add = async (name, amount) => {
    const place = guessFood(name).place;
    await t.addFridge([{ name, amount, place, expires: guessExpires(name, place) }]);
  };
  const eaten = f => {
    t.deleteFridge(f); setOpen(null);
    toast(`'${f.name}' 다 먹었어요`, { label: '장바구니에 담기', fn: () => { t.addShopping([{ name: f.name, amount: '', unit: '', sources: [] }]); toast(`'${f.name}'을(를) 장바구니에 담았어요`); } });
  };
  const sortKey = f => f.expires || '9999-99-99';
  if (!t.fridge.length) {
    return (
      <>
        {t.canWrite && <AddBar placeholder="냉장고에 있는 것 (예: 계란)" onAdd={add} />}
        <p className="px-1 py-6 text-center text-[13px] text-muted leading-relaxed">냉장고가 비어 있어요.<br />장바구니에서 산 걸 체크하면 여기로 들어와요.</p>
      </>
    );
  }
  return (
    <>
      {t.canWrite && <AddBar placeholder="냉장고에 있는 것 (예: 계란)" onAdd={add} />}
      {PLACES.map(p => {
        const list = t.fridge.filter(f => (f.place || 'fridge') === p.id).sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || String(a.created_at).localeCompare(String(b.created_at)));
        if (!list.length) return null;
        return (
          <section key={p.id}>
            <GroupHead right={<span className="tabular-nums">{list.length}</span>}><span>{p.label}</span></GroupHead>
            <ul className="flex flex-col gap-2">
              {list.map(f => {
                const dd = dday(f.expires);
                const isOpen = open === f.id;
                return (
                  <li key={f.id} className="bg-white border border-line rounded-2xl">
                    <button type="button" onClick={() => t.canWrite && setOpen(isOpen ? null : f.id)} aria-expanded={isOpen}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 text-left rounded-2xl ${focus}`}>
                      <Tile name={f.name} place={f.place} />
                      <span className="flex-1 min-w-0 text-[15px] text-ink font-medium truncate">{f.name}
                        {f.amount && <span className="ml-1.5 font-normal text-[12px] text-faintink">{f.amount}</span>}</span>
                      {dd && <span className={`shrink-0 text-[12px] px-2.5 py-0.5 rounded-full ${TONE[dd.tone]}`}>{dd.label}</span>}
                    </button>
                    {isOpen && <FridgeEdit f={f} onEaten={() => eaten(f)} />}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {t.canWrite && <p className="mt-1 text-center text-[12px] text-faintink">재료를 누르면 장소 · 양 · 유통기한을 고칠 수 있어요</p>}
    </>
  );
}

// 냉장고 재료 고치기 (누르면 아래로 펼쳐져요)
function FridgeEdit({ f, onEaten }) {
  const t = useTable();
  const [amount, setAmount] = useState(f.amount || '');
  const saveAmount = () => { if (amount.trim() !== (f.amount || '')) t.updateFridge(f, { amount: amount.trim().slice(0, 30) }); };
  return (
    <div className="px-3.5 pb-3 pt-1 border-t border-line flex flex-col gap-2.5">
      <div className="flex items-center gap-2 pt-2">
        <span className="w-14 shrink-0 text-[12px] text-muted">보관</span>
        <div className="inline-flex rounded-full border border-line bg-canvas p-0.5">
          {PLACES.map(p => (
            <button key={p.id} type="button" onClick={() => t.updateFridge(f, { place: p.id })}
              className={`h-7 px-3 rounded-full text-[12px] ${f.place === p.id ? 'bg-sage text-white font-medium' : 'text-muted'}`}>{p.label}</button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-[12px] text-muted">양</span>
        <input value={amount} onChange={e => setAmount(e.target.value)} onBlur={saveAmount} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} placeholder="예: 반 단, 3개" autoComplete="off"
          className="flex-1 min-w-0 h-8 border-b border-[#C9D6C4] bg-transparent px-0.5 text-[14px] placeholder:text-faintink focus:outline-none focus:border-sage" />
      </label>
      <label className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-[12px] text-muted">유통기한</span>
        <input type="date" value={f.expires || ''} onChange={e => t.updateFridge(f, { expires: e.target.value || null })}
          className="flex-1 min-w-0 h-8 border-b border-[#C9D6C4] bg-transparent px-0.5 text-[14px] focus:outline-none focus:border-sage" />
        {f.expires && <button type="button" onClick={() => t.updateFridge(f, { expires: null })} className="shrink-0 h-8 px-1 text-[12px] text-faintink">지우기</button>}
      </label>
      {(
        <div className="flex justify-end pt-0.5">
          <button type="button" onClick={onEaten} className="h-8 px-3.5 rounded-full border border-line text-[13px] text-ink hover:border-sage">다 먹었어요</button>
        </div>
      )}
    </div>
  );
}
