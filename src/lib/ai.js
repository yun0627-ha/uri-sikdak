import { normalizeDishes } from './utils.js';

/*
  AI 정리는 API 대신 '내 Claude 채팅'으로 해요 (추가 비용 없음).
  1) 앱이 정리 요청문을 복사해 줌 → 2) Claude 채팅에 붙여 넣고 영상 설명·자막·본문·캡처를 함께 보냄
  3) Claude 의 답을 통째로 복사해 앱에 붙여 넣으면 → 메뉴별로 채워짐
*/
export function buildPrompt(url) {
  return `레시피 정리를 부탁해요. 아래에 영상 설명·자막·블로그/인스타 본문을 붙여 넣거나 캡처를 첨부할게요.
${url ? `참고 링크: ${url}\n` : ''}
규칙:
- 자료에 메뉴가 여러 개면 dishes 배열에 메뉴마다 하나씩 넣어 주세요.
- 자료에 없는 내용은 지어내지 말고 빈 문자열/빈 배열로 둬 주세요. 분량 단위는 자료 표기 그대로(큰술, 작은술, g, ml, 개, 약간 등). 1T는 큰술, 1t는 작은술로.
- type은 main(일반식) side(반찬) soup(국·찌개) onebowl(한그릇) noodle(면요리) salad(샐러드·간편) dessert(간식·디저트) 중 하나.
- servings는 숫자(모르면 2). steps는 번호 없이 한 단계씩. tags는 3~5개, # 없이.
- tips.cooking 은 조리 팁, tips.tools 는 화력·도구 팁 (자료에 있을 때만).
- 설명 없이 아래 형식의 JSON 코드 블록 하나로만 답해 주세요.

\`\`\`json
{"dishes":[{"title":"","type":"main","servings":2,"tags":[],"ingredients":[{"name":"","amount":"","unit":""}],"steps":[],"tips":{"cooking":"","tools":""}}]}
\`\`\`

자료:
`;
}

/** Claude 답(코드 블록 포함 가능) → 메뉴 목록. 못 읽으면 Error */
export function parsePasted(text) {
  const s = String(text || '');
  const block = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = block ? block[1] : s;
  const a = body.indexOf('{'), b = body.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('Claude의 답에서 레시피를 찾지 못했어요. 답 전체를 복사해 붙여 넣어 주세요.');
  let data;
  try { data = JSON.parse(body.slice(a, b + 1)); } catch (e) { throw new Error('답이 중간에 잘린 것 같아요. 끝까지 복사해 붙여 넣어 주세요.'); }
  const dishes = normalizeDishes(data);
  if (!dishes.length) throw new Error('레시피 내용이 비어 있어요. Claude에게 자료를 더 보내 달라고 해 보세요.');
  return dishes;
}

// 링크만 넣으면 자동 정리 (Supabase 서버 함수 → Gemini)
const AUTO_ERR = {
  NO_KEY: '자동 정리가 아직 준비되지 않았어요. (Gemini 키 설정 필요)',
  BAD_URL: '주소를 확인해 주세요. https:// 로 시작해야 해요.',
  NO_CONTENT: '이 링크는 글을 읽을 수 없어요. 레시피 화면을 캡처해서 [캡처로 불러오기]를 눌러 주세요.',
  LIMIT: '오늘 무료 사용량을 다 썼어요. 잠시 뒤나 내일 다시 해 주세요.',
  BUSY: 'AI 서버가 지금 붐벼요. 1~2분 뒤에 다시 눌러 주세요.',
  FAILED: '정리하지 못했어요. 잠시 뒤 다시 하거나 [캡처로 불러오기]를 써 주세요.',
};
// 사진을 줄여서 base64 로 (전송량 줄이기)
export function shrinkImage(file, max = 1400) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve({ mime: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.82).split(',')[1] });
    };
    img.onerror = () => reject(new Error('사진을 읽지 못했어요.'));
    img.src = URL.createObjectURL(file);
  });
}
export async function autoParse(supabase, url, images) {
  const { data, error } = await supabase.functions.invoke('parse-recipe', { body: images ? { images } : { url } });
  if (error) throw new Error(AUTO_ERR.FAILED);
  if (data?.error) throw new Error(AUTO_ERR[data.error] || AUTO_ERR.FAILED);
  const dishes = normalizeDishes(data);
  if (!dishes.length) throw new Error('레시피를 찾지 못했어요. 레시피 화면을 캡처해서 [캡처로 불러오기]를 눌러 주세요.');
  return dishes;
}
