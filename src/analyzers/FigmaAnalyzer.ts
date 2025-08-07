import { ElementExtractor } from '../analyzers/ElementExtractor.js';
import { PatternDetector } from '../analyzers/PatternDetector.js';
import { TypographyAnalyzer } from './TypographyAnalyzer.js';
import { SkinVarsAnalyzer } from './SkinVarsAnalyzer.js';
import type { TypographyAnalysis } from './TypographyAnalyzer.js';
import type { ColorMapping } from './SkinVarsAnalyzer.js';
import type { UIElements } from '../analyzers/ElementExtractor.js';
import type { UIPatterns, StructuralAnalysis } from '../analyzers/PatternDetector.js';

export interface FigmaAnalysis {
  elements: UIElements;
  structure: StructuralAnalysis;
  patterns: UIPatterns;
  complexity: 'low' | 'medium' | 'high';
  metadata: AnalysisMetadata;
}

export interface EnhancedFigmaAnalysis {
  elements: {
    buttons: { found: boolean; count: number; hasActions: boolean };
    texts: { 
      found: boolean; 
      count: number; 
      hierarchy: string[];
      typography: TypographyAnalysis[];
      skinVarsSuggestions: ColorMapping[];
    };
    lists: { found: boolean; count: number; hasNavigation: boolean };
    containers: { found: boolean; count: number };
    icons: { found: boolean; count: number; hasInteraction: boolean };
    inputs: { found: boolean; count: number; types: string[] };
    navigation: { found: boolean; hasBackButton: boolean };
  };
  structure: {
    layoutType: string;
    hasGrid: boolean;
    hasFlexbox: boolean;
  };
  patterns: {
    listPattern: boolean;
    cardPattern: boolean;
    formPattern: boolean;
    navigationPattern: boolean;
    modalPattern: boolean;
  };
  designTokens: {
    typography: TypographyAnalysis[];
    colors: ColorMapping[];
    spacing: string[];
  };
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
  private typographyAnalyzer: TypographyAnalyzer;
  private skinVarsAnalyzer: SkinVarsAnalyzer;

  constructor() {
    this.elementExtractor = new ElementExtractor();
    this.patternDetector = new PatternDetector();
    this.typographyAnalyzer = new TypographyAnalyzer();
    this.skinVarsAnalyzer = new SkinVarsAnalyzer();
  }

  analyzeFigmaCode(figmaCode: string): EnhancedFigmaAnalysis {
    const elements = this.elementExtractor.extractUIElements(figmaCode);
    const structure = this.patternDetector.analyzeStructure(figmaCode);
    const patterns = this.patternDetector.detectVisualPatterns(figmaCode);
    
    const enhancedAnalysis: EnhancedFigmaAnalysis = {
      elements: {
        buttons: { found: false, count: 0, hasActions: false },
        texts: { 
          found: false, 
          count: 0, 
          hierarchy: [],
          typography: [],
          skinVarsSuggestions: []
        },
        lists: { found: false, count: 0, hasNavigation: false },
        containers: { found: false, count: 0 },
        icons: { found: false, count: 0, hasInteraction: false },
        inputs: { found: false, count: 0, types: [] },
        navigation: { found: false, hasBackButton: false },
      },
      structure: {
        layoutType: structure.layoutType || 'unknown',
        hasGrid: figmaCode.includes('grid') || figmaCode.includes('Grid'),
        hasFlexbox: figmaCode.includes('flex') || figmaCode.includes('Flex'),
      },
      patterns: {
        listPattern: patterns.listPattern || false,
        cardPattern: patterns.cardPattern || false,
        formPattern: patterns.formPattern || false,
        navigationPattern: patterns.navigationPattern || false,
        modalPattern: patterns.modalPattern || false,
      },
      designTokens: {
        typography: [],
        colors: [],
        spacing: [],
      },
      complexity: this.patternDetector.calculateCodeComplexity(figmaCode),
      metadata: this.extractMetadata(figmaCode)
    };

    // Enhanced text analysis
    this.analyzeTexts(figmaCode, enhancedAnalysis);
    
    // Enhanced button analysis
    this.analyzeButtons(figmaCode, enhancedAnalysis);
    
    // Map from existing analysis
    this.mapExistingElements(elements, enhancedAnalysis);

    return enhancedAnalysis;
  }

  private analyzeTexts(figmaCode: string, analysis: EnhancedFigmaAnalysis): void {
    // Find all text elements with enhanced parsing - improved regex to catch Tailwind classes
    const textElements = [
      ...Array.from(figmaCode.matchAll(/(<(?:div|p|span|h[1-6])[^>]*(?:className="[^"]*(?:text-|font-)[^"]*"|style="[^"]*font[^"]*")[^>]*>.*?<\/(?:div|p|span|h[1-6])>)/gs)),
    ];

    console.log(`🔍 Found ${textElements.length} text elements`);

    if (textElements.length > 0) {
      analysis.elements.texts.found = true;
      analysis.elements.texts.count = textElements.length;

      textElements.forEach(([fullMatch], index) => {
        console.log(`\n📝 Analyzing element ${index + 1}:`, fullMatch.substring(0, 100) + '...');
        
        // Extract CSS styles for typography analysis
        const styleMatch = fullMatch.match(/style="([^"]*)"/);
        const classMatch = fullMatch.match(/className="([^"]*)"/);
        
        const cssText = styleMatch ? styleMatch[1] : '';
        const elementHtml = fullMatch;
        
        console.log(`   CSS: ${cssText}`);
        console.log(`   Classes: ${classMatch ? classMatch[1] : 'none'}`);
        
        // Analyze typography - pass both CSS and HTML
        const typographyAnalysis = this.typographyAnalyzer.analyzeTypography(cssText, undefined, elementHtml);
        
        console.log(`   Typography: ${typographyAnalysis.textLevel} (${typographyAnalysis.weight}), size: ${typographyAnalysis.size}px, color: ${typographyAnalysis.color}`);
        
        analysis.elements.texts.typography.push(typographyAnalysis);
        analysis.designTokens.typography.push(typographyAnalysis);
        
        // Add to hierarchy if confident enough
        if (typographyAnalysis.confidence > 0.6) {
          const hierarchyLabel = `${typographyAnalysis.textLevel} (${typographyAnalysis.weight})`;
          if (!analysis.elements.texts.hierarchy.includes(hierarchyLabel)) {
            analysis.elements.texts.hierarchy.push(hierarchyLabel);
          }
        }

        // Analyze colors for skinVars - pass HTML for Tailwind class analysis
        const colorMappings = this.skinVarsAnalyzer.analyzeSkinVarsUsage(
          cssText, 
          this.extractElementType(fullMatch),
          elementHtml
        );
        
        console.log(`   Color mappings: ${colorMappings.length} found`);
        
        analysis.elements.texts.skinVarsSuggestions.push(...colorMappings);
        analysis.designTokens.colors.push(...colorMappings);
      });

      // Sort hierarchy by text level
      analysis.elements.texts.hierarchy.sort((a, b) => {
        const levelA = parseInt(a.match(/text(\d+)/)?.[1] || '10');
        const levelB = parseInt(b.match(/text(\d+)/)?.[1] || '10');
        return levelA - levelB;
      });
    }
  }

  private analyzeButtons(figmaCode: string, analysis: EnhancedFigmaAnalysis): void {
    const buttonElements = Array.from(figmaCode.matchAll(/(<button[^>]*>.*?<\/button>|<div[^>]*[Bb]utton[^>]*>.*?<\/div>)/gs));
    
    if (buttonElements.length > 0) {
      analysis.elements.buttons.found = true;
      analysis.elements.buttons.count = buttonElements.length;
      analysis.elements.buttons.hasActions = figmaCode.includes('onClick') || figmaCode.includes('click');

      buttonElements.forEach(([fullMatch]) => {
        const styleMatch = fullMatch.match(/style="([^"]*)"/);
        if (styleMatch) {
          const cssText = styleMatch[1];
          
          // Analyze button colors for skinVars
          const colorMappings = this.skinVarsAnalyzer.analyzeSkinVarsUsage(cssText, 'button');
          analysis.designTokens.colors.push(...colorMappings);
        }
      });
    }
  }

  private mapExistingElements(elements: UIElements, analysis: EnhancedFigmaAnalysis): void {
    // Map existing analysis to enhanced format
    if (!analysis.elements.buttons.found && elements.buttons) {
      analysis.elements.buttons = elements.buttons;
    }
    if (!analysis.elements.lists.found && elements.lists) {
      analysis.elements.lists = elements.lists;
    }
    if (!analysis.elements.containers.found && elements.containers) {
      analysis.elements.containers = elements.containers;
    }
    if (!analysis.elements.icons.found && elements.icons) {
      analysis.elements.icons = elements.icons;
    }
    if (!analysis.elements.inputs.found && elements.inputs) {
      analysis.elements.inputs = elements.inputs;
    }
    if (!analysis.elements.navigation.found && elements.navigation) {
      analysis.elements.navigation = elements.navigation;
    }
  }

  private extractElementType(elementHtml: string): string {
    const tagMatch = elementHtml.match(/<(\w+)/);
    return tagMatch ? tagMatch[1] : 'div';
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
