// Parses a natural-language voice command (e.g. "add two liters of mango juice")
// into a structured action the frontend can execute against /api/v1/inventory.
//
// TODO: wire this to the Gemini/OpenAI service with a function-calling / structured
// output prompt, e.g.:
//   { "action": "add_item", "name": "mango juice", "quantity": 2, "unit": "L" }

exports.parseCommand = async (req, res, next) => {
  try {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: { message: "transcript is required" } });
    }

    // Placeholder echo response until the AI parsing service is implemented.
    res.json({
      transcript,
      action: null,
      message: "Voice parsing not yet implemented — wire this to ai.service.js",
    });
  } catch (err) {
    next(err);
  }
};
