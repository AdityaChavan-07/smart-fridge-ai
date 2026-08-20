const express = require("express");
const router = express.Router();
const voiceController = require("../controllers/voice.controller");

router.post("/parse", voiceController.parseCommand);

module.exports = router;
