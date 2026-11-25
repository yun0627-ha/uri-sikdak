import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { cls, Logo, Spinner } from '../components/ui.jsx';

// 이메일로 받은 로그인 링크를 눌러 들어가기 (비밀번호 없음)
export default function Login() {
  const { sendCode } = useAuth();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('email');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const send = async e => {
    e?.preventDefault?.(); setErr('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr('이메일 주소를 확인해 주세요.'); return; }
    setBusy(true);
    const { error } = await sendCode(email);
    setBusy(false);
    if (error) { setErr(error.status === 429 ? '잠시 뒤에 다시 시도해 주세요.' : '메일을 보내지 못했어요. 다시 해 주세요.'); return; }
    setStep('sent');
  };
  return (
    <div className="min-h-screen grid place-items-center px-5 py-10">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center text-center">
          <Logo size={72} />
          <h1 className="mt-3 text-[26px] font-bold text-ink">우리집 식탁</h1>
          <p className="mt-1 text-[14px] text-muted">가족과 함께 쓰는 식단 캘린더 · 레시피 보관함</p>
        </div>
        <div className={cls.card + ' mt-8 p-5'}>
          {step === 'email' ? (
            <form onSubmit={send} className="flex flex-col gap-3">
              <label className={cls.label} htmlFor="email">이메일로 시작하기</label>
              <input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={cls.input + ' h-12 rounded-2xl'} placeholder="you@example.com" autoFocus />
              <button type="submit" disabled={busy || !email.trim()} className={cls.primary + ' h-12 text-[15px]'}>{busy ? <Spinner /> : null}로그인 메일 받기</button>
              <p className="text-[13px] text-faintink text-center">비밀번호 없이, 메일로 온 링크를 누르면 들어가요.</p>
            </form>
          ) : (
            <div className="flex flex-col gap-3 text-center">
              <p className="text-[15px] text-ink"><b>{email}</b>로<br />로그인 메일을 보냈어요.</p>
              <p className="text-[13px] text-muted">메일함에서 <b>Your sign-in link</b> 메일을 열고 <b>Sign in</b>을 누르면 바로 들어가져요. 안 보이면 스팸함도 확인해 주세요.</p>
              <button type="button" onClick={send} disabled={busy} className={cls.ghost + ' h-11 text-[14px]'}>{busy ? <Spinner /> : null}메일 다시 보내기</button>
              <button type="button" onClick={() => setStep('email')} className="text-[13px] text-muted h-9">이메일 다시 입력</button>
            </div>
          )}
          {err && <p className="mt-3 text-[13px] text-[#9E4742] text-center">{err}</p>}
        </div>
      </div>
    </div>
  );
}
