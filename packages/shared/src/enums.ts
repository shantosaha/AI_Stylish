export enum ProcessingMode {
  AUTO = 'auto',
  LOCAL_PREFERRED = 'local_preferred',
  CLOUD_PREFERRED = 'cloud_preferred',
}

export enum WardrobeItemCategory {
  TOPS = 'tops',
  BOTTOMS = 'bottoms',
  OUTERWEAR = 'outerwear',
  SHOES = 'shoes',
  ACCESSORIES = 'accessories',
  BAGS = 'bags',
  JEWELRY = 'jewelry',
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  READY = 'ready',
  FAILED = 'failed',
}

// Matches documents/04's canonical feedback_code enum.
export enum OutfitFeedback {
  LIKE = 'like',
  WORN = 'worn',
  FAVORITE = 'favorite',
  TOO_HOT = 'too_hot',
  TOO_COLD = 'too_cold',
  TOO_FORMAL = 'too_formal',
  TOO_CASUAL = 'too_casual',
  NOT_MY_STYLE = 'not_my_style',
  SKIP = 'skip',
}
