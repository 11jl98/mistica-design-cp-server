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
    ];

    return {
      found: patterns.some((p) => p.test(code)),
      count: (code.match(/Text|title|heading|h\d|p>/gi) || []).length,
      hasFormatting: /bold|italic|font-size|color|weight/gi.test(code),
      hierarchy: this.detectTextHierarchy(code),
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
    if (/h1|title.*1|Title1|heading.*1/gi.test(code)) hierarchy.push("h1");
    if (/h2|title.*2|Title2|heading.*2/gi.test(code)) hierarchy.push("h2");
    if (/h3|title.*3|Title3|heading.*3/gi.test(code)) hierarchy.push("h3");
    if (/subtitle|Subtitle/gi.test(code)) hierarchy.push("subtitle");
    if (/body|Body|paragraph|p>/gi.test(code)) hierarchy.push("body");
    return hierarchy;
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
}
