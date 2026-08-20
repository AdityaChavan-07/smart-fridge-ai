const { createInventoryItem } = require("../models/InventoryItem");

// TODO: replace this in-memory store with Firebase/Supabase calls (see services/db.service.js)
let items = [];

exports.listItems = (req, res) => {
  res.json({ items });
};

exports.addItem = (req, res) => {
  const { name, quantity, unit, category, expiresAt, lowStockThreshold } = req.body;

  if (!name || quantity === undefined || !unit) {
    return res.status(400).json({ error: { message: "name, quantity, and unit are required" } });
  }

  const item = createInventoryItem({ name, quantity, unit, category, expiresAt, lowStockThreshold });
  items.push(item);
  res.status(201).json({ item });
};

exports.updateItem = (req, res) => {
  const { id } = req.params;
  const index = items.findIndex((i) => i.id === id);

  if (index === -1) {
    return res.status(404).json({ error: { message: "Item not found" } });
  }

  items[index] = { ...items[index], ...req.body };
  res.json({ item: items[index] });
};

exports.removeItem = (req, res) => {
  const { id } = req.params;
  const before = items.length;
  items = items.filter((i) => i.id !== id);

  if (items.length === before) {
    return res.status(404).json({ error: { message: "Item not found" } });
  }

  res.status(204).send();
};
