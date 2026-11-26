import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useTable } from '../hooks/useTable.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { Avatar, CardHead, cls, focus, Icon, I, Modal, TagInput, Toggle, useToast } from '../components/ui.jsx';
import CategoryModal from '../components/CategoryModal.jsx';
import { SHOP_COLOR, TINTS } from '../lib/constants.js';
import { setPhotoPref, usePhotoPref } from '../lib/photoPref.js';

const Row = ({ title, sub, children }) => (
  <div className="flex items-center justify-between gap-4 px-4 py-3.5 border-b border-line last:border-0">
    <div className="min-w-0"><p className="text-[15px] text-ink">{title}</p>{sub && <p className="text-[13px] text-muted mt-0.5">{sub}</p>}</div>
    {children}
  </div>
);
const Seg = ({ value, options, onChange, disabled }) => (
  <div className="inline-flex rounded-full border border-line bg-canvas p-0.5">
    {options.map(([v, l]) => <button key={String(v)} type="button" disabled={disabled} onClick={() => onChange(v)} className={`h-8 px-3.5 rounded-full text-[13px] ${value === v ? 'bg-sage text-white font-medium' : 'text-muted'}`}>{l}</button>)}
  </div>
);
const ROLE = { owner: '만든 사람', editor: '함께 고치기', viewer: '보기만' };

export default function Settings() {
  const t = useTable();
  const { profile, saveProfile, signOut } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const s = t.settings;
  const photoPref = usePhotoPref();
  const [cats, setCats] = useState(false);
  const [qr, setQr] = useState(null); // invite | view
  const [name, setName] = useState(t.table.name);
  const [nick, setNick] = useState(profile.nickname);
  const [armed, setArmed] = useState(null);
  useEffect(() => setName(t.table.name), [t.table.name]);

  const origin = window.location.origin;
  const links = { invite: `${origin}/j/${t.table.invite_code}`, view: `${origin}/s/${t.table.view_code}` };
  const share = async kind => {
    const url = links[kind];
    const text = kind === 'invite' ? `'${t.table.name}'에 같이 쓰자! 이 링크로 들어와요.` : `'${t.table.name}' 구경하러 와요 (읽기 전용)`;
    try { if (navigator.share) { await navigator.share({ title: t.table.name, text, url }); return; } } catch (e) { return; }
    try { await navigator.clipboard.writeText(url); toast('링크를 복사했어요'); } catch (e) { toast(url); }
  };
  const confirmTwice = (key, fn) => { if (armed === key) { setArmed(null); fn(); } else { setArmed(key); setTimeout(() => setArmed(a => a === key ? null : a), 3000); } };

  return (
    <div className="mx-auto w-full max-w-[640px] flex flex-col gap-4">
      <section className={cls.card}>
        <CardHead tag="가족 · 친구" count={`멤버 ${t.members.length}명`} />
        <div className="px-4 pb-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setQr('invite')} className={`rounded-2xl border border-line bg-canvas/60 px-4 py-3 text-left hover:border-sage ${focus}`}>
            <span className="flex items-center gap-1.5 text-[14px] font-semibold text-ink"><Icon d={I.qr} size={16} />가족 초대</span>
            <span className="block mt-0.5 text-[13px] text-muted">함께 고칠 수 있어요</span>
          </button>
          <button type="button" onClick={() => setQr('view')} className={`rounded-2xl border border-line bg-canvas/60 px-4 py-3 text-left hover:border-sage ${focus}`}>
            <span className="flex items-center gap-1.5 text-[14px] font-semibold text-ink"><Icon d={I.eye} size={16} />친구에게 구경시키기</span>
            <span className="block mt-0.5 text-[13px] text-muted">읽기 전용 · 레시피 가져가기</span>
          </button>
        </div>
        <ul>
          {t.members.map(m => {
            const me = m.user_id === t.me;
            return (
              <li key={m.user_id} className="flex items-center gap-3 px-4 py-2.5 border-t border-line">
                <Avatar p={m.profiles} size={32} ring={me} />
                <span className="flex-1 min-w-0"><span className="block text-[15px] text-ink truncate">{m.profiles?.nickname}{me && <span className="ml-1.5 text-[13px] text-sage">나</span>}</span><span className="text-[13px] text-muted">{ROLE[m.role]}</span></span>
                {t.isOwner && !me && (
                  <>
                    <select value={m.role} onChange={e => t.setMemberRole(m.user_id, e.target.value)} aria-label={`${m.profiles?.nickname} 권한`} className="h-8 rounded-full border border-line bg-white px-2 text-[13px]">
                      <option value="editor">함께 고치기</option><option value="viewer">보기만</option>
                    </select>
                    <button type="button" onClick={() => confirmTwice(`rm-${m.user_id}`, () => t.removeMember(m.user_id))} className={`h-8 px-2.5 rounded-full text-[13px] ${armed === `rm-${m.user_id}` ? 'bg-[#F7E8E6] text-[#9E4742]' : 'text-muted hover:text-[#9E4742]'}`}>{armed === `rm-${m.user_id}` ? '확인' : '내보내기'}</button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className={cls.card}>
        <CardHead tag="식탁" />
        <div className="px-4 pb-3">
          <label className={cls.label} htmlFor="tname">식탁 이름</label>
          <input id="tname" value={name} maxLength={20} disabled={!t.canWrite} onChange={e => setName(e.target.value)}
            onBlur={() => { const n = name.trim(); if (n && n !== t.table.name) { t.updateTable({ name: n }); toast('식탁 이름을 바꿨어요'); } else setName(t.table.name); }}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} className={cls.input} />
        </div>
        <Row title="처음 열 때 보기"><Seg value={s.defaultView} options={[['2w', '2주'], ['month', '한 달']]} onChange={v => t.updateSettings({ defaultView: v })} disabled={!t.canWrite} /></Row>
        <Row title="한 주의 시작"><Seg value={s.weekStart} options={[[0, '일요일'], [1, '월요일']]} onChange={v => t.updateSettings({ weekStart: v })} disabled={!t.canWrite} /></Row>
        <Row title="끼니 · 일정 카테고리" sub={`${t.categories.length}개 · 이름, 색, 순서 바꾸기`}><button type="button" onClick={() => setCats(true)} className={cls.ghost + ' h-9'}>편집</button></Row>
        <Row title="메뉴를 사진으로 보기" sub="목록·달력에서 아이콘 대신 사진 (내 폰에서만)"><Toggle on={photoPref} onChange={setPhotoPref} label="메뉴를 사진으로 보기" /></Row>
        <Row title="달력에 장볼 재료 표시" sub="날짜 칸에 '장볼 N'을 함께 보여줘요"><Toggle on={!!s.showShopOnCalendar} onChange={v => t.updateSettings({ showShopOnCalendar: v })} label="달력에 장볼 재료 표시" disabled={!t.canWrite} /></Row>
        <div className="px-4 py-3.5">
          <p className="text-[15px] text-ink">기본 양념</p>
          <p className="text-[13px] text-muted mt-0.5 mb-2">장바구니에 '모두 담기' 할 때 빠지는 재료예요.</p>
          <TagInput tags={s.basics} onChange={v => t.updateSettings({ basics: v })} disabled={!t.canWrite} placeholder="재료 이름 (Enter로 추가)" />
        </div>
      </section>

      <section className={cls.card}>
        <CardHead tag="내 정보" />
        <div className="px-4 pb-4">
          <label className={cls.label} htmlFor="nick">닉네임</label>
          <div className="flex gap-2">
            <input id="nick" value={nick} maxLength={12} onChange={e => setNick(e.target.value)} className={cls.input} />
            <button type="button" disabled={!nick.trim() || nick.trim() === profile.nickname} onClick={async () => { await saveProfile({ nickname: nick, tint: profile.tint }); t.reload(); toast('닉네임을 바꿨어요'); }} className={cls.primary + ' shrink-0'}>저장</button>
          </div>
          <div className="mt-3 flex gap-2" role="radiogroup" aria-label="내 색">
            {TINTS.map(c => (
              <button key={c} type="button" role="radio" aria-checked={profile.tint === c} aria-label="색 고르기" onClick={async () => { await saveProfile({ nickname: profile.nickname, tint: c }); t.reload(); }}
                className={`h-8 w-8 rounded-full border ${focus} ${profile.tint === c ? 'ring-2 ring-sage ring-offset-2 border-transparent' : 'border-black/5'}`} style={{ background: c }} />
            ))}
          </div>
        </div>
        <Row title="다른 식탁 보기 · 새 식탁 만들기"><button type="button" onClick={() => nav('/')} className={cls.ghost + ' h-9'}>내 식탁</button></Row>
        <Row title="로그아웃"><button type="button" onClick={signOut} className={cls.ghost + ' h-9'}><Icon d={I.logout} size={15} />로그아웃</button></Row>
        {!t.isOwner && <Row title="이 식탁에서 나가기" sub="다시 들어오려면 초대 링크가 필요해요">
          <button type="button" onClick={() => confirmTwice('leave', async () => { await t.removeMember(t.me); nav('/', { replace: true }); })} className={`h-9 px-3.5 rounded-full text-[13px] ${armed === 'leave' ? 'bg-[#F7E8E6] text-[#9E4742]' : 'border border-line'}`}>{armed === 'leave' ? '한 번 더 누르면 나가요' : '나가기'}</button>
        </Row>}
        {t.isOwner && <Row title="식탁 지우기" sub="모든 레시피 · 일정 · 장바구니가 지워져요">
          <button type="button" onClick={() => confirmTwice('del', async () => { await t.deleteTable(); nav('/', { replace: true }); })} className={`h-9 px-3.5 rounded-full text-[13px] ${armed === 'del' ? 'bg-[#9E4742] text-white' : 'border border-[#D9A9A5] text-[#9E4742]'}`}>{armed === 'del' ? '정말 지우기' : '지우기'}</button>
        </Row>}
      </section>

      {cats && <CategoryModal onClose={() => setCats(false)} />}
      {qr && (
        <Modal title={qr === 'invite' ? '가족 초대' : '친구에게 구경시키기'} onClose={() => setQr(null)}>
          <div className="flex flex-col items-center text-center">
            <p className="text-[14px] text-muted leading-relaxed">
              {qr === 'invite' ? '이 QR을 찍거나 링크로 들어오면 함께 고치는 멤버가 돼요. 처음엔 이메일 로그인과 닉네임 설정을 한 번 해요.'
                : '로그인 없이도 우리 식탁의 2주 식단과 레시피를 볼 수 있어요(읽기 전용). 마음에 드는 레시피는 자기 식탁으로 가져갈 수 있어요.'}
            </p>
            {qr === 'view' && !t.table.view_enabled ? (
              <p className="mt-5 rounded-2xl bg-canvas px-4 py-6 text-[14px] text-muted">구경하기가 꺼져 있어요.</p>
            ) : (
              <div className="mt-5 rounded-3xl bg-white border border-line p-5"><QRCodeSVG value={links[qr]} size={200} fgColor="#2E352F" bgColor="#FFFFFF" level="M" /></div>
            )}
            <p className="mt-3 text-[13px] text-faintink break-all">{links[qr]}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => share(qr)} className={cls.primary}><Icon d={I.link} size={15} />링크 보내기</button>
              {t.isOwner && <button type="button" onClick={() => confirmTwice(`rot-${qr}`, async () => { await t.rotateCode(qr); toast('새 코드로 바꿨어요. 예전 링크는 이제 안 열려요.'); })} className={cls.ghost}>{armed === `rot-${qr}` ? '한 번 더 누르면 바뀌어요' : '코드 새로 만들기'}</button>}
            </div>
            {qr === 'view' && t.isOwner && (
              <div className="mt-5 w-full flex items-center justify-between rounded-2xl border border-line px-4 py-3">
                <span className="text-[14px] text-ink">구경하기 허용</span>
                <Toggle on={t.table.view_enabled} onChange={v => t.updateTable({ view_enabled: v })} label="구경하기 허용" />
              </div>
            )}
            {qr === 'invite' && <p className="mt-4 text-[13px] text-muted">들어온 뒤 '보기만'으로 바꾸려면 멤버 목록에서 권한을 바꿔 주세요.</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
