interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export class Cache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTL: number = 60000) { // Default 1 minute
    this.defaultTTL = defaultTTL;
  }

  set(key: string, value: T, ttl?: number): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  async getOrSet(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
}

export class LRUCache<T = any> extends Cache<T> {
  private maxSize: number;
  private accessOrder: string[] = [];

  constructor(maxSize: number = 100, defaultTTL: number = 60000) {
    super(defaultTTL);
    this.maxSize = maxSize;
  }

  set(key: string, value: T, ttl?: number): void {
    super.set(key, value, ttl);
    this.updateAccessOrder(key);
    this.evictIfNeeded();
  }

  get(key: string): T | undefined {
    const value = super.get(key);
    if (value !== undefined) {
      this.updateAccessOrder(key);
    }
    return value;
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  private evictIfNeeded(): void {
    while (this.size() > this.maxSize && this.accessOrder.length > 0) {
      const keyToEvict = this.accessOrder.shift();
      if (keyToEvict) {
        this.delete(keyToEvict);
      }
    }
  }
}