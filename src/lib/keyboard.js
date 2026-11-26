// 휴대폰 키보드가 올라와도 지금 입력하는 칸(글 쓰는 줄)이 보이도록 화면을 올려요.
// 키보드가 떠 있는 동안에는 아래 고정 메뉴(.kb-hide)를 숨겨서 입력 칸을 가리지 않게 해요.
const editable = el => !!el && (el.tagName === 'TEXTAREA' || el.isContentEditable
  || (el.tagName === 'INPUT' && !/^(checkbox|radio|file|range|button|submit|color|hidden)$/.test(el.type)));

const scrollParent = el => {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p;
  }
  return null;
};

function reveal() {
  const el = document.activeElement;
  if (!editable(el)) return;
  const r = el.getBoundingClientRect();
  let top = r.top, bottom = r.bottom;
  // 긴 글칸은 칸 전체 대신 커서가 있는 줄을 기준으로
  if (el.tagName === 'TEXTAREA' && r.height > 90) {
    const v = el.value || '';
    const pos = el.selectionEnd ?? v.length;
    const lines = Math.max(v.split('\n').length, el.rows || 1);
    const before = v.slice(0, pos).split('\n').length;
    const lh = r.height / lines;
    bottom = Math.min(r.bottom, r.top + lh * before + lh * 0.6);
    top = bottom - lh * 1.6;
  }
  const vv = window.visualViewport;
  const viewTop = (vv ? vv.offsetTop : 0) + 64;
  const viewBottom = (vv ? vv.offsetTop + vv.height : window.innerHeight) - 20;
  let d = 0;
  if (bottom > viewBottom) d = bottom - viewBottom;
  else if (top < viewTop) d = top - viewTop;
  if (Math.abs(d) < 4) return;
  const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
  const sp = scrollParent(el);
  (sp || window).scrollBy({ top: d / zoom, behavior: 'smooth' });
}

let timer = 0;
const later = ms => { clearTimeout(timer); timer = setTimeout(reveal, ms); };
const root = document.documentElement;

document.addEventListener('focusin', e => {
  if (!editable(e.target)) return;
  root.classList.add('kb-open');
  later(350); // 키보드가 다 올라온 뒤
});
document.addEventListener('focusout', () => {
  setTimeout(() => { if (!editable(document.activeElement)) root.classList.remove('kb-open'); }, 120);
});
document.addEventListener('input', e => { if (e.target.tagName === 'TEXTAREA') requestAnimationFrame(reveal); });
(window.visualViewport || window).addEventListener('resize', () => later(60));
