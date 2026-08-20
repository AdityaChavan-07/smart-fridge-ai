from pydantic import BaseModel, Field
from typing import List


class ItemSchema(BaseModel):
    item_name: str
    quantity: int = 1


class ItemResponse(BaseModel):
    id: int
    item_name: str
    quantity: int
    weekly_velocity: int

    class Config:
        from_attributes = True


class RecipeRequest(BaseModel):
    inventory: List[str] = Field(..., min_length=1)


class RecipeResponse(BaseModel):
    recipe: str
    youtube_video_id: str | None = None


class RestockAlert(BaseModel):
    item_name: str
    quantity: int
    weekly_velocity: int
    days_remaining: int
