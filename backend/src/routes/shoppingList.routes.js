const express = require("express");
const router = express.Router();
const shoppingListController = require("../controllers/shoppingList.controller");

router.get("/", shoppingListController.getList);
router.post("/:id/purchase", shoppingListController.markPurchased);

module.exports = router;
