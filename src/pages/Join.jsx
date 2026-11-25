import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { cls, FullScreenMessage, Logo, Spinner } from '../components/ui.jsx';

// 가족 초대 링크 /j/:code → 식탁 이름 확인 후 함께 고치는 멤버로 들어가기
export default function Join() {
  const { code } = useParams();
  const nav = useNavigate();
  const [info, setInfo] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    supabase.rpc('peek_invite', { code }).then(({ data }) => setInfo(data || null));
  }, [code]);

  const join = async () => {
    setBusy(true); setErr('');
    const { data, error } = await supabase.rpc('join_table', { code });
    setBusy(false);
    if (error) { setErr('들어가지 못했어요. 코드가 바뀌었을 수 있어요.'); return; }
    nav(`/t/${data}`, { replace: true });
  };

  if (info === undefined) return <FullScreenMessage><Spinner /></FullScreenMessage>;
  if (!info) return <FullScreenMessage title="초대 코드를 찾을 수 없어요">코드가 바뀌었거나 잘못 입력됐어요. 초대한 가족에게 새 링크를 받아 주세요.</FullScreenMessage>;
  return (
    <div className="min-h-screen grid place-items-center px-5">
      <div className="w-full max-w-[380px] text-center">
        <div className="flex justify-center"><Logo size={72} /></div>
        <p className="mt-4 text-[14px] text-muted">{info.owner}님이 초대했어요</p>
        <h1 className="mt-1 text-[26px] font-bold text-ink">{info.name}</h1>
        <p className="mt-1 text-[13px] text-faintink">멤버 {info.members}명 · 들어가면 함께 고칠 수 있어요</p>
        <button type="button" onClick={join} disabled={busy} className={cls.primary + ' mt-8 w-full h-12 text-[15px]'}>{busy && <Spinner />}식탁에 들어가기</button>
        <button type="button" onClick={() => nav('/')} className="mt-2 h-10 text-[13px] text-muted">내 식탁 목록으로</button>
        {err && <p className="mt-2 text-[13px] text-[#9E4742]">{err}</p>}
      </div>
    </div>
  );
}
