import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, I, Spinner, focus } from './ui.jsx';
import RecipeForm from './RecipeForm.jsx';
import { autoParse, shrinkImage } from '../lib/ai.js';
import { supabase } from '../lib/supabase.js';

// + 버튼: 링크 붙여넣기 → 자동 분석 → 레시피 입력 화면 (또는 수동 입력 · 사진으로)
export default function QuickAdd({ onClose }) {
  const nav = useNavigate();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState(null); // { url, dishes }
  const fileRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape' && !form) onClose(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [form, onClose]);

  const run = async files => {
    if (!files && !/^https?:\/\//.test(url.trim())) { setErr('https:// 로 시작하는 링크를 넣어 주세요.'); inputRef.current?.focus(); return; }
    setBusy(true); setErr('');
    try {
      const images = files ? await Promise.all([...files].slice(0, 4).map(f => shrinkImage(f))) : null;
      const dishes = await autoParse(supabase, url.trim(), images);
      setForm({ url: files ? '' : url.trim(), dishes });
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  if (form) return <RecipeForm initial={form} onClose={onClose} onSaved={(rid, did) => { onClose(); nav(`recipes/${rid}?d=${encodeURIComponent(did)}`); }} />;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#2E352F]/35" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="레시피 추가" className="fade-in w-full sm:max-w-[480px] bg-[#FAFAF7] rounded-t-[28px] px-5 pt-3 pb-6" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
        <div className="flex justify-center"><span className="h-1 w-10 rounded-full bg-[#D8DDD4]" /></div>
        <h2 className="mt-4 text-center text-[17px] font-bold text-ink">레시피를 추가해 보세요</h2>
        <p className="mt-1 text-center text-[12px] text-muted">링크를 넣으면 재료와 순서를 자동으로 채워 드려요</p>

        <input ref={inputRef} value={url} onChange={e => { setUrl(e.target.value); setErr(''); }} onKeyDown={e => { if (e.key === 'Enter') run(); }}
          inputMode="url" placeholder="유튜브 · 블로그 · 인스타 링크 붙여넣기" disabled={busy}
          className="mt-5 w-full h-12 rounded-2xl bg-[#F0F1EC] px-4 text-[14px] text-ink placeholder:text-faintink focus:outline-none focus:ring-2 focus:ring-sage/30" />
        <button type="button" onClick={() => run()} disabled={busy} className={`mt-2.5 w-full h-12 rounded-2xl bg-sage text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60 ${focus}`}>
          {busy ? <><Spinner size={16} />분석하는 중… (영상은 30초쯤)</> : '자동 분석하기'}
        </button>
        {err && <p className="mt-2 text-center text-[12px] text-[#9E4742]">{err}</p>}

        <div className="my-4 flex items-center gap-3 text-[11px] text-faintink"><span className="flex-1 h-px bg-line" />또는<span className="flex-1 h-px bg-line" /></div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => setForm({ url: url.trim(), dishes: [] })} className={`h-11 rounded-2xl border border-sage/50 bg-white text-[13px] text-sage font-medium inline-flex items-center justify-center gap-1.5 ${focus}`}><Icon d={I.edit} size={15} />직접 입력하기</button>
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={`h-11 rounded-2xl border border-sage/50 bg-white text-[13px] text-sage font-medium inline-flex items-center justify-center gap-1.5 ${focus}`}><Icon d={I.download} size={15} />캡처 사진으로</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { const f = e.target.files; if (f && f.length) run(f); e.target.value = ''; }} />
      </div>
    </div>
  );
}
