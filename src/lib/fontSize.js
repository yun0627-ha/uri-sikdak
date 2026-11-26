import { useSyncExternalStore } from 'react';

// 글자 크기 (이 기기에서만): s 작게(기본) · m 중간 · l 크게
// 글씨만 키우면 칸이 깨지니까 화면 전체를 같은 비율로 키워요 (index.css 의 html.fs-m / html.fs-l)
const KEY = 'uri-font-size';
const subs = new Set();
const read = () => { try { const v = localStorage.getItem(KEY); return v === 'm' || v === 'l' ? v : 's'; } catch (e) { return 's'; } };
const apply = v => {
  const c = document.documentElement.classList;
  c.remove('fs-m', 'fs-l');
  if (v !== 's') c.add(`fs-${v}`);
};
apply(read());

export function setFontSize(v) {
  try { localStorage.setItem(KEY, v); } catch (e) { /* 저장 못 해도 이번엔 적용 */ }
  apply(v);
  subs.forEach(f => f());
}
export const useFontSize = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, read, () => 's');
