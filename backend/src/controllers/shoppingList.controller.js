// TODO: derive this from real consumption-pattern analytics over inventory history.
// For now this is a stub showing the expected response shape.

let shoppingList = [];

exports.getList = (req, res) => {
  res.json({ items: shoppingList });
};

exports.markPurchased = (req, res) => {
  const { id } = req.params;
  const item = shoppingList.find((i) => i.id === id);

  if (!item) {
    return res.status(404).json({ error: { message: "Item not found" } });
  }

  item.status = "purchased";
  res.json({ item });
};
