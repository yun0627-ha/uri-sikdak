import { useSyncExternalStore } from 'react';

// 목록·달력에서 아이콘 대신 사진 보기 (이 기기에서만, 사람마다 따로)
const KEY = 'uri-photo-thumbs';
const subs = new Set();
const read = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
export function setPhotoPref(on) {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* 저장 못 해도 이번엔 적용 */ }
  subs.forEach(f => f());
}
export const usePhotoPref = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, read, () => false);

// 메뉴 사진 목록 (예전 레시피는 photo 하나만 있음)
export const photosOf = d => (Array.isArray(d?.photos) && d.photos.length ? d.photos : d?.photo ? [d.photo] : []);
