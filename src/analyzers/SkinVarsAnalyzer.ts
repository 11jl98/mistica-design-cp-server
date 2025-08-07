export interface ColorMapping {
  figmaColor: string;
  skinVar: string;
  category: 'text' | 'background' | 'border' | 'brand' | 'neutral';
  confidence: number;
}

export class SkinVarsAnalyzer {
  private readonly SKIN_VARS_MAPPING = {
    // Text colors
    colors: {
      text: {
        primary: ['#000000', '#1a1a1a', '#333333', '#0b2739', 'rgb(0,0,0)', 'black'],
        secondary: ['#666666', '#777777', '#999999', '#6b6c6f', 'rgb(102,102,102)'],
        tertiary: ['#999999', '#aaaaaa', '#bbbbbb', 'rgb(153,153,153)'],
        inverse: ['#ffffff', '#fff', 'white', 'rgb(255,255,255)'],
        brand: ['#0066cc', '#007acc', '#0080ff', 'rgb(0,102,204)'],
        success: ['#00aa44', '#00cc55', '#22cc66', 'rgb(0,170,68)'],
        warning: ['#ff9900', '#ffaa00', '#ffbb33', 'rgb(255,153,0)'],
        error: ['#cc0000', '#dd1122', '#ff3344', 'rgb(204,0,0)'],
      },
      background: {
        canvas: ['#ffffff', '#fff', 'white', 'rgb(255,255,255)'],
        canvasAlternative: ['#f5f5f5', '#f0f0f0', '#eeeeee', 'rgb(245,245,245)'],
        container: ['#ffffff', '#fff', 'white', 'rgb(255,255,255)'],
        containerAlternative: ['#fafafa', '#f8f8f8', 'rgb(250,250,250)'],
        brand: ['#0066cc', '#007acc', 'rgb(0,102,204)'],
        brandSecondary: ['#e6f2ff', '#f0f8ff', 'rgb(230,242,255)'],
      },
      border: {
        primary: ['#dddddd', '#d0d0d0', '#cccccc', 'rgb(221,221,221)'],
        secondary: ['#eeeeee', '#e8e8e8', 'rgb(238,238,238)'],
        brand: ['#0066cc', '#007acc', 'rgb(0,102,204)'],
        selected: ['#0066cc', '#007acc', 'rgb(0,102,204)'],
      },
      control: {
        activatedBackground: ['#0066cc', '#007acc', 'rgb(0,102,204)'],
        deactivatedBackground: ['#f5f5f5', '#f0f0f0', 'rgb(245,245,245)'],
        activatedText: ['#ffffff', '#fff', 'white', 'rgb(255,255,255)'],
        deactivatedText: ['#999999', '#aaaaaa', 'rgb(153,153,153)'],
      }
    }
  } as const;

  analyzeSkinVarsUsage(cssText: string, element: string, elementHtml?: string): ColorMapping[] {
    const mappings: ColorMapping[] = [];
    
    // Extract all color properties from inline CSS
    const colorProperties = this.extractColorProperties(cssText);
    
    // Extract colors from Tailwind classes if available
    if (elementHtml) {
      const tailwindColors = this.extractTailwindColors(elementHtml);
      colorProperties.push(...tailwindColors);
    }
    
    colorProperties.forEach(({ property, value }) => {
      const skinVar = this.findBestSkinVarMatch(value, property, element);
      if (skinVar) {
        mappings.push({
          figmaColor: value,
          skinVar: skinVar.varName,
          category: skinVar.category,
          confidence: skinVar.confidence,
        });
      }
    });

    return mappings;
  }

  private extractColorProperties(cssText: string): { property: string; value: string }[] {
    const colorProperties: { property: string; value: string }[] = [];
    
    // Common color properties
    const colorRegexes = [
      { property: 'color', regex: /color:\s*([^;]+)/gi },
      { property: 'background-color', regex: /background-color:\s*([^;]+)/gi },
      { property: 'border-color', regex: /border-color:\s*([^;]+)/gi },
      { property: 'background', regex: /background:\s*([^;]+)/gi },
      { property: 'border', regex: /border:\s*[^;]*?([#\w\(\),\s]+)[^;]*?/gi },
    ];

    colorRegexes.forEach(({ property, regex }) => {
      let match;
      while ((match = regex.exec(cssText)) !== null) {
        const value = this.normalizeColor(match[1].trim());
        if (this.isValidColor(value)) {
          colorProperties.push({ property, value });
        }
      }
    });

    return colorProperties;
  }

  private findBestSkinVarMatch(
    color: string, 
    property: string, 
    element: string
  ): { varName: string; category: ColorMapping['category']; confidence: number } | null {
    const normalizedColor = this.normalizeColor(color);
    let bestMatch: { varName: string; category: ColorMapping['category']; confidence: number } | null = null;
    let highestConfidence = 0;

    // Determine context for better matching
    const context = this.determineColorContext(property, element);

    // Search through skin vars
    Object.entries(this.SKIN_VARS_MAPPING.colors).forEach(([category, subcategories]) => {
      Object.entries(subcategories).forEach(([subcat, colorValues]) => {
        colorValues.forEach((skinColor: string) => {
          const normalizedSkinColor = this.normalizeColor(skinColor);
          if (this.colorsMatch(normalizedColor, normalizedSkinColor)) {
            const confidence = this.calculateColorConfidence(
              normalizedColor, 
              normalizedSkinColor, 
              context, 
              category as ColorMapping['category']
            );
            
            if (confidence > highestConfidence) {
              highestConfidence = confidence;
              bestMatch = {
                varName: `skinVars.colors.${subcat}`,
                category: category as ColorMapping['category'],
                confidence,
              };
            }
          }
        });
      });
    });

    return bestMatch;
  }

  private determineColorContext(property: string, element: string): string {
    if (property.includes('background')) return 'background';
    if (property.includes('border')) return 'border';
    if (property === 'color') return 'text';
    
    // Context from element type
    if (element.toLowerCase().includes('button')) return 'control';
    if (element.toLowerCase().includes('text') || element.toLowerCase().includes('span')) return 'text';
    if (element.toLowerCase().includes('div') || element.toLowerCase().includes('container')) return 'background';
    
    return 'text'; // default
  }

  private normalizeColor(color: string): string {
    // Convert rgb to hex, normalize case, etc.
    color = color.trim().toLowerCase();
    
    // Convert rgb() to hex
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
      const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
      const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    
    // Normalize hex
    if (color.startsWith('#') && color.length === 4) {
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }
    
    return color;
  }

  private isValidColor(color: string): boolean {
    return /^(#[0-9a-f]{3,8}|rgb|rgba|hsl|hsla|[a-z]+)/.test(color.toLowerCase());
  }

  private colorsMatch(color1: string, color2: string): boolean {
    return color1 === color2;
  }

  private calculateColorConfidence(
    actualColor: string, 
    skinColor: string, 
    context: string, 
    category: ColorMapping['category']
  ): number {
    let confidence = 0.7; // Base confidence for exact match

    // Context bonus
    if (context === category) {
      confidence += 0.2;
    }

    // Exact match bonus
    if (actualColor === skinColor) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  generateSkinVarsSuggestions(mappings: ColorMapping[]): string {
    if (mappings.length === 0) {
      return 'Nenhuma correspondência de skinVars encontrada.';
    }

    let suggestions = 'Sugestões de skinVars:\n\n';
    
    mappings.forEach((mapping, index) => {
      suggestions += `${index + 1}. Cor: ${mapping.figmaColor}\n`;
      suggestions += `   Usar: ${mapping.skinVar}\n`;
      suggestions += `   Categoria: ${mapping.category}\n`;
      suggestions += `   Confiança: ${Math.round(mapping.confidence * 100)}%\n\n`;
    });

    return suggestions;
  }

  private extractTailwindColors(elementHtml: string): { property: string; value: string }[] {
    const colors: { property: string; value: string }[] = [];
    
    // Extract text colors like text-[#0b2739]
    const textColorMatch = elementHtml.match(/text-\[(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\]/);
    if (textColorMatch) {
      colors.push({ property: 'color', value: textColorMatch[1] });
    }

    // Extract background colors like bg-[#ffffff]
    const bgColorMatch = elementHtml.match(/bg-\[(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\]/);
    if (bgColorMatch) {
      colors.push({ property: 'background-color', value: bgColorMatch[1] });
    }

    // Extract border colors like border-[#dddddd]
    const borderColorMatch = elementHtml.match(/border-\[(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\]/);
    if (borderColorMatch) {
      colors.push({ property: 'border-color', value: borderColorMatch[1] });
    }

    // Mapeamento de cores Tailwind comuns
    const tailwindColorMap = {
      // Text colors
      'text-black': { property: 'color', value: '#000000' },
      'text-white': { property: 'color', value: '#ffffff' },
      'text-gray-900': { property: 'color', value: '#111827' },
      'text-gray-800': { property: 'color', value: '#1f2937' },
      'text-gray-700': { property: 'color', value: '#374151' },
      'text-gray-600': { property: 'color', value: '#4b5563' },
      'text-gray-500': { property: 'color', value: '#6b7280' },
      'text-gray-400': { property: 'color', value: '#9ca3af' },
      'text-blue-600': { property: 'color', value: '#2563eb' },
      'text-blue-500': { property: 'color', value: '#3b82f6' },
      // Background colors
      'bg-white': { property: 'background-color', value: '#ffffff' },
      'bg-gray-50': { property: 'background-color', value: '#f9fafb' },
      'bg-gray-100': { property: 'background-color', value: '#f3f4f6' },
      'bg-blue-500': { property: 'background-color', value: '#3b82f6' },
    };

    for (const [className, colorInfo] of Object.entries(tailwindColorMap)) {
      if (elementHtml.includes(className)) {
        colors.push(colorInfo);
      }
    }

    return colors;
  }
}
