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


class BodyImage(Base):
    __tablename__ = "body_images"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(1024), nullable=False)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class BodyAnalysisResult(Base):
    __tablename__ = "body_analysis_results"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    body_shape = Column(String(100), nullable=True)
    skin_tone = Column(String(100), nullable=True)
    face_shape = Column(String(100), nullable=True)
    height = Column(String(50), nullable=True)
    proportions = Column(Text, default="{}")  # JSON-encoded; JSONB in Postgres migration
    confidence = Column(Float, default=0.0)
    corrections = Column(Text, default="{}")  # JSON-encoded; JSONB in Postgres migration
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


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
    # In documents/04's canonical DDL but missing from Phase 2 (added here for Phase 5
    # scoring, which needs formality/weather hard-filtering per IMPLEMENTATION_PLAN.md #8).
    # Nullable and unscored when unset - never assumed casual by default.
    formality = Column(String(50), nullable=True)  # casual, business, formal
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


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    source = Column(String(50), nullable=False, default="device_calendar")  # device_calendar, manual
    external_id = Column(String(255), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    start_ts = Column(DateTime, nullable=False, index=True)
    end_ts = Column(DateTime, nullable=True)
    location = Column(String(255), nullable=True)
    inferred_event_type = Column(String(50), nullable=True)
    inferred_formality = Column(String(50), nullable=True)
    context_json = Column(Text, default="{}")  # JSON-encoded; JSONB in Postgres migration
    # Not in documents/04's canonical DDL; added to satisfy the corrections-audit
    # convention already required for every other AI-inferred field in this codebase.
    corrections = Column(Text, default="{}")  # JSON-encoded; JSONB in Postgres migration
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Routine(Base):
    __tablename__ = "routines"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    recurrence_rule = Column(String(255), nullable=False)  # free-text descriptor, never parsed
    time_block = Column(String(50), nullable=True)  # morning, workday, evening, night
    default_event_type = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class WeatherCache(Base):
    __tablename__ = "weather_cache"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    location_hash = Column(String(64), nullable=False, index=True)
    fetched_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    forecast_json = Column(Text, default="{}")  # JSON-encoded; JSONB in Postgres migration


class Outfit(Base):
    __tablename__ = "outfits"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    top_item_id = Column(String(36), ForeignKey("wardrobe_items.id", ondelete="SET NULL"), nullable=True)
    bottom_item_id = Column(String(36), ForeignKey("wardrobe_items.id", ondelete="SET NULL"), nullable=True)
    outerwear_item_id = Column(String(36), ForeignKey("wardrobe_items.id", ondelete="SET NULL"), nullable=True)
    shoe_item_id = Column(String(36), ForeignKey("wardrobe_items.id", ondelete="SET NULL"), nullable=True)
    # accessories/bags/jewelry unified into one slot per documents/04's canonical
    # accessory_item_ids_json; always empty in Phase 5 - candidate generation only
    # picks top/bottom/outerwear/shoes for the guaranteed baseline.
    accessory_item_ids = Column(Text, default="[]")  # JSON-encoded array of wardrobe_item ids
    score = Column(Float, default=0.0)
    explanation_tags = Column(Text, default="[]")  # JSON-encoded array of strings
    created_at = Column(DateTime, default=datetime.utcnow)


class RecommendationRun(Base):
    __tablename__ = "recommendation_runs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    context_snapshot = Column(Text, default="{}")  # JSON-encoded; JSONB in Postgres migration
    main_outfit_id = Column(String(36), ForeignKey("outfits.id", ondelete="SET NULL"), nullable=True)
    alt_1_outfit_id = Column(String(36), ForeignKey("outfits.id", ondelete="SET NULL"), nullable=True)
    alt_2_outfit_id = Column(String(36), ForeignKey("outfits.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class OutfitHistory(Base):
    __tablename__ = "outfit_history"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    outfit_id = Column(String(36), ForeignKey("outfits.id", ondelete="CASCADE"), nullable=False)
    recommendation_run_id = Column(
        String(36), ForeignKey("recommendation_runs.id", ondelete="SET NULL"), nullable=True
    )
    feedback_code = Column(String(50), nullable=True)  # like, worn, favorite, too_hot, too_cold, ...
    is_favorite = Column(Boolean, default=False)
    worn_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
