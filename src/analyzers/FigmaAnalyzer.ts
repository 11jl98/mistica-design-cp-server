import { ElementExtractor } from '../analyzers/ElementExtractor.js';
import { PatternDetector } from '../analyzers/PatternDetector.js';
import type { UIElements } from '../analyzers/ElementExtractor.js';
import type { UIPatterns, StructuralAnalysis } from '../analyzers/PatternDetector.js';

export interface FigmaAnalysis {
  elements: UIElements;
  structure: StructuralAnalysis;
  patterns: UIPatterns;
  complexity: 'low' | 'medium' | 'high';
  metadata: AnalysisMetadata;
}

export interface AnalysisMetadata {
  codeLength: number;
  hasReactComponents: boolean;
  hasTypeScript: boolean;
  hasCSS: boolean;
  hasImages: boolean;
}

export class FigmaAnalyzer {
  private elementExtractor: ElementExtractor;
  private patternDetector: PatternDetector;

  constructor() {
    this.elementExtractor = new ElementExtractor();
    this.patternDetector = new PatternDetector();
  }

  analyzeFigmaCode(figmaCode: string): FigmaAnalysis {
    const elements = this.elementExtractor.extractUIElements(figmaCode);
    const structure = this.patternDetector.analyzeStructure(figmaCode);
    const patterns = this.patternDetector.detectVisualPatterns(figmaCode);
    
    return {
      elements,
      structure,
      patterns,
      complexity: this.patternDetector.calculateCodeComplexity(figmaCode),
      metadata: this.extractMetadata(figmaCode)
    };
  }

  private extractMetadata(figmaCode: string): AnalysisMetadata {
    return {
      codeLength: figmaCode.length,
      hasReactComponents: /export default function|function \w+|const \w+ = |React\./gi.test(figmaCode),
      hasTypeScript: /interface|type |: \w+|<\w+>/gi.test(figmaCode),
      hasCSS: /className|style=|css`|styled\./gi.test(figmaCode),
      hasImages: /src=|Image|img|picture/gi.test(figmaCode),
    };
  }
}
