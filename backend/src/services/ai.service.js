/**
 * Wraps calls to Google Gemini API / OpenAI API to generate recipes
 * from a list of available inventory items.
 *
 * Swap the implementation below for a real call, e.g.:
 *
 *   const { GoogleGenerativeAI } = require("@google/generative-ai");
 *   const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
 *   const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
 *   const result = await model.generateContent(prompt);
 */

async function generateRecipes(inventoryItems) {
  const prompt = `You are a recipe assistant. Given these available ingredients: ${inventoryItems.join(
    ", "
  )}, suggest 3 recipes that are realistically makeable. Respond ONLY as JSON: an array of
  { "title": string, "matchedItems": string[], "missingItems": string[] }`;

  // TODO: replace with a real Gemini/OpenAI call using `prompt`
  return inventoryItems.length
    ? [
        {
          title: `${inventoryItems[0]} Stir Fry`,
          matchedItems: inventoryItems.slice(0, 2),
          missingItems: [],
        },
      ]
    : [];
}

module.exports = { generateRecipes };
