/**
 * Utilitários para manipulação de strings e URLs
 */

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9-_]/g, '_');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function normalizeComponentName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase();
}

export function generateComponentUrl(baseUrl: string, category: string, componentName: string): string {
  const normalizedName = componentName.toLowerCase().replace(/\s+/g, '');
  return `${baseUrl}/?path=/story/${category}-${normalizedName}--default`;
}

export function extractComponentIdFromUrl(url: string): string | null {
  const match = url.match(/story\/([^-]+)-([^-]+)--/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return null;
}

export function formatComponentId(category: string, name: string): string {
  return `${category}-${slugify(name)}`;
}

export function parseComponentId(id: string): { category: string; name: string } | null {
  const parts = id.split('-');
  if (parts.length >= 2) {
    return {
      category: parts[0],
      name: parts.slice(1).join('-')
    };
  }
  return null;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function camelToKebab(text: string): string {
  return text.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function kebabToCamel(text: string): string {
  return text.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function formatTimestamp(date: Date): string {
  return date.toISOString().split('T')[0] + ' ' + 
         date.toTimeString().split(' ')[0];
}

export function isRecentlyUpdated(date: Date, hoursThreshold: number = 24): boolean {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hoursDiff = diff / (1000 * 60 * 60);
  return hoursDiff < hoursThreshold;
}

export function removeHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export function extractTextFromHtml(html: string): string {
  return removeHtmlTags(html)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Debounce function para evitar chamadas excessivas
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Rate limiter simples
 */
export class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    
    return false;
  }

  getWaitTime(): number {
    if (this.requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...this.requests);
    const waitTime = this.windowMs - (Date.now() - oldestRequest);
    
    return Math.max(0, waitTime);
  }
}
