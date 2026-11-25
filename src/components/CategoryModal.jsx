import { useState } from 'react';
import { useTable, useEditingPresence, editorsOf } from '../hooks/useTable.jsx';
import { cls, EditingBanner, focus, Icon, I, IconButton, Modal, useToast } from './ui.jsx';
import { PALETTE } from '../lib/constants.js';
import { norm } from '../lib/utils.js';

function Editor({ initial, existing, onSave, onCancel }) {
  const [name, setName] = useState(initial?.label || '');
  const [grp, setGrp] = useState(initial?.grp || 'life');
  const start = initial ? Math.max(0, PALETTE.findIndex(p => p.bg.toLowerCase() === initial.bg.toLowerCase())) : 7;
  const [color, setColor] = useState(start);
  const p = PALETTE[color];
  const dup = existing.some(c => c.id !== initial?.id && norm(c.label) === norm(name));
  const valid = name.trim() && !dup;
  return (
    <form className="fade-in flex flex-col gap-4 rounded-2xl border border-line bg-canvas/50 p-4"
      onSubmit={e => { e.preventDefault(); if (valid) onSave({ ...(initial || {}), label: name.trim(), grp, bg: p.bg, fg: p.fg }); }}>
      <div>
        <label className={cls.label} htmlFor="cat-name">이름</label>
        <input id="cat-name" value={name} maxLength={10} onChange={e => setName(e.target.value)} className={cls.input} placeholder="예: 도시락, 베이킹, 손님 초대" autoFocus />
        {dup && <p className="mt-1 text-[13px] text-[#9E4742]">이미 있는 이름이에요</p>}
      </div>
      <div>
        <span className={cls.label}>종류</span>
        <div className="inline-flex rounded-full border border-line bg-white p-0.5">
          {[['meal', '식사 · 레시피 연결'], ['life', '일정 · 직접 입력']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setGrp(v)} className={`h-8 px-3.5 rounded-full text-[13px] ${grp === v ? 'bg-sage text-white font-medium' : 'text-muted'}`}>{l}</button>
          ))}
        </div>
      </div>
      <div>
        <span className={cls.label}>색상 · <span className="text-ink">{p.name}</span></span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="색상">
          {PALETTE.map((c, i) => (
            <button key={c.name} type="button" role="radio" aria-checked={color === i} aria-label={c.name} title={c.name} onClick={() => setColor(i)}
              className={`h-9 w-9 rounded-full grid place-items-center border ${focus} ${color === i ? 'ring-2 ring-sage ring-offset-2 border-transparent' : 'border-black/5'}`}
              style={{ background: c.bg, color: c.fg }}>
              {color === i ? <Icon d={I.check} size={14} sw={2.6} /> : <span className="h-2 w-2 rounded-full" style={{ background: c.fg }} />}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center h-7 px-2.5 rounded-full text-[13px] font-medium" style={{ background: p.bg, color: p.fg }}>{name.trim() || '새 카테고리'}</span>
        <span className="flex-1" />
        <button type="button" onClick={onCancel} className={cls.ghost + ' h-9'}>취소</button>
        <button type="submit" disabled={!valid} className={cls.primary + ' h-9'}>{initial ? '수정' : '추가'}</button>
      </div>
    </form>
  );
}

// 카테고리 관리: 기본 카테고리도 이름 · 색 · 순서를 바꾸거나 지울 수 있어요
export default function CategoryModal({ onClose }) {
  const t = useTable();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [armed, setArmed] = useState(null);
  useEditingPresence({ kind: 'categories', id: 'all' });
  const others = editorsOf(t.others, 'categories');
  const save = async c => {
    if (editing === 'new') { await t.addCategory(c); toast(`'${c.label}' 카테고리를 추가했어요`); }
    else { await t.updateCategory(c); toast(`'${c.label}'(으)로 수정했어요`); }
    setEditing(null);
  };
  const remove = async c => {
    if (armed !== c.id) { setArmed(c.id); return; }
    await t.deleteCategory(c); setArmed(null); toast(`'${c.label}' 카테고리를 지웠어요`);
  };
  const section = (grp, title) => {
    const items = t.categories.filter(c => (c.grp === 'meal') === (grp === 'meal'));
    return (
      <div>
        <p className="text-[13px] text-muted mb-1.5">{title}</p>
        <ul className="rounded-2xl border border-line divide-y divide-line">
          {items.map(c => {
            const n = t.events.filter(e => e.category_id === c.id).length;
            if (editing === c.id) return <li key={c.id} className="p-2"><Editor initial={c} existing={t.categories} onSave={save} onCancel={() => setEditing(null)} /></li>;
            return (
              <li key={c.id} className="flex items-center gap-2 px-3 py-2">
                <span className="inline-flex items-center h-7 px-2.5 rounded-full text-[13px] font-medium" style={{ background: c.bg, color: c.fg }}>{c.label}</span>
                <span className="text-[13px] text-faintink tabular-nums">일정 {n}</span>
                <span className="flex-1" />
                {!t.canWrite ? null : armed === c.id ? (
                  <>
                    <button type="button" onClick={() => setArmed(null)} className="h-8 px-2.5 rounded-full text-[13px] text-muted">취소</button>
                    <button type="button" onClick={() => remove(c)} className="h-8 px-3 rounded-full text-[13px] bg-[#F7E8E6] text-[#9E4742]">{n ? `일정 ${n}개도 삭제` : '삭제'}</button>
                  </>
                ) : (
                  <>
                    <IconButton label={`${c.label} 위로`} onClick={() => t.moveCategory(c, -1)} className="h-8 w-8"><Icon d="M18 15l-6-6-6 6" size={15} /></IconButton>
                    <IconButton label={`${c.label} 수정`} onClick={() => { setEditing(c.id); setArmed(null); }} className="h-8 w-8"><Icon d={I.edit} size={15} /></IconButton>
                    <IconButton label={`${c.label} 삭제`} onClick={() => remove(c)} className="h-8 w-8"><Icon d={I.trash} size={15} /></IconButton>
                  </>
                )}
              </li>
            );
          })}
          {!items.length && <li className="px-3 py-3 text-[13px] text-faintink">없어요</li>}
        </ul>
      </div>
    );
  };
  return (
    <Modal title="카테고리 관리" onClose={onClose} footer={<><span className="flex-1" /><button type="button" onClick={onClose} className={cls.primary}>완료</button></>}>
      <div className="flex flex-col gap-4">
        <EditingBanner people={others} what="카테고리를 고치고 있어요" />
        {t.canWrite && (editing === 'new'
          ? <Editor existing={t.categories} onSave={save} onCancel={() => setEditing(null)} />
          : <button type="button" onClick={() => { setEditing('new'); setArmed(null); }} className={`h-11 rounded-2xl border border-dashed border-[#C9D1C6] text-sage text-sm inline-flex items-center justify-center gap-1 hover:bg-sage-faint ${focus}`}><Icon d={I.plus} size={15} />새 카테고리 추가</button>)}
        {section('meal', '식사 (레시피를 연결할 수 있어요)')}
        {section('life', '일정 (약속처럼 직접 적어요)')}
      </div>
    </Modal>
  );
}
