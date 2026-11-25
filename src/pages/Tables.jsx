import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { Avatar, cls, focus, Icon, I, Logo, Modal, Spinner, useToast } from '../components/ui.jsx';
import Onboarding from './Onboarding.jsx';

const ROLE = { owner: '만든 사람', editor: '함께 고치기', viewer: '보기만' };
const LAST_KEY = 'last-table';

// 내 식탁 목록: 혼자 쓰는 식탁, 가족 식탁 만들기 · 코드로 들어가기
export default function Tables() {
  const { profile, signOut } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [list, setList] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [editProfile, setEditProfile] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from('table_members').select('role, joined_at, tables(id, name, created_at)').eq('user_id', profile.id).order('joined_at');
    if (error) { toast('식탁 목록을 불러오지 못했어요.'); setList([]); return; }
    const rows = (data || []).filter(x => x.tables);
    setList(rows);
    // 앱을 열면 마지막으로 쓴 식탁으로 바로 (한 번만)
    try {
      const last = localStorage.getItem(LAST_KEY);
      if (!sessionStorage.getItem('auto-opened') && last && rows.some(x => x.tables.id === last)) { sessionStorage.setItem('auto-opened', '1'); nav(`/t/${last}`, { replace: true }); }
      else sessionStorage.setItem('auto-opened', '1');
    } catch (er) { /* 무시 */ }
  };
  useEffect(() => { load(); }, []);

  const create = async e => {
    e.preventDefault();
    const n = (name.trim() || `${profile.nickname}네 식탁`).slice(0, 20);
    setBusy(true);
    const { data, error } = await supabase.rpc('create_table', { tname: n });
    setBusy(false);
    if (error) { toast('식탁을 만들지 못했어요.'); return; }
    try { localStorage.setItem(LAST_KEY, data); } catch (er) { /* 무시 */ }
    nav(`/t/${data}`);
  };
  const join = e => {
    e.preventDefault();
    const c = code.trim().replace(/.*\/j\//, '').replace(/[^0-9a-f]/gi, '').toLowerCase();
    if (c) nav(`/j/${c}`);
  };

  if (editProfile) return <Onboarding initial={profile} onDone={() => setEditProfile(false)} />;

  return (
    <div className="min-h-screen pb-16">
      <header className="mx-auto max-w-[640px] px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2"><Logo size={36} /><span className="text-[16px] font-semibold">우리집 식탁</span></div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setEditProfile(true)} className={`flex items-center gap-1.5 h-9 pl-1 pr-3 rounded-full hover:bg-white ${focus}`}><Avatar p={profile} size={28} /><span className="text-[13px]">{profile.nickname}</span></button>
          <button type="button" onClick={signOut} aria-label="로그아웃" title="로그아웃" className={`h-9 w-9 grid place-items-center rounded-full text-muted hover:bg-white ${focus}`}><Icon d={I.logout} size={17} /></button>
        </div>
      </header>
      <main className="mx-auto max-w-[640px] px-4">
        <h1 className="mt-4 text-[24px] font-bold text-ink">내 식탁</h1>
        <p className="mt-1 text-[14px] text-muted">혼자 쓰는 식탁도, 가족과 함께 쓰는 식탁도 만들 수 있어요.</p>

        <ul className="mt-5 flex flex-col gap-2.5">
          {list === null && <li className="py-10 grid place-items-center text-muted"><Spinner /></li>}
          {list && !list.length && <li className={cls.card + ' px-5 py-8 text-center text-[14px] text-muted'}>아직 식탁이 없어요. 아래에서 첫 식탁을 만들어 보세요.</li>}
          {list && list.map(({ role, tables: t }) => (
            <li key={t.id}>
              <Link to={`/t/${t.id}`} onClick={() => { try { localStorage.setItem(LAST_KEY, t.id); } catch (er) { /* 무시 */ } }}
                className={`${cls.card} flex items-center gap-4 px-5 py-4 hover:border-[#C5D2C0] ${focus}`}>
                <Logo size={40} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[17px] font-semibold text-ink truncate">{t.name}</span>
                  <span className="text-[13px] text-muted">{ROLE[role]}</span>
                </span>
                <Icon d={I.right} className="text-faintink" />
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => { setName(`${profile.nickname}네 식탁`); setCreating(true); }} className={`${cls.card} px-5 py-4 text-left hover:border-[#C5D2C0] ${focus}`}>
            <span className="flex items-center gap-2 text-[15px] font-semibold text-ink"><Icon d={I.plus} size={16} />새 식탁 만들기</span>
            <span className="block mt-1 text-[13px] text-muted">혼자 쓰거나, 만든 뒤 가족을 초대해요</span>
          </button>
          <form onSubmit={join} className={`${cls.card} px-5 py-4`}>
            <label htmlFor="code" className="flex items-center gap-2 text-[15px] font-semibold text-ink"><Icon d={I.users} size={16} />초대 코드로 들어가기</label>
            <div className="mt-2 flex gap-2">
              <input id="code" value={code} onChange={e => setCode(e.target.value)} placeholder="코드 또는 초대 링크" className={cls.input + ' rounded-full'} />
              <button type="submit" disabled={!code.trim()} className={cls.primary + ' shrink-0'}>들어가기</button>
            </div>
          </form>
        </div>
      </main>

      {creating && (
        <Modal title="새 식탁 만들기" onClose={() => setCreating(false)}
          footer={<><span className="flex-1" /><button type="button" onClick={() => setCreating(false)} className={cls.ghost}>취소</button><button type="submit" form="create-form" disabled={busy} className={cls.primary}>{busy && <Spinner />}만들기</button></>}>
          <form id="create-form" onSubmit={create}>
            <label className={cls.label} htmlFor="tname">식탁 이름</label>
            <input id="tname" value={name} maxLength={20} onChange={e => setName(e.target.value)} className={cls.input} autoFocus />
            <p className="mt-2 text-[13px] text-muted">만든 뒤 설정 › 멤버에서 가족 초대 QR을 보낼 수 있어요.</p>
          </form>
        </Modal>
      )}
    </div>
  );
}
