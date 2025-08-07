/**
 * Tipos TypeScript para o design system Mística
 */

export interface MisticaComponent {
  id: string;
  name: string;
  category: string;
  description: string;
  props?: ComponentProp[];
  examples?: ComponentExample[];
  usage?: string;
  variations?: ComponentVariation[];
  designTokens?: DesignToken[];
  figmaId?: string;
  storyUrl: string;
  lastUpdated: Date;
  npmInfo?: NpmInfo;
}

export interface NpmInfo {
  package: string;
  version: string;
  exportName: string;
  isDefault: boolean;
  source: string;
}

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description: string;
}

export interface ComponentExample {
  title: string;
  code: string;
  description?: string;
  variant?: string;
}

export interface ComponentVariation {
  name: string;
  description: string;
  props: Record<string, any>;
}

export interface DesignToken {
  name: string;
  value: string;
  category: "color" | "spacing" | "typography" | "shadow" | "border" | "other";
  description?: string;
}

export interface MisticaCategory {
  id: string;
  name: string;
  description: string;
  components: string[];
}

export interface StoryBookData {
  title: string;
  kind: string;
  id: string;
  name: string;
  story: string;
  parameters?: Record<string, any>;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiry: Date;
}

export interface ScraperConfig {
  baseUrl: string;
  cacheTimeout: number; // em minutos
  retryAttempts: number;
  retryDelay: number; // em ms
}
