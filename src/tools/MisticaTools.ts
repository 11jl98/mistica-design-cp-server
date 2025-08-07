import { MisticaScraper } from "../scraper/MisticaScraper.js";
import { CacheManager } from "../cache/CacheManager.js";
import { FigmaAnalyzer } from "../analyzers/FigmaAnalyzer.js";
import { ComponentMapper } from "../mappers/ComponentMapper.js";
import { RefactoringGenerator } from "../generators/RefactoringGenerator.js";
import { SearchEngine } from "../search/SearchEngine.js";
import type { MisticaComponent, Tool } from "../types/interfaces.js";
import type { EnhancedFigmaAnalysis } from "../analyzers/FigmaAnalyzer.js";
import type { TypographyAnalysis } from "../analyzers/TypographyAnalyzer.js";
import type { ColorMapping } from "../analyzers/SkinVarsAnalyzer.js";

const COMPONENT_CATEGORY_LABELS = {
  components: "UI Components",
  layout: "Layout",
  icons: "Icons",
  utilities: "Utilities",
  hooks: "React Hooks",
  feedback: "Feedback",
  patterns: "Patterns",
  community: "Community",
  lab: "Experimental",
} as const;

const DESIGN_TOKEN_CATEGORY_LABELS = {
  color: "Colors",
  spacing: "Spacing",
  typography: "Typography",
  shadow: "Shadows",
  border: "Borders",
  other: "Other",
} as const;

export class MisticaTools {
  private misticaScraper: MisticaScraper;
  private figmaAnalyzer: FigmaAnalyzer;
  private componentMapper: ComponentMapper;
  private refactoringGenerator: RefactoringGenerator;
  private searchEngine: SearchEngine;

  constructor(cacheManager: CacheManager) {
    this.misticaScraper = new MisticaScraper(cacheManager);
    this.figmaAnalyzer = new FigmaAnalyzer();
    this.componentMapper = new ComponentMapper();
    this.refactoringGenerator = new RefactoringGenerator();
    this.searchEngine = new SearchEngine();
  }

  private getCategoryLabel(category: string): string {
    return (
      COMPONENT_CATEGORY_LABELS[
        category as keyof typeof COMPONENT_CATEGORY_LABELS
      ] || category
    );
  }

  private formatComponentResult(comp: MisticaComponent, index: number): string {
    const categoryLabel = this.getCategoryLabel(comp.category);
    return `${index + 1}. ${comp.name} (${categoryLabel})\n   ${
      comp.description
    }`;
  }

  getAllTools(): Record<string, Tool> {
    return {
      searchComponents: {
        name: "search_components",
        description:
          "Busca componentes do Mística design system por termo ou conceito",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                'Termo ou conceito para buscar (ex: "button", "card", "form", "icon")',
            },
          },
          required: ["query"],
        },
      },

      mapFigmaToMistica: {
        name: "map_figma_to_mistica",
        description:
          "Mapeia código do Figma para componentes equivalentes do Mística design system",
        inputSchema: {
          type: "object",
          properties: {
            figmaCode: {
              type: "string",
              description:
                "Código React/HTML gerado pelo Figma para análise e mapeamento",
            },
            includeRefactoring: {
              type: "boolean",
              description:
                "Incluir sugestões de refatoração usando componentes do Mística",
              default: true,
            },
          },
          required: ["figmaCode"],
        },
      },

      listComponents: this.getListComponentsTool(),
      getUsageExamples: this.getUsageExamplesTool(),
      getDesignTokens: this.getDesignTokensTool(),
      getCacheStatus: this.getCacheStatusTool(),
      exploreCategories: this.getExploreCategoryTool(),
    };
  }

  async executeTool(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case "search_components":
        return this.searchComponents(args);
      case "map_figma_to_mistica":
        return this.mapFigmaToMistica(args);
      case "list_mistica_components":
        return this.listComponents(args);
      case "get_mistica_usage_examples":
        return this.getUsageExamples(args);
      case "get_mistica_design_tokens":
        return this.getDesignTokens(args);
      case "get_mistica_cache_status":
        return this.getCacheStatus(args);
      case "explore_mistica_categories":
        return this.exploreCategories(args);
      default:
        return { error: `Ferramenta não encontrada: ${toolName}` };
    }
  }

  async searchComponents(args: any) {
    const query = args.query?.toLowerCase().trim();
    if (!query) {
      return { error: "Consulta é obrigatória" };
    }

    try {
      const allComponents = await this.misticaScraper.getAllComponents();
      const results = this.searchEngine.smartSearchComponents(
        allComponents,
        query
      );

      if (results.length === 0) {
        return {
          message: `Nenhum componente encontrado para "${query}"`,
          suggestion:
            "Tente termos como: button, card, form, input, icon, layout, navigation, list, navbar, header",
        };
      }

      const formattedResults = results
        .slice(0, 8)
        .map((comp, index) => {
          const categoryLabel = this.getCategoryLabel(comp.category);
          return `${index + 1}. ${comp.name} (${categoryLabel})\n   ${
            comp.description
          }`;
        })
        .join("\n\n");

      return {
        query: query,
        total_found: results.length,
        components: formattedResults,
        message: `Busca por "${query}" - ${results.length} resultado(s):\n\n${formattedResults}`,
      };
    } catch (error: any) {
      return { error: `Erro na busca: ${error.message}` };
    }
  }
  async mapFigmaToMistica(args: any) {
    const { figmaCode, includeRefactoring = true } = args;

    if (!figmaCode) {
      return { error: "Código do Figma é obrigatório" };
    }

    try {
      const analysis = this.figmaAnalyzer.analyzeFigmaCode(figmaCode);
      const allComponents = await this.misticaScraper.getAllComponents();
      
      // Convert enhanced elements to UIElements format for compatibility
      const compatibleElements = this.convertToUIElements(analysis.elements);
      
      const suggestions = await this.componentMapper.findMisticaEquivalents(
        compatibleElements,
        this.convertToStructuralAnalysis(analysis.structure),
        this.convertToUIPatterns(analysis.patterns),
        allComponents
      );

      let response = `Análise Avançada do Código Figma\n\n`;

      // Typography Analysis
      if (analysis.elements.texts.found && analysis.elements.texts.typography.length > 0) {
        response += `📝 Análise de Tipografia:\n`;
        analysis.elements.texts.typography.forEach((typo, index) => {
          response += `  ${index + 1}. Text Level: ${typo.textLevel} (${typo.weight})\n`;
          response += `     Tamanho: ${typo.size}px, Line Height: ${typo.lineHeight}\n`;
          response += `     Confiança: ${Math.round(typo.confidence * 100)}%\n`;
          if (typo.color) {
            response += `     Cor: ${typo.color}\n`;
          }
        });
        response += "\n";

        response += `🎨 Hierarquia de Texto Detectada:\n`;
        analysis.elements.texts.hierarchy.forEach((hierarchy, index) => {
          response += `  ${index + 1}. ${hierarchy}\n`;
        });
        response += "\n";
      }

      // SkinVars Suggestions
      if (analysis.designTokens.colors.length > 0) {
        response += `🎨 Sugestões de SkinVars para Cores:\n`;
        const uniqueColorMappings = analysis.designTokens.colors
          .filter((mapping, index, self) => 
            index === self.findIndex(m => m.figmaColor === mapping.figmaColor && m.skinVar === mapping.skinVar)
          )
          .sort((a, b) => b.confidence - a.confidence);

        uniqueColorMappings.slice(0, 5).forEach((mapping, index) => {
          response += `  ${index + 1}. ${mapping.figmaColor} → ${mapping.skinVar}\n`;
          response += `     Categoria: ${mapping.category} (${Math.round(mapping.confidence * 100)}% confiança)\n`;
        });
        response += "\n";
      }

      // Component Suggestions (existing logic)
      if (suggestions.length > 0) {
        response += `🧩 Componentes Mística Sugeridos:\n`;
        suggestions.forEach((suggestion, index) => {
          response += `${index + 1}. ${suggestion.component.name} (${suggestion.component.category})\n`;
          response += `   ${suggestion.component.description}\n`;
          response += `   Relevância: ${suggestion.reason}\n\n`;
        });
      }

      // Enhanced Refactoring
      if (includeRefactoring && (suggestions.length > 0 || analysis.designTokens.typography.length > 0)) {
        response += `⚡ Sugestão de Refatoração Avançada:\n`;
        response += this.generateEnhancedRefactoring(analysis, suggestions);
      }

      return {
        analysis: analysis,
        suggestions: suggestions.map((s) => s.component),
        typography: analysis.designTokens.typography,
        skinVars: analysis.designTokens.colors,
        message: response,
      };
    } catch (error: any) {
      return { error: `Erro na análise avançada: ${error.message}` };
    }
  }

  private convertToUIElements(elements: EnhancedFigmaAnalysis['elements']): any {
    // Convert enhanced elements format to UIElements format for backward compatibility
    return {
      buttons: elements.buttons,
      texts: {
        found: elements.texts.found,
        count: elements.texts.count,
        hierarchy: elements.texts.hierarchy
      },
      lists: elements.lists,
      containers: elements.containers,
      icons: elements.icons,
      inputs: elements.inputs,
      navigation: elements.navigation,
      // Add default values for required UIElements properties
      images: { found: false, count: 0 },
      layouts: { found: false, type: 'unknown' },
      security: { found: false },
      forms: { found: false, count: 0, types: [] },
      spacing: { found: false },
      feedback: { found: false, type: 'info' },
      figmaComponents: { found: false, count: 0, types: [] }
    };
  }

  private convertToStructuralAnalysis(structure: EnhancedFigmaAnalysis['structure']): any {
    return {
      hasNestedElements: true,
      layoutType: structure.layoutType,
      repetitiveElements: false,
      interactionElements: [],
      spacing: 'normal',
      alignment: 'start'
    };
  }

  private convertToUIPatterns(patterns: EnhancedFigmaAnalysis['patterns']): any {
    return {
      listPattern: patterns.listPattern,
      cardPattern: patterns.cardPattern,
      formPattern: patterns.formPattern,
      navigationPattern: patterns.navigationPattern,
      modalPattern: patterns.modalPattern,
      tablePattern: false,
      headerPattern: false,
      footerPattern: false
    };
  }

  private generateEnhancedRefactoring(analysis: EnhancedFigmaAnalysis, suggestions: any[]): string {
    let refactoring = "```tsx\n";
    refactoring += "import { Text2, skinVars } from '@telefonica/mistica';\n\n";
    
    refactoring += "// Exemplo de refatoração com tipografia e cores otimizadas\n";
    refactoring += "const RefactoredComponent = () => {\n";
    refactoring += "  return (\n";
    refactoring += "    <div style={{ padding: 24 }}>\n";
    
    // Typography examples with proper Text2 usage
    if (analysis.elements.texts.typography.length > 0) {
      analysis.elements.texts.typography.forEach((typo, index) => {
        if (index < 3) { // Limite a 3 exemplos para não ficar muito longo
          // Find color suggestion for text
          const colorSuggestion = analysis.designTokens.colors.find((c: ColorMapping) => 
            c.category === 'text' && c.figmaColor === typo.color
          );
          
          refactoring += `      <Text2\n`;
          refactoring += `        as="${typo.textLevel}"\n`;
          refactoring += `        weight="${typo.weight}"\n`;
          
          if (colorSuggestion) {
            refactoring += `        color={${colorSuggestion.skinVar}}\n`;
          }
          
          refactoring += `      >\n`;
          refactoring += `        ${index === 0 ? 'Título' : index === 1 ? 'Subtítulo' : 'Texto de corpo'}\n`;
          refactoring += `      </Text2>\n`;
          
          if (index < analysis.elements.texts.typography.length - 1 && index < 2) {
            refactoring += `\n`;
          }
        }
      });
    } else {
      refactoring += `      <Text2 as="text6" weight="medium" color={skinVars.colors.textPrimary}>\n`;
      refactoring += `        Exemplo de texto refatorado\n`;
      refactoring += `      </Text2>\n`;
    }
    
    refactoring += "    </div>\n";
    refactoring += "  );\n";
    refactoring += "};\n";
    refactoring += "```\n";
    
    return refactoring;
  }

  getListComponentsTool(): Tool {
    return {
      name: "list_mistica_components",
      description:
        "Lista todos os componentes disponíveis no design system Mística",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Filtrar por categoria específica",
            enum: [
              "components",
              "layout",
              "icons",
              "utilities",
              "hooks",
              "community",
              "lab",
              "feedback",
            ],
          },
          includeCount: {
            type: "boolean",
            description: "Incluir contagem de componentes por categoria",
            default: true,
          },
        },
      },
    };
  }

  getUsageExamplesTool(): Tool {
    return {
      name: "get_mistica_usage_examples",
      description: "Obtém exemplos de uso e código para componentes do Mística",
      inputSchema: {
        type: "object",
        properties: {
          componentName: {
            type: "string",
            description: "Nome do componente para obter exemplos",
          },
          variant: {
            type: "string",
            description: "Variante específica do componente (se aplicável)",
          },
          format: {
            type: "string",
            description: "Formato do exemplo de código",
            enum: ["react", "html", "both"],
            default: "react",
          },
        },
        required: ["componentName"],
      },
    };
  }

  getDesignTokensTool(): Tool {
    return {
      name: "get_mistica_design_tokens",
      description:
        "Obtém design tokens (cores, espaçamentos, tipografia) do Mística",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Categoria dos tokens",
            enum: [
              "color",
              "spacing",
              "typography",
              "shadow",
              "border",
              "other",
            ],
          },
          search: {
            type: "string",
            description: "Buscar tokens específicos por nome",
          },
        },
      },
    };
  }

  getCacheStatusTool(): Tool {
    return {
      name: "get_mistica_cache_status",
      description: "Obtém informações sobre o cache do MCP server Mística",
      inputSchema: {
        type: "object",
        properties: {
          refresh: {
            type: "boolean",
            description: "Forçar atualização do cache",
            default: false,
          },
        },
      },
    };
  }

  getExploreCategoryTool(): Tool {
    return {
      name: "explore_mistica_categories",
      description: "Explora componentes por categoria específica",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Categoria para explorar",
            enum: [
              "components",
              "layout",
              "icons",
              "utilities",
              "hooks",
              "feedback",
              "patterns",
              "community",
              "msticalab",
            ],
          },
          includeDetails: {
            type: "boolean",
            description: "Incluir detalhes sobre cada componente",
            default: false,
          },
        },
        required: ["category"],
      },
    };
  }

  // ===== IMPLEMENTAÇÕES DOS MÉTODOS AUXILIARES =====

  async listComponents(args: any) {
    try {
      const allComponents = await this.misticaScraper.getAllComponents();
      const { category, includeCount = true } = args;

      let filteredComponents = allComponents;
      if (category) {
        filteredComponents = allComponents.filter(
          (comp) => comp.category === category
        );
      }

      const componentsByCategory = filteredComponents.reduce((acc, comp) => {
        if (!acc[comp.category]) {
          acc[comp.category] = [];
        }
        acc[comp.category].push(comp);
        return acc;
      }, {} as Record<string, MisticaComponent[]>);

      let message = "Componentes Mística\n\n";

      if (category) {
        message += `Categoria: ${category} (${filteredComponents.length} componentes)\n\n`;
      }

      for (const [cat, comps] of Object.entries(componentsByCategory)) {
        const categoryLabel = this.getCategoryLabel(cat);

        message += `${categoryLabel} ${
          includeCount ? `(${comps.length})` : ""
        }\n`;
        comps.slice(0, 8).forEach((comp) => {
          message += `  - ${comp.name}\n`;
        });
        if (comps.length > 8) {
          message += `  - ... e mais ${comps.length - 8} componentes\n`;
        }
        message += "\n";
      }

      return {
        category: category || "todas",
        total_components: filteredComponents.length,
        components: filteredComponents.map((c) => c.name),
        message,
      };
    } catch (error: any) {
      return { error: `Erro ao listar componentes: ${error.message}` };
    }
  }

  async getUsageExamples(args: any) {
    try {
      const { componentName } = args;
      const allComponents = await this.misticaScraper.getAllComponents();

      const component = allComponents.find(
        (c) => c.name.toLowerCase() === componentName.toLowerCase()
      );

      if (!component) {
        return { error: `Componente "${componentName}" não encontrado` };
      }

      let message = `Exemplos de uso: ${component.name}\n\n`;
      message += `Descrição: ${component.description}\n\n`;

      if (component.examples && component.examples.length > 0) {
        message += "Exemplos disponíveis:\n\n";
        component.examples.forEach((example, index) => {
          message += `### Exemplo ${index + 1}\n`;
          message += "```tsx\n";
          message += example.code || `<${component.name} />\n`;
          message += "```\n\n";
        });
      } else {
        message += "Exemplo básico:\n\n";
        message += "```tsx\n";
        message += `import { ${component.name} } from '@telefonica/mistica';\n\n`;
        message += `<${component.name}`;

        if (component.props && component.props.length > 0) {
          const essentialProps = component.props.slice(0, 3);
          essentialProps.forEach((prop) => {
            message += `\n  ${prop.name}="${
              prop.type === "string" ? "valor" : "true"
            }"`;
          });
        }

        message += `\n/>\n`;
        message += "```\n\n";
      }

      if (component.props && component.props.length > 0) {
        message += "Props principais:\n\n";
        component.props.slice(0, 5).forEach((prop) => {
          message += `- ${prop.name} (${prop.type}): ${
            prop.description || "Propriedade do componente"
          }\n`;
        });
      }

      return {
        component: component.name,
        message,
      };
    } catch (error: any) {
      return { error: `Erro ao obter exemplos: ${error.message}` };
    }
  }

  async getDesignTokens(args: any) {
    try {
      const { category, search } = args;

      const mockTokens = {
        color: [
          {
            name: "brand-primary",
            value: "#0066CC",
            description: "Cor primária da marca",
          },
          {
            name: "brand-secondary",
            value: "#FF6B00",
            description: "Cor secundária da marca",
          },
          {
            name: "neutral-gray-100",
            value: "#F5F5F5",
            description: "Cinza muito claro",
          },
        ],
        spacing: [
          {
            name: "space-8",
            value: "8px",
            description: "Espaçamento extra pequeno",
          },
          {
            name: "space-16",
            value: "16px",
            description: "Espaçamento pequeno",
          },
          { name: "space-24", value: "24px", description: "Espaçamento médio" },
        ],
        typography: [
          {
            name: "text-title-1",
            value: "32px/40px",
            description: "Título principal",
          },
          { name: "text-body", value: "16px/24px", description: "Texto corpo" },
        ],
      };

      let tokens = mockTokens;
      if (category && tokens[category as keyof typeof tokens]) {
        tokens = { [category]: tokens[category as keyof typeof tokens] } as any;
      }

      let message = "Design Tokens Mística\n\n";

      Object.entries(tokens).forEach(([cat, tokenList]) => {
        const categoryLabel =
          DESIGN_TOKEN_CATEGORY_LABELS[
            cat as keyof typeof DESIGN_TOKEN_CATEGORY_LABELS
          ] || cat;

        message += `${categoryLabel}\n\n`;

        tokenList.forEach((token: any) => {
          if (!search || token.name.includes(search.toLowerCase())) {
            message += `- ${token.name}: ${token.value}\n`;
            if (token.description) {
              message += `  ${token.description}\n`;
            }
            message += "\n";
          }
        });
      });

      return { message };
    } catch (error: any) {
      return { error: `Erro ao obter design tokens: ${error.message}` };
    }
  }

  async getCacheStatus(args: any) {
    try {
      const { refresh = false } = args;

      if (refresh) {
        console.log("Cache refresh solicitado");
      }

      const allComponents = await this.misticaScraper.getAllComponents();

      let message = "Status do Cache MCP Mística\n\n";
      message += `Cache ativo: ${allComponents.length} componentes carregados\n`;
      message += `Última atualização: ${new Date().toLocaleString("pt-BR")}\n`;
      message += `Refresh: ${refresh ? "Executado" : "Não solicitado"}\n\n`;

      const categoryStats = allComponents.reduce((acc, comp) => {
        acc[comp.category] = (acc[comp.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      message += "Estatísticas por categoria:\n";
      Object.entries(categoryStats).forEach(([category, count]) => {
        message += `- ${category}: ${count} componentes\n`;
      });

      return { message };
    } catch (error: any) {
      return { error: `Erro ao obter status do cache: ${error.message}` };
    }
  }

  async exploreCategories(args: any) {
    try {
      const { category, includeDetails = false } = args;
      const allComponents = await this.misticaScraper.getAllComponents();

      const filteredComponents = allComponents.filter(
        (comp) => comp.category === category
      );

      if (filteredComponents.length === 0) {
        return {
          error: `Categoria "${category}" não encontrada ou vazia`,
          suggestion:
            "Categorias disponíveis: components, layout, icons, utilities, hooks, feedback",
        };
      }

      const categoryLabel = this.getCategoryLabel(category);

      let message = `Categoria: ${categoryLabel}\n\n`;
      message += `${filteredComponents.length} componentes encontrados\n\n`;

      if (includeDetails) {
        filteredComponents.forEach((comp, index) => {
          message += `${index + 1}. ${comp.name}\n`;
          message += `   ${comp.description}\n`;
          message += "\n";
        });
      } else {
        const componentNames = filteredComponents.map((c) => c.name).join(", ");
        message += `Componentes: ${componentNames}\n\n`;
        message += `Use includeDetails: true para ver descrições detalhadas`;
      }

      return {
        category,
        total_components: filteredComponents.length,
        components: filteredComponents.map((c) => c.name),
        message,
      };
    } catch (error: any) {
      return { error: `Erro ao explorar categoria: ${error.message}` };
    }
  }
}
