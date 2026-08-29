from typing import List
from typing import Optional
from pydantic import BaseModel, Field


# ==========================================================================
# INVENTORY
# ==========================================================================

class ItemSchema(BaseModel):
    item_name: str
    quantity: int = Field(default=1, ge=0)


class ItemResponse(BaseModel):
    id: int
    item_name: str
    quantity: int
    weekly_velocity: float

    class Config:
        from_attributes = True


class ConsumeItemSchema(BaseModel):
    quantity: int = Field(..., ge=1)


# ==========================================================================
# AI RECIPES
# ==========================================================================

class RecipeRequest(BaseModel):
    inventory: List[str] = Field(..., min_length=1)


    inventory: List[str]
    context: Optional[str] = None

class RecipeResponse(BaseModel):
    recipe: str
    youtube_video_id: str | None = None


# ==========================================================================
# RESTOCK
# ==========================================================================

class RestockAlert(BaseModel):
    item_name: str
    quantity: int
    weekly_velocity: float
    days_remaining: float
