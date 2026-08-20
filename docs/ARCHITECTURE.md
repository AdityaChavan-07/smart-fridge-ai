# Architecture & Requirements

## Overview
Integrated Smart Fridge Application for vertical touch displays (e.g., Samsung Family Hub), synced with a mobile companion app. Handles real-time inventory tracking, AI-driven recipe generation, YouTube tutorial integration, predictive restock analytics, and cross-device control.

## Core Features

- **Inventory Management** — Manual and voice touch input for storing items, quantities, and metrics (e.g., 2 eggs, 1kg potatoes, 4 packs chili powder, 1L mango juice).
- **AI Recipe & YouTube Engine** — Cross-references active inventory to suggest doable recipes, rendering embedded YouTube cooking video tutorials for step-by-step guidance.
- **Predictive Shopping List** — Tracks consumption patterns to auto-generate shopping lists. Prompts smart restock alerts when essential items run low within a 7-day window.
- **Mobile & IoT Control** — Real-time bi-directional synchronization between the fridge display and smartphone app (iOS/Android) for remote access and shopping.

## Toolchain by Phase

### Phase 1: Design & Wireframing
- **Figma** — UI/UX layouts for the vertical 21:9 smart fridge door screen and mobile app UI
- **Whimsical / Miro** — Flowcharting user journeys for touch inputs and inventory updates

### Phase 2: Frontend & Appliance UI
- **React Native** — Cross-platform framework, single codebase for fridge displays and smartphones
- **VS Code / Android Studio** — Primary IDEs, hardware emulators
- **Tizen Studio / Android SDK** — Native OS targeting and hardware integration

### Phase 3: Backend & Real-time Database
- **Firebase / Supabase** — Real-time NoSQL/PostgreSQL DB to sync inventory instantly across devices
- **Node.js (Express) / FastAPI** — Backend microservices for business logic and API requests

### Phase 4: AI & External API Integrations
- **Google Gemini API / OpenAI API** — Parse inventory, generate custom recipes, power NL voice commands
- **YouTube Data API v3** — Fetch culinary video tutorials matching generated recipes
- **Spoonacular API** — Structured fallback for nutritional facts and recipe metadata

### Phase 5: Version Control & Testing
- **Git & GitHub** — Source control, branching, collaboration
- **Postman** — API testing for LLM endpoints and webhooks

### Phase 6: Cloud Deployment & DevOps
- **Google Cloud Platform / AWS** — Backend hosting and database storage
- **AWS IoT Core / Balena.io** — Remote device management, OTA updates for fridge displays
- **Google Play Console & Apple App Store** — Mobile app distribution

## Data Model (initial draft)

### `InventoryItem`
```json
{
  "id": "uuid",
  "name": "eggs",
  "quantity": 12,
  "unit": "pcs",
  "category": "dairy",
  "addedAt": "ISO-8601",
  "expiresAt": "ISO-8601 | null",
  "lowStockThreshold": 4
}
```

### `Recipe`
```json
{
  "id": "uuid",
  "title": "Chili Egg Scramble",
  "matchedItems": ["eggs", "chili powder"],
  "missingItems": [],
  "youtubeVideoId": "string",
  "nutrition": { "calories": 320, "protein": 18 },
  "source": "gemini | spoonacular"
}
```

### `ShoppingListItem`
```json
{
  "id": "uuid",
  "name": "mango juice",
  "predictedRunOutDate": "ISO-8601",
  "status": "pending | purchased"
}
```

## API Surface (backend, v1)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/inventory` | List current inventory |
| POST | `/api/v1/inventory` | Add item(s) |
| PATCH | `/api/v1/inventory/:id` | Update quantity/metadata |
| DELETE | `/api/v1/inventory/:id` | Remove item |
| GET | `/api/v1/recipes/suggestions` | AI-generated recipes from current inventory |
| GET | `/api/v1/shopping-list` | Predicted shopping list |
| POST | `/api/v1/shopping-list/:id/purchase` | Mark item purchased |
| POST | `/api/v1/voice/parse` | Parse a voice command into an inventory/recipe action |

## Open Questions
- Voice input: on-device (fridge OS) vs. streamed to backend for LLM parsing?
- Offline behavior when fridge display loses connectivity — local cache + sync-on-reconnect?
- Multi-user households: per-user shopping lists vs. shared household list?
