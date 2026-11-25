import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { cls, Empty, FullScreenMessage, Icon, I, Logo, Modal, SectionTitle, Spinner, TypePill, focus, useToast } from '../components/ui.jsx';
import Login from './Login.jsx';
import Onboarding from './Onboarding.jsx';
import { WEEKDAYS } from '../lib/constants.js';
import { addDays, shortDate, startOfWeek, toKey, todayKey } from '../lib/utils.js';

// 친구 식탁 구경 (읽기 전용) — QR /s/:code. 마음에 드는 레시피는 내 식탁으로 가져오기
export default function SharedView() {
  const { code } = useParams();
  const [data, setData] = useState(undefined);
  const [open, setOpen] = useState(null); // { r, d }
  const [tab, setTab] = useState('cal');
  useEffect(() => { supabase.rpc('shared_view', { code }).then(({ data: d }) => setData(d || null)); }, [code]);

  const cats = useMemo(() => Object.fromEntries((data?.categories || []).map(c => [c.id, c])), [data]);
  if (data === undefined) return <FullScreenMessage><Spinner /></FullScreenMessage>;
  if (!data) return <FullScreenMessage title="볼 수 없는 식탁이에요">링크가 바뀌었거나 구경하기가 꺼져 있어요.</FullScreenMessage>;

  const today = todayKey();
  const start = startOfWeek(new Date());
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i));
  const byDate = {};
  (data.events || []).forEach(e => { (byDate[e.date] = byDate[e.date] || []).push(e); });
  const findDish = (rid, did) => { const r = data.recipes.find(x => x.id === rid); return r ? { r, d: r.dishes.find(x => x.id === did) || r.dishes[0] } : null; };

  return (
    <div className="min-h-screen pb-16">
      <header className="mx-auto max-w-[960px] px-4 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Logo size={38} />
          <div className="min-w-0 leading-tight">
            <p className="text-[16px] font-semibold text-ink truncate">{data.table.name}</p>
            <p className="text-[13px] text-muted">{data.owner}님의 식탁 · 구경 중 (읽기 전용)</p>
          </div>
        </div>
        <Link to="/" className={cls.ghost + ' h-9 text-[13px]'}>내 식탁</Link>
      </header>
      <main className="mx-auto max-w-[960px] px-3 sm:px-6">
        <div className="inline-flex rounded-full border border-line bg-white p-0.5 mb-4" role="tablist">
          {[['cal', '2주 식단'], ['recipes', `레시피 ${data.recipes.reduce((n, r) => n + r.dishes.length, 0)}`]].map(([v, l]) => (
            <button key={v} type="button" role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className={`h-9 px-4 rounded-full text-[14px] font-medium ${tab === v ? 'bg-sage text-white' : 'text-muted'}`}>{l}</button>
          ))}
        </div>
        {tab === 'cal' ? (
          <section className="rounded-[28px] border border-line bg-white px-2 sm:px-5 py-4">
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1">{WEEKDAYS.map((w, i) => <div key={w} className={`text-center text-[13px] py-1 ${i === 0 ? 'text-[#C0524C]' : i === 6 ? 'text-[#4A6F92]' : 'text-muted'}`}>{w}</div>)}</div>
            {[0, 1].map(w => (
              <div key={w} className={`grid grid-cols-7 gap-0.5 sm:gap-1 py-2 ${w === 0 ? 'border-b border-dashed border-[#D6DCD2]' : ''}`}>
                {days.slice(w * 7, w * 7 + 7).map(d => {
                  const k = toKey(d);
                  return (
                    <div key={k} className="flex flex-col items-center min-h-[120px] px-[2px] pt-1.5">
                      <span className={`grid place-items-center h-8 w-8 rounded-full text-[15px] font-semibold ${k === today ? 'bg-[#D6E7C4] text-[#2D4538]' : k < today ? 'text-ink opacity-35' : 'text-ink'}`}>{d.getDate()}</span>
                      <span className="mt-1.5 flex flex-col gap-1 w-full">
                        {(byDate[k] || []).slice(0, 4).map(e => {
                          const c = cats[e.category_id] || { bg: '#EFEFEF', fg: '#5C5F5B' };
                          const hit = e.recipe_id ? findDish(e.recipe_id, e.dish_id) : null;
                          const chip = <span className="block w-full rounded-lg px-1 py-[5px] text-[12px] sm:text-[13px] font-semibold leading-[1.25] text-center break-keep [overflow-wrap:anywhere] line-clamp-2" style={{ background: c.bg, color: c.fg }}>{e.title}</span>;
                          return hit ? <button key={e.id} type="button" onClick={() => setOpen(hit)} className={`block w-full rounded-lg ${focus}`}>{chip}</button> : <span key={e.id}>{chip}</span>;
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
            <p className="mt-2 px-2 text-[13px] text-faintink">{shortDate(toKey(days[0]))} – {shortDate(toKey(days[13]))} · 레시피가 있는 메뉴를 누르면 볼 수 있어요</p>
          </section>
        ) : (
          data.recipes.length ? (
            <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {data.recipes.flatMap(r => r.dishes.map(d => (
                <li key={`${r.id}|${d.id}`}>
                  <button type="button" onClick={() => setOpen({ r, d })} className={`${cls.card} w-full h-full text-left px-4 py-3.5 hover:border-[#C5D2C0] ${focus}`}>
                    <p className="text-[16px] font-semibold text-ink">{d.title}</p>
                    <div className="mt-1.5 flex items-center gap-1.5"><TypePill type={d.type} className="!text-[13px] !px-2" />{r.by && <span className="text-[13px] text-muted">{r.by} 아이디어</span>}</div>
                  </button>
                </li>
              )))}
            </ul>
          ) : <Empty>아직 레시피가 없어요.</Empty>
        )}
      </main>
      {open && <SharedRecipe item={open} tableName={data.table.name} owner={data.owner} onClose={() => setOpen(null)} />}
    </div>
  );
}

function SharedRecipe({ item, tableName, owner, onClose }) {
  const { r, d } = item;
  const { session, profile } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState('view'); // view | login | pick | done
  const [mine, setMine] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (step !== 'pick' || !session) return;
    supabase.from('table_members').select('role, tables(id, name)').eq('user_id', session.user.id).in('role', ['owner', 'editor'])
      .then(({ data }) => setMine((data || []).filter(x => x.tables)));
  }, [step, session]);
  useEffect(() => { if (step === 'login' && session && profile) setStep('pick'); }, [step, session, profile]);

  const importTo = async tableId => {
    setBusy(true);
    const { error } = await supabase.from('recipes').insert({
      table_id: tableId, source: r.source, source_url: r.source_url || '', links: [],
      dishes: [{ ...d, tips: { ...(d.tips || {}), memo: '' } }], imported_from: { table: tableName, by: owner },
    });
    setBusy(false);
    if (error) { toast('가져오지 못했어요.'); return; }
    setStep('done'); toast(`'${d.title}'을(를) 내 식탁에 담았어요`);
  };

  if (step === 'login' && (!session || !profile)) {
    return <div className="fixed inset-0 z-50 bg-canvas overflow-y-auto">{!session ? <Login /> : <Onboarding />}</div>;
  }
  return (
    <Modal title={d.title} onClose={onClose} size="lg"
      footer={step === 'done' ? <><span className="flex-1 text-[13px] text-sage">내 식탁에 담았어요.</span><Link to="/" className={cls.primary}>내 식탁 가기</Link></>
        : step === 'pick' ? <><span className="flex-1" /><button type="button" onClick={() => setStep('view')} className={cls.ghost}>뒤로</button></>
        : <><span className="flex-1 text-[13px] text-faintink">{owner}님의 식탁 · 읽기 전용</span><button type="button" onClick={() => setStep(session && profile ? 'pick' : 'login')} className={cls.primary}><Icon d={I.download} size={15} />내 식탁으로 가져오기</button></>}>
      {step === 'pick' ? (
        <div>
          <p className="text-[14px] text-muted mb-3">어느 식탁에 담을까요?</p>
          {mine === null ? <div className="py-6 grid place-items-center"><Spinner /></div>
            : mine.length ? (
              <ul className="flex flex-col gap-2">{mine.map(({ tables: x }) => (
                <li key={x.id}><button type="button" disabled={busy} onClick={() => importTo(x.id)} className={`${cls.card} w-full flex items-center gap-3 px-4 py-3 text-left hover:border-sage ${focus}`}><Logo size={32} /><span className="flex-1 font-medium">{x.name}</span>{busy ? <Spinner /> : <Icon d={I.plus} size={16} className="text-sage" />}</button></li>
              ))}</ul>
            ) : <p className="text-[14px] text-muted">고칠 수 있는 식탁이 없어요. <Link to="/" className="text-sage underline">새 식탁을 먼저 만들어 주세요.</Link></p>}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2"><TypePill type={d.type} />{(d.tags || []).slice(0, 4).map(x => <span key={x} className="text-[13px] text-muted">#{x}</span>)}</div>
          <SectionTitle>재료 <span className="text-[13px] font-normal text-muted">{d.servings}인분</span></SectionTitle>
          <ul className="rounded-2xl border border-line px-5 py-3">{d.ingredients.map((i, k) => <li key={k} className="flex items-center gap-2.5 py-1 text-[15px]"><span className="h-1.5 w-1.5 rounded-full bg-sage-check" />{i.name} <span className="text-[#5A6259]">{[i.amount, i.unit].filter(Boolean).join(' ')}</span></li>)}</ul>
          <SectionTitle>조리 순서</SectionTitle>
          <ol className="rounded-2xl border border-line px-5 py-4 flex flex-col gap-3">{d.steps.map((s, i) => <li key={i} className="flex gap-3"><span className="h-7 w-7 shrink-0 rounded-full bg-sage text-white text-[13px] font-semibold grid place-items-center">{i + 1}</span><p className="text-[15px] leading-relaxed pt-0.5">{s}</p></li>)}</ol>
          {(d.tips?.cooking || d.tips?.tools) && <>
            <SectionTitle>팁</SectionTitle>
            <div className="rounded-2xl border border-line px-5 py-3 text-[15px] leading-relaxed whitespace-pre-line">{[d.tips.cooking, d.tips.tools].filter(Boolean).join('\n')}</div>
          </>}
          {r.source_url && /^https?:\/\//.test(r.source_url) && <a href={r.source_url} target="_blank" rel="noopener noreferrer" className={cls.ghost + ' mt-5'}><Icon d={I.ext} size={15} />{r.source}에서 보기</a>}
        </div>
      )}
    </Modal>
  );
}
