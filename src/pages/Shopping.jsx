import { useState } from 'react';
import { useTable } from '../hooks/useTable.jsx';
import { ByLine, CardHead, cls, Icon, I, RoundCheck, useToast } from '../components/ui.jsx';
import { SHOP_COLOR } from '../lib/constants.js';
import { shortDate } from '../lib/utils.js';

export default function Shopping() {
  const t = useTable();
  const toast = useToast();
  const [name, setName] = useState(''), [amt, setAmt] = useState('');
  const todo = t.shopping.filter(i => !i.checked), done = t.shopping.filter(i => i.checked);
  const add = async e => {
    e.preventDefault();
    if (!name.trim()) return;
    const m = amt.trim().match(/^([\d./]+)\s*(.*)$/);
    await t.addShopping([{ name: name.trim(), amount: m ? m[1] : amt.trim(), unit: m ? m[2] : '', sources: [] }]);
    setName(''); setAmt('');
  };
  const copyList = async () => {
    const text = todo.map(i => `- ${i.name} ${[i.amount, i.unit].filter(Boolean).join('')}`.trim()).join('\n');
    try { await navigator.clipboard.writeText(text || '(비어 있음)'); toast('장바구니 목록을 복사했어요'); } catch (er) { toast('복사가 막혀 있어요'); }
  };
  const Row = ({ i }) => (
    <li className="flex items-start gap-3 px-4 py-2">
      <RoundCheck checked={i.checked} onChange={() => t.toggleShopping(i)} label={`${i.name} 구매 완료`} disabled={!t.canWrite} />
      <div className="flex-1 min-w-0">
        <span className={`text-[14px] ${i.checked ? 'line-through text-faintink' : 'text-ink font-medium'}`}>{i.name}
          <span className={`ml-2 font-normal tabular-nums whitespace-nowrap ${i.checked ? 'text-faintink' : 'text-[#5A6259]'}`}>{[i.amount, i.unit].filter(Boolean).join(' ')}</span>
        </span>
        <p className="text-[13px] text-faintink mt-0.5 truncate">{(i.sources || []).map(s => `${s.title}${s.date ? ` ${shortDate(s.date)}` : ''}`).join(', ') || '직접 추가'}</p>
      </div>
      <ByLine p={t.profileOf(i.created_by)} />
      {t.canWrite && <button type="button" aria-label={`${i.name} 삭제`} onClick={() => { t.deleteShopping(i); toast(`'${i.name}'을(를) 뺐어요`, { label: '되돌리기', fn: () => t.restoreShopping(i) }); }}
        className="h-7 w-7 grid place-items-center rounded-full text-faintink hover:text-[#9E4742] hover:bg-[#F7E8E6]"><Icon d={I.x} size={14} /></button>}
    </li>
  );
  return (
    <div className="mx-auto w-full max-w-[720px] flex flex-col gap-3">
      {t.canWrite && (
        <form onSubmit={add} className={cls.card + ' p-3 flex gap-2'}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="품목 (예: 대파)" className={cls.input + ' flex-[2] rounded-full'} aria-label="품목" />
          <input value={amt} onChange={e => setAmt(e.target.value)} placeholder="수량 (예: 2개)" className={cls.input + ' flex-1 rounded-full'} aria-label="수량" />
          <button type="submit" className={cls.primary + ' px-4'}><Icon d={I.plus} size={16} /><span className="hidden sm:inline">추가</span></button>
        </form>
      )}
      <div className="flex items-center justify-between px-1">
        <p className="text-[13px] text-muted tracking-wide">장바구니 · {todo.length}개 남음</p>
        <button type="button" onClick={copyList} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink h-8"><Icon d={I.copy} size={13} />목록 복사</button>
      </div>
      <section className={cls.card}>
        <CardHead tag="살 것" count={`${todo.length}/${t.shopping.length}`} bg={SHOP_COLOR.bg} fg={SHOP_COLOR.fg} />
        {todo.length ? <ul className="pb-2">{todo.map(i => <Row key={i.id} i={i} />)}</ul>
          : <p className="px-4 pb-5 pt-1 text-sm text-muted">다 샀어요. 레시피의 재료 옆 '장바구니'로 담거나 위에서 직접 추가하세요.</p>}
      </section>
      {done.length > 0 && (
        <section className={cls.card}>
          <CardHead tag="구매 완료" count={done.length} right={t.canWrite && <button type="button" onClick={t.clearChecked} className="text-[13px] text-muted hover:text-[#9E4742] h-7 px-2">모두 지우기</button>} />
          <ul className="pb-2">{done.map(i => <Row key={i.id} i={i} />)}</ul>
        </section>
      )}
    </div>
  );
}
