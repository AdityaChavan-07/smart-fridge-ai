/**
 * Wraps the YouTube Data API v3 to find a tutorial video matching a recipe title.
 * https://developers.google.com/youtube/v3/docs/search/list
 */

async function findTutorialVideoId(recipeTitle) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", `${recipeTitle} recipe tutorial`);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) return null;

  const data = await response.json();
  return data.items?.[0]?.id?.videoId ?? null;
}

module.exports = { findTutorialVideoId };
