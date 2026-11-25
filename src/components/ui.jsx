import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { rtype, STAR } from '../lib/constants.js';

export const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage';
export const cls = {
  card: 'rounded-2xl border border-line bg-white',
  primary: `inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full bg-sage text-white text-sm font-medium hover:bg-sage-dark disabled:opacity-40 disabled:pointer-events-none transition-colors ${focus}`,
  ghost: `inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-full border border-line bg-white text-ink text-sm hover:bg-sage-faint disabled:opacity-40 transition-colors ${focus}`,
  soft: `inline-flex items-center justify-center gap-1 h-8 px-3 rounded-full bg-sage-faint text-[13px] text-sage hover:bg-sage-soft ${focus}`,
  danger: `inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-full text-sm text-[#9E4742] hover:bg-[#F7E8E6] ${focus}`,
  input: 'w-full h-10 rounded-xl border border-line bg-white px-3 text-base sm:text-[15px] text-ink placeholder:text-faintink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/15',
  label: 'block text-[13px] font-medium text-muted mb-1.5',
  pill: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-medium whitespace-nowrap',
};

export const I = {
  x: 'M18 6 6 18|M6 6l12 12', plus: 'M12 5v14|M5 12h14', minus: 'M5 12h14', left: 'M15 18l-6-6 6-6', right: 'M9 18l6-6-6-6', down: 'M6 9l6 6 6-6',
  link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7|M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  ext: 'M14 4h6v6|M20 4l-9 9|M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z|M21 21l-4.3-4.3',
  cal: 'M8 2v4|M16 2v4|M3 10h18|M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  cart: 'M3 3h2l2.4 12.3a2 2 0 0 0 2 1.7h8.7a2 2 0 0 0 2-1.6L21.6 8H6|M9 21h.01|M18 21h.01',
  trash: 'M3 6h18|M8 6V4h8v2|M19 6l-1 14H6L5 6', copy: 'M9 9h11v11H9z|M5 15H4V4h11v1',
  spark: 'M12 3v4|M12 17v4|M3 12h4|M17 12h4|M6 6l2.5 2.5|M15.5 15.5 18 18|M6 18l2.5-2.5|M15.5 8.5 18 6',
  chef: 'M6 13.9V20h12v-6.1|M6 14a4 4 0 0 1-.6-8 5 5 0 0 1 9.2-1.5A4 4 0 1 1 18 14z',
  book: 'M4 19.5V5a2 2 0 0 1 2-2h14v16H6.5A2.5 2.5 0 0 0 4 21.5z|M20 19v3H6.5|M9 8h7', check: 'M5 12l5 5 9-10',
  edit: 'M12 20h9|M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z', split: 'M16 3h5v5|M8 3H3v5|M21 3l-7 7|M3 3l7 7|M12 14v7',
  video: 'M15 10l5-3v10l-5-3z|M3 6h12v12H3z', chart: 'M4 20V11|M10 20V5|M16 20v-6|M21 20H3',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M22 21v-2a4 4 0 0 0-3-3.9|M16 3.1a4 4 0 0 1 0 7.8',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  qr: 'M3 3h7v7H3z|M14 3h7v7h-7z|M3 14h7v7H3z|M14 14h3v3h-3z|M20 14v.01|M14 20h.01|M17 17h4v4h-4',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  download: 'M12 3v12|M7 10l5 5 5-5|M5 21h14', logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4|M16 17l5-5-5-5|M21 12H9',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.6 1-1.1a5.5 5.5 0 0 0 0-7.8z',
};

export const Icon = ({ d, size = 18, className = '', sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {d.split('|').map((p, i) => <path key={i} d={p} />)}
  </svg>
);

export const Spinner = ({ size = 16 }) => (
  <svg className="spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>
);

export const Logo = ({ size = 38 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
    <path d="M14 9.5c-1.6-1.7 1.6-3.2 0-5M20 8.5c-1.6-1.7 1.6-3.2 0-5M26 9.5c-1.6-1.7 1.6-3.2 0-5" stroke="#9DB79A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    <path d="M7.5 19.5c.3-4.6 5.9-7.6 12.5-7.6s12.2 3 12.5 7.6z" fill="#fff" stroke="#58765B" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M5 19.5h30c0 8.3-6.7 15-15 15s-15-6.7-15-15z" fill="#D6E7C4" stroke="#58765B" strokeWidth="1.6" strokeLinejoin="round" />
    <ellipse cx="11.5" cy="27.5" rx="2.2" ry="1.3" fill="#F3C4BC" /><ellipse cx="28.5" cy="27.5" rx="2.2" ry="1.3" fill="#F3C4BC" />
    <circle cx="15" cy="24.5" r="1.5" fill="#2E352F" /><circle cx="25" cy="24.5" r="1.5" fill="#2E352F" />
    <path d="M18 27.2q2 2 4 0" stroke="#2E352F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);

export function IconButton({ label, onClick, children, className = '', disabled }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
    className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-sage-faint hover:text-ink disabled:opacity-40 ${focus} ${className}`}>{children}</button>;
}

// ---- 토스트 ----
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [t, setT] = useState(null);
  const timer = useRef(null);
  const toast = useCallback((msg, action) => {
    setT({ msg, action }); clearTimeout(timer.current);
    timer.current = setTimeout(() => setT(null), action ? 4500 : 2600);
  }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {t && (
        <div role="status" className="fade-in fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] max-w-[92vw] flex items-center gap-3 bg-ink text-white text-sm pl-4 pr-2 py-2 rounded-full shadow-lg">
          <span className="truncate">{t.msg}</span>
          {t.action
            ? <button type="button" onClick={() => { t.action.fn(); setT(null); }} className="shrink-0 h-7 px-3 rounded-full bg-white/15 hover:bg-white/25 text-[13px] font-medium">{t.action.label}</button>
            : <span className="w-2" />}
        </div>
      )}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ---- 창 ----
export function Modal({ onClose, title, children, footer, size = 'md', esc = true }) {
  useEffect(() => {
    if (!esc) return undefined;
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [onClose, esc]);
  const w = size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg';
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-[#2E352F]/25 sm:p-6"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`fade-in w-full ${w} max-h-[92vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl border border-line shadow-[0_20px_60px_-20px_rgba(46,53,47,.35)]`}>
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-line">
          <h2 className="text-[17px] font-semibold text-ink truncate">{title}</h2>
          <IconButton label="닫기" onClick={onClose}><Icon d={I.x} /></IconButton>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-line flex flex-wrap items-center gap-2">{footer}</div>}
      </div>
    </div>
  );
}

// ---- 작은 부품 ----
export function Check({ checked, onChange, children, sub }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer select-none py-1">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-0.5 h-[18px] w-[18px] accent-[#58765B] shrink-0" />
      <span className="text-[14px] text-ink leading-snug">{children}{sub && <span className="block text-[13px] text-muted mt-0.5">{sub}</span>}</span>
    </label>
  );
}

export function RoundCheck({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} onClick={onChange} disabled={disabled}
      className={`-m-2 p-2 shrink-0 rounded-full disabled:opacity-50 ${focus}`}>
      <span className={`grid place-items-center h-5 w-5 rounded-full border transition-colors ${checked ? 'bg-sage-check border-sage-check text-white' : 'bg-white border-[#CBD2C8] hover:border-sage'}`}>
        {checked && <Icon d={I.check} size={12} sw={3} />}
      </span>
    </button>
  );
}

export function Stepper({ value, onChange, min = 1, max = 20, suffix = '' }) {
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-white">
      <button type="button" aria-label="줄이기" onClick={() => onChange(Math.max(min, value - 1))} className="h-9 w-9 grid place-items-center text-muted hover:text-ink rounded-l-full"><Icon d={I.minus} size={16} /></button>
      <span className="min-w-[56px] text-center text-sm font-medium tabular-nums">{value}{suffix}</span>
      <button type="button" aria-label="늘리기" onClick={() => onChange(Math.min(max, value + 1))} className="h-9 w-9 grid place-items-center text-muted hover:text-ink rounded-r-full"><Icon d={I.plus} size={16} /></button>
    </div>
  );
}

export function Toggle({ on, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} disabled={disabled}
      className={`relative shrink-0 h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${focus} ${on ? 'bg-sage' : 'bg-[#D8DDD4]'}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

export const Pill = ({ c, children, className = '' }) => (
  <span className={`${cls.pill} ${className}`} style={{ background: c.bg, color: c.fg }}>{children || c.label}</span>
);
export const TypePill = ({ type, className }) => <Pill c={rtype(type)} className={className} />;

export const Avatar = ({ p, size = 28, ring = false }) => (
  <span title={p?.nickname} className={`inline-grid place-items-center shrink-0 rounded-full font-semibold text-ink border-2 ${ring ? 'border-sage' : 'border-white'}`}
    style={{ width: size, height: size, background: p?.tint || '#EFEFEF', fontSize: size < 24 ? 10 : size > 40 ? 18 : 12 }}>{(p?.nickname || '?').slice(0, 1)}</span>
);

// "누구 아이디어" 표시
export const ByLine = ({ p, prefix = '' }) => p ? (
  <span className="inline-flex items-center gap-1 text-[13px] text-muted whitespace-nowrap"><Avatar p={p} size={18} />{prefix}{p.nickname}</span>
) : null;

export const CardHead = ({ tag, count, right, bg = '#E8EFE6', fg = '#46604A' }) => (
  <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
    <div className="flex items-center gap-2">
      <span className={cls.pill + ' border border-black/[.04]'} style={{ background: bg, color: fg }}>#{tag}</span>
      {count != null && <span className="text-[13px] text-muted tabular-nums">{count}</span>}
    </div>
    {right}
  </div>
);

export const SectionTitle = ({ children, right }) => (
  <div className="flex items-center justify-between gap-2 mt-8 mb-3">
    <h3 className="flex items-center gap-2.5 text-[17px] font-semibold text-ink"><span className="w-1 h-5 rounded-full bg-sage" />{children}</h3>
    {right}
  </div>
);

export function HeartButton({ on, onClick, size = 18, className = '' }) {
  return (
    <button type="button" aria-pressed={on} aria-label={on ? '즐겨찾기 해제' : '즐겨찾기'} title={on ? '즐겨찾기 해제' : '즐겨찾기'}
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={`shrink-0 h-9 w-9 grid place-items-center rounded-full transition-colors ${focus} ${on ? 'text-[#C0524C]' : 'text-faintink hover:text-[#C0524C]'} hover:bg-[#F7E8E6] ${className}`}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d={I.heart} /></svg>
    </button>
  );
}

export const Stars = ({ n, size = 13 }) => (
  <span className="tracking-[-1px] whitespace-nowrap" style={{ fontSize: size }} aria-label={`별 ${n}개`}>
    <span style={{ color: STAR }}>{'★'.repeat(n)}</span><span className="text-[#DADFD6]">{'★'.repeat(5 - n)}</span>
  </span>
);

export function TagInput({ tags, onChange, placeholder = '#솜밥 #명란 (Enter로 추가)', disabled }) {
  const [v, setV] = useState('');
  const commit = () => {
    const parts = v.split(/[,，\n]/).map(t => t.trim().replace(/^#/, '')).filter(Boolean);
    const next = [...tags]; parts.forEach(t => { if (!next.includes(t)) next.push(t); });
    if (next.length !== tags.length) onChange(next);
    setV('');
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-white px-2 py-1.5 focus-within:border-sage focus-within:ring-2 focus-within:ring-sage/15">
      {tags.map(t => (
        <span key={t} className="inline-flex items-center gap-0.5 h-7 pl-2.5 pr-1 rounded-full bg-canvas border border-line text-[13px] text-muted">#{t}
          {!disabled && <button type="button" aria-label={`${t} 지우기`} onClick={() => onChange(tags.filter(x => x !== t))} className="h-5 w-5 grid place-items-center rounded-full hover:bg-white"><Icon d={I.x} size={11} /></button>}
        </span>
      ))}
      {!disabled && <input value={v} onChange={e => setV(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); } else if (e.key === 'Backspace' && !v && tags.length) onChange(tags.slice(0, -1)); }}
        className="flex-1 min-w-[8rem] h-7 bg-transparent text-base sm:text-[15px] focus:outline-none placeholder:text-faintink" placeholder={tags.length ? '' : placeholder} aria-label="태그" />}
    </div>
  );
}

export function EditingBanner({ people, what, action }) {
  if (!people.length) return null;
  return (
    <div className="fade-in flex items-center gap-2.5 rounded-2xl border border-[#E8D9B5] bg-[#FBF6E9] px-4 py-2.5 text-[13px] text-[#7D6420]">
      <span className="flex -space-x-1.5 shrink-0">{people.slice(0, 3).map(p => <Avatar key={p.user_id} p={p} size={24} />)}</span>
      <span className="flex-1"><b className="font-semibold">{people.map(p => p.nickname).join(', ')}</b>님이 {what}. 끝날 때까지 기다리면 겹치지 않아요.</span>
      {action}
    </div>
  );
}

export function Empty({ children }) {
  return <div className={cls.card + ' py-12 px-6 text-center text-sm text-muted leading-relaxed whitespace-pre-line'}>{children}</div>;
}

export function FullScreenMessage({ title, children }) {
  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="text-center max-w-sm">
        <div className="flex justify-center"><Logo size={64} /></div>
        {title && <h1 className="mt-4 text-[20px] font-bold text-ink">{title}</h1>}
        <div className="mt-2 text-[14px] text-muted leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
