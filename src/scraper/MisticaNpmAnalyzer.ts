import { promises as fs } from "fs";
import path from "path";
import type { MisticaComponent, ComponentProp } from "../types/mistica.js";
import { CacheManager } from "../cache/CacheManager.js";

export class MisticaNpmAnalyzer {
  private cache: CacheManager;
  private misticaPath: string;
  private distPath: string;
  private packageJsonPath: string;

  constructor(cacheManager: CacheManager) {
    this.cache = cacheManager;
    this.misticaPath = path.resolve(
      process.cwd(),
      "node_modules",
      "@telefonica",
      "mistica"
    );
    this.distPath = path.join(this.misticaPath, "dist");
    this.packageJsonPath = path.join(this.misticaPath, "package.json");
  }

  async getAllComponents(): Promise<MisticaComponent[]> {
    const cacheKey = "npm_components";

    const cached = await this.cache.get<MisticaComponent[]>(cacheKey);
    if (cached) {
      console.log(
        `📦 Cache hit: ${cached.length} componentes do npm carregados`
      );
      return cached;
    }

    console.log("🔍 Analisando pacote npm @telefonica/mistica...");

    try {
      await this.verifyPackageInstalled();

      const packageInfo = await this.getPackageInfo();
      console.log(`📋 Pacote Mística v${packageInfo.version} encontrado`);

      const exports = await this.analyzeMainExports();
      console.log(
        `📤 ${exports.length} exports encontrados no index principal`
      );

      const components = await this.buildComponentsFromExports(
        exports,
        packageInfo
      );

      const enrichedComponents = await this.enrichComponentsWithTypeInfo(
        components
      );

      await this.cache.set(cacheKey, enrichedComponents, 240);
      console.log(
        `✅ ${enrichedComponents.length} componentes extraídos do npm`
      );
      this.logComponentsByCategory(enrichedComponents);

      return enrichedComponents;
    } catch (error) {
      console.error("❌ Erro ao analisar pacote npm:", error);
      throw error;
    }
  }

  private async verifyPackageInstalled(): Promise<void> {
    try {
      await fs.access(this.misticaPath);
      await fs.access(this.packageJsonPath);
      await fs.access(this.distPath);
    } catch (error) {
      throw new Error(
        "Pacote @telefonica/mistica não encontrado. Execute: npm install @telefonica/mistica"
      );
    }
  }

  private async getPackageInfo(): Promise<any> {
    const content = await fs.readFile(this.packageJsonPath, "utf-8");
    return JSON.parse(content);
  }

  private async analyzeMainExports(): Promise<ExportInfo[]> {
    const indexPath = path.join(this.distPath, "index.d.ts");
    const content = await fs.readFile(indexPath, "utf-8");

    const exports: ExportInfo[] = [];
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
        continue;
      }

      const exportInfos = this.parseExportLine(trimmed);
      if (exportInfos.length > 0) {
        exports.push(...exportInfos);
      }
    }

    return exports;
  }

  private parseExportLine(line: string): ExportInfo[] {
    const results: ExportInfo[] = [];

    const defaultExportMatch = line.match(
      /export\s*\{\s*default\s+as\s+(\w+)\s*\}\s*from\s*['"](\.\/[\w-]+)['"]/
    );
    if (defaultExportMatch) {
      results.push({
        name: defaultExportMatch[1],
        type: "component",
        isDefault: true,
        source: defaultExportMatch[2],
        category: this.inferCategory(defaultExportMatch[1]),
      });
      return results;
    }

    const namedExportMatch = line.match(
      /export\s*\{\s*([^}]+)\s*\}\s*from\s*['"](\.\/[\w-]+)['"]/
    );
    if (namedExportMatch) {
      const names = namedExportMatch[1].split(",").map((n) => n.trim());
      for (const name of names) {
        if (name) {
          results.push({
            name: name,
            type: "component",
            isDefault: false,
            source: namedExportMatch[2],
            category: this.inferCategory(name),
          });
        }
      }
      return results;
    }

    const namespaceMatch = line.match(
      /export\s*\*\s*as\s+(\w+)\s*from\s*['"](\.\/[\w-]+)['"]/
    );
    if (namespaceMatch) {
      results.push({
        name: namespaceMatch[1],
        type: "utility",
        isDefault: false,
        source: namespaceMatch[2],
        category: "utilities",
      });
      return results;
    }

    const hookMatch = line.match(/export\s*\{\s*(use\w+)/);
    if (hookMatch) {
      results.push({
        name: hookMatch[1],
        type: "hook",
        isDefault: false,
        source: "",
        category: "hooks",
      });
      return results;
    }

    return results;
  }

  private inferCategory(componentName: string): string {
    const name = componentName.toLowerCase();

    if (name.startsWith("use")) {
      return "hooks";
    }

    if (
      name.includes("feedback") ||
      name.includes("screen") ||
      name.includes("empty") ||
      name.includes("loading") ||
      name.includes("error") ||
      name.includes("success") ||
      name.includes("info") ||
      name.includes("warning")
    ) {
      return "feedback";
    }

    if (
      name.includes("layout") ||
      name.includes("grid") ||
      name.includes("stack") ||
      name.includes("box") ||
      name.includes("container") ||
      name.includes("wrapper")
    ) {
      return "layout";
    }

    if (name.includes("icon") || name === "logo") {
      return "icons";
    }

    if (
      name.includes("theme") ||
      name.includes("context") ||
      name.includes("provider") ||
      name.includes("skin") ||
      name.includes("vars") ||
      name.includes("utility")
    ) {
      return "utilities";
    }

    return "components";
  }

  private async buildComponentsFromExports(
    exports: ExportInfo[],
    packageInfo: any
  ): Promise<MisticaComponent[]> {
    const components: MisticaComponent[] = [];

    for (const exportInfo of exports) {
      if (exportInfo.type === "component" || exportInfo.type === "hook") {
        const component: MisticaComponent = {
          id: `npm-${exportInfo.category}-${exportInfo.name.toLowerCase()}`,
          name: exportInfo.name,
          category: exportInfo.category,
          description: this.generateDescription(
            exportInfo.name,
            exportInfo.category
          ),
          props: [],
          examples: [],
          usage: "",
          variations: [],
          designTokens: [],
          storyUrl: `https://mistica-web.vercel.app/?path=/story/${
            exportInfo.category
          }-${exportInfo.name.toLowerCase()}--default`,
          lastUpdated: new Date(),
          figmaId: undefined,
          npmInfo: {
            package: "@telefonica/mistica",
            version: packageInfo.version,
            exportName: exportInfo.name,
            isDefault: exportInfo.isDefault,
            source: exportInfo.source,
          },
        };

        components.push(component);
      }
    }

    return components;
  }

  private async enrichComponentsWithTypeInfo(
    components: MisticaComponent[]
  ): Promise<MisticaComponent[]> {
    const enriched: MisticaComponent[] = [];

    for (const component of components) {
      try {
        const props = await this.extractPropsFromTypeFile(component);
        const enrichedComponent = {
          ...component,
          props: props,
        };
        enriched.push(enrichedComponent);
      } catch (error) {
        console.warn(`⚠️ Erro ao extrair props para ${component.name}:`, error);
        enriched.push(component);
      }
    }

    return enriched;
  }

  private async extractPropsFromTypeFile(
    component: MisticaComponent
  ): Promise<ComponentProp[]> {
    if (!component.npmInfo?.source) {
      return [];
    }

    try {
      const fileName =
        component.npmInfo.source.replace("./", "").replace(/\//g, "-") +
        ".d.ts";
      const typePath = path.join(this.distPath, fileName);

      try {
        await fs.access(typePath);
      } catch {
        const kebabName = component.name
          .replace(/([A-Z])/g, "-$1")
          .toLowerCase()
          .substring(1);
        const altTypePath = path.join(this.distPath, kebabName + ".d.ts");
        try {
          await fs.access(altTypePath);
          return await this.parseTypeDefinitions(altTypePath, component.name);
        } catch {
          return [];
        }
      }

      return await this.parseTypeDefinitions(typePath, component.name);
    } catch (error) {
      console.warn(
        `Erro ao ler arquivo de tipos para ${component.name}:`,
        error
      );
      return [];
    }
  }

  private async parseTypeDefinitions(
    filePath: string,
    componentName: string
  ): Promise<ComponentProp[]> {
    const content = await fs.readFile(filePath, "utf-8");
    const props: ComponentProp[] = [];

    const interfaceRegex = new RegExp(
      `interface\\s+${componentName}Props\\s*{([^}]+)}`,
      "g"
    );
    const typeRegex = new RegExp(
      `type\\s+${componentName}Props\\s*=\\s*{([^}]+)}`,
      "g"
    );

    let match = interfaceRegex.exec(content) || typeRegex.exec(content);

    if (match) {
      const propsBlock = match[1];
      const propLines = propsBlock.split("\n");

      for (const line of propLines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
          continue;
        }

        const propMatch = trimmed.match(/(\w+)(\?)?:\s*([^;]+);?/);
        if (propMatch) {
          const [, name, optional, type] = propMatch;
          props.push({
            name,
            type: type.trim(),
            description: `Propriedade ${name} do componente ${componentName}`,
            required: !optional,
            defaultValue: undefined,
          });
        }
      }
    }

    return props;
  }

  private generateDescription(componentName: string, category: string): string {
    const descriptions: Record<string, string> = {
      // Componentes principais
      Avatar: "Componente para exibir foto de perfil ou iniciais do usuário",
      Badge: "Indicador visual para notificações e status",
      Button: "Botão para ações primárias e secundárias",
      ButtonPrimary: "Botão principal para ações primárias",
      ButtonSecondary: "Botão secundário para ações auxiliares",
      ButtonDanger: "Botão para ações de risco ou destrutivas",
      Card: "Container para agrupar conteúdo relacionado",
      Checkbox: "Caixa de seleção para opções múltiplas",
      Counter: "Contador numérico para exibir quantidades",
      Divider: "Separador visual entre seções",
      Form: "Formulário para entrada e validação de dados",
      TextField: "Campo de texto com label e validação",
      Select: "Menu dropdown para seleção de opções",
      Modal: "Janela modal para conteúdo sobreposto",
      Popover: "Conteúdo flutuante contextual",
      ProgressBar: "Indicador de progresso visual",
      RadioButton: "Botão de seleção única",
      Snackbar: "Notificação temporária na parte inferior",
      Spinner: "Indicador de carregamento animado",
      Switch: "Interruptor para alternância de estados",
      Table: "Tabela para exibição de dados estruturados",
      Tabs: "Navegação por abas para organizar conteúdo",
      Tag: "Etiqueta para categorização e filtros",
      TextLink: "Link de texto com estilos consistentes",
      Tooltip: "Dica contextual que aparece ao passar o mouse",

      // Componentes de feedback e telas
      FeedbackScreen:
        "Tela de feedback para exibir estados de sucesso, erro ou informação",
      ErrorFeedbackScreen: "Tela específica para exibir mensagens de erro",
      InfoFeedbackScreen: "Tela para exibir informações importantes ao usuário",
      SuccessFeedbackScreen: "Tela de confirmação para ações bem-sucedidas",
      LoadingScreen: "Tela de carregamento com indicadores visuais",
      BrandLoadingScreen: "Tela de carregamento com elementos da marca",
      EmptyState: "Componente para estados vazios ou sem conteúdo",
      EmptyStateCard: "Card específico para exibir estados vazios",
      SuccessFeedback: "Componente de feedback para ações bem-sucedidas",

      // Layout
      Box: "Container básico para layout com propriedades de espaçamento",
      Stack: "Container para empilhamento vertical ou horizontal",
      Grid: "Sistema de grid responsivo para organização de conteúdo",
      GridLayout: "Layout em grid com responsividade",
      ResponsiveLayout: "Layout que se adapta a diferentes tamanhos de tela",

      // Hooks
      useTheme: "Hook para acessar e modificar tema atual",
      useScreenSize: "Hook para detectar tamanho da tela",
      useWindowSize: "Hook para obter dimensões da janela",
      useForm: "Hook para gerenciar estado de formulários",
      useSnackbar: "Hook para exibir notificações snackbar",
    };

    return (
      descriptions[componentName] ||
      `Componente ${componentName} do design system Mística (${category})`
    );
  }

  private logComponentsByCategory(components: MisticaComponent[]): void {
    const byCategory = components.reduce((acc, comp) => {
      acc[comp.category] = acc[comp.category] || [];
      acc[comp.category].push(comp);
      return acc;
    }, {} as Record<string, MisticaComponent[]>);

    console.log("\n📊 Componentes extraídos do npm por categoria:");
    for (const [category, comps] of Object.entries(byCategory)) {
      console.log(`  📁 ${category}: ${comps.length} componentes`);
      comps.forEach((comp) => {
        const npmInfo = comp.npmInfo ? ` (v${comp.npmInfo.version})` : "";
        console.log(`    - ${comp.name}${npmInfo}`);
      });
    }
    console.log("");
  }

  async searchComponents(query: string): Promise<MisticaComponent[]> {
    const allComponents = await this.getAllComponents();
    const lowercaseQuery = query.toLowerCase();

    return allComponents.filter(
      (component) =>
        component.name.toLowerCase().includes(lowercaseQuery) ||
        component.description.toLowerCase().includes(lowercaseQuery) ||
        component.category.toLowerCase().includes(lowercaseQuery)
    );
  }

  async getComponent(id: string): Promise<MisticaComponent | null> {
    const allComponents = await this.getAllComponents();
    return allComponents.find((component) => component.id === id) || null;
  }

  async getComponentsByCategory(category: string): Promise<MisticaComponent[]> {
    const allComponents = await this.getAllComponents();
    return allComponents.filter((component) => component.category === category);
  }
}

interface ExportInfo {
  name: string;
  type: "component" | "hook" | "utility" | "type";
  isDefault: boolean;
  source: string;
  category: string;
}
