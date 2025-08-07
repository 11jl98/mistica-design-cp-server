# Mística MCP Server

Um servidor MCP (Model Context Protocol) para integrar o Design System Mística da Telefónica com o GitHub Copilot, permitindo acesso contextual a componentes, padrões e guidelines de design.

## 🎯 Objetivo

Permitir que o GitHub Copilot tenha acesso às informações do design system Mística como uma fonte de dados externa, facilitando o desenvolvimento de interfaces consistentes com os padrões da Telefónica.

## ✨ Funcionalidades

### 🔍 Ferramentas Disponíveis

- **`search_mistica_component`** - Busca componentes por nome, categoria ou descrição
- **`get_mistica_component_docs`** - Obtém documentação completa de um componente
- **`list_mistica_components`** - Lista todos os componentes disponíveis
- **`get_mistica_usage_examples`** - Obtém exemplos de uso e código
- **`get_mistica_design_tokens`** - Acessa tokens de design (cores, espaçamentos, etc.)
- **`get_mistica_cache_status`** - Verifica status do cache e força atualizações

### 📊 Categorias Suportadas

- **Components** - Avatar, Badge, Breadcrumbs, Callout, Counter, etc.
- **Layout** - Align, Box, Stack, HorizontalScroll, etc.
- **Utilities** - FixedToTop, OverscrollColor, skinVars
- **Hooks** - useTheme, useScreenSize, useModalState, etc.
- **Icons** - Catálogo de ícones
- **Community** - Componentes da comunidade
- **Lab** - Componentes experimentais

## 🚀 Instalação e Uso

### Para Este Projeto

```bash
# Instalar dependências
npm install

# Build do projeto
npm run build

# Executar servidor
npm start
```

### Para Outros Projetos ⭐

#### Instalação Automática (Recomendado)
```bash
# 1. Build do projeto
npm run build

# 2. Instalar no Copilot automaticamente
npm run setup:install

# 3. Reiniciar VS Code
# Pronto! Use @mistica no Copilot Chat
```

#### Verificar Instalação
```bash
npm run setup:status
```

#### Comandos de Setup
```bash
npm run setup:install      # Instalar no Copilot
npm run setup:uninstall    # Remover do Copilot
npm run setup:status       # Verificar status
npm run setup:help         # Ajuda
```

### Configuração Manual

Se preferir configurar manualmente, veja: [SETUP-GUIDE.md](SETUP-GUIDE.md)

### Exemplos de Uso

Após instalação, use no Copilot Chat:
```
@mistica list all components
@mistica search for button components
@mistica get documentation for Avatar component
@mistica show design tokens for colors
```

Exemplos completos: [USAGE-EXAMPLES.md](USAGE-EXAMPLES.md)

## 🏗️ Arquitetura

```
src/
├── index.ts              # Entry point do MCP server
├── tools/                # Implementação das ferramentas MCP
│   └── MisticaTools.ts
├── scraper/              # Web scraping do Storybook
│   └── MisticaScraper.ts
├── cache/                # Sistema de cache
│   └── CacheManager.ts
├── types/                # Definições TypeScript
│   └── mistica.ts
└── utils/                # Utilitários
    └── helpers.ts
```

## 🔧 Desenvolvimento

### Scripts Disponíveis

```bash
# Desenvolvimento com watch
npm run dev

# Build de produção
npm run build

# Linting
npm run lint

# Executar testes
npm test

# Limpar cache
npm run clean-cache
```

### Configuração do Cache

O servidor utiliza cache local para melhorar a performance:

- **Localização**: `./data/cache/`
- **TTL padrão**: 4 horas
- **Formato**: JSON

### Rate Limiting

- **Requests por segundo**: 2
- **Máximo concorrente**: 5
- **Retry automático**: 3 tentativas

## 📚 Exemplos de Uso

### Buscar Componente

```javascript
// Buscar componentes relacionados a "button"
{
  "tool": "search_mistica_component",
  "arguments": {
    "query": "button",
    "category": "components",
    "limit": 5
  }
}
```

### Obter Documentação

```javascript
// Obter docs completas do Avatar
{
  "tool": "get_mistica_component_docs",
  "arguments": {
    "componentId": "components-avatar",
    "includeFigma": true
  }
}
```

### Listar por Categoria

```javascript
// Listar todos os componentes de layout
{
  "tool": "list_mistica_components",
  "arguments": {
    "category": "layout",
    "includeCount": true
  }
}
```

## 🔄 Integração com Figma

> **Em desenvolvimento** - Planejada integração com MCP do Figma para dados de design complementares.

## 📖 Fonte de Dados

- **Storybook**: https://mistica-web.vercel.app
- **GitHub**: https://github.com/Telefonica/mistica
- **Documentação**: Extraída automaticamente via web scraping

## 🚧 Limitações Atuais

- Web scraping básico (sem JavaScript dinâmico)
- Design tokens mockados (necessário implementar extração real)
- Sem integração Figma (planejada)
- Cache simples baseado em arquivos

## 🔮 Roadmap

- [ ] Integração completa com API do Storybook
- [ ] Extração real de design tokens
- [ ] Integração com Figma MCP
- [ ] Suporte a temas dinâmicos
- [ ] Cache distribuído
- [ ] Métricas e observabilidade

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🔗 Links Úteis

- [Design System Mística](https://mistica-web.vercel.app)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [GitHub Copilot](https://github.com/features/copilot)
- [Telefónica Design](https://brand.telefonica.com)

---

**Criado com ❤️ para melhorar a experiência de desenvolvimento com o Design System Mística**
