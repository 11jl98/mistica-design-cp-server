#!/usr/bin/env node

import { MisticaScraper } from '../scraper/MisticaScraper.js';
import { CacheManager } from '../cache/CacheManager.js';

async function testComponentDiscovery() {
  console.log('🧪 Testando descoberta de componentes do Mística...\n');
  
  const cache = new CacheManager('./data/cache-test', 1); // 1 minuto apenas para teste
  const scraper = new MisticaScraper(cache);
  
  try {
    // Limpar cache para teste fresh
    await cache.clear();
    console.log('🗑️ Cache limpo para teste\n');
    
    // Descobrir componentes
    console.log('🔍 Iniciando descoberta de componentes...\n');
    const startTime = Date.now();
    
    const components = await scraper.getAllComponents();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n📊 === RESULTADOS DA DESCOBERTA ===');
    console.log(`⏱️  Tempo: ${duration.toFixed(2)}s`);
    console.log(`📦 Total: ${components.length} componentes\n`);
    
    // Agrupar por categoria
    const byCategory = components.reduce((acc, comp) => {
      acc[comp.category] = acc[comp.category] || [];
      acc[comp.category].push(comp);
      return acc;
    }, {} as Record<string, any[]>);
    
    console.log('📋 === COMPONENTES POR CATEGORIA ===');
    
    const sortedCategories = Object.entries(byCategory).sort(([,a], [,b]) => b.length - a.length);
    
    for (const [category, comps] of sortedCategories) {
      console.log(`\n📁 ${category.toUpperCase()}: ${comps.length} componentes`);
      
      comps.sort((a, b) => a.name.localeCompare(b.name)).forEach(comp => {
        console.log(`   ✓ ${comp.name}`);
        console.log(`     ${comp.description}`);
        console.log(`     🔗 ${comp.storyUrl}`);
      });
    }
    
    // Testar funcionalidades de busca
    console.log('\n🔍 === TESTE DE BUSCA ===');
    
    const searchTests = [
      'button',
      'modal', 
      'card',
      'input',
      'layout'
    ];
    
    for (const query of searchTests) {
      const results = await scraper.searchComponents(query);
      console.log(`🔎 Busca "${query}": ${results.length} resultados`);
      results.slice(0, 3).forEach(comp => {
        console.log(`   - ${comp.name} (${comp.category})`);
      });
    }
    
    // Testar busca por categoria
    console.log('\n📂 === TESTE POR CATEGORIA ===');
    
    const categories = ['components', 'layout', 'utilities', 'hooks'];
    for (const category of categories) {
      const categoryComps = await scraper.getComponentsByCategory(category);
      console.log(`📁 ${category}: ${categoryComps.length} componentes`);
    }
    
    // Estatísticas finais
    console.log('\n📈 === ESTATÍSTICAS ===');
    const totalDescriptions = components.filter(c => c.description && c.description.length > 10).length;
    const totalUrls = components.filter(c => c.storyUrl).length;
    
    console.log(`📝 Componentes com descrição: ${totalDescriptions}/${components.length}`);
    console.log(`🔗 Componentes com URL: ${totalUrls}/${components.length}`);
    
    console.log('\n✅ Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro no teste:', error);
    process.exit(1);
  }
}

// Executar teste
testComponentDiscovery();
