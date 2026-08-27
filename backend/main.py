import os
from typing import List, cast
from contextlib import asynccontextmanager

import requests
from dotenv import load_dotenv

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import init_db, get_db, InventoryItem
from schemas import (
    ItemSchema,
    ItemResponse,
    ConsumeItemSchema,
    RecipeRequest,
    RecipeResponse,
    RestockAlert,
)


# ============================================================
# ENVIRONMENT & CONSTANTS
# ============================================================

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

RESTOCK_THRESHOLD_DAYS = 7

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Free OpenRouter router
OPENROUTER_MODEL = "openrouter/free"


# ============================================================
# EXTRA SCHEMAS
# ============================================================

class VelocityUpdateSchema(BaseModel):
    weekly_velocity: float


# ============================================================
# LIFESPAN & FASTAPI APPLICATION
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Smart Fridge AI Ecosystem",
    version="2.0.0",
    lifespan=lifespan,
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# OPENROUTER HELPER
# ============================================================

def generate_with_openrouter(prompt: str) -> str:
    """
    Generate text using OpenRouter.
    """

    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=500,
            detail=(
                "OPENROUTER_API_KEY is not configured. "
                "Add it to your .env file."
            ),
        )

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "Smart Fridge AI",
    }

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an expert chef and nutritionist working "
                    "inside a Smart Fridge AI application."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "temperature": 0.7,
        "max_tokens": 1500,
    }

    try:
        response = requests.post(
            OPENROUTER_URL,
            headers=headers,
            json=payload,
            timeout=60,
        )

        if not response.ok:
            try:
                error_data = response.json()
            except Exception:
                error_data = response.text

            raise HTTPException(
                status_code=502,
                detail=f"OpenRouter API error: {error_data}",
            )

        data = response.json()

        choices = data.get("choices", [])

        if not choices:
            raise HTTPException(
                status_code=502,
                detail="OpenRouter returned no choices.",
            )

        message = choices[0].get("message", {})

        recipe_text = message.get("content")

        if not recipe_text:
            raise HTTPException(
                status_code=502,
                detail="OpenRouter returned an empty response.",
            )

        return recipe_text

    except HTTPException:
        raise

    except requests.Timeout:
        raise HTTPException(
            status_code=504,
            detail=(
                "OpenRouter request timed out. "
                "Please try again."
            ),
        )

    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not connect to OpenRouter: {str(exc)}",
        )

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"OpenRouter request failed: {str(exc)}",
        )


# ============================================================
# INVENTORY ENDPOINTS
# ============================================================

@app.get(
    "/api/items",
    response_model=List[ItemResponse],
)
def list_items(
    db: Session = Depends(get_db),
):
    """
    Return all fridge inventory items.
    """

    return db.query(InventoryItem).all()


# ============================================================
# ADD ITEM
# ============================================================

@app.post(
    "/api/add-item",
    response_model=ItemResponse,
)
def add_manual_item(
    item: ItemSchema,
    db: Session = Depends(get_db),
):
    """
    Add an item to the fridge.

    If the item already exists, its quantity is increased.

    Example:

        Eggs = 10

        Add 2 Eggs

        Eggs = 12
    """

    formatted = item.item_name.strip().title()

    if not formatted:
        raise HTTPException(
            status_code=400,
            detail="Item name cannot be empty",
        )

    if item.quantity < 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity cannot be negative",
        )

    existing = (
        db.query(InventoryItem)
        .filter(
            InventoryItem.item_name == formatted
        )
        .first()
    )

    # ItemSchema may or may not contain weekly_velocity.
    provided_velocity = getattr(
        item,
        "weekly_velocity",
        None,
    )

    # --------------------------------------------------------
    # EXISTING ITEM
    # --------------------------------------------------------

    if existing:

        current_quantity = int(
            getattr(existing, "quantity", 0) or 0
        )

        setattr(
            existing,
            "quantity",
            current_quantity + item.quantity,
        )

        if (
            provided_velocity is not None
            and provided_velocity >= 0
        ):
            setattr(
                existing,
                "weekly_velocity",
                float(provided_velocity),
            )

        db.commit()
        db.refresh(existing)

        return existing

    # --------------------------------------------------------
    # NEW ITEM
    # --------------------------------------------------------

    new_item = InventoryItem(
        item_name=formatted,
        quantity=item.quantity,
        weekly_velocity=(
            float(provided_velocity)
            if provided_velocity is not None
            else 0.0
        ),
    )

    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return new_item


# ============================================================
# CONSUME / USE INVENTORY ITEM
# ============================================================

@app.patch(
    "/api/items/{item_id}/consume",
    response_model=ItemResponse,
)
def consume_item(
    item_id: int,
    payload: ConsumeItemSchema,
    db: Session = Depends(get_db),
):
    """
    Decrease an item's quantity when it is taken or used.

    Example:

        Current:
            Eggs = 12

        Request:
            {
                "quantity": 2
            }

        Result:
            Eggs = 10
    """

    item = (
        db.query(InventoryItem)
        .filter(
            InventoryItem.id == item_id
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Item not found",
        )

    consume_quantity = payload.quantity

    if consume_quantity < 1:
        raise HTTPException(
            status_code=400,
            detail="Consume quantity must be at least 1.",
        )

    current_quantity = int(
        getattr(item, "quantity", 0) or 0
    )

    # --------------------------------------------------------
    # DON'T ALLOW NEGATIVE STOCK
    # --------------------------------------------------------

    if consume_quantity > current_quantity:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Not enough {item.item_name}. "
                f"Available: {current_quantity}, "
                f"requested: {consume_quantity}."
            ),
        )

    # --------------------------------------------------------
    # UPDATE QUANTITY
    # --------------------------------------------------------

    new_quantity = (
        current_quantity - consume_quantity
    )

    setattr(
        item,
        "quantity",
        new_quantity,
    )

    db.commit()
    db.refresh(item)

    return item


# ============================================================
# DELETE ITEM
# ============================================================

@app.delete("/api/items/{item_id}")
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
):
    """
    Delete an inventory item.
    """

    item = (
        db.query(InventoryItem)
        .filter(
            InventoryItem.id == item_id
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Item not found",
        )

    db.delete(item)
    db.commit()

    return {
        "status": "deleted",
        "id": item_id,
    }


# ============================================================
# UPDATE CONSUMPTION VELOCITY
# ============================================================

@app.patch(
    "/api/items/{item_id}/velocity",
    response_model=ItemResponse,
)
def update_velocity(
    item_id: int,
    payload: VelocityUpdateSchema,
    db: Session = Depends(get_db),
):
    """
    Update weekly consumption velocity.

    Example:

        {
            "weekly_velocity": 3.5
        }
    """

    if payload.weekly_velocity < 0:
        raise HTTPException(
            status_code=400,
            detail="Weekly velocity cannot be negative.",
        )

    item = (
        db.query(InventoryItem)
        .filter(
            InventoryItem.id == item_id
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Item not found",
        )

    setattr(
        item,
        "weekly_velocity",
        payload.weekly_velocity,
    )

    db.commit()
    db.refresh(item)

    return item


# ============================================================
# AI RECIPE GENERATION
# ============================================================

@app.post(
    "/api/generate-recipe",
    response_model=RecipeResponse,
)
def generate_recipe(
    payload: RecipeRequest,
):
    if not payload.inventory:
        raise HTTPException(
            status_code=400,
            detail="Inventory cannot be empty.",
        )

    inventory = [
        item.strip()
        for item in payload.inventory
        if item and item.strip()
    ]

    if not inventory:
        raise HTTPException(
            status_code=400,
            detail="Inventory cannot be empty.",
        )

    inventory_text = ", ".join(inventory)

    prompt = f"""
Create exactly 2 practical recipes using this fridge inventory:

{inventory_text}

Rules:

1. Use the available fridge ingredients as the main ingredients.
2. Do not invent unavailable major ingredients.
3. Basic kitchen staples such as water, salt,
   cooking oil, pepper and common spices are allowed.
4. Give each recipe a clear name.
5. List the ingredients.
6. Give numbered step-by-step instructions.
7. Include approximate cooking time.
8. Include difficulty.
9. Keep recipes realistic for a normal home kitchen.
10. Make the two recipes different from each other.

Use this format:

RECIPE 1

Name:
Time:
Difficulty:

Ingredients:
- ingredient

Steps:
1. Step
2. Step
3. Step

Nutrition information (per 100 grams):
- Calories:
- Protein:
- Carbohydrates:
- Vitamins:
- Minerals:
- Sugar:


RECIPE 2

Name:
Time:
Difficulty:

Ingredients:
- ingredient

Steps:
1. Step
2. Step
3. Step

Nutrition information (per 100 grams):
- Calories:
- Protein:
- Carbohydrates:
- Vitamins:
- Minerals:
- Sugar:
"""

    recipe_text = generate_with_openrouter(prompt)

    # --------------------------------------------------------
    # YOUTUBE SEARCH
    # --------------------------------------------------------

    video_id = None

    if YOUTUBE_API_KEY:

        try:
            youtube_url = (
                "https://www.googleapis.com/"
                "youtube/v3/search"
            )

            search_terms = " ".join(
                inventory[:5]
            )

            youtube_params = {
                "part": "snippet",
                "q": f"{search_terms} recipe",
                "key": YOUTUBE_API_KEY,
                "type": "video",
                "maxResults": 1,
            }

            youtube_response = requests.get(
                youtube_url,
                params=youtube_params,
                timeout=10,
            )

            youtube_response.raise_for_status()

            youtube_data = (
                youtube_response.json()
            )

            youtube_items = youtube_data.get(
                "items",
                [],
            )

            if youtube_items:

                video_id = (
                    youtube_items[0]
                    .get("id", {})
                    .get("videoId")
                )

        except Exception:
            # YouTube failure should never
            # break recipe generation.
            video_id = None

    return RecipeResponse(
        recipe=recipe_text,
        youtube_video_id=video_id,
    )


# ============================================================
# PREDICTIVE RESTOCKING
# ============================================================

@app.get(
    "/api/restock-alerts",
    response_model=List[RestockAlert],
)
def restock_alerts(
    db: Session = Depends(get_db),
):
    """
    Calculate how many days of stock remain.

    Formula:

        daily velocity = weekly velocity / 7

        days remaining =
            quantity / daily velocity

    Alert when remaining stock <= 7 days.
    """

    alerts = []

    items = db.query(
        InventoryItem
    ).all()

    for item in items:

        weekly_velocity = float(
            getattr(
                item,
                "weekly_velocity",
                0,
            )
            or 0
        )

        item_name = cast(
            str,
            getattr(
                item,
                "item_name",
                "",
            ),
        )

        quantity = cast(
            int,
            getattr(
                item,
                "quantity",
                0,
            )
            or 0,
        )

        # No consumption history
        if weekly_velocity <= 0:
            continue

        daily_velocity = (
            weekly_velocity / 7.0
        )

        if daily_velocity <= 0:
            continue

        days_remaining = (
            quantity / daily_velocity
        )

        if (
            days_remaining
            <= RESTOCK_THRESHOLD_DAYS
        ):

            alerts.append(
                RestockAlert(
                    item_name=item_name,
                    quantity=quantity,
                    weekly_velocity=int(
                        round(
                            weekly_velocity
                        )
                    ),
                    days_remaining=round(
                        days_remaining,
                        1,
                    ),
                )
            )

    return alerts


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "Smart Fridge AI",
    }


# ============================================================
# OPENROUTER STATUS
# ============================================================

@app.get("/api/openrouter-status")
def openrouter_status():

    if not OPENROUTER_API_KEY:

        return {
            "status": "error",
            "message": (
                "OPENROUTER_API_KEY is missing"
            ),
        }

    try:

        test_response = requests.post(
            OPENROUTER_URL,
            headers={
                "Authorization":
                    f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type":
                    "application/json",
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": "Reply with: OK",
                    }
                ],
                "max_tokens": 10,
            },
            timeout=30,
        )

        if not test_response.ok:

            try:
                error = (
                    test_response.json()
                )

            except Exception:
                error = (
                    test_response.text
                )

            return {
                "status": "error",
                "model": OPENROUTER_MODEL,
                "error": error,
            }

        data = test_response.json()

        choices = data.get(
            "choices",
            [],
        )

        response_text = ""

        if choices:

            response_text = (
                choices[0]
                .get("message", {})
                .get("content", "")
            )

        return {
            "status": "ok",
            "model": OPENROUTER_MODEL,
            "message": (
                "OpenRouter API is working"
            ),
            "response": response_text,
        }

    except requests.Timeout:

        return {
            "status": "error",
            "model": OPENROUTER_MODEL,
            "message": (
                "OpenRouter request timed out"
            ),
        }

    except requests.RequestException as exc:

        return {
            "status": "error",
            "model": OPENROUTER_MODEL,
            "message": str(exc),
        }

    except Exception as exc:

        return {
            "status": "error",
            "model": OPENROUTER_MODEL,
            "message": str(exc),
        }