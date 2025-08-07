export interface UIElements {
  buttons: ButtonElements;
  texts: TextElements;
  containers: ContainerElements;
  lists: ListElements;
  icons: IconElements;
  inputs: InputElements;
  images: ImageElements;
  navigation: NavigationElements;
  layouts: LayoutElements;
  security: SecurityElements;
  forms: FormElements;
  spacing: SpacingElements;
  feedback: FeedbackElements; // Nova categoria para feedback screens
  figmaComponents: FigmaComponentElements; // Detecção geral de componentes do Figma
}

export interface FeedbackElements {
  found: boolean;
  type: string; // error, success, info, warning
  hasScreen: boolean; // se é uma tela completa
  hasIcon: boolean;
  hasActions: boolean;
  detectedNames: string[]; // nomes detectados do figma
}

export interface FigmaComponentElements {
  found: boolean;
  detectedComponents: DetectedFigmaComponent[];
}

export interface DetectedFigmaComponent {
  originalName: string; // "Error Feedback Screen"
  normalizedName: string; // "ErrorFeedbackScreen"
  componentType: string; // "feedback", "button", "text", etc.
  confidenceScore: number;
  variations: string[]; // variações possíveis
}

export interface ButtonElements {
  found: boolean;
  count: number;
  hasActions: boolean;
  variants: string[];
  positions: string[];
}

export interface TextElements {
  found: boolean;
  count: number;
  hasFormatting: boolean;
  hierarchy: string[];
  figmaPresets: FigmaTextPreset[];
}

export interface FigmaTextPreset {
  preset: string; // text1, text2, text3, etc.
  variant: string; // regular, medium, bold, light
  originalName: string; // text-preset-3/regular
  fontSizeGuess?: number; // tamanho da fonte estimado
  confidenceScore: number; // 0-1, confiança na detecção
}

export interface ContainerElements {
  found: boolean;
  count: number;
  hasLayout: boolean;
  hasPadding: boolean;
  types: string[];
}

export interface ListElements {
  found: boolean;
  count: number;
  isRepeated: boolean;
  hasNavigation: boolean;
  structure: any;
}

export interface IconElements {
  found: boolean;
  count: number;
  hasInteraction: boolean;
  types: string[];
}

export interface LayoutElements {
  found: boolean;
  hasFixedFooter: boolean;
  hasFixedHeader: boolean;
  hasModal: boolean;
  layoutType: string;
  containsButtonInFooter: boolean;
}

export interface SecurityElements {
  found: boolean;
  hasPinField: boolean;
  hasCodeInput: boolean;
  hasOTPInput: boolean;
  securityLevel: string;
}

export interface SpacingElements {
  found: boolean;
  hasExplicitSpacing: boolean;
  spacingTypes: string[];
  spacingValues: string[];
  spacingPatterns: string[];
  detectedUnits: string[];
  semanticSpacing: string[];
}

export interface FormElements {
  found: boolean;
  hasValidation: boolean;
  fieldTypes: string[];
  hasSubmitButton: boolean;
  structure: string;
}

export interface InputElements {
  found: boolean;
  count: number;
  types: string[];
  hasValidation: boolean;
}

export interface ImageElements {
  found: boolean;
  count: number;
  isDecorative: boolean;
}

export interface NavigationElements {
  found: boolean;
  hasBackButton: boolean;
  hasTitle: boolean;
  hasActions: boolean;
}

export class ElementExtractor {
  extractUIElements(code: string): UIElements {
    return {
      buttons: this.extractButtons(code),
      texts: this.extractTexts(code),
      containers: this.extractContainers(code),
      lists: this.extractLists(code),
      icons: this.extractIcons(code),
      inputs: this.extractInputs(code),
      images: this.extractImages(code),
      navigation: this.extractNavigation(code),
      layouts: this.extractLayouts(code),
      security: this.extractSecurity(code),
      forms: this.extractForms(code),
      spacing: this.extractSpacing(code),
      feedback: this.extractFeedback(code),
      figmaComponents: this.extractFigmaComponents(code),
    };
  }

  private extractButtons(code: string): ButtonElements {
    const patterns = [
      /(?:button|Button|btn|Btn|TouchableOpacity|Pressable)[\s\S]*?(?:onPress|onClick|press)/gi,
      /<button[\s\S]*?>/gi,
      /Button\w*\s*{/gi,
    ];

    return {
      found: patterns.some((p) => p.test(code)),
      count: (code.match(/button|Button|TouchableOpacity|Pressable/gi) || [])
        .length,
      hasActions: /onPress|onClick|press|tap/gi.test(code),
      variants: this.detectButtonVariants(code),
      positions: this.detectButtonPositions(code),
    };
  }

  private extractTexts(code: string): TextElements {
    const patterns = [
      /<Text[\s\S]*?>/gi,
      /<h[1-6][\s\S]*?>/gi,
      /<p[\s\S]*?>/gi,
      /Title\d*|Heading|Typography/gi,
      /text-preset-\d+\/\w+/gi, // Padrões do Figma
      /text-preset-\d+-\w+/gi,  // Variação com hífen
    ];

    return {
      found: patterns.some((p) => p.test(code)),
      count: (code.match(/Text|title|heading|h\d|p>|text-preset-\d+/gi) || []).length,
      hasFormatting: /bold|italic|font-size|color|weight|\/regular|\/medium|\/bold|\/light/gi.test(code),
      hierarchy: this.detectTextHierarchy(code),
      figmaPresets: this.extractFigmaTextPresets(code),
    };
  }

  private extractContainers(code: string): ContainerElements {
    return {
      found: /div|View|Container|Box|Stack|Grid/gi.test(code),
      count: (code.match(/div|View|Container|Box|Stack/gi) || []).length,
      hasLayout: /flex|grid|stack|column|row/gi.test(code),
      hasPadding: /padding|margin|space/gi.test(code),
      types: this.detectContainerTypes(code),
    };
  }

  private extractLists(code: string): ListElements {
    return {
      found: /FlatList|ScrollView|map\(|Row.*Row|Item.*Item/gi.test(code),
      count: (code.match(/Row|Item|List/gi) || []).length,
      isRepeated: this.hasRepeatedElements(code),
      hasNavigation: /chevron|arrow|>/gi.test(code),
      structure: this.analyzeListStructure(code),
    };
  }

  private extractIcons(code: string): IconElements {
    return {
      found: /icon|Icon|Image.*?\.(svg|png)|\/>/gi.test(code),
      count: (code.match(/icon|Icon/gi) || []).length,
      hasInteraction: /IconButton|onPress.*icon/gi.test(code),
      types: this.detectIconTypes(code),
    };
  }

  private extractInputs(code: string): InputElements {
    return {
      found: /input|Input|Field|TextInput/gi.test(code),
      count: (code.match(/input|Input|Field/gi) || []).length,
      types: this.detectInputTypes(code),
      hasValidation: /required|validation|error/gi.test(code),
    };
  }

  private extractImages(code: string): ImageElements {
    return {
      found: /img|Image|picture|src=/gi.test(code),
      count: (code.match(/img|Image/gi) || []).length,
      isDecorative: !/alt=|aria-label/gi.test(code),
    };
  }

  private extractNavigation(code: string): NavigationElements {
    return {
      found: /Navigation|Header|AppBar|nav/gi.test(code),
      hasBackButton: /back|arrow.*left|</gi.test(code),
      hasTitle: /title|heading/gi.test(code),
      hasActions: /action|menu|more/gi.test(code),
    };
  }

  private detectButtonVariants(code: string): string[] {
    const variants = [];
    if (/primary|Primary/gi.test(code)) variants.push("primary");
    if (/secondary|Secondary/gi.test(code)) variants.push("secondary");
    if (/danger|Danger|error/gi.test(code)) variants.push("danger");
    if (/link|Link/gi.test(code)) variants.push("link");
    if (/icon.*button|IconButton/gi.test(code)) variants.push("icon");
    return variants;
  }

  private detectTextHierarchy(code: string): string[] {
    const hierarchy = [];
    
    // Detecta padrões do Figma (text-preset-X/variant)
    if (/text-preset-1\/|text-preset-1-|title.*1|Title1|heading.*1/gi.test(code)) hierarchy.push("text1");
    if (/text-preset-2\/|text-preset-2-|title.*2|Title2|heading.*2/gi.test(code)) hierarchy.push("text2");
    if (/text-preset-3\/|text-preset-3-|title.*3|Title3|heading.*3/gi.test(code)) hierarchy.push("text3");
    if (/text-preset-4\/|text-preset-4-|title.*4|Title4|heading.*4/gi.test(code)) hierarchy.push("text4");
    if (/text-preset-5\/|text-preset-5-|title.*5|Title5|heading.*5/gi.test(code)) hierarchy.push("text5");
    if (/text-preset-6\/|text-preset-6-|title.*6|Title6|heading.*6/gi.test(code)) hierarchy.push("text6");
    
    // Detecta variações de peso/estilo
    if (/\/regular|text.*regular|-regular/gi.test(code)) hierarchy.push("regular");
    if (/\/medium|text.*medium|-medium/gi.test(code)) hierarchy.push("medium");
    if (/\/bold|text.*bold|-bold/gi.test(code)) hierarchy.push("bold");
    if (/\/light|text.*light|-light/gi.test(code)) hierarchy.push("light");
    
    // Detecta padrões HTML tradicionais
    if (/h1|title.*1/gi.test(code)) hierarchy.push("h1");
    if (/h2|title.*2/gi.test(code)) hierarchy.push("h2");
    if (/h3|title.*3/gi.test(code)) hierarchy.push("h3");
    if (/subtitle|Subtitle/gi.test(code)) hierarchy.push("subtitle");
    if (/body|Body|paragraph|p>/gi.test(code)) hierarchy.push("body");
    
    return hierarchy;
  }

  /**
   * Extrai presets de texto do Figma baseado em múltiplas estratégias:
   * 1. Nomes explícitos (text-preset-3/regular)
   * 2. Propriedades CSS (font-size, font-weight, line-height)
   * 3. Contexto semântico (títulos, subtítulos, etc.)
   */
  private extractFigmaTextPresets(code: string): FigmaTextPreset[] {
    const presets: FigmaTextPreset[] = [];
    
    // Estratégia 1: Detecção por nome explícito
    presets.push(...this.detectPresetsByName(code));
    
    // Estratégia 2: Detecção por propriedades CSS
    presets.push(...this.detectPresetsByCSSProperties(code));
    
    // Estratégia 3: Detecção por contexto semântico
    presets.push(...this.detectPresetsBySemanticContext(code));
    
    // Remove duplicatas e ordena por confiança
    return this.consolidatePresets(presets);
  }

  private detectPresetsByName(code: string): FigmaTextPreset[] {
    const presets: FigmaTextPreset[] = [];
    
    // Padrão: text-preset-3/regular ou text-preset-3-regular
    const figmaPattern = /text-preset-(\d+)([\/\-])(\w+)/gi;
    let match;
    
    while ((match = figmaPattern.exec(code)) !== null) {
      const presetNumber = match[1];
      const variant = match[3];
      const originalName = match[0];
      
      presets.push({
        preset: `text${presetNumber}`,
        variant: variant,
        originalName: originalName,
        confidenceScore: 1.0, // Máxima confiança para nomes explícitos
      });
    }
    
    return presets;
  }

  private detectPresetsByCSSProperties(code: string): FigmaTextPreset[] {
    const presets: FigmaTextPreset[] = [];
    
    // Mapeamento baseado no design system Mística (valores típicos)
    const textPresetMapping = [
      { preset: 'text1', minFontSize: 28, maxFontSize: 40, weights: ['400', '500', '600', '700'] },
      { preset: 'text2', minFontSize: 20, maxFontSize: 28, weights: ['400', '500', '600'] },
      { preset: 'text3', minFontSize: 16, maxFontSize: 20, weights: ['400', '500', '600'] },
      { preset: 'text4', minFontSize: 14, maxFontSize: 16, weights: ['400', '500'] },
      { preset: 'text5', minFontSize: 12, maxFontSize: 14, weights: ['400', '500'] },
      { preset: 'text6', minFontSize: 10, maxFontSize: 12, weights: ['400'] },
    ];

    // Extrai valores de font-size do código (CSS e JSX)
    const fontSizePatterns = [
      /font-size:\s*(\d+)px/gi,                    // CSS: font-size: 16px
      /fontSize:\s*['"]?(\d+)px['"]?/gi,           // JSX: fontSize="16px"
      /fontSize:\s*\{(\d+)\}/gi,                   // JSX: fontSize={16}
      /fontSize=\{(\d+)\}/gi,                      // JSX: fontSize={16}
      /text-(\d+)|size-(\d+)/gi,                   // Classes: text-16, size-14
    ];

    const fontWeightPatterns = [
      /font-weight:\s*(\d+)/gi,                    // CSS: font-weight: 500
      /fontWeight:\s*['"]?(\d+)['"]?/gi,           // JSX: fontWeight="500"
      /fontWeight:\s*['"]?(normal|bold|medium|light)['"]?/gi,  // JSX: fontWeight="medium"
      /fontWeight=\{['"]?(\w+)['"]?\}/gi,          // JSX: fontWeight={"medium"}
    ];
    
    const detectedFonts: Array<{fontSize: number, weight?: string}> = [];
    
    // Processa todos os padrões de font-size
    fontSizePatterns.forEach(pattern => {
      let fontMatch;
      while ((fontMatch = pattern.exec(code)) !== null) {
        const fontSize = parseInt(fontMatch[1] || fontMatch[2]);
        if (fontSize && fontSize > 0) {
          detectedFonts.push({ fontSize });
        }
      }
    });

    // Processa font-weight se disponível
    fontWeightPatterns.forEach(pattern => {
      let weightMatch;
      while ((weightMatch = pattern.exec(code)) !== null) {
        const weight = weightMatch[1] || weightMatch[2];
        if (weight && detectedFonts.length > 0) {
          detectedFonts[detectedFonts.length - 1].weight = weight;
        }
      }
    });

    // Mapeia tamanhos de fonte para presets
    detectedFonts.forEach(font => {
      const matchingPreset = textPresetMapping.find(preset => 
        font.fontSize >= preset.minFontSize && font.fontSize <= preset.maxFontSize
      );
      
      if (matchingPreset) {
        const variant = this.guessVariantFromWeight(font.weight);
        presets.push({
          preset: matchingPreset.preset,
          variant: variant,
          originalName: `Detectado por CSS: ${font.fontSize}px${font.weight ? `, peso: ${font.weight}` : ''}`,
          fontSizeGuess: font.fontSize,
          confidenceScore: 0.7, // Boa confiança para detecção por CSS
        });
      }
    });
    
    return presets;
  }

  private detectPresetsBySemanticContext(code: string): FigmaTextPreset[] {
    const presets: FigmaTextPreset[] = [];
    
    // Analisa o contexto semântico dos textos
    const semanticRules = [
      { pattern: /<h1[\s\S]*?>|<title[\s\S]*?>|class.*title.*main/gi, preset: 'text1', confidence: 0.6 },
      { pattern: /<h2[\s\S]*?>|class.*subtitle|class.*heading-2/gi, preset: 'text2', confidence: 0.6 },
      { pattern: /<h3[\s\S]*?>|class.*heading-3|class.*section-title/gi, preset: 'text3', confidence: 0.5 },
      { pattern: /<p[\s\S]*?>|class.*body|class.*paragraph/gi, preset: 'text4', confidence: 0.4 },
      { pattern: /class.*caption|class.*small|class.*footnote/gi, preset: 'text5', confidence: 0.4 },
    ];

    semanticRules.forEach(rule => {
      if (rule.pattern.test(code)) {
        presets.push({
          preset: rule.preset,
          variant: 'regular',
          originalName: `Detectado por contexto semântico`,
          confidenceScore: rule.confidence,
        });
      }
    });
    
    return presets;
  }

  private guessVariantFromWeight(weight?: string): string {
    if (!weight) return 'regular';
    
    const weightMap: Record<string, string> = {
      '300': 'light',
      '400': 'regular',
      '500': 'medium',
      '600': 'medium',
      '700': 'bold',
      '800': 'bold',
      '900': 'bold',
      'normal': 'regular',
      'bold': 'bold',
      'medium': 'medium',
      'light': 'light',
    };
    
    return weightMap[weight] || 'regular';
  }

  private consolidatePresets(presets: FigmaTextPreset[]): FigmaTextPreset[] {
    // Remove duplicatas baseado na combinação preset + variant
    const uniqueMap = new Map<string, FigmaTextPreset>();
    
    presets.forEach(preset => {
      const key = `${preset.preset}-${preset.variant}`;
      const existing = uniqueMap.get(key);
      
      // Mantém o preset com maior confiança
      if (!existing || preset.confidenceScore > existing.confidenceScore) {
        uniqueMap.set(key, preset);
      }
    });
    
    // Retorna ordenado por confiança (maior primeiro)
    return Array.from(uniqueMap.values())
      .sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  private detectContainerTypes(code: string): string[] {
    const types = [];
    if (/Stack|stack/gi.test(code)) types.push("stack");
    if (/Box|box/gi.test(code)) types.push("box");
    if (/Grid|grid/gi.test(code)) types.push("grid");
    if (/Card|card/gi.test(code)) types.push("card");
    if (/Container|container/gi.test(code)) types.push("container");
    return types;
  }

  private analyzeListStructure(code: string): any {
    return {
      hasIcons: /icon|Icon/gi.test(code) && this.isListPattern(code),
      hasActions:
        /chevron|arrow|onPress/gi.test(code) && this.isListPattern(code),
      hasSubtitle: /subtitle|description/gi.test(code),
      isNested: this.hasNestedStructure(code) && this.isListPattern(code),
    };
  }

  private detectIconTypes(code: string): string[] {
    const types = [];
    if (/chevron|arrow/gi.test(code)) types.push("navigation");
    if (/check|tick|cross|x/gi.test(code)) types.push("status");
    if (/star|heart|bookmark/gi.test(code)) types.push("action");
    if (/info|warning|error|success/gi.test(code)) types.push("feedback");
    return types;
  }

  private detectInputTypes(code: string): string[] {
    const types = [];
    if (/email|Email/gi.test(code)) types.push("email");
    if (/password|Password/gi.test(code)) types.push("password");
    if (/number|Number|numeric/gi.test(code)) types.push("number");
    if (/search|Search/gi.test(code)) types.push("search");
    if (/date|Date|time|Time/gi.test(code)) types.push("date");
    if (/textarea|TextArea|multiline/gi.test(code)) types.push("textarea");
    return types;
  }

  private hasRepeatedElements(code: string): boolean {
    const repeatPatterns = [
      /(\w+)[\s\S]*?\1[\s\S]*?\1/gi,
      /map\s*\(/gi,
      /\.map\(/gi,
      /FlatList|ScrollView/gi,
      /forEach|for.*in|for.*of/gi,
    ];

    return repeatPatterns.some((pattern) => pattern.test(code));
  }

  private hasNestedStructure(code: string): boolean {
    const lines = code.split("\n");
    return lines.some((line) => (line.match(/^\s+/)?.[0]?.length || 0) > 8);
  }

  private isListPattern(code: string): boolean {
    return /\.map|FlatList|ScrollView|ListView|VirtualizedList/gi.test(code);
  }

  private detectButtonPositions(code: string): string[] {
    const positions: string[] = [];

    if (
      /footer.*button|button.*footer|bottom.*button|fixed.*bottom.*button/gi.test(
        code
      )
    ) {
      positions.push("footer");
    }

    if (
      /header.*button|button.*header|top.*button|navigation.*button/gi.test(
        code
      )
    ) {
      positions.push("header");
    }

    if (!positions.length || /inline.*button|content.*button/gi.test(code)) {
      positions.push("inline");
    }

    return positions;
  }

  private extractLayouts(code: string): LayoutElements {
    const hasFixedFooter =
      /fixed.*footer|footer.*fixed|sticky.*bottom|position.*fixed.*bottom/gi.test(
        code
      );
    const hasFixedHeader =
      /fixed.*header|header.*fixed|sticky.*top|position.*fixed.*top/gi.test(
        code
      );
    const hasModal = /modal|dialog|overlay|popup|sheet|bottomsheet/gi.test(
      code
    );
    const containsButtonInFooter =
      hasFixedFooter && /footer.*button|button.*footer/gi.test(code);

    let layoutType = "standard";
    if (hasFixedFooter && containsButtonInFooter)
      layoutType = "fixed-footer-with-button";
    else if (hasFixedFooter) layoutType = "fixed-footer";
    else if (hasFixedHeader) layoutType = "fixed-header";
    else if (hasModal) layoutType = "modal";

    return {
      found: hasFixedFooter || hasFixedHeader || hasModal,
      hasFixedFooter,
      hasFixedHeader,
      hasModal,
      layoutType,
      containsButtonInFooter,
    };
  }

  private extractSecurity(code: string): SecurityElements {
    const hasPinField = /pinfield|pin.*field|pin.*input|code.*input/gi.test(
      code
    );
    const hasCodeInput = /code.*input|verification.*code|otp|pin/gi.test(code);
    const hasOTPInput = /otp|one.*time.*password|verification.*code/gi.test(
      code
    );

    let securityLevel = "none";
    if (hasPinField || hasCodeInput) securityLevel = "medium";
    if (hasOTPInput) securityLevel = "high";

    return {
      found: hasPinField || hasCodeInput || hasOTPInput,
      hasPinField,
      hasCodeInput,
      hasOTPInput,
      securityLevel,
    };
  }

  private extractForms(code: string): FormElements {
    const hasValidation = /validation|error|validate|required|pattern/gi.test(
      code
    );
    const hasSubmitButton = /submit|send|save|continue|next|confirm/gi.test(
      code
    );

    const fieldTypes: string[] = [];
    if (/text.*input|textfield/gi.test(code)) fieldTypes.push("text");
    if (/email.*input|email.*field/gi.test(code)) fieldTypes.push("email");
    if (/password.*input|password.*field/gi.test(code))
      fieldTypes.push("password");
    if (/number.*input|numeric.*field/gi.test(code)) fieldTypes.push("number");
    if (/phone.*input|phone.*field/gi.test(code)) fieldTypes.push("phone");
    if (/pin.*input|pin.*field|code.*input/gi.test(code))
      fieldTypes.push("pin");

    let structure = "simple";
    if (fieldTypes.length > 3) structure = "complex";
    else if (fieldTypes.length > 1) structure = "multi-field";

    return {
      found: fieldTypes.length > 0 || hasSubmitButton,
      hasValidation,
      fieldTypes,
      hasSubmitButton,
      structure,
    };
  }

  private extractSpacing(code: string): SpacingElements {
    const spacingPatterns = [
      /padding[:\s]*[\w-]*\s*[:\s]*\s*(['"`]?)(\d+(?:\.\d+)?)(px|rem|em|%|pt|pc|in|cm|mm|ex|ch|vw|vh|vmin|vmax)\1/gi,
      /margin[:\s]*[\w-]*\s*[:\s]*\s*(['"`]?)(\d+(?:\.\d+)?)(px|rem|em|%|pt|pc|in|cm|mm|ex|ch|vw|vh|vmin|vmax)\1/gi,
      /gap[:\s]*\s*(['"`]?)(\d+(?:\.\d+)?)(px|rem|em|%|pt|pc|in|cm|mm|ex|ch|vw|vh|vmin|vmax)\1/gi,
      /space[:\s]*\s*(['"`]?)(\d+(?:\.\d+)?)(px|rem|em|%|pt|pc|in|cm|mm|ex|ch|vw|vh|vmin|vmax)\1/gi,
      /\b(\d+)(px|rem|em|%)\b/gi,
    ];

    const semanticPatterns = [
      /space[-_]?(xs|sm|md|lg|xl|2xl|3xl)/gi,
      /padding[-_]?(small|medium|large|extra)/gi,
      /margin[-_]?(small|medium|large|extra)/gi,
      /gap[-_]?(tight|normal|loose)/gi,
    ];

    const spacingTypes: string[] = [];
    const spacingValues: string[] = [];
    const detectedUnits: string[] = [];
    const semanticSpacing: string[] = [];

    let hasExplicitSpacing = false;

    if (/padding/gi.test(code)) {
      spacingTypes.push("padding");
      hasExplicitSpacing = true;
    }
    if (/margin/gi.test(code)) {
      spacingTypes.push("margin");
      hasExplicitSpacing = true;
    }
    if (/gap/gi.test(code)) {
      spacingTypes.push("gap");
      hasExplicitSpacing = true;
    }
    if (/space/gi.test(code)) {
      spacingTypes.push("space");
      hasExplicitSpacing = true;
    }

    spacingPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const value = match[2];
        const unit = match[3];

        if (value && unit) {
          spacingValues.push(`${value}${unit}`);
          if (!detectedUnits.includes(unit)) {
            detectedUnits.push(unit);
          }
          hasExplicitSpacing = true;
        }
      }
    });

    semanticPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const semantic = match[1];
        if (semantic && !semanticSpacing.includes(semantic)) {
          semanticSpacing.push(semantic);
        }
      }
    });

    const spacingPatterns_result: string[] = [];

    const uniqueValues = [...new Set(spacingValues)];
    if (uniqueValues.length === 1) {
      spacingPatterns_result.push("consistent");
    } else if (uniqueValues.length <= 3) {
      spacingPatterns_result.push("design-system");
    } else {
      spacingPatterns_result.push("mixed");
    }

    const commonDesignSystemValues = [
      "8px",
      "16px",
      "24px",
      "32px",
      "4px",
      "12px",
      "20px",
      "40px",
    ];
    const hasDesignSystemValues = spacingValues.some((value) =>
      commonDesignSystemValues.includes(value)
    );

    if (hasDesignSystemValues) {
      spacingPatterns_result.push("design-system-aligned");
    }

    return {
      found: hasExplicitSpacing,
      hasExplicitSpacing,
      spacingTypes: [...new Set(spacingTypes)],
      spacingValues: [...new Set(spacingValues)],
      spacingPatterns: spacingPatterns_result,
      detectedUnits: [...new Set(detectedUnits)],
      semanticSpacing: [...new Set(semanticSpacing)],
    };
  }

  /**
   * Detecta elementos de feedback (Error Screen, Success Screen, etc.)
   */
  private extractFeedback(code: string): FeedbackElements {
    const feedbackPatterns = [
      /error.*feedback.*screen|feedback.*error.*screen|error.*screen/gi,
      /success.*feedback.*screen|feedback.*success.*screen|success.*screen/gi,
      /info.*feedback.*screen|feedback.*info.*screen|info.*screen/gi,
      /warning.*feedback.*screen|feedback.*warning.*screen|warning.*screen/gi,
      /feedback.*screen|screen.*feedback/gi,
    ];

    const detectedNames = [];
    let feedbackType = "generic";
    
    // Detecta nomes específicos do Figma
    const figmaNames = this.extractFigmaComponentNames(code);
    const feedbackNames = figmaNames.filter(name => 
      /feedback|screen|error|success|info|warning/gi.test(name)
    );
    
    detectedNames.push(...feedbackNames);

    // Determina o tipo específico
    if (/error/gi.test(code)) feedbackType = "error";
    else if (/success/gi.test(code)) feedbackType = "success";
    else if (/info/gi.test(code)) feedbackType = "info";
    else if (/warning/gi.test(code)) feedbackType = "warning";

    const found = feedbackPatterns.some(pattern => pattern.test(code)) || feedbackNames.length > 0;
    const hasScreen = /screen/gi.test(code);
    const hasIcon = /icon|image.*error|image.*success|image.*info|image.*warning/gi.test(code);
    const hasActions = /button|action|retry|close|dismiss|ok/gi.test(code);

    return {
      found,
      type: feedbackType,
      hasScreen,
      hasIcon,
      hasActions,
      detectedNames,
    };
  }

  /**
   * Detecta componentes gerais do Figma com análise inteligente de nomes
   */
  private extractFigmaComponents(code: string): FigmaComponentElements {
    const detectedComponents: DetectedFigmaComponent[] = [];
    
    // Extrai nomes de componentes do código
    const componentNames = this.extractFigmaComponentNames(code);
    
    componentNames.forEach(originalName => {
      const analysis = this.analyzeFigmaComponentName(originalName);
      if (analysis) {
        detectedComponents.push(analysis);
      }
    });

    return {
      found: detectedComponents.length > 0,
      detectedComponents,
    };
  }

  /**
   * Extrai nomes de componentes de diferentes formatos do Figma
   */
  private extractFigmaComponentNames(code: string): string[] {
    const names: string[] = [];
    
    // Padrões para detectar nomes de componentes do Figma
    const patterns = [
      // data-name="Component Name"
      /data-name=["']([^"']+)["']/gi,
      // className contendo nomes de componentes
      /className=["']([^"']*(?:Screen|Feedback|Button|Card|Modal)[^"']*)["']/gi,
      // id contendo nomes de componentes  
      /id=["']([^"']*(?:Screen|Feedback|Button|Card|Modal)[^"']*)["']/gi,
      // Comentários do Figma
      /\/\*\s*([^*]*(?:Screen|Feedback|Button|Card|Modal)[^*]*)\s*\*\//gi,
      // Nomes em camelCase ou PascalCase
      /\b([A-Z][a-z]*(?:Screen|Feedback|Button|Card|Modal)[A-Z]?[a-z]*)\b/gi,
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const name = match[1]?.trim();
        if (name && name.length > 2) {
          names.push(name);
        }
      }
    });

    // Remove duplicatas
    return [...new Set(names)];
  }

  /**
   * Analisa um nome de componente do Figma e determina seu tipo
   */
  private analyzeFigmaComponentName(originalName: string): DetectedFigmaComponent | null {
    const normalizedName = this.normalizeComponentName(originalName);
    const variations = this.generateNameVariations(originalName);
    
    // Mapeamento de tipos baseado em padrões
    const typePatterns = [
      { pattern: /feedback.*screen|screen.*feedback|error.*screen|success.*screen/gi, type: 'feedback', confidence: 0.9 },
      { pattern: /button|btn/gi, type: 'button', confidence: 0.8 },
      { pattern: /card/gi, type: 'card', confidence: 0.7 },
      { pattern: /modal|dialog/gi, type: 'modal', confidence: 0.8 },
      { pattern: /text|title|heading/gi, type: 'text', confidence: 0.6 },
      { pattern: /navigation|nav|header/gi, type: 'navigation', confidence: 0.7 },
      { pattern: /input|field|form/gi, type: 'input', confidence: 0.7 },
    ];

    let componentType = 'unknown';
    let confidenceScore = 0.3;

    for (const typePattern of typePatterns) {
      if (typePattern.pattern.test(originalName)) {
        componentType = typePattern.type;
        confidenceScore = typePattern.confidence;
        break;
      }
    }

    if (componentType === 'unknown' && originalName.length < 3) {
      return null; // Ignora nomes muito curtos sem tipo identificado
    }

    return {
      originalName,
      normalizedName,
      componentType,
      confidenceScore,
      variations,
    };
  }

  /**
   * Normaliza nome do componente para formato padrão
   */
  private normalizeComponentName(name: string): string {
    return name
      .replace(/[\s-_]+/g, '') // Remove espaços, hífens, underscores
      .replace(/([a-z])([A-Z])/g, '$1$2') // Mantém camelCase
      .replace(/^./, str => str.toUpperCase()); // Primeira letra maiúscula
  }

  /**
   * Gera variações possíveis do nome do componente
   */
  private generateNameVariations(originalName: string): string[] {
    const variations: string[] = [originalName];
    
    // Variação sem espaços
    const noSpaces = originalName.replace(/\s+/g, '');
    if (noSpaces !== originalName) variations.push(noSpaces);
    
    // Variação camelCase
    const camelCase = originalName.replace(/\s+(.)/g, (_, char) => char.toUpperCase());
    if (camelCase !== originalName) variations.push(camelCase);
    
    // Variação PascalCase
    const pascalCase = originalName.replace(/(?:^|\s+)(.)/g, (_, char) => char.toUpperCase()).replace(/\s+/g, '');
    if (pascalCase !== originalName) variations.push(pascalCase);
    
    // Variação kebab-case
    const kebabCase = originalName.toLowerCase().replace(/\s+/g, '-');
    if (kebabCase !== originalName) variations.push(kebabCase);
    
    // Variação snake_case
    const snakeCase = originalName.toLowerCase().replace(/\s+/g, '_');
    if (snakeCase !== originalName) variations.push(snakeCase);
    
    return [...new Set(variations)];
  }
}
