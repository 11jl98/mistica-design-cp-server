import axios from "axios";
import * as cheerio from "cheerio";
import type { MisticaComponent, ScraperConfig } from "../types/mistica.js";
import { CacheManager } from "../cache/CacheManager.js";
import { MisticaNpmAnalyzer } from "./MisticaNpmAnalyzer.js";

export class MisticaScraper {
  private config: ScraperConfig;
  private cache: CacheManager;
  private npmAnalyzer: MisticaNpmAnalyzer;
  private baseUrl = "https://mistica-web.vercel.app";
  private storiesApiUrl = "https://mistica-web.vercel.app/stories.json";

  constructor(cacheManager: CacheManager) {
    this.cache = cacheManager;
    this.npmAnalyzer = new MisticaNpmAnalyzer(cacheManager);
    this.config = {
      baseUrl: this.baseUrl,
      cacheTimeout: 240,
      retryAttempts: 3,
      retryDelay: 1000,
    };
  }

  async getAllComponents(): Promise<MisticaComponent[]> {
    const cacheKey = "all_components_combined";

    const cached = await this.cache.get<MisticaComponent[]>(cacheKey);
    if (cached) {
      console.log(
        `📦 Cache hit: ${cached.length} componentes combinados carregados`
      );
      return cached;
    }

    console.log("🔍 Descobrindo componentes do Mística (npm + storybook)...");

    try {
      let components: MisticaComponent[] = [];

      try {
        console.log("📦 Tentando extrair componentes do pacote npm...");
        const npmComponents = await this.npmAnalyzer.getAllComponents();
        console.log(`✅ ${npmComponents.length} componentes extraídos do npm`);
        components = npmComponents;
      } catch (npmError) {
        console.warn("⚠️ Falha no analisador npm:", npmError);
      }

      try {
        console.log("📡 Complementando com dados do Storybook...");
        const storybookComponents = await this.scrapeFromStoriesApi();

        components = this.mergeComponentData(components, storybookComponents);
        console.log(
          `🔗 Dados mesclados: ${components.length} componentes finais`
        );
      } catch (storybookError) {
        console.warn("⚠️ Falha na API Storybook:", storybookError);
      }

      if (components.length === 0) {
        console.log("🔄 Usando fallback para componentes conhecidos...");
        components = await this.getExpandedKnownComponents();
      }

      const uniqueComponents = this.removeDuplicateComponents(components);
      await this.cache.set(
        cacheKey,
        uniqueComponents,
        this.config.cacheTimeout
      );

      console.log(
        `✅ ${uniqueComponents.length} componentes únicos descobertos`
      );
      this.logComponentsByCategory(uniqueComponents);

      return uniqueComponents;
    } catch (error) {
      console.error("❌ Erro ao descobrir componentes:", error);

      const fallbackComponents = await this.getExpandedKnownComponents();
      await this.cache.set(
        cacheKey,
        fallbackComponents,
        this.config.cacheTimeout
      );
      return fallbackComponents;
    }
  }

  private mergeComponentData(
    npmComponents: MisticaComponent[],
    storybookComponents: MisticaComponent[]
  ): MisticaComponent[] {
    const merged: MisticaComponent[] = [...npmComponents];

    const npmMap = new Map<string, MisticaComponent>();
    npmComponents.forEach((comp) => npmMap.set(comp.name.toLowerCase(), comp));

    for (const storybookComp of storybookComponents) {
      const npmComp = npmMap.get(storybookComp.name.toLowerCase());

      if (npmComp) {
        npmComp.examples = storybookComp.examples || [];
        if (storybookComp.storyUrl && !npmComp.storyUrl.includes("default")) {
          npmComp.storyUrl = storybookComp.storyUrl;
        }
      } else {
        merged.push(storybookComp);
      }
    }

    return merged;
  }

  private async scrapeFromStoriesApi(): Promise<MisticaComponent[]> {
    try {
      console.log("📡 Tentando API stories.json...");
      const response = await this.makeRequest(this.storiesApiUrl);

      const stories = response.data?.stories || {};
      const storyIds = Object.keys(stories);

      if (storyIds.length === 0) {
        console.log("⚠️ Nenhuma story encontrada na API");
        return [];
      }

      console.log(`📖 Processando ${storyIds.length} stories do Storybook...`);

      const components: MisticaComponent[] = [];

      for (const storyId of storyIds) {
        const story = stories[storyId];

        if (this.isValidComponentStory(storyId, story)) {
          const component = await this.parseStoryToComponent(storyId, story);
          if (component) {
            components.push(component);
          }
        }
      }

      console.log(`✅ ${components.length} componentes extraídos da API`);
      return components;
    } catch (error) {
      console.error("❌ Erro na API stories.json:", error);
      return [];
    }
  }

  private isValidComponentStory(storyId: string, story: any): boolean {
    const title = story.title || "";
    const name = story.name || "";

    const validCategories = [
      "Components/",
      "Layout/",
      "Icons/",
      "Utilities/",
      "Hooks/",
      "Community/",
      "Mística Lab/",
      "Patterns/",
    ];

    const isValidCategory = validCategories.some((cat) =>
      title.startsWith(cat)
    );

    const isFeedbackPattern =
      title.startsWith("Patterns/Feedback/") &&
      (name.includes("FeedbackScreen") ||
        name.includes("SuccessFeedback") ||
        name.includes("ErrorFeedback") ||
        name.includes("InfoFeedback") ||
        name.includes("WarningFeedback"));

    const isMainStory =
      name === "Default" ||
      name === "Primary" ||
      name === "Catalog" ||
      name.includes("Default") ||
      name.includes("Story") ||
      storyId.includes("--default") ||
      storyId.includes("--primary") ||
      (isFeedbackPattern &&
        (name.includes("ErrorFeedbackScreen") ||
          name.includes("SuccessFeedbackScreen") ||
          name.includes("InfoFeedbackScreen") ||
          name.includes("WarningFeedbackScreen") ||
          name.includes("FeedbackScreen") ||
          name === "SuccessFeedback" ||
          name === "ErrorFeedback"));

    const shouldInclude =
      isValidCategory &&
      (isMainStory || !name.includes("Doc") || isFeedbackPattern);

    if (shouldInclude) {
      console.log(`✓ Incluindo: ${title} - ${name} (${storyId})`);
    }

    return shouldInclude;
  }

  private async parseStoryToComponent(
    storyId: string,
    story: any
  ): Promise<MisticaComponent | null> {
    try {
      const title = story.title || "";
      const name = story.name || "";

      const titleParts = title.split("/");
      let category =
        titleParts[0]?.toLowerCase().replace(/[^a-z]/g, "") || "components";
      let componentName = titleParts[1] || name || "Unknown";

      if (title.startsWith("Patterns/Feedback/")) {
        category = "feedback";
        componentName = titleParts[2] || name || "Unknown";
      }

      const component: MisticaComponent = {
        id: storyId,
        name: componentName,
        category: category,
        description: this.generateDescription(componentName, category),
        storyUrl: `${this.baseUrl}/?path=/story/${storyId}`,
        props: [],
        examples: [],
        usage: "",
        variations: [],
        designTokens: [],
        lastUpdated: new Date(),
        figmaId: undefined,
      };

      return component;
    } catch (error) {
      console.error(`❌ Erro ao parsear story ${storyId}:`, error);
      return null;
    }
  }

  private async getExpandedKnownComponents(): Promise<MisticaComponent[]> {
    console.log("📋 Carregando componentes conhecidos...");

    const componentMap: Record<
      string,
      Array<{ name: string; description: string }>
    > = {
      components: [
        {
          name: "Avatar",
          description:
            "Componente para exibir foto de perfil ou iniciais do usuário",
        },
        {
          name: "Badge",
          description: "Indicador visual para notificações e status",
        },
        {
          name: "Breadcrumbs",
          description: "Navegação hierárquica para indicar localização atual",
        },
        {
          name: "Button",
          description: "Botão para ações primárias e secundárias",
        },
        {
          name: "Callout",
          description: "Destaque para informações importantes",
        },
        {
          name: "Card",
          description: "Container para agrupar conteúdo relacionado",
        },
        {
          name: "Checkbox",
          description: "Caixa de seleção para opções múltiplas",
        },
        {
          name: "Counter",
          description: "Contador numérico para exibir quantidades",
        },
        { name: "Divider", description: "Separador visual entre seções" },
        { name: "Input", description: "Campo de entrada de texto básico" },
        {
          name: "LoadingBar",
          description: "Barra de progresso para indicar carregamento",
        },
        { name: "Logo", description: "Logotipo da marca Telefónica" },
        { name: "Modal", description: "Janela modal para conteúdo sobreposto" },
        { name: "Popover", description: "Conteúdo flutuante contextual" },
        { name: "ProgressBar", description: "Indicador de progresso visual" },
        { name: "RadioButton", description: "Botão de seleção única" },
        { name: "Select", description: "Menu dropdown para seleção de opções" },
        {
          name: "Sheet",
          description: "Modal tipo sheet para formulários e seleções",
        },
        {
          name: "Snackbar",
          description: "Notificação temporária na parte inferior",
        },
        { name: "Spinner", description: "Indicador de carregamento animado" },
        {
          name: "StackingGroup",
          description: "Agrupamento visual de elementos empilhados",
        },
        { name: "Stepper", description: "Indicador de progresso em etapas" },
        {
          name: "Switch",
          description: "Interruptor para alternância de estados",
        },
        {
          name: "Table",
          description: "Tabela para exibição de dados estruturados",
        },
        {
          name: "Tabs",
          description: "Navegação por abas para organizar conteúdo",
        },
        { name: "Tag", description: "Etiqueta para categorização e filtros" },
        {
          name: "TextField",
          description: "Campo de texto com label e validação",
        },
        {
          name: "TextLink",
          description: "Link de texto com estilos consistentes",
        },
        {
          name: "Timeline",
          description: "Linha do tempo para eventos cronológicos",
        },
        {
          name: "Tooltip",
          description: "Dica contextual que aparece ao passar o mouse",
        },
      ],
      layout: [
        {
          name: "Align",
          description: "Utilitário para alinhamento de elementos",
        },
        {
          name: "Box",
          description:
            "Container básico para layout com propriedades de espaçamento",
        },
        {
          name: "ButtonLayout",
          description: "Layout especializado para organização de botões",
        },
        {
          name: "Grid",
          description:
            "Sistema de grid responsivo para organização de conteúdo",
        },
        {
          name: "HorizontalScroll",
          description: "Container com scroll horizontal",
        },
        {
          name: "MasterDetail",
          description: "Layout mestre-detalhe para navegação hierárquica",
        },
        {
          name: "Stack",
          description: "Container para empilhamento vertical ou horizontal",
        },
      ],
      utilities: [
        {
          name: "FixedToTop",
          description: "Utilitário para fixar elementos no topo",
        },
        {
          name: "OverscrollColor",
          description: "Configuração de cor para overscroll",
        },
        { name: "SkinVars", description: "Variáveis de tema e personalização" },
        { name: "Theme", description: "Configuração e controle de temas" },
      ],
      hooks: [
        {
          name: "useDocumentVisibility",
          description: "Hook para detectar visibilidade do documento",
        },
        {
          name: "useElementDimensions",
          description: "Hook para obter dimensões de elementos",
        },
        {
          name: "useIsInViewport",
          description: "Hook para detectar se elemento está na viewport",
        },
        {
          name: "useModalState",
          description: "Hook para gerenciar estado de modais",
        },
        {
          name: "useScreenSize",
          description: "Hook para detectar tamanho da tela",
        },
        {
          name: "useTheme",
          description: "Hook para acessar e modificar tema atual",
        },
        {
          name: "useWindowSize",
          description: "Hook para obter dimensões da janela",
        },
      ],
      icons: [
        {
          name: "Icon",
          description: "Catálogo completo de ícones do design system Mística",
        },
        {
          name: "IconCatalog",
          description: "Visualização de todos os ícones disponíveis",
        },
      ],
      community: [
        {
          name: "AdvancedDataCard",
          description: "Card avançado para exibição de dados complexos",
        },
        {
          name: "AdvancedDataCarousel",
          description: "Carrossel de cards de dados avançados",
        },
        {
          name: "ExampleComponent",
          description: "Componente de exemplo da comunidade",
        },
      ],
      lab: [
        {
          name: "Autocomplete",
          description: "Campo de texto com autocompletar experimental",
        },
      ],
    };

    const components: MisticaComponent[] = [];

    for (const [categoryName, componentList] of Object.entries(componentMap)) {
      for (const comp of componentList) {
        const component = await this.createComponentEntry(
          comp.name,
          categoryName,
          comp.description
        );
        if (component) {
          components.push(component);
        }
      }
    }

    console.log(`📦 ${components.length} componentes conhecidos carregados`);
    return components;
  }

  private async discoverAdditionalComponents(): Promise<MisticaComponent[]> {
    return [];
  }

  private removeDuplicateComponents(
    components: MisticaComponent[]
  ): MisticaComponent[] {
    const seen = new Set<string>();
    return components.filter((comp) => {
      const key = `${comp.category}-${comp.name.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private logComponentsByCategory(components: MisticaComponent[]): void {
    const byCategory = components.reduce((acc, comp) => {
      acc[comp.category] = acc[comp.category] || [];
      acc[comp.category].push(comp);
      return acc;
    }, {} as Record<string, MisticaComponent[]>);

    console.log("\n📊 Componentes por categoria:");
    for (const [category, comps] of Object.entries(byCategory)) {
      console.log(`  📁 ${category}: ${comps.length} componentes`);
      comps.forEach((comp) => {
        console.log(`    - ${comp.name}`);
      });
    }
    console.log("");
  }

  private async createComponentEntry(
    name: string,
    category: string,
    customDescription?: string
  ): Promise<MisticaComponent | null> {
    try {
      const id = this.generateComponentId(name, category);
      const storybookUrl = this.generateStorybookUrl(name, category);

      const componentData = await this.scrapeComponentDetails(storybookUrl);

      const component: MisticaComponent = {
        id,
        name,
        category,
        description:
          customDescription ||
          componentData?.description ||
          this.generateDescription(name, category),
        props: componentData?.props || [],
        examples: componentData?.examples || [],
        usage: componentData?.usage || "",
        variations: componentData?.variations || [],
        designTokens: componentData?.designTokens || [],
        storyUrl: storybookUrl,
        lastUpdated: new Date(),
        figmaId: undefined,
      };

      return component;
    } catch (error) {
      console.error(`Erro ao criar entrada para ${name}:`, error);
      return null;
    }
  }

  private generateDescription(componentName: string, category: string): string {
    const descriptions: Record<string, string> = {
      // Components
      Avatar: "Componente para exibir foto de perfil ou iniciais do usuário",
      Badge: "Indicador visual para notificações e status",
      Breadcrumbs: "Navegação hierárquica para indicar localização atual",
      Button: "Botão para ações primárias e secundárias",
      Callout: "Destaque para informações importantes",
      Card: "Container para agrupar conteúdo relacionado",
      Checkbox: "Caixa de seleção para opções múltiplas",
      Counter: "Contador numérico para exibir quantidades",
      Divider: "Separador visual entre seções",
      Input: "Campo de entrada de texto básico",
      LoadingBar: "Barra de progresso para indicar carregamento",
      Logo: "Logotipo da marca Telefónica",
      Modal: "Janela modal para conteúdo sobreposto",
      Popover: "Conteúdo flutuante contextual",
      ProgressBar: "Indicador de progresso visual",
      RadioButton: "Botão de seleção única",
      Select: "Menu dropdown para seleção de opções",
      Sheet: "Modal tipo sheet para formulários e seleções",
      Snackbar: "Notificação temporária na parte inferior",
      Spinner: "Indicador de carregamento animado",
      StackingGroup: "Agrupamento visual de elementos empilhados",
      Stepper: "Indicador de progresso em etapas",
      Switch: "Interruptor para alternância de estados",
      Table: "Tabela para exibição de dados estruturados",
      Tabs: "Navegação por abas para organizar conteúdo",
      Tag: "Etiqueta para categorização e filtros",
      TextField: "Campo de texto com label e validação",
      TextLink: "Link de texto com estilos consistentes",
      Timeline: "Linha do tempo para eventos cronológicos",
      Tooltip: "Dica contextual que aparece ao passar o mouse",

      // Componentes de Feedback (categoria específica)
      ErrorFeedbackScreen:
        "Tela de feedback para exibir mensagens de erro com ícone e ações",
      SuccessFeedbackScreen:
        "Tela de feedback para exibir mensagens de sucesso com ícone e ações",
      InfoFeedbackScreen:
        "Tela de feedback para exibir mensagens informativas com ícone e ações",
      WarningFeedbackScreen:
        "Tela de feedback para exibir mensagens de aviso com ícone e ações",
      FeedbackScreen:
        "Tela de feedback genérica para exibir mensagens com ícone e ações",
      SuccessFeedback:
        "Componente de feedback para indicar sucesso em operações",
      ErrorFeedback: "Componente de feedback para indicar erros em operações",
      InfoFeedback:
        "Componente de feedback para fornecer informações ao usuário",
      WarningFeedback: "Componente de feedback para alertas e avisos",

      // Layout
      Align: "Utilitário para alinhamento de elementos",
      Box: "Container básico para layout com propriedades de espaçamento",
      ButtonLayout: "Layout especializado para organização de botões",
      Grid: "Sistema de grid responsivo para organização de conteúdo",
      HorizontalScroll: "Container com scroll horizontal",
      MasterDetail: "Layout mestre-detalhe para navegação hierárquica",
      Stack: "Container para empilhamento vertical ou horizontal",

      // Icons
      Icon: "Catálogo completo de ícones do design system Mística",
      IconCatalog: "Visualização de todos os ícones disponíveis",
      Catalog:
        "Catálogo completo de ícones do design system Mística com busca e categorização",
      IconButton: "Botão com ícone para ações visuais",

      // Utilities
      FixedToTop: "Utilitário para fixar elementos no topo",
      OverscrollColor: "Configuração de cor para overscroll",
      SkinVars: "Variáveis de tema e personalização",
      Theme: "Configuração e controle de temas",

      // Hooks
      useDocumentVisibility: "Hook para detectar visibilidade do documento",
      useElementDimensions: "Hook para obter dimensões de elementos",
      useIsInViewport: "Hook para detectar se elemento está na viewport",
      useModalState: "Hook para gerenciar estado de modais",
      useScreenSize: "Hook para detectar tamanho da tela",
      useTheme: "Hook para acessar e modificar tema atual",
      useWindowSize: "Hook para obter dimensões da janela",
    };

    return (
      descriptions[componentName] ||
      `Componente ${componentName} do design system Mística (${category})`
    );
  }

  private async scrapeComponentDetails(url: string): Promise<any> {
    try {
      const response = await this.makeRequest(url);
      const $ = cheerio.load(response.data);

      const title = $("title").text();
      const description = $('meta[name="description"]').attr("content") || "";

      return {
        description,
        props: [],
        examples: [],
        usage: "",
        variations: [],
        designTokens: [],
      };
    } catch (error) {
      console.error("Erro ao extrair detalhes do componente:", error);
      return null;
    }
  }

  private generateComponentId(name: string, category: string): string {
    return `${category}-${name.toLowerCase().replace(/\s+/g, "-")}`;
  }

  private generateStorybookUrl(name: string, category: string): string {
    const path = name.toLowerCase().replace(/\s+/g, "");
    return `${this.baseUrl}/?path=/story/${category}-${path}--default`;
  }

  private async makeRequest(url: string, retries = 0): Promise<any> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          "User-Agent": "Mistica-MCP-Server/1.0",
        },
      });
      return response;
    } catch (error) {
      if (retries < this.config.retryAttempts) {
        await this.delay(this.config.retryDelay * (retries + 1));
        return this.makeRequest(url, retries + 1);
      }
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
