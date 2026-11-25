// 별점 계산 도우미 (reviews 테이블 행 목록에서)
export const reviewsFor = (reviews, recipeId, dishId) => reviews.filter(r => r.recipe_id === recipeId && r.dish_id === dishId);
export const avgStars = (reviews, recipeId, dishId) => {
  const rs = reviewsFor(reviews, recipeId, dishId);
  return rs.length ? rs.reduce((s, r) => s + r.stars, 0) / rs.length : 0;
};
