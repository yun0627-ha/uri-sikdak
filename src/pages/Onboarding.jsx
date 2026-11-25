import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { cls, focus, Icon, I, Logo, Spinner } from '../components/ui.jsx';
import { TINTS } from '../lib/constants.js';

// 처음 한 번: 닉네임 정하기
export default function Onboarding({ onDone, initial }) {
  const { saveProfile, profile } = useAuth();
  const [name, setName] = useState(initial?.nickname || profile?.nickname || '');
  const [tint, setTint] = useState(initial?.tint || profile?.tint || TINTS[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async e => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true); setErr('');
    try { await saveProfile({ nickname: name, tint }); onDone && onDone(); }
    catch (er) { setErr('저장하지 못했어요. 다시 해 주세요.'); }
    setBusy(false);
  };
  return (
    <div className="min-h-screen grid place-items-center px-5 py-10">
      <form onSubmit={save} className="w-full max-w-[400px] text-center">
        <div className="flex justify-center"><Logo size={64} /></div>
        <h1 className="mt-3 text-[24px] font-bold text-ink">{initial ? '닉네임 바꾸기' : '반가워요! 뭐라고 부를까요?'}</h1>
        <p className="mt-1 text-[14px] text-muted">가족 식탁에서 이 이름으로 보여요. 누가 올린 메뉴인지도 이 이름으로 표시돼요.</p>
        <div className="mt-7 flex justify-center">
          <span className="grid place-items-center h-20 w-20 rounded-full text-[30px] font-bold text-ink border-4 border-white shadow" style={{ background: tint }}>{(name.trim() || '?').slice(0, 1)}</span>
        </div>
        <input value={name} maxLength={12} onChange={e => setName(e.target.value)} placeholder="예: 지민, 엄마, 막내" aria-label="닉네임"
          className={cls.input + ' mt-5 h-12 rounded-2xl text-center text-[17px]'} autoFocus />
        <div className="mt-4 flex justify-center gap-2" role="radiogroup" aria-label="내 색">
          {TINTS.map(t => (
            <button key={t} type="button" role="radio" aria-checked={tint === t} aria-label="색 고르기" onClick={() => setTint(t)}
              className={`h-8 w-8 rounded-full border grid place-items-center ${focus} ${tint === t ? 'ring-2 ring-sage ring-offset-2 border-transparent' : 'border-black/5'}`} style={{ background: t }}>
              {tint === t && <Icon d={I.check} size={13} sw={2.6} className="text-sage-dark" />}
            </button>
          ))}
        </div>
        <button type="submit" disabled={busy || !name.trim()} className={cls.primary + ' mt-7 w-full h-12 text-[15px]'}>{busy && <Spinner />}{initial ? '저장' : '시작하기'}</button>
        {err && <p className="mt-3 text-[13px] text-[#9E4742]">{err}</p>}
      </form>
    </div>
  );
}
