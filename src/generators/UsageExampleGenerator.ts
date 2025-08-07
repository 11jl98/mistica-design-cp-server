/**
 * 📘 UsageExampleGenerator - Gera exemplos de uso ricos e contextuais para qualquer componente Mística
 *
 * Objetivos:
 * - Padronizar saída para melhor consumo via MCP / copilots
 * - Adaptar exemplos conforme tipo (Button, Field, Layout, etc.)
 * - Incluir: import, uso básico, variantes, composição, acessibilidade, props chave
 */
import type { MisticaComponent } from '../types/interfaces.js';

export interface UsageExampleOptions {
  format?: 'react' | 'html' | 'both';
  variant?: string;
  includeAdvanced?: boolean;
  maxProps?: number;
}

interface GeneratedSection {
  title: string;
  content: string;
}

export class UsageExampleGenerator {
  generate(component: MisticaComponent, options: UsageExampleOptions = {}): string {
    const format = options.format || 'react';
    const maxProps = options.maxProps || 8;
    const cleanName = this.normalizeComponentName(component.name);

    const sections: GeneratedSection[] = [];

    sections.push(this.sectionHeader(cleanName, component));
    sections.push(this.sectionWhenToUse(cleanName, component));
    sections.push(this.sectionImport(cleanName, component));
    sections.push(this.sectionBasicUsage(cleanName, component, format));

    const variantSection = this.sectionVariants(cleanName, component, format);
    if (variantSection) sections.push(variantSection);

    const composition = this.sectionComposition(cleanName, component, format);
    if (composition) sections.push(composition);

    const accessibility = this.sectionAccessibility(cleanName, component);
    if (accessibility) sections.push(accessibility);

    const props = this.sectionProps(cleanName, component, maxProps);
    if (props) sections.push(props);

    const related = this.sectionRelated(cleanName, component);
    if (related) sections.push(related);

    return sections
      .filter(Boolean)
      .map(s => `## ${s.title}\n\n${s.content.trim()}\n`)
      .join('\n');
  }

  // ===== Sections =====
  private sectionHeader(name: string, component: MisticaComponent): GeneratedSection {
    return {
      title: `Exemplos de uso: ${name}`,
      content: `${component.description || 'Componente do design system Mística.'}`
    };
  }

  private sectionWhenToUse(name: string, component: MisticaComponent): GeneratedSection {
    const hints: Record<string,string> = {
      button: 'Use para iniciar ações primárias ou secundárias na interface.',
      layout: 'Use para estruturar e organizar áreas da página mantendo espaçamentos consistentes.',
      field: 'Use para capturar entrada de dados do usuário com validação consistente.',
      pinfield: 'Use para capturar códigos curtos (PIN / OTP) com UX otimizada.',
      form: 'Use para agrupar e orquestrar campos com estados e validação.',
      card: 'Use para agrupar conteúdo relacionado dentro de um container com identidade visual.',
      list: 'Use para exibir coleções navegáveis ou repetitivas de conteúdo.',
      modal: 'Use para interromper o fluxo e exibir conteúdo ou confirmação prioritária.',
      inline: 'Use para alinhar elementos horizontalmente com controle de espaçamento.',
      stack: 'Use para empilhar elementos verticalmente mantendo ritmo visual.'
    };
    const key = Object.keys(hints).find(k => name.toLowerCase().includes(k));
    return { title: 'Quando usar', content: key ? hints[key] : 'Use conforme a necessidade de sua interface seguindo as diretrizes do design system.' };
  }

  private sectionImport(name: string, component: MisticaComponent): GeneratedSection {
    const importLine = `import { ${name} } from '@telefonica/mistica';`;
    return { title: 'Import', content: '```tsx\n' + importLine + '\n```' };
  }

  private sectionBasicUsage(name: string, component: MisticaComponent, format: string): GeneratedSection {
    const kind = this.detectKind(name, component);
    let code = '';
    switch (kind) {
      case 'button':
        code = `<${name} onPress={() => console.log('clicked')}>Continuar</${name}>`;
        break;
      case 'field':
        code = `const [value, setValue] = useState('');\n\n<${name} name="email" value={value} onChange={setValue} label="Email" />`;
        break;
      case 'pinfield':
        code = `const [code, setCode] = useState('');\n\n<${name} value={code} onChange={setCode} length={6} label="Código" />`;
        break;
      case 'layout-fixed-footer':
        code = `<${name}>\n  <Stack space={16}>\n    <Title2>Configurações</Title2>\n    <Text1>Conteúdo principal...</Text1>\n  </Stack>\n  <ButtonPrimary onPress={() => {}}>Salvar</ButtonPrimary>\n</${name}>`;
        break;
      case 'stack':
        code = `<${name} space={16}>\n  <Title2>Exemplo</Title2>\n  <Text1>Texto 1</Text1>\n  <Text1>Texto 2</Text1>\n</${name}>`;
        break;
      default:
        code = `<${name} />`;
    }
    if (format === 'html') {
      // Minimal HTML fallback (não representativo para todos, mas útil)
      code = `<div class="${name.toLowerCase()}">...</div>`;
    }
    if (format === 'both') {
      return { title: 'Uso básico', content: '**React**\n```tsx\n' + code + '\n```\n\n**HTML (conceitual)**\n```html\n<div class="' + name.toLowerCase() + '">...</div>\n```' };
    }
    return { title: 'Uso básico', content: '```tsx\n' + code + '\n```' };
  }

  private sectionVariants(name: string, component: MisticaComponent, format: string): GeneratedSection | null {
    const lower = name.toLowerCase();
    const isButton = /button/.test(lower) && !/group/.test(lower);
    const isField = /(field|textfield|pinfield)/.test(lower);
    if (!isButton && !isField) return null;

    let content = '';
    if (isButton) {
      content += 'Principais variantes de botão:\n\n';
      content += '```tsx\n<ButtonPrimary>Confirmar</ButtonPrimary>\n<ButtonSecondary>Cancelar</ButtonSecondary>\n<ButtonDanger>Excluir</ButtonDanger>\n<ButtonLink href="#">Saiba mais</ButtonLink>\n```';
    }
    if (isField) {
      content += (content ? '\n\n' : '') + 'Variações de campos:\n\n';
      content += '```tsx\n<TextField label="Nome" />\n<EmailField label="Email" />\n<PasswordField label="Senha" />\n<PinField length={6} label="Código" />\n```';
    }
    return { title: 'Variantes', content };
  }

  private sectionComposition(name: string, component: MisticaComponent, format: string): GeneratedSection | null {
    const lower = name.toLowerCase();
    if (/stack|inline|grid/.test(lower)) {
      return {
        title: 'Composição',
        content: 'Exemplo de composição com layout:\n\n```tsx\n<Stack space={16}>\n  <Inline space={8}>\n    <ButtonPrimary>Ok</ButtonPrimary>\n    <ButtonSecondary>Cancelar</ButtonSecondary>\n  </Inline>\n  <Grid columns={{desktop: 3, mobile: 2}}>\n    <Box>Nó 1</Box>\n    <Box>Nó 2</Box>\n    <Box>Nó 3</Box>\n  </Grid>\n</Stack>\n```'
      };
    }
    if (/layout/.test(lower) && /footer/.test(lower)) {
      return {
        title: 'Composição',
        content: 'Layout com ação fixa no rodapé:\n\n```tsx\n<ButtonFixedFooterLayout>\n  <Stack space={16}>\n    <Title2>Preferências</Title2>\n    <Text1>Conteúdo...</Text1>\n  </Stack>\n  <ButtonPrimary onPress={() => {}}>Salvar</ButtonPrimary>\n</ButtonFixedFooterLayout>\n```'
      };
    }
    return null;
  }

  private sectionAccessibility(name: string, component: MisticaComponent): GeneratedSection | null {
    const lower = name.toLowerCase();
    let notes: string[] = [];
    if (/button/.test(lower)) notes.push('Garanta texto descritivo dentro do botão.');
    if (/(field|input)/.test(lower)) notes.push('Associe sempre label visível ou aria-label.');
    if (/iconbutton|icon/.test(lower)) notes.push('Forneça aria-label quando o ícone sozinho representar ação.');
    if (/layout|stack|inline|grid/.test(lower)) notes.push('Use a ordem semântica correta de heading e landmarks.');
    if (!notes.length) return null;
    return { title: 'Acessibilidade', content: notes.map(n => `- ${n}`).join('\n') };
  }

  private sectionProps(name: string, component: MisticaComponent, max: number): GeneratedSection | null {
    if (!component.props || !component.props.length) return null;
    const rows = component.props.slice(0, max).map((p: any) => {
      const type = p.type || p.tsType || p.kind || '—';
      const def = p.defaultValue?.value || p.default || '—';
      const desc = (p.description || '').replace(/\n+/g, ' ').trim() || '—';
      return `| ${p.name} | ${type} | ${def} | ${desc} |`;
    });
    const header = '| Prop | Tipo | Default | Descrição |\n|------|------|---------|-----------|';
    return { title: 'Props principais', content: header + '\n' + rows.join('\n') + (component.props.length > max ? `\n\n… +${component.props.length - max} props` : '') };
  }

  private sectionRelated(name: string, component: MisticaComponent): GeneratedSection | null {
    const related: string[] = [];
    const lower = name.toLowerCase();
    if (/button/.test(lower)) related.push('ButtonGroup', 'LoadingBar');
    if (/pinfield/.test(lower)) related.push('Form', 'TextField', 'PasswordField');
    if (/layout/.test(lower)) related.push('Stack', 'Inline', 'Grid');
    if (/stack/.test(lower)) related.push('Inline', 'Grid');
    if (/card/.test(lower)) related.push('MediaCard', 'DataCard');
    if (!related.length) return null;
    return { title: 'Relacionados', content: related.map(r => `- ${r}`).join('\n') };
  }

  // ===== Helpers =====
  private normalizeComponentName(raw: string): string {
    return raw.replace(/^default as /i, '').trim();
  }

  private detectKind(name: string, component: MisticaComponent): string {
    const lower = name.toLowerCase();
    if (/pinfield/.test(lower)) return 'pinfield';
    if (/buttonfixedfooterlayout/.test(lower)) return 'layout-fixed-footer';
    if (/field|textfield|emailfield|passwordfield|datefield|pinfield/.test(lower)) return 'field';
    if (/button(primary|secondary|danger|link)?$/.test(lower) || /button$/.test(lower)) return 'button';
    if (/stack/.test(lower)) return 'stack';
    return 'generic';
  }
}

export default UsageExampleGenerator;
