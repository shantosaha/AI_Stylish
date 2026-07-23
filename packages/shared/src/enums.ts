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

export enum OutfitFeedback {
  LIKED = 'liked',
  WORN = 'worn',
  SKIPPED = 'skipped',
  NEUTRAL = 'neutral',
}
