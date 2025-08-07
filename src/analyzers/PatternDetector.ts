export interface UIPatterns {
  listPattern: boolean;
  cardPattern: boolean;
  formPattern: boolean;
  navigationPattern: boolean;
  modalPattern: boolean;
  tablePattern: boolean;
  headerPattern: boolean;
  footerPattern: boolean;
}

export interface StructuralAnalysis {
  hasNestedElements: boolean;
  layoutType: string;
  repetitiveElements: boolean;
  interactionElements: string[];
  spacing: string;
  alignment: string;
}

export class PatternDetector {
  detectVisualPatterns(code: string): UIPatterns {
    return {
      listPattern: this.isListPattern(code),
      cardPattern: this.isCardPattern(code),
      formPattern: this.isFormPattern(code),
      navigationPattern: this.isNavigationPattern(code),
      modalPattern: this.isModalPattern(code),
      tablePattern: this.isTablePattern(code),
      headerPattern: this.isHeaderPattern(code),
      footerPattern: this.isFooterPattern(code),
    };
  }

  analyzeStructure(code: string): StructuralAnalysis {
    return {
      hasNestedElements: this.hasNestedStructure(code),
      layoutType: this.detectLayoutType(code),
      repetitiveElements: this.findRepetitivePatterns(code),
      interactionElements: this.findInteractiveElements(code),
      spacing: this.analyzeSpacing(code),
      alignment: this.analyzeAlignment(code),
    };
  }

  calculateCodeComplexity(code: string): "low" | "medium" | "high" {
    const metrics = {
      elementCount: (code.match(/<\w+/g) || []).length,
      nestingLevel: Math.max(
        ...code
          .split("\n")
          .map((line) => (line.match(/^\s*/)?.[0]?.length || 0) / 2)
      ),
      propsCount: (code.match(/\w+=/g) || []).length,
    };

    const complexityScore =
      metrics.elementCount * 2 + metrics.nestingLevel + metrics.propsCount;

    if (complexityScore > 50) return "high";
    if (complexityScore > 20) return "medium";
    return "low";
  }

  private isListPattern(code: string): boolean {
    return this.hasRepeatedElements(code) && /Row|Item|List/gi.test(code);
  }

  private isCardPattern(code: string): boolean {
    return (
      /Card|card|container.*shadow|elevation/gi.test(code) ||
      (this.hasNestedStructure(code) && /padding|border/gi.test(code))
    );
  }

  private isFormPattern(code: string): boolean {
    const inputCount = (code.match(/input|field|textfield/gi) || []).length;
    return inputCount > 1 || /form|Form|submit/gi.test(code);
  }

  private isNavigationPattern(code: string): boolean {
    return /Navigation|Header|AppBar|nav.*bar/gi.test(code);
  }

  private isModalPattern(code: string): boolean {
    return /Modal|modal|Dialog|dialog|Sheet|sheet|Drawer|drawer|overlay/gi.test(
      code
    );
  }

  private isTablePattern(code: string): boolean {
    return (
      /table|Table|thead|tbody|tr|td|th/gi.test(code) ||
      (this.hasRepeatedElements(code) && /column|header/gi.test(code))
    );
  }

  private isHeaderPattern(code: string): boolean {
    return /header|Header|AppBar|Navigation.*title/gi.test(code);
  }

  private isFooterPattern(code: string): boolean {
    return /footer|Footer|bottom.*bar|tab.*bar/gi.test(code);
  }

  private hasNestedStructure(code: string): boolean {
    const lines = code.split("\n");
    return lines.some((line) => (line.match(/^\s+/)?.[0]?.length || 0) > 8);
  }

  private detectLayoutType(code: string): string {
    if (/flex.*column|flex-col|Stack.*vertical/gi.test(code)) return "vertical";
    if (/flex.*row|flex-row|horizontal/gi.test(code)) return "horizontal";
    if (/grid|Grid/gi.test(code)) return "grid";
    if (/absolute|fixed|relative/gi.test(code)) return "positioned";
    return "flow";
  }

  private findRepetitivePatterns(code: string): boolean {
    const elementTypes = code.match(/<\w+/g) || [];
    const counts = elementTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.values(counts).some((count) => count > 2);
  }

  private findInteractiveElements(code: string): string[] {
    const interactive = [];
    if (/onPress|onClick|press|tap/gi.test(code)) interactive.push("buttons");
    if (/scroll|swipe/gi.test(code)) interactive.push("scrollable");
    if (/input|field/gi.test(code)) interactive.push("forms");
    if (/modal|sheet|drawer/gi.test(code)) interactive.push("overlays");
    return interactive;
  }

  private analyzeSpacing(code: string): string {
    if (/gap|space.*\d+|margin.*\d+|padding.*\d+/gi.test(code))
      return "explicit";
    if (/flex.*gap|grid.*gap/gi.test(code)) return "flexible";
    return "implicit";
  }

  private analyzeAlignment(code: string): string {
    if (/center|justify-center|align-center/gi.test(code)) return "center";
    if (/start|left|justify-start/gi.test(code)) return "start";
    if (/end|right|justify-end/gi.test(code)) return "end";
    if (/between|around|evenly/gi.test(code)) return "distributed";
    return "default";
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
}
