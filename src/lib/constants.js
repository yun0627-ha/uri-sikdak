// 레시피(메뉴) 종류
export const RECIPE_TYPES = [
  { id: 'main',    label: '일반식',      bg: '#E7E5F2', fg: '#55507E' },
  { id: 'side',    label: '반찬',        bg: '#EEEFDD', fg: '#5F6431' },
  { id: 'soup',    label: '국·찌개',     bg: '#F3E3DC', fg: '#8C4E3C' },
  { id: 'onebowl', label: '한그릇',      bg: '#F6F0DF', fg: '#8A6D2F' },
  { id: 'noodle',  label: '면요리',      bg: '#E4EDF3', fg: '#3F6079' },
  { id: 'salad',   label: '샐러드·간편', bg: '#E3ECE5', fg: '#3B5440' },
  { id: 'dessert', label: '간식·디저트', bg: '#F5E6EA', fg: '#8A4A5C' },
];
export const RTYPE = Object.fromEntries(RECIPE_TYPES.map(t => [t.id, t]));
export const rtype = id => RTYPE[id] || RTYPE.main;

// 카테고리 · 프로필 색
export const PALETTE = [
  { name: '연두', bg: '#F2F6EC', fg: '#55703F' }, { name: '민트', bg: '#DCEBE1', fg: '#2F5238' },
  { name: '청록', bg: '#C5D9CD', fg: '#1E3D2C' }, { name: '물빛', bg: '#E2ECEF', fg: '#3B5862' },
  { name: '코랄', bg: '#F7E8E6', fg: '#9E4742' }, { name: '옐로', bg: '#F6F0DF', fg: '#8A6D2F' },
  { name: '그레이', bg: '#EFEFEF', fg: '#5C5F5B' }, { name: '라벤더', bg: '#ECE8F3', fg: '#5E527A' },
  { name: '피치', bg: '#F8EAE1', fg: '#94593A' }, { name: '스카이블루', bg: '#E4EDF3', fg: '#3F6079' },
  { name: '올리브', bg: '#EEEFDD', fg: '#5F6431' }, { name: '로즈', bg: '#F5E6EA', fg: '#8A4A5C' },
  { name: '머스타드', bg: '#F4EDD6', fg: '#7D6420' }, { name: '테라코타', bg: '#F3E3DC', fg: '#8C4E3C' },
  { name: '슬레이트', bg: '#E6E9EC', fg: '#4A5560' }, { name: '모카', bg: '#EEE7E1', fg: '#6A5544' },
];
export const TINTS = ['#E3ECE5', '#ECE8F3', '#F6F0DF', '#F8EAE1', '#E4EDF3', '#F5E6EA', '#EEEFDD', '#E6E9EC'];

export const SHOP_COLOR = { bg: '#F7E8E6', fg: '#9E4742' };
export const STAR = '#D9A441';

export const DEFAULT_BASICS = ['간장', '진간장', '국간장', '양조간장', '설탕', '흑설탕', '소금', '굵은소금', '꽃소금', '후추', '후춧가루',
  '참기름', '들기름', '식용유', '올리브유', '포도씨유', '식초', '맛술', '미림', '물', '깨', '통깨', '참깨', '고춧가루', '다진마늘'];

export const DEFAULT_SETTINGS = { defaultView: '2w', weekStart: 0, basics: DEFAULT_BASICS, fridge: [], showShopOnCalendar: false };

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
