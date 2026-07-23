from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

ProcessingMode = Literal["auto", "local_preferred", "cloud_preferred"]


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
