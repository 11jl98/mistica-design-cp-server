import type { MisticaComponent } from "../types/interfaces.js";

export class SearchEngine {
  smartSearchComponents(
    components: MisticaComponent[],
    query: string
  ): MisticaComponent[] {
    if (!query || query.trim() === "") {
      return components;
    }

    const normalizedQuery = query.toLowerCase().trim();

    const searchTerms = this.extractSearchTerms(normalizedQuery);
    const contextualKeywords = this.extractContextualKeywords(normalizedQuery);

    const scoredComponents = components
      .map((component) => ({
        component,
        score: this.calculateRelevanceScore(
          component,
          normalizedQuery,
          searchTerms,
          contextualKeywords
        ),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.component);

    return scoredComponents;
  }

  private extractSearchTerms(query: string): string[] {
    const terms = query.split(/[\s\-_]+/).filter((term) => term.length > 1);
    return [...new Set([query, ...terms])];
  }

  private extractContextualKeywords(query: string): string[] {
    const keywords: string[] = [];

    if (query.includes("fixed") || query.includes("footer"))
      keywords.push("layout", "footer", "fixed");
    if (query.includes("header"))
      keywords.push("layout", "header", "navigation");
    if (query.includes("modal")) keywords.push("overlay", "dialog", "popup");
    if (query.includes("card")) keywords.push("container", "content", "card");
    if (query.includes("form"))
      keywords.push("input", "field", "form", "validation");
    if (query.includes("list")) keywords.push("list", "item", "collection");
    if (query.includes("button"))
      keywords.push("action", "click", "interactive");
    if (query.includes("input") || query.includes("field"))
      keywords.push("form", "data", "entry");
    if (
      query.includes("pin") ||
      query.includes("security") ||
      query.includes("code")
    )
      keywords.push("security", "authentication", "input");

    return keywords;
  }

  private calculateRelevanceScore(
    component: MisticaComponent,
    originalQuery: string,
    searchTerms: string[],
    contextualKeywords: string[]
  ): number {
    let score = 0;
    const name = component.name.toLowerCase();
    const category = component.category.toLowerCase();
    const description = component.description.toLowerCase();

    if (name === originalQuery) return 100;

    for (const term of searchTerms) {
      if (name === term) score += 90;
      if (name.includes(term)) {
        if (name.startsWith(term)) score += 80;
        else if (name.endsWith(term)) score += 70;
        else score += 60;
      }
    }

    const termMappings = this.getExpandedTermMappings();
    for (const term of searchTerms) {
      const mappedTerms = termMappings[term] || [];
      for (const mappedTerm of mappedTerms) {
        if (name.includes(mappedTerm)) score += 50;
        if (description.includes(mappedTerm)) score += 30;
      }
    }

    for (const keyword of contextualKeywords) {
      if (name.includes(keyword)) score += 40;
      if (description.includes(keyword)) score += 25;
      if (category.includes(keyword)) score += 20;
    }

    for (const term of searchTerms) {
      if (
        category === term ||
        category === term + "s" ||
        term === category + "s"
      ) {
        score += 35;
      }
    }

    score += this.getFunctionalityScore(component, originalQuery, searchTerms);

    return score;
  }

  private getFunctionalityScore(
    component: MisticaComponent,
    originalQuery: string,
    searchTerms: string[]
  ): number {
    const name = component.name.toLowerCase();
    const description = component.description.toLowerCase();
    let functionalScore = 0;

    for (const term of [...searchTerms, originalQuery]) {
      switch (term) {
        case "pinfield":
        case "pin field":
        case "pin code":
        case "security":
          if (
            name.includes("pin") ||
            name.includes("code") ||
            name.includes("security")
          ) {
            functionalScore += 60;
          }
          if (
            description.includes("código") ||
            description.includes("pin") ||
            description.includes("segurança")
          ) {
            functionalScore += 40;
          }
          break;

        case "fixed footer":
        case "footer layout":
        case "button fixed footer":
          if (
            name.includes("footer") ||
            name.includes("layout") ||
            name.includes("fixed")
          ) {
            functionalScore += 60;
          }
          if (
            description.includes("footer") ||
            description.includes("rodapé") ||
            description.includes("fixo")
          ) {
            functionalScore += 40;
          }
          break;

        case "input":
        case "field":
          if (
            name.includes("input") ||
            name.includes("field") ||
            name.includes("textfield")
          ) {
            functionalScore += 50;
          }
          break;

        case "text":
        case "label":
          if (
            name.includes("text") ||
            name.includes("label") ||
            name.includes("title")
          ) {
            functionalScore += 45;
          }
          break;
      }
    }

    return functionalScore;
  }

  private getExpandedTermMappings(): { [key: string]: string[] } {
    return {
      // Componentes de entrada/formulário
      pin: ["pinfield", "code", "security", "input", "verification"],
      pinfield: ["pin", "code", "security", "otp", "verification"],
      field: ["textfield", "input", "form", "entry"],
      input: ["textfield", "field", "entry", "form"],
      code: ["pin", "otp", "verification", "security"],
      security: ["pin", "otp", "verification", "authentication"],

      // Layout e estrutura
      footer: ["layout", "fixed", "bottom", "sticky"],
      header: ["layout", "top", "navigation", "navbar"],
      fixed: ["footer", "header", "layout", "sticky"],
      layout: ["grid", "stack", "box", "container", "wrapper"],
      modal: ["dialog", "popup", "overlay", "sheet"],

      // Componentes de ação
      button: ["action", "click", "primary", "secondary", "cta"],
      primary: ["button", "main", "action"],
      secondary: ["button", "auxiliary", "action"],

      // Navegação
      navigation: ["navbar", "menu", "tabs", "breadcrumb"],
      navbar: ["navigation", "menu", "header"],
      menu: ["navigation", "dropdown", "list"],

      // Conteúdo
      card: ["container", "content", "box"],
      list: ["item", "collection", "menu"],
      text: ["label", "title", "heading", "paragraph"],
      icon: ["symbol", "graphic", "visual"],

      // Feedback
      loading: ["spinner", "progress", "wait"],
      error: ["feedback", "alert", "warning"],
      success: ["feedback", "confirmation", "check"],

      // Formulário
      form: ["input", "field", "validation", "submit"],
      validation: ["error", "check", "verify"],
      submit: ["button", "action", "send"],

      // Dados
      table: ["data", "grid", "list", "row"],
      chart: ["graph", "visualization", "data"],

      // Específicos do Mística
      mistica: ["telefonica", "brand", "design", "system"],
      telefonica: ["mistica", "brand", "company"],
    };
  }

  /**
   * Busca por categoria com melhor matching
   */
  searchByCategory(
    components: MisticaComponent[],
    category: string
  ): MisticaComponent[] {
    const normalizedCategory = category.toLowerCase();
    return components.filter(
      (comp) =>
        comp.category.toLowerCase() === normalizedCategory ||
        comp.category.toLowerCase() === normalizedCategory + "s" ||
        normalizedCategory === comp.category.toLowerCase() + "s"
    );
  }

  searchMultipleTerms(
    components: MisticaComponent[],
    terms: string[]
  ): MisticaComponent[] {
    const allResults = new Map<
      string,
      { component: MisticaComponent; totalScore: number }
    >();

    for (const term of terms) {
      const results = this.smartSearchComponents(components, term);
      results.forEach((comp, index) => {
        const scoreBonus = Math.max(0, 50 - index * 5);
        const existing = allResults.get(comp.name);
        if (existing) {
          existing.totalScore += scoreBonus;
        } else {
          allResults.set(comp.name, {
            component: comp,
            totalScore: scoreBonus,
          });
        }
      });
    }

    return Array.from(allResults.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((item) => item.component);
  }
}
