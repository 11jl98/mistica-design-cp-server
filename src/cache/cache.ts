import NodeCache from "node-cache";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import type { CacheEntry } from "../types/mistica.js";

export class MisticaCache {
  private memoryCache: NodeCache;
  private readonly cacheDir: string;
  private readonly defaultTTL: number = 60 * 60 * 24;

  constructor(cacheDir: string = "data", ttlSeconds: number = 60 * 60 * 24) {
    this.cacheDir = cacheDir;
    this.defaultTTL = ttlSeconds;
    this.memoryCache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: ttlSeconds * 0.2,
      useClones: false,
    });
  }

  get<T>(key: string): T | null {
    const memoryResult = this.memoryCache.get<T>(key);
    if (memoryResult !== undefined) {
      return memoryResult;
    }

    const diskResult = this.getFromDisk<T>(key);
    if (diskResult) {
      this.memoryCache.set(key, diskResult);
      return diskResult;
    }

    return null;
  }

  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds || this.defaultTTL;

    this.memoryCache.set(key, value, ttl);

    this.setToDisk(key, value, ttl);
  }


  has(key: string): boolean {
    return this.memoryCache.has(key) || this.existsOnDisk(key);
  }

  delete(key: string): void {
    this.memoryCache.del(key);
    this.deleteFromDisk(key);
  }

  clear(): void {
    this.memoryCache.flushAll();
  }

  getStats() {
    return {
      memory: this.memoryCache.getStats(),
      keys: this.memoryCache.keys(),
    };
  }

  private getFromDisk<T>(key: string): T | null {
    try {
      const filePath = this.getFilePath(key);
      if (!existsSync(filePath)) {
        return null;
      }

      const fileContent = readFileSync(filePath, "utf-8");
      const entry: CacheEntry<T> = JSON.parse(fileContent);

      if (new Date() > new Date(entry.expiry)) {
        this.deleteFromDisk(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error(`Erro ao ler cache do disco para chave ${key}:`, error);
      return null;
    }
  }

  private setToDisk<T>(key: string, value: T, ttlSeconds: number): void {
    try {
      const filePath = this.getFilePath(key);
      const entry: CacheEntry<T> = {
        data: value,
        timestamp: new Date(),
        expiry: new Date(Date.now() + ttlSeconds * 1000),
      };

      writeFileSync(filePath, JSON.stringify(entry, null, 2));
    } catch (error) {
      console.error(`Erro ao salvar cache no disco para chave ${key}:`, error);
    }
  }

  private existsOnDisk(key: string): boolean {
    const filePath = this.getFilePath(key);
    return existsSync(filePath);
  }

  private deleteFromDisk(key: string): void {
    try {
      const filePath = this.getFilePath(key);
      if (existsSync(filePath)) {
        require("fs").unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Erro ao deletar cache do disco para chave ${key}:`, error);
    }
  }

  private getFilePath(key: string): string {
    const sanitizedKey = key.replace(/[^a-zA-Z0-9-_]/g, "_");
    return join(this.cacheDir, `${sanitizedKey}.json`);
  }

  async cleanup(): Promise<void> {
    const keys = this.memoryCache.keys();
    for (const key of keys) {
      if (!this.memoryCache.has(key)) {
        this.deleteFromDisk(key);
      }
    }
  }
}
