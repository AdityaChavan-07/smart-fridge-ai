const aiService = require("../services/ai.service");
const youtubeService = require("../services/youtube.service");

exports.getSuggestions = async (req, res, next) => {
  try {
    // In a real implementation, pull current inventory from the DB instead of the query string
    const inventory = (req.query.items || "").split(",").filter(Boolean);

    if (inventory.length === 0) {
      return res.status(400).json({ error: { message: "Provide ?items=eggs,potatoes,..." } });
    }

    const recipes = await aiService.generateRecipes(inventory);

    const withVideos = await Promise.all(
      recipes.map(async (recipe) => ({
        ...recipe,
        youtubeVideoId: await youtubeService.findTutorialVideoId(recipe.title),
      }))
    );

    res.json({ recipes: withVideos });
  } catch (err) {
    next(err);
  }
};
