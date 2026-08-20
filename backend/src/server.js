require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const inventoryRoutes = require("./routes/inventory.routes");
const recipeRoutes = require("./routes/recipes.routes");
const shoppingListRoutes = require("./routes/shoppingList.routes");
const voiceRoutes = require("./routes/voice.routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/recipes", recipeRoutes);
app.use("/api/v1/shopping-list", shoppingListRoutes);
app.use("/api/v1/voice", voiceRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Smart Fridge AI backend listening on port ${PORT}`);
});

module.exports = app;
