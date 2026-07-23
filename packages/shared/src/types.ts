import { ProcessingMode, WardrobeItemCategory, TaskStatus, OutfitFeedback } from './enums';

// API Response Wrappers
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: 'success' | 'error';
}

export interface AsyncTaskResponse {
  task_id: string;
  status: TaskStatus;
  data?: unknown;
  error?: string;
}

// User & Profile DTOs
export interface User {
  id: string;
  email: string;
  created_at: string;
  processing_mode: ProcessingMode;
}

export interface UserProfile {
  id: string;
  user_id: string;
  name?: string;
  bio?: string;
  style_preferences?: Record<string, unknown>;
  processing_mode: ProcessingMode;
  created_at: string;
  updated_at: string;
}

// Wardrobe DTOs
export interface WardrobeImage {
  id: string;
  wardrobe_item_id: string;
  image_url: string;
  is_primary: boolean;
  created_at: string;
}

export interface ItemAnalysisResult {
  id: string;
  wardrobe_item_id: string;
  detected_category: WardrobeItemCategory;
  confidence: number;
  detected_color?: string;
  detected_pattern?: string;
  detected_material?: string;
  detected_brand?: string;
  corrections?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WardrobeItem {
  id: string;
  user_id: string;
  category: WardrobeItemCategory;
  name: string;
  color?: string;
  pattern?: string;
  material?: string;
  brand?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  images?: WardrobeImage[];
  analysis?: ItemAnalysisResult;
}

// Body Analysis DTOs
export interface BodyImage {
  id: string;
  user_id: string;
  image_url: string;
  is_primary: boolean;
  created_at: string;
}

export interface BodyAnalysisResult {
  id: string;
  user_id: string;
  body_shape?: string;
  skin_tone?: string;
  face_shape?: string;
  height?: string;
  proportions?: Record<string, unknown>;
  confidence: number;
  corrections?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Context DTOs
export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  wind_speed: number;
  timestamp: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  formality_level?: 'casual' | 'business' | 'formal' | 'black-tie';
}

export interface ContextSnapshot {
  timestamp: string;
  weather: WeatherData;
  events: CalendarEvent[];
  routine_block?: string;
  location?: string;
}

// Recommendation DTOs
export interface Outfit {
  id: string;
  wardrobe_item_ids: string[];
  score: number;
  explanation?: string;
  tags?: string[];
}

export interface RecommendationRun {
  id: string;
  user_id: string;
  context: ContextSnapshot;
  main_outfit_id: string;
  alt_outfit_1_id: string;
  alt_outfit_2_id: string;
  created_at: string;
}

// Preview DTOs
export interface PreviewAsset {
  id: string;
  outfit_id: string;
  preview_type: 'card' | 'mannequin' | 'collage' | 'realistic';
  image_url: string;
  created_at: string;
}

// History DTOs
export interface OutfitHistory {
  id: string;
  user_id: string;
  outfit_id: string;
  recommendation_run_id: string;
  feedback: OutfitFeedback;
  worn_date?: string;
  created_at: string;
  updated_at: string;
}

// Request DTOs
export interface SignupRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  name?: string;
  bio?: string;
  processing_mode?: ProcessingMode;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface CreateWardrobeItemRequest {
  category: WardrobeItemCategory;
  name: string;
  color?: string;
  pattern?: string;
  material?: string;
  brand?: string;
}

export interface UpdateWardrobeItemRequest {
  name?: string;
  category?: WardrobeItemCategory;
  color?: string;
  pattern?: string;
  material?: string;
  brand?: string;
  is_active?: boolean;
}

export interface CreateRecommendationRequest {
  processing_mode?: ProcessingMode;
  date?: string;
}
