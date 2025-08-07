import type { ComponentSuggestion } from '../mappers/ComponentMapper.js';
import type { UIElements } from '../analyzers/ElementExtractor.js';
import type { UIPatterns, StructuralAnalysis } from '../analyzers/PatternDetector.js';

/**
 * 🔄 RefactoringGenerator - Gera código refatorado com Mística
 * 
 * Responsabilidade: Gerar sugestões de refatoração de código
 * usando componentes do Mística baseado na análise
 */

export class RefactoringGenerator {
  /**
   * Gera sugestão de refatoração genérica baseada na análise
   */
  generateGenericRefactoring(
    elements: UIElements,
    structure: StructuralAnalysis,
    patterns: UIPatterns,
    suggestions: ComponentSuggestion[]
  ): string {
    let refactoring = '```tsx\n';
    refactoring += 'import { ';
    
    // Imports dos top 5 componentes sugeridos
    const topComponents = suggestions.slice(0, 5);
    const imports = topComponents.map(s => s.component.name).join(', ');
    refactoring += imports;
    refactoring += ' } from \'@telefonica/mistica\';\n\n';
    
    refactoring += 'export default function RefactoredComponent() {\n';
    refactoring += '  return (\n';
    
    // Estrutura baseada nos padrões detectados
    if (patterns.listPattern) {
      refactoring += this.generateListPattern(elements, structure);
    } else if (patterns.cardPattern) {
      refactoring += this.generateCardPattern(elements, structure, patterns);
    } else if (patterns.formPattern) {
      refactoring += this.generateFormPattern(elements, structure);
    } else {
      refactoring += this.generateGenericPattern(elements, structure, patterns);
    }
    
    refactoring += '  );\n';
    refactoring += '}\n';
    refactoring += '```\n\n';
    
    // Benefícios genéricos
    refactoring += this.generateBenefitsSection();
    
    // Recomendações específicas baseadas na análise
    refactoring += this.generateRecommendations(patterns);
    
    return refactoring;
  }

  /**
   * Gera padrão de lista
   */
  private generateListPattern(elements: UIElements, structure: StructuralAnalysis): string {
    let code = '    <Box padding={16}>\n';
    
    if (elements.navigation.found) {
      code += '      <NavigationBar title="Título" onBack={() => {}} />\n\n';
    }
    
    code += '      <BoxedRowList>\n';
    code += '        <BoxedRow\n';
    code += '          headline="Item 1"\n';
    code += '          onPress={() => {}}\n';
    
    if (elements.icons.found) {
      code += '          asset={<IconComponent />}\n';
    }
    
    if (elements.lists.hasNavigation) {
      code += '          right={<IconChevronRight />}\n';
    }
    
    code += '        />\n';
    code += '        <BoxedRow\n';
    code += '          headline="Item 2"\n';
    code += '          onPress={() => {}}\n';
    
    if (elements.icons.found) {
      code += '          asset={<IconComponent />}\n';
    }
    
    if (elements.lists.hasNavigation) {
      code += '          right={<IconChevronRight />}\n';
    }
    
    code += '        />\n';
    code += '      </BoxedRowList>\n';
    code += '    </Box>\n';
    
    return code;
  }

  /**
   * Gera padrão de card
   */
  private generateCardPattern(elements: UIElements, structure: StructuralAnalysis, patterns: UIPatterns): string {
    let code = '    <Stack space={16} padding={16}>\n';
    
    if (patterns.navigationPattern) {
      code += '      <Header title="Título" />\n';
    }
    
    code += '      <DataCard\n';
    code += '        title="Título do Card"\n';
    code += '        subtitle="Descrição"\n';
    
    if (elements.buttons.found) {
      code += '        actions={<ButtonPrimary>Ação</ButtonPrimary>}\n';
    }
    
    code += '      />\n';
    code += '    </Stack>\n';
    
    return code;
  }

  /**
   * Gera padrão de formulário
   */
  private generateFormPattern(elements: UIElements, structure: StructuralAnalysis): string {
    let code = '    <Form>\n';
    code += '      <Box padding={16}>\n';
    code += '        <Stack space={16}>\n';
    
    if (elements.texts.hierarchy.includes('h1')) {
      code += '          <Title1>Formulário</Title1>\n';
    }
    
    code += '          <TextField\n';
    code += '            label="Campo 1"\n';
    code += '            name="field1"\n';
    code += '          />\n';
    code += '          <TextField\n';
    code += '            label="Campo 2"\n';
    code += '            name="field2"\n';
    code += '          />\n';
    
    if (elements.buttons.found) {
      code += '          <ButtonPrimary type="submit">Enviar</ButtonPrimary>\n';
    }
    
    code += '        </Stack>\n';
    code += '      </Box>\n';
    code += '    </Form>\n';
    
    return code;
  }

  /**
   * Gera padrão genérico
   */
  private generateGenericPattern(elements: UIElements, structure: StructuralAnalysis, patterns: UIPatterns): string {
    let code = '    <Box padding={16}>\n';
    
    if (patterns.navigationPattern) {
      code += '      <NavigationBar title="Título" />\n\n';
    }
    
    if (elements.texts.found) {
      code += '      <Stack space={16}>\n';
      
      if (elements.texts.hierarchy.includes('h1')) {
        code += '        <Title1>Título Principal</Title1>\n';
      }
      
      if (elements.texts.hierarchy.includes('body')) {
        code += '        <Text>Conteúdo do texto</Text>\n';
      }
      
      code += '      </Stack>\n\n';
    }
    
    if (elements.buttons.found) {
      code += '      <ButtonPrimary onPress={() => {}}>Ação</ButtonPrimary>\n';
    }
    
    code += '    </Box>\n';
    
    return code;
  }

  /**
   * Gera seção de benefícios
   */
  private generateBenefitsSection(): string {
    return `## ✨ **Benefícios da Refatoração com Mística**
• 🎨 **Design Consistente**: Segue o design system oficial da Telefónica
• ♿ **Acessibilidade**: Componentes otimizados para todos os usuários
• 📱 **Responsividade**: Adapta automaticamente a diferentes telas
• 🚀 **Performance**: Componentes otimizados e tree-shakeable
• 🔧 **Manutenção**: Código mais limpo e fácil de manter

`;
  }

  /**
   * Gera recomendações específicas
   */
  private generateRecommendations(patterns: UIPatterns): string {
    let recommendations = '';
    
    if (patterns.listPattern) {
      recommendations += `### 📋 **Recomendações para Listas**
• Use \`BoxedRowList\` + \`BoxedRow\` para listas interativas com navegação
• Use \`RowList\` para listas simples sem estrutura boxed
• Adicione ícones com a prop \`asset\` e indicadores com \`right\`

`;
    }
    
    if (patterns.formPattern) {
      recommendations += `### 📝 **Recomendações para Formulários**
• Use componentes específicos como \`EmailField\`, \`PasswordField\`
• Combine com \`Form\` para validação automática
• Use \`Stack\` para espaçamento consistente entre campos

`;
    }
    
    if (patterns.cardPattern) {
      recommendations += `### 🎴 **Recomendações para Cards**
• Use \`DataCard\` para conteúdo estruturado com dados
• Use \`MediaCard\` para conteúdo com imagem
• Use \`HighlightedCard\` para destacar informações importantes

`;
    }
    
    return recommendations;
  }
}
