/**
 * Fallback nutrition/recipe metadata via the Spoonacular API.
 * https://spoonacular.com/food-api/docs
 */

async function getNutrition(recipeTitle) {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return null;

  const url = new URL("https://api.spoonacular.com/recipes/complexSearch");
  url.searchParams.set("query", recipeTitle);
  url.searchParams.set("addRecipeNutrition", "true");
  url.searchParams.set("number", "1");
  url.searchParams.set("apiKey", apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) return null;

  const data = await response.json();
  return data.results?.[0]?.nutrition ?? null;
}

module.exports = { getNutrition };
