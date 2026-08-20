const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventory.controller");

router.get("/", inventoryController.listItems);
router.post("/", inventoryController.addItem);
router.patch("/:id", inventoryController.updateItem);
router.delete("/:id", inventoryController.removeItem);

module.exports = router;
