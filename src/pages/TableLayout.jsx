import { useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { TableProvider, useTable } from '../hooks/useTable.jsx';
import { Avatar, FullScreenMessage, Icon, I, Logo, Spinner, focus } from '../components/ui.jsx';
import { SHOP_COLOR } from '../lib/constants.js';
import QuickAdd from '../components/QuickAdd.jsx';

export default function TableLayout() {
  const { tableId } = useParams();
  try { localStorage.setItem('last-table', tableId); } catch (e) { /* 무시 */ }
  return <TableProvider key={tableId} tableId={tableId}><Shell /></TableProvider>;
}

function Shell() {
  const t = useTable();
  const [adding, setAdding] = useState(false);
  if (t.status === 'loading') return <FullScreenMessage><Spinner size={22} /></FullScreenMessage>;
  if (t.status !== 'ready') {
    return <FullScreenMessage title="식탁을 열 수 없어요">이 식탁의 멤버가 아니거나 식탁이 없어졌어요.<br /><Link to="/" className="text-sage underline">내 식탁 목록으로</Link></FullScreenMessage>;
  }
  return (
    <div className="min-h-screen pb-24">
      <Header />
      {!t.canWrite && <p className="mx-auto max-w-[1240px] px-4 sm:px-6 -mt-1 mb-2 text-[13px] text-[#8A6D2F]">이 식탁은 보기만 할 수 있어요.</p>}
      <main className="mx-auto max-w-[1240px] px-3 sm:px-6"><Outlet /></main>
      <BottomNav onAdd={t.canWrite ? () => setAdding(true) : null} />
      {adding && <QuickAdd onClose={() => setAdding(false)} />}
    </div>
  );
}

function Header() {
  const t = useTable();
  return (
    <header className="mx-auto max-w-[1240px] px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
      <Link to="/" className={`flex items-center gap-2 min-w-0 rounded-full pr-2 ${focus}`} title="내 식탁 목록">
        <Logo size={32} />
        <span className="min-w-0 leading-tight">
          <span className="flex items-center gap-1 text-[15px] font-semibold text-ink"><span className="truncate">{t.table.name}</span><Icon d={I.down} size={14} className="text-muted shrink-0" /></span>
          <span className="block text-[12px] text-muted">멤버 {t.members.length}명</span>
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <OnlineNow />
      </div>
    </header>
  );
}

// 지금 같이 보고 있는 가족 (노란 점: 고치는 중)
function OnlineNow() {
  const { others } = useTable();
  if (!others.length) return null;
  const word = ed => ed.kind === 'recipe' ? `'${ed.label || '레시피'}' 고치는 중` : ed.kind === 'day' ? `${ed.label} 메뉴 추가 중` : ed.kind === 'categories' ? '카테고리 고치는 중' : '편집 중';
  return (
    <div className="flex items-center gap-1.5" aria-label="지금 접속 중">
      <span className="hidden sm:inline text-[13px] text-sage">접속 중</span>
      <span className="flex -space-x-1.5">
        {others.slice(0, 4).map(o => (
          <span key={o.user_id} className="relative" title={`${o.nickname}${o.editing ? ' · ' + word(o.editing) : ' · 보는 중'}`}>
            <Avatar p={o} size={28} />
            <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${o.editing ? 'bg-[#D9A441]' : 'bg-sage'}`} />
          </span>
        ))}
      </span>
    </div>
  );
}

const TABS = [
  { to: '.', label: '달력', icon: I.cal, end: true },
  { to: 'recipes', label: '레시피', icon: I.book },
  { to: 'shopping', label: '장바구니', icon: I.cart },
  { to: 'settings', label: '설정', icon: I.gear },
];
function BottomNav({ onAdd }) {
  const { shopping } = useTable();
  const left = shopping.filter(i => !i.checked).length;
  return (
    <nav aria-label="주요 화면" className="kb-hide fixed z-30 bottom-0 inset-x-0 sm:bottom-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] bg-white/95 backdrop-blur border-t sm:border border-line sm:rounded-full shadow-[0_8px_30px_-12px_rgba(46,53,47,.25)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <ul className="grid grid-cols-5 items-center p-1">
        {TABS.map((t, i) => [i === 2 && (
          <li key="add" className="flex justify-center">
            {onAdd && <button type="button" onClick={onAdd} aria-label="레시피 추가" className={`-mt-6 h-14 w-14 grid place-items-center rounded-full bg-sage text-white shadow-[0_8px_20px_-6px_rgba(46,53,47,.45)] active:scale-95 transition-transform ${focus}`}><Icon d={I.plus} size={26} sw={2.4} /></button>}
          </li>
        ), (
          <li key={t.label}>
            <NavLink to={t.to} end={t.end} replace
              className={({ isActive }) => `relative w-full h-12 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 rounded-full text-[11px] sm:text-[13px] font-medium transition-colors ${focus} ${isActive ? 'bg-sage-faint text-sage' : 'text-muted hover:text-ink'}`}>
              <Icon d={t.icon} size={18} />
              {t.label}
              {t.to === 'shopping' && left > 0 && (
                <span className="absolute top-1 right-[12%] sm:static min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[10px] font-semibold tabular-nums" style={{ background: SHOP_COLOR.bg, color: SHOP_COLOR.fg }}>{left}</span>
              )}
            </NavLink>
          </li>
        )])}
      </ul>
    </nav>
  );
}
