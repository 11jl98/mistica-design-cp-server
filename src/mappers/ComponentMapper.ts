import type { MisticaComponent } from '../types/interfaces.js';
import type { UIElements } from '../analyzers/ElementExtractor.js';
import type { UIPatterns, StructuralAnalysis } from '../analyzers/PatternDetector.js';

/**
 * 🗺️ ComponentMapper - Mapeia elementos UI para componentes Mística
 * 
 * Responsabilidade: Criar mapeamentos inteligentes entre elementos
 * detectados no Figma e componentes equivalentes do Mística
 */

export interface ComponentSuggestion {
  component: MisticaComponent;
  reason: string;
  score: number;
}

export interface ElementMapping {
  detected: boolean;
  misticaComponents: string[];
  reason: string;
  priority: number;
}

export interface ElementMappings {
  buttons: ElementMapping;
  texts: ElementMapping;
  lists: ElementMapping;
  containers: ElementMapping;
  icons: ElementMapping;
  inputs: ElementMapping;
  navigation: ElementMapping;
}

export class ComponentMapper {
  /**
   * Encontra componentes equivalentes no Mística baseado na análise APRIMORADA
   */
  async findMisticaEquivalents(
    elements: UIElements,
    structure: StructuralAnalysis,
    patterns: UIPatterns,
    allComponents: MisticaComponent[]
  ): Promise<ComponentSuggestion[]> {
    const suggestions: ComponentSuggestion[] = [];

    // === DETECÇÃO ESPECÍFICA DE PADRÕES DO FIGMA ===
    
    // 1. Button Fixed Footer Layout - caso específico identificado
    if (elements.layouts?.hasFixedFooter && elements.layouts?.containsButtonInFooter) {
      const footerLayoutComponents = this.findComponentsByPattern(allComponents, ['layout', 'footer', 'fixed', 'button']);
      footerLayoutComponents.forEach(comp => {
        suggestions.push({
          component: comp,
          reason: 'Componente para layout com botão fixo no footer (Button Fixed Footer Layout)',
          score: 95
        });
      });
    }

    // 2. PinField - componente específico de segurança
    if (elements.security?.hasPinField || elements.security?.hasCodeInput) {
      const pinFieldComponents = this.findComponentsByPattern(allComponents, ['pin', 'code', 'security', 'otp', 'verification']);
      pinFieldComponents.forEach(comp => {
        suggestions.push({
          component: comp,
          reason: 'Componente para entrada de código PIN/segurança',
          score: 90
        });
      });
    }

    // 3. Análise tradicional de elementos
    const elementMappings = this.createElementMappings(elements, structure, patterns);
    
    // Mapear cada elemento detectado para componentes Mística
    Object.entries(elementMappings).forEach(([elementType, mapping]: [string, ElementMapping]) => {
      if (mapping.detected) {
        mapping.misticaComponents.forEach((componentName: string) => {
          const component = allComponents.find(c => 
            c.name.toLowerCase() === componentName.toLowerCase()
          );
          
          if (component) {
            const score = this.calculateIntelligentScore(
              elementType, 
              component, 
              { elements, structure, patterns },
              mapping
            );
            
            suggestions.push({
              component,
              reason: mapping.reason,
              score
            });
          }
        });
      }
    });

    // Adicionar sugestões baseadas em padrões detectados
    const patternSuggestions = this.getPatternBasedSuggestions(patterns, allComponents);
    suggestions.push(...patternSuggestions);

    // Remover duplicatas e ordenar por score
    const uniqueSuggestions = suggestions
      .filter((suggestion, index, self) => 
        index === self.findIndex(s => s.component.name === suggestion.component.name)
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return uniqueSuggestions;
  }

  /**
   * Cria mapeamentos inteligentes baseados nos elementos detectados
   */
  private createElementMappings(
    elements: UIElements,
    structure: StructuralAnalysis,
    patterns: UIPatterns
  ): ElementMappings {
    return {
      // Botões
      buttons: {
        detected: elements.buttons.found,
        misticaComponents: this.getButtonComponents(elements.buttons),
        reason: this.getButtonReason(elements.buttons),
        priority: elements.buttons.hasActions ? 90 : 70
      },

      // Textos e Tipografia
      texts: {
        detected: elements.texts.found,
        misticaComponents: this.getTextComponents(elements.texts),
        reason: this.getTextReason(elements.texts),
        priority: 60
      },

      // Listas
      lists: {
        detected: elements.lists.found,
        misticaComponents: this.getListComponents(elements.lists, structure),
        reason: this.getListReason(elements.lists, structure),
        priority: elements.lists.hasNavigation ? 95 : 80
      },

      // Containers e Layout
      containers: {
        detected: elements.containers.found,
        misticaComponents: this.getContainerComponents(elements.containers, structure, elements.spacing),
        reason: this.getContainerReason(elements.containers, structure, elements.spacing),
        priority: 50
      },

      // Ícones
      icons: {
        detected: elements.icons.found,
        misticaComponents: this.getIconComponents(elements.icons),
        reason: this.getIconReason(elements.icons),
        priority: elements.icons.hasInteraction ? 75 : 40
      },

      // Inputs e Formulários
      inputs: {
        detected: elements.inputs.found,
        misticaComponents: this.getInputComponents(elements.inputs),
        reason: this.getInputReason(elements.inputs),
        priority: elements.inputs.hasValidation ? 85 : 70
      },

      // Navegação
      navigation: {
        detected: elements.navigation.found,
        misticaComponents: this.getNavigationComponents(elements.navigation),
        reason: this.getNavigationReason(elements.navigation),
        priority: 90
      }
    };
  }

  /**
   * Calcula score inteligente baseado no contexto e relevância
   */
  private calculateIntelligentScore(
    elementType: string, 
    component: MisticaComponent, 
    analysis: any, 
    mapping: ElementMapping
  ): number {
    let score = mapping.priority || 50;

    // Boost por correspondência de nome
    const componentName = component.name.toLowerCase();
    if (componentName.includes(elementType)) score += 30;

    // Boost por categoria relevante
    const categoryBoosts = {
      'components': 25,
      'layout': 20,
      'icons': 15,
      'utilities': 10,
      'hooks': 5
    };
    score += categoryBoosts[component.category as keyof typeof categoryBoosts] || 0;

    // === NOVO: Análise de espaçamento ===
    if (analysis.elements.spacing?.found) {
      // Boost para componentes de layout que respeitam design system
      if (analysis.elements.spacing.spacingPatterns.includes('design-system-aligned')) {
        if (component.category === 'layout' || componentName.includes('stack') || componentName.includes('box')) {
          score += 25; // Componentes de layout compatíveis com design system
        }
      }

      // Boost para componentes que usam espaçamento consistente
      if (analysis.elements.spacing.spacingPatterns.includes('consistent')) {
        score += 15;
      }

      // Boost específico para componentes que lidam com espaçamento
      const spacingComponents = ['stack', 'box', 'container', 'grid', 'flex'];
      if (spacingComponents.some(type => componentName.includes(type))) {
        score += 20;
      }

      // Penalização para espaçamento inconsistente em componentes críticos
      if (analysis.elements.spacing.spacingPatterns.includes('mixed') && 
          (elementType === 'layout' || elementType === 'containers')) {
        score -= 10;
      }
    }

    // Boost por complexidade matching
    const complexity = this.inferComplexity(analysis);
    const complexityBoosts = {
      'high': complexity === 'high' ? 20 : -10,
      'medium': complexity === 'medium' ? 15 : 0,
      'low': complexity === 'low' ? 10 : 5
    };
    score += complexityBoosts[complexity as keyof typeof complexityBoosts] || 0;

    // Penalizações por incompatibilidade
    if (elementType === 'lists' && !componentName.includes('list') && !componentName.includes('row')) {
      score -= 20;
    }
    
    if (elementType === 'buttons' && !componentName.includes('button') && !componentName.includes('touchable')) {
      score -= 15;
    }

    return Math.max(score, 0);
  }

  /**
   * Gera sugestões baseadas em padrões visuais detectados
   */
  private getPatternBasedSuggestions(patterns: UIPatterns, allComponents: MisticaComponent[]): ComponentSuggestion[] {
    const suggestions: ComponentSuggestion[] = [];

    // Padrão de Lista
    if (patterns.listPattern) {
      const listComponents = ['BoxedRowList', 'RowList', 'BoxedRow'];
      listComponents.forEach(name => {
        const component = allComponents.find(c => c.name === name);
        if (component) {
          suggestions.push({
            component,
            reason: 'Detectado padrão de lista com elementos repetitivos',
            score: 85
          });
        }
      });
    }

    // Padrão de Card
    if (patterns.cardPattern) {
      const cardComponents = ['DataCard', 'MediaCard', 'HighlightedCard', 'BoxedRow'];
      cardComponents.forEach(name => {
        const component = allComponents.find(c => c.name === name);
        if (component) {
          suggestions.push({
            component,
            reason: 'Detectado padrão de card com container estruturado',
            score: 80
          });
        }
      });
    }

    // Padrão de Formulário
    if (patterns.formPattern) {
      const formComponents = ['Form', 'TextField', 'EmailField', 'PasswordField'];
      formComponents.forEach(name => {
        const component = allComponents.find(c => c.name === name);
        if (component) {
          suggestions.push({
            component,
            reason: 'Detectado padrão de formulário com múltiplos inputs',
            score: 85
          });
        }
      });
    }

    // Padrão de Navegação
    if (patterns.navigationPattern) {
      const navComponents = ['NavigationBar', 'Header', 'NavigationBreadcrumbs'];
      navComponents.forEach(name => {
        const component = allComponents.find(c => c.name === name);
        if (component) {
          suggestions.push({
            component,
            reason: 'Detectado padrão de navegação com cabeçalho',
            score: 90
          });
        }
      });
    }

    // Padrão de Modal
    if (patterns.modalPattern) {
      const modalComponents = ['ActionsSheet', 'Drawer', 'InfoSheet'];
      modalComponents.forEach(name => {
        const component = allComponents.find(c => c.name === name);
        if (component) {
          suggestions.push({
            component,
            reason: 'Detectado padrão de modal ou overlay',
            score: 85
          });
        }
      });
    }

    return suggestions;
  }

  // ===== MÉTODOS DE MAPEAMENTO DE COMPONENTES =====

  private getButtonComponents(buttons: any): string[] {
    const components = [];
    
    if (buttons.hasActions) {
      components.push('ButtonPrimary', 'ButtonSecondary', 'Touchable');
    }
    
    if (buttons.variants.includes('icon')) {
      components.push('IconButton');
    }
    
    if (buttons.variants.includes('link')) {
      components.push('TextLink');
    }
    
    if (buttons.variants.includes('danger')) {
      components.push('ButtonDanger');
    }
    
    return components.length > 0 ? components : ['ButtonPrimary', 'Touchable'];
  }

  private getButtonReason(buttons: any): string {
    if (buttons.hasActions) {
      return 'Para elementos interativos com ações (clique, toque)';
    }
    return 'Para componentes de ação básicos';
  }

  private getTextComponents(texts: any): string[] {
    const components = [];
    
    if (texts.hierarchy.includes('h1')) {
      components.push('Title1');
    }
    if (texts.hierarchy.includes('h2')) {
      components.push('Title2');
    }
    if (texts.hierarchy.includes('h3')) {
      components.push('Title3');
    }
    if (texts.hierarchy.includes('subtitle')) {
      components.push('Title2', 'Title3');
    }
    if (texts.hierarchy.includes('body')) {
      components.push('Text');
    }
    
    return components.length > 0 ? components : ['Text', 'Title1'];
  }

  private getTextReason(texts: any): string {
    if (texts.hasFormatting) {
      return 'Para textos com hierarquia e formatação específica';
    }
    return 'Para conteúdo textual e títulos';
  }

  private getListComponents(lists: any, structure: any): string[] {
    const components = [];
    
    if (lists.hasNavigation && lists.structure.hasIcons) {
      components.push('BoxedRowList', 'BoxedRow');
    } else if (lists.hasNavigation) {
      components.push('RowList', 'BoxedRow');
    } else if (lists.isRepeated) {
      components.push('RowList', 'BoxedRowList');
    }
    
    if (lists.structure.hasActions) {
      components.push('BoxedRow', 'Menu');
    }
    
    return components.length > 0 ? components : ['RowList'];
  }

  private getListReason(lists: any, structure: any): string {
    if (lists.hasNavigation && lists.structure.hasIcons) {
      return 'Para listas interativas com ícones e navegação - IDEAL: BoxedRowList + BoxedRow';
    }
    if (lists.isRepeated) {
      return 'Para listas de elementos repetitivos estruturados';
    }
    return 'Para organização de conteúdo em lista';
  }

  private getContainerComponents(containers: any, structure: any, spacing?: any): string[] {
    const components = [];
    
    if (structure.layoutType === 'vertical') {
      components.push('Stack');
    }
    if (structure.layoutType === 'horizontal') {
      components.push('Inline');
    }
    if (structure.layoutType === 'grid') {
      components.push('Grid', 'GridLayout');
    }
    
    if (containers.hasPadding) {
      components.push('Box');
    }
    
    // === NOVO: Análise específica de espaçamento ===
    if (spacing?.found) {
      // Se usa sistema de design, priorizar componentes que seguem o padrão
      if (spacing.spacingPatterns?.includes('design-system-aligned')) {
        components.unshift('Stack'); // Stack é o principal para espaçamento consistente
        
        // Se tem valores específicos do Mística, sugerir Box
        const misticaValues = ['8px', '16px', '24px', '32px'];
        if (spacing.spacingValues?.some((value: string) => misticaValues.includes(value))) {
          components.unshift('Box');
        }
      }
      
      // Para espaçamento flexível, sugerir Inline
      if (spacing.spacingTypes?.includes('gap')) {
        components.push('Inline');
      }
      
      // Para espaçamento complexo, sugerir Grid
      if (spacing.spacingTypes?.length > 2) {
        components.push('Grid');
      }
    }
    
    if (containers.types.includes('card')) {
      components.push('DataCard', 'MediaCard');
    }
    
    return components.length > 0 ? [...new Set(components)] : ['Box', 'Stack'];
  }

  private getContainerReason(containers: any, structure: any, spacing?: any): string {
    if (spacing?.found) {
      if (spacing.spacingPatterns?.includes('design-system-aligned')) {
        return 'Para layout com espaçamento alinhado ao design system Mística';
      }
      if (spacing.spacingPatterns?.includes('consistent')) {
        return 'Para layout com espaçamento consistente e controlado';
      }
      if (spacing.spacingPatterns?.includes('mixed')) {
        return 'Para normalizar espaçamento inconsistente usando padrões Mística';
      }
    }
    
    if (structure.layoutType === 'vertical') {
      return 'Para layout vertical com espaçamento controlado';
    }
    if (structure.layoutType === 'grid') {
      return 'Para layouts em grade organizados';
    }
    return 'Para organização e espaçamento de elementos';
  }

  private getIconComponents(icons: any): string[] {
    if (icons.hasInteraction) {
      return ['IconButton'];
    }
    return ['Logo']; // Para ícones decorativos, usar Logo ou imports diretos
  }

  private getIconReason(icons: any): string {
    if (icons.hasInteraction) {
      return 'Para ícones interativos com ações (botões de ícone)';
    }
    return 'Para ícones decorativos e identidade visual';
  }

  private getInputComponents(inputs: any): string[] {
    const components = [];
    
    inputs.types.forEach((type: string) => {
      switch (type) {
        case 'email':
          components.push('EmailField');
          break;
        case 'password':
          components.push('PasswordField');
          break;
        case 'number':
          components.push('IntegerField', 'DecimalField');
          break;
        case 'search':
          components.push('SearchField');
          break;
        case 'date':
          components.push('DateField', 'DateTimeField');
          break;
        case 'textarea':
          components.push('TextField');
          break;
        default:
          components.push('TextField');
      }
    });
    
    if (inputs.hasValidation) {
      components.push('Form');
    }
    
    return components.length > 0 ? components : ['TextField'];
  }

  private getInputReason(inputs: any): string {
    if (inputs.hasValidation) {
      return 'Para campos de entrada com validação e formulários estruturados';
    }
    return 'Para entrada de dados do usuário';
  }

  private getNavigationComponents(navigation: any): string[] {
    const components = ['NavigationBar'];
    
    if (navigation.hasTitle && !navigation.hasBackButton) {
      components.push('Header');
    }
    
    if (navigation.hasActions) {
      components.push('Header');
    }
    
    return components;
  }

  private getNavigationReason(navigation: any): string {
    if (navigation.hasBackButton) {
      return 'Para navegação com botão de voltar e título';
    }
    if (navigation.hasActions) {
      return 'Para cabeçalho com ações e navegação';
    }
    return 'Para estrutura de navegação básica';
  }

  // ===== MÉTODOS AUXILIARES =====

  /**
   * Busca componentes por padrões específicos (NOVO)
   */
  private findComponentsByPattern(components: MisticaComponent[], patterns: string[]): MisticaComponent[] {
    return components.filter(comp => {
      const name = comp.name.toLowerCase();
      const description = comp.description.toLowerCase();
      
      // Verifica se algum padrão aparece no nome ou descrição
      return patterns.some(pattern => 
        name.includes(pattern.toLowerCase()) || 
        description.includes(pattern.toLowerCase())
      );
    });
  }

  private inferComplexity(analysis: any): 'low' | 'medium' | 'high' {
    const elementCounts = Object.values(analysis.elements).reduce((sum: number, element: any) => 
      sum + (element.count || 0), 0
    );

    if (elementCounts > 15) return 'high';
    if (elementCounts > 8) return 'medium';
    return 'low';
  }
}
