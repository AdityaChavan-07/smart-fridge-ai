import axios from "axios";

// Point this at your deployed backend, or http://localhost:4000 during local dev
// (use your machine's LAN IP instead of localhost when testing on a physical device).
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const api = axios.create({ baseURL: BASE_URL });

export const InventoryAPI = {
  list: () => api.get("/inventory").then((r) => r.data.items),
  add: (item) => api.post("/inventory", item).then((r) => r.data.item),
  update: (id, patch) => api.patch(`/inventory/${id}`, patch).then((r) => r.data.item),
  remove: (id) => api.delete(`/inventory/${id}`),
};

export const RecipesAPI = {
  suggestions: (items) =>
    api.get("/recipes/suggestions", { params: { items: items.join(",") } }).then((r) => r.data.recipes),
};

export const ShoppingListAPI = {
  list: () => api.get("/shopping-list").then((r) => r.data.items),
  markPurchased: (id) => api.post(`/shopping-list/${id}/purchase`).then((r) => r.data.item),
};

export default api;
