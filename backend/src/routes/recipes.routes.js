const express = require("express");
const router = express.Router();
const recipesController = require("../controllers/recipes.controller");

router.get("/suggestions", recipesController.getSuggestions);

module.exports = router;
