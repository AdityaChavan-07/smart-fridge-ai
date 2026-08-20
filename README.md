# Smart Fridge AI Ecosystem
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%20Pro-8E75B5?style=flat&logo=googlegemini&logoColor=white)](https://openrouter.ai/)
[![YouTube API](https://img.shields.io/badge/Integration-YouTube%20API-FF0000?style=flat&logo=youtube&logoColor=white)](https://developers.google.com/youtube/v3)
[![Platform](https://img.shields.io/badge/Platform-Samsung%20Family%20Hub%20(Tizen)-034EA2?style=flat&logo=samsung&logoColor=white)](https://developer.samsung.com/smarttv)

End-to-end smart kitchen platform: FastAPI backend, Gemini-powered recipe generation,
YouTube tutorial embedding, 7-day velocity predictive restocking, and a 21:9 vertical
frontend for Samsung Family Hub (Tizen) displays.

## Structure

```
smart-fridge-ai/
├── backend/
│   ├── main.py           # FastAPI app & routes
│   ├── database.py       # SQLAlchemy models + session
│   ├── schemas.py        # Pydantic request/response models
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── index.html
    ├── style.css
    └── app.js
```

## Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # then fill in your real API keys
uvicorn main:app --reload --port 8000
```

Set these in `.env`:
-'Openrouter_API'-https://openrouter.ai/
- `YOUTUBE_API_KEY` — from Google Cloud Console (YouTube Data API v3)
- `DATABASE_URL` — defaults to local SQLite; swap for Postgres in production

## Frontend

Just open `frontend/index.html` in a browser (or serve it with any static
server). It talks to the backend at `http://localhost:8000` by default —
override by setting `window.SMART_FRIDGE_API_BASE` before `app.js` loads.

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/items` | List inventory |
| POST | `/api/add-item` | Add/increment an item |
| DELETE | `/api/items/{id}` | Remove an item |
| PATCH | `/api/items/{id}/velocity` | Update weekly consumption velocity |
| POST | `/api/generate-recipe` | Generate recipe + fetch YouTube tutorial |
| GET | `/api/restock-alerts` | Items projected to run out within 7 days |

## Tizen packaging (Samsung Family Hub)

1. Build/export the `frontend/` folder as static assets.
2. Wrap with Tizen Studio (`@tizentv/create-tizen-app`) into a Tizen Web App.
3. Test via Samsung Remote Test Lab (RTL) on a virtual Family Hub display.
4. Record a demo and submit through the Samsung Developer Portal.

## Notes

- No API keys are hardcoded — they're loaded from environment variables.
- Recipe/YouTube calls fail gracefully with clear error messages if keys are missing.
- Restock alerts require `weekly_velocity` to be set per item (via the velocity
  endpoint or a background consumption-tracking job you add).
