from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, EmailStr, Field

ProcessingMode = Literal["auto", "local_preferred", "cloud_preferred"]
WardrobeCategory = Literal[
    "tops", "bottoms", "outerwear", "shoes", "accessories", "bags", "jewelry"
]


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    processing_mode: ProcessingMode
    created_at: datetime

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserProfileOut(BaseModel):
    id: str
    user_id: str
    name: Optional[str] = None
    bio: Optional[str] = None
    processing_mode: ProcessingMode
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    processing_mode: Optional[ProcessingMode] = None


class WardrobeImageOut(BaseModel):
    id: str
    image_url: str
    is_primary: bool

    class Config:
        from_attributes = True


class ItemAnalysisOut(BaseModel):
    id: str
    detected_category: Optional[str] = None
    confidence: float
    detected_color: Optional[str] = None
    detected_pattern: Optional[str] = None
    detected_material: Optional[str] = None
    detected_brand: Optional[str] = None

    class Config:
        from_attributes = True


class WardrobeItemOut(BaseModel):
    id: str
    category: WardrobeCategory
    name: str
    color: Optional[str] = None
    pattern: Optional[str] = None
    material: Optional[str] = None
    brand: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    images: list[WardrobeImageOut] = []
    analysis: Optional[ItemAnalysisOut] = None

    class Config:
        from_attributes = True


class WardrobeItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[WardrobeCategory] = None
    color: Optional[str] = None
    pattern: Optional[str] = None
    material: Optional[str] = None
    brand: Optional[str] = None
    is_active: Optional[bool] = None


class BodyImageOut(BaseModel):
    id: str
    image_url: str
    is_primary: bool

    class Config:
        from_attributes = True


class BodyAnalysisOut(BaseModel):
    id: str
    body_shape: Optional[str] = None
    skin_tone: Optional[str] = None
    face_shape: Optional[str] = None
    height: Optional[str] = None
    proportions: dict[str, Any] = {}
    confidence: float
    created_at: datetime
    updated_at: datetime


class BodyAnalysisUpdate(BaseModel):
    body_shape: Optional[str] = None
    skin_tone: Optional[str] = None
    face_shape: Optional[str] = None
    height: Optional[str] = None
