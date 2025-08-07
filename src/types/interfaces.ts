/**
 * 🏗️ Interfaces - Tipos e interfaces compartilhadas
 * 
 * Responsabilidade: Definir tipos comuns usados em todo o projeto
 */

import type { FigmaAnalysis, EnhancedFigmaAnalysis } from "../analyzers/FigmaAnalyzer.js";
import type { TypographyAnalysis } from "../analyzers/TypographyAnalyzer.js";
import type { ColorMapping } from "../analyzers/SkinVarsAnalyzer.js";

export interface MisticaComponent {
  name: string;
  category: string;
  description: string;
  version?: string;
  url?: string;
  props?: any[];
  examples?: any[];
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: any;
}
