import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { CacheEntry } from "../types/mistica.js";

export class CacheManager {
  private cacheDir: string;
  private defaultTTL: number;
  private memoryCache: Map<string, { data: any; expiry: Date }> = new Map();

  constructor(cacheDir?: string, defaultTTL: number = 60) {
    if (cacheDir) {
      this.cacheDir = path.resolve(cacheDir);
    } else {
      const currentFileUrl = import.meta.url;
      const currentDir = path.dirname(fileURLToPath(currentFileUrl));
      const mcpServerRoot = path.resolve(currentDir, "../../"); // src/cache -> root
      this.cacheDir = path.join(mcpServerRoot, "data", "cache");
    }
    this.defaultTTL = defaultTTL;
    this.ensureCacheDir();
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      console.log(`📁 Cache configurado em: ${this.cacheDir}`);
    } catch (error) {
      console.error("Erro ao criar diretório de cache:", error);
    }
  }

  private getCacheFilePath(key: string): string {
    const sanitizedKey = key.replace(/[^a-zA-Z0-9-_]/g, "_");
    return path.join(this.cacheDir, `${sanitizedKey}.json`);
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return new Date() > new Date(entry.expiry);
  }

  async get<T>(key: string): Promise<T | null> {
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && new Date() < memoryEntry.expiry) {
      return memoryEntry.data;
    }

    try {
      const filePath = this.getCacheFilePath(key);
      const data = await fs.readFile(filePath, "utf-8");
      const entry: CacheEntry<T> = JSON.parse(data);

      if (this.isExpired(entry)) {
        await this.delete(key);
        return null;
      }

      this.memoryCache.set(key, {
        data: entry.data,
        expiry: new Date(entry.expiry),
      });

      return entry.data;
    } catch (error) {
      return null;
    }
  }

  async set<T>(key: string, data: T, ttlMinutes?: number): Promise<void> {
    const ttl = ttlMinutes || this.defaultTTL;
    const expiry = new Date(Date.now() + ttl * 60 * 1000);

    const entry: CacheEntry<T> = {
      data,
      timestamp: new Date(),
      expiry,
    };

    try {
      const filePath = this.getCacheFilePath(key);
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2), "utf-8");

      this.memoryCache.set(key, {
        data,
        expiry,
      });
    } catch (error) {
      console.error("Erro ao salvar no cache:", error);
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getCacheFilePath(key);
    await fs.unlink(filePath);
  }

  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(
        files.map((file) => fs.unlink(path.join(this.cacheDir, file)))
      );
    } catch (error) {
      console.error("Erro ao limpar cache:", error);
    }
  }

  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  async getKeys(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.cacheDir);
      return files
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.replace(".json", ""));
    } catch (error) {
      return [];
    }
  }

  async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  }> {
    try {
      const keys = await this.getKeys();
      let totalSize = 0;
      let oldestEntry: Date | undefined;
      let newestEntry: Date | undefined;

      for (const key of keys) {
        const filePath = this.getCacheFilePath(key);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;

        if (!oldestEntry || stats.mtime < oldestEntry) {
          oldestEntry = stats.mtime;
        }
        if (!newestEntry || stats.mtime > newestEntry) {
          newestEntry = stats.mtime;
        }
      }

      return {
        totalEntries: keys.length,
        totalSize,
        oldestEntry,
        newestEntry,
      };
    } catch (error) {
      return { totalEntries: 0, totalSize: 0 };
    }
  }
}
