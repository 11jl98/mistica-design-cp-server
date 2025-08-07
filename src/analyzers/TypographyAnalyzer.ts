export interface TypographyAnalysis {
  textLevel: 'text1' | 'text2' | 'text3' | 'text4' | 'text5' | 'text6' | 'text7' | 'text8' | 'text9' | 'text10';
  weight: 'light' | 'regular' | 'medium' | 'bold';
  size: number;
  lineHeight: number | string;
  color?: string;
  skinVarSuggestion?: string;
  confidence: number;
}

export class TypographyAnalyzer {
  // Mapping baseado na documentação do Mística
  private readonly TEXT_SCALE_MAPPING = {
    text1: { minSize: 56, maxSize: 64, weights: ['light', 'regular', 'medium'] },
    text2: { minSize: 40, maxSize: 48, weights: ['light', 'regular', 'medium'] },
    text3: { minSize: 32, maxSize: 40, weights: ['light', 'regular', 'medium'] },
    text4: { minSize: 28, maxSize: 32, weights: ['light', 'regular', 'medium'] },
    text5: { minSize: 24, maxSize: 28, weights: ['light', 'regular', 'medium'] },
    text6: { minSize: 20, maxSize: 24, weights: ['regular', 'medium'] },
    text7: { minSize: 18, maxSize: 20, weights: ['regular', 'medium'] },
    text8: { minSize: 16, maxSize: 18, weights: ['regular', 'medium'] },
    text9: { minSize: 14, maxSize: 16, weights: ['regular', 'medium'] },
    text10: { minSize: 12, maxSize: 14, weights: ['regular', 'medium'] },
  } as const;

  private readonly WEIGHT_KEYWORDS = {
    light: ['light', 'thin', '300', '200', '100'],
    regular: ['regular', 'normal', '400', 'book'],
    medium: ['medium', '500', '600', 'semibold'],
    bold: ['bold', '700', '800', '900', 'black'],
  } as const;

  analyzeTypography(cssText: string, computedStyles?: any, elementHtml?: string): TypographyAnalysis {
    let fontSize = this.extractFontSize(cssText);
    let fontWeight = this.extractFontWeight(cssText);
    let lineHeight = this.extractLineHeight(cssText);
    let color = this.extractColor(cssText);

    console.log(`    🔍 Initial extraction - fontSize: ${fontSize}, fontWeight: ${fontWeight}, color: ${color}`);

    // Se não encontrou no CSS inline, tentar extrair de classes Tailwind
    if (!fontSize && elementHtml) {
      fontSize = this.extractTailwindFontSize(elementHtml);
      console.log(`    📐 Tailwind fontSize: ${fontSize}`);
    }
    if (!fontWeight && elementHtml) {
      fontWeight = this.extractTailwindFontWeight(elementHtml);
      console.log(`    📐 Tailwind fontWeight: ${fontWeight}`);
    }
    if (!color && elementHtml) {
      color = this.extractTailwindColor(elementHtml);
      console.log(`    📐 Tailwind color: ${color}`);
    }
    if (lineHeight === 'normal' && elementHtml) {
      const tailwindLineHeight = this.extractTailwindLineHeight(elementHtml);
      if (tailwindLineHeight !== 'normal') {
        lineHeight = tailwindLineHeight;
        console.log(`    📐 Tailwind lineHeight: ${lineHeight}`);
      }
    }

    // Força a extração do Tailwind mesmo se já tem valores
    if (elementHtml) {
      const tailwindSize = this.extractTailwindFontSize(elementHtml);
      const tailwindWeight = this.extractTailwindFontWeight(elementHtml);
      const tailwindColor = this.extractTailwindColor(elementHtml);
      
      if (tailwindSize !== 16) fontSize = tailwindSize;
      if (tailwindWeight !== 'regular') fontWeight = tailwindWeight;
      if (tailwindColor) color = tailwindColor;
      
      console.log(`    ✅ Final values - fontSize: ${fontSize}, fontWeight: ${fontWeight}, color: ${color}`);
    }

    const textLevel = this.determineTextLevel(fontSize);
    const weight = this.determineWeight(fontWeight, cssText + (elementHtml || ''));
    
    const confidence = this.calculateTypographyConfidence(
      fontSize, 
      fontWeight, 
      textLevel, 
      weight
    );

    return {
      textLevel,
      weight,
      size: fontSize,
      lineHeight,
      color,
      confidence,
    };
  }

  private extractFontSize(cssText: string): number {
    const fontSizeMatch = cssText.match(/font-size:\s*(\d+(?:\.\d+)?)px/i);
    return fontSizeMatch ? parseFloat(fontSizeMatch[1]) : 16;
  }

  private extractFontWeight(cssText: string): string {
    const fontWeightMatch = cssText.match(/font-weight:\s*([^;]+)/i);
    return fontWeightMatch ? fontWeightMatch[1].trim() : 'regular';
  }

  private extractLineHeight(cssText: string): number | string {
    const lineHeightMatch = cssText.match(/line-height:\s*([^;]+)/i);
    if (!lineHeightMatch) return 'normal';
    
    const value = lineHeightMatch[1].trim();
    if (value.includes('px')) {
      return parseFloat(value);
    }
    return value;
  }

  private extractColor(cssText: string): string | undefined {
    const colorMatch = cssText.match(/color:\s*([^;]+)/i);
    return colorMatch ? colorMatch[1].trim() : undefined;
  }

  // Métodos para extrair informações de classes Tailwind
  private extractTailwindFontSize(elementHtml: string): number {
    // Procura por classes como text-[20px] (tem que ser mais específica)
    const customSizeMatch = elementHtml.match(/text-\[(\d+(?:\.\d+)?)px\]/);
    if (customSizeMatch) {
      return parseFloat(customSizeMatch[1]);
    }

    // Mapeamento de classes Tailwind padrão para tamanhos
    const tailwindSizeMap: Record<string, number> = {
      'text-xs': 12,
      'text-sm': 14,
      'text-base': 16,
      'text-lg': 18,
      'text-xl': 20,
      'text-2xl': 24,
      'text-3xl': 30,
      'text-4xl': 36,
      'text-5xl': 48,
      'text-6xl': 60,
    };

    for (const [className, size] of Object.entries(tailwindSizeMap)) {
      if (new RegExp(`\\b${className}\\b`).test(elementHtml)) {
        return size;
      }
    }

    return 16; // default
  }

  private extractTailwindFontWeight(elementHtml: string): string {
    // Procura por font-['On_Air:Bold'] ou font-bold - mais específica
    if (elementHtml.includes('On_Air:Bold') || elementHtml.includes(':Bold') || elementHtml.match(/\bfont-bold\b/)) {
      return 'bold';
    }
    if (elementHtml.includes('On_Air:Medium') || elementHtml.includes(':Medium') || elementHtml.match(/\bfont-medium\b/)) {
      return 'medium';
    }
    if (elementHtml.includes('On_Air:Light') || elementHtml.includes(':Light') || elementHtml.match(/\bfont-light\b/)) {
      return 'light';
    }
    if (elementHtml.includes('On_Air:Regular') || elementHtml.includes(':Regular') || elementHtml.match(/\bfont-normal\b/)) {
      return 'regular';
    }

    // Procura por font-[number]
    const fontWeightMatch = elementHtml.match(/font-(\d{3})/);
    if (fontWeightMatch) {
      return fontWeightMatch[1];
    }

    return 'regular';
  }

  private extractTailwindColor(elementHtml: string): string | undefined {
    // Procura por classes como text-[#0b2739]
    const colorMatch = elementHtml.match(/text-\[(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\]/);
    if (colorMatch) {
      return colorMatch[1];
    }

    // Mapeamento de cores Tailwind comuns
    const tailwindColorMap: Record<string, string> = {
      'text-black': '#000000',
      'text-white': '#ffffff',
      'text-gray-900': '#111827',
      'text-gray-800': '#1f2937',
      'text-gray-700': '#374151',
      'text-gray-600': '#4b5563',
      'text-gray-500': '#6b7280',
      'text-gray-400': '#9ca3af',
      'text-blue-600': '#2563eb',
      'text-blue-500': '#3b82f6',
    };

    for (const [className, color] of Object.entries(tailwindColorMap)) {
      if (elementHtml.includes(className)) {
        return color;
      }
    }

    return undefined;
  }

  private extractTailwindLineHeight(elementHtml: string): number | string {
    // Procura por leading-[24px] ou leading-6
    const customLeadingMatch = elementHtml.match(/leading-\[(\d+(?:\.\d+)?)px\]/);
    if (customLeadingMatch) {
      return parseFloat(customLeadingMatch[1]);
    }

    // Mapeamento de classes Tailwind para line-height
    const tailwindLeadingMap: Record<string, string> = {
      'leading-none': '1',
      'leading-tight': '1.25',
      'leading-snug': '1.375',
      'leading-normal': '1.5',
      'leading-relaxed': '1.625',
      'leading-loose': '2',
      'leading-3': '12',
      'leading-4': '16',
      'leading-5': '20',
      'leading-6': '24',
      'leading-7': '28',
      'leading-8': '32',
      'leading-9': '36',
      'leading-10': '40',
    };

    for (const [className, leading] of Object.entries(tailwindLeadingMap)) {
      if (elementHtml.includes(className)) {
        return leading.includes('.') ? leading : parseFloat(leading);
      }
    }

    return 'normal';
  }

  private determineTextLevel(fontSize: number): TypographyAnalysis['textLevel'] {
    for (const [level, config] of Object.entries(this.TEXT_SCALE_MAPPING)) {
      if (fontSize >= config.minSize && fontSize <= config.maxSize) {
        return level as TypographyAnalysis['textLevel'];
      }
    }

    // Fallback: determinar pelo tamanho mais próximo
    if (fontSize >= 56) return 'text1';
    if (fontSize >= 40) return 'text2';
    if (fontSize >= 32) return 'text3';
    if (fontSize >= 28) return 'text4';
    if (fontSize >= 24) return 'text5';
    if (fontSize >= 20) return 'text6';
    if (fontSize >= 18) return 'text7';
    if (fontSize >= 16) return 'text8';
    if (fontSize >= 14) return 'text9';
    return 'text10';
  }

  private determineWeight(fontWeight: string, cssText: string): TypographyAnalysis['weight'] {
    const weightLower = fontWeight.toLowerCase();
    
    for (const [weight, keywords] of Object.entries(this.WEIGHT_KEYWORDS)) {
      if (keywords.some(keyword => weightLower.includes(keyword) || cssText.toLowerCase().includes(keyword))) {
        return weight as TypographyAnalysis['weight'];
      }
    }

    // Fallback numérico
    const numericWeight = parseInt(fontWeight);
    if (numericWeight <= 300) return 'light';
    if (numericWeight <= 400) return 'regular';
    if (numericWeight <= 600) return 'medium';
    return 'bold';
  }

  private calculateTypographyConfidence(
    fontSize: number, 
    fontWeight: string, 
    textLevel: string, 
    weight: string
  ): number {
    let confidence = 0.5; // Base confidence

    // Confidence boost se o tamanho está dentro do range esperado
    const levelConfig = this.TEXT_SCALE_MAPPING[textLevel as keyof typeof this.TEXT_SCALE_MAPPING];
    if (fontSize >= levelConfig.minSize && fontSize <= levelConfig.maxSize) {
      confidence += 0.3;
    }

    // Confidence boost se o weight é suportado para este level
    if (levelConfig.weights.includes(weight as any)) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }
}
