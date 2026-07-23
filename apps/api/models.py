import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    name = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    style_preferences = Column(Text, default="{}")  # JSON-encoded; JSONB in Postgres migration
    processing_mode = Column(String(50), default="auto")  # auto, local_preferred, cloud_preferred
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")


class WardrobeItem(Base):
    __tablename__ = "wardrobe_items"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    color = Column(String(100), nullable=True)
    pattern = Column(String(100), nullable=True)
    material = Column(String(100), nullable=True)
    brand = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    images = relationship(
        "WardrobeImage", back_populates="item", cascade="all, delete-orphan", order_by="WardrobeImage.created_at"
    )
    analysis = relationship(
        "ItemAnalysisResult", back_populates="item", uselist=False, cascade="all, delete-orphan"
    )


class WardrobeImage(Base):
    __tablename__ = "wardrobe_images"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    wardrobe_item_id = Column(String(36), ForeignKey("wardrobe_items.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(1024), nullable=False)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    item = relationship("WardrobeItem", back_populates="images")


class ItemAnalysisResult(Base):
    __tablename__ = "item_analysis_results"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    wardrobe_item_id = Column(
        String(36), ForeignKey("wardrobe_items.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    detected_category = Column(String(50), nullable=True)
    confidence = Column(Float, default=0.0)
    detected_color = Column(String(100), nullable=True)
    detected_pattern = Column(String(100), nullable=True)
    detected_material = Column(String(100), nullable=True)
    detected_brand = Column(String(100), nullable=True)
    corrections = Column(Text, default="{}")  # JSON-encoded; JSONB in Postgres migration
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    item = relationship("WardrobeItem", back_populates="analysis")
