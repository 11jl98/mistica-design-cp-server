#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

/**
 * Script para instalar automaticamente o Mística MCP Server
 * na configuração do GitHub Copilot
 */

class MisticaMCPInstaller {
  constructor() {
    this.configPaths = this.getConfigPaths();
    this.currentPath = process.cwd();
  }

  getConfigPaths() {
    const platform = os.platform();
    const homeDir = os.homedir();
    
    const paths = {
      win32: path.join(homeDir, 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'github.copilot-chat', 'mcpServers.json'),
      darwin: path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'github.copilot-chat', 'mcpServers.json'),
      linux: path.join(homeDir, '.config', 'Code', 'User', 'globalStorage', 'github.copilot-chat', 'mcpServers.json')
    };

    return paths[platform] || paths.linux;
  }

  async checkIfExists() {
    try {
      await fs.access(this.configPaths);
      return true;
    } catch {
      return false;
    }
  }

  async readExistingConfig() {
    try {
      const content = await fs.readFile(this.configPaths, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { mcpServers: {} };
    }
  }

  async createBackup() {
    const exists = await this.checkIfExists();
    if (exists) {
      const backupPath = this.configPaths + '.backup.' + Date.now();
      await fs.copyFile(this.configPaths, backupPath);
      console.log(`✅ Backup criado: ${backupPath}`);
    }
  }

  async ensureDirectory() {
    const dir = path.dirname(this.configPaths);
    await fs.mkdir(dir, { recursive: true });
  }

  generateConfig() {
    const serverPath = path.join(this.currentPath, 'dist', 'index.js');
    
    return {
      mistica: {
        command: 'node',
        args: [serverPath],
        env: {
          NODE_ENV: 'production'
        }
      },
      'mistica-dev': {
        command: 'npm',
        args: ['run', 'dev:server'],
        cwd: this.currentPath,
        env: {
          NODE_ENV: 'development'
        }
      }
    };
  }

  async install() {
    console.log('🚀 Instalando Mística MCP Server...');
    console.log(`📂 Diretório atual: ${this.currentPath}`);
    console.log(`⚙️  Arquivo de config: ${this.configPaths}`);

    try {
      // 1. Verificar se o build existe
      const distPath = path.join(this.currentPath, 'dist', 'index.js');
      try {
        await fs.access(distPath);
        console.log('✅ Build encontrado');
      } catch {
        console.log('❌ Build não encontrado. Execute: npm run build');
        process.exit(1);
      }

      // 2. Criar backup se necessário
      await this.createBackup();

      // 3. Ler configuração existente
      const existingConfig = await this.readExistingConfig();
      console.log('📖 Configuração existente lida');

      // 4. Adicionar nossa configuração
      const misticaConfig = this.generateConfig();
      const newConfig = {
        ...existingConfig,
        mcpServers: {
          ...existingConfig.mcpServers,
          ...misticaConfig
        }
      };

      // 5. Garantir que o diretório existe
      await this.ensureDirectory();

      // 6. Salvar nova configuração
      await fs.writeFile(
        this.configPaths, 
        JSON.stringify(newConfig, null, 2), 
        'utf-8'
      );

      console.log('✅ Mística MCP Server instalado com sucesso!');
      console.log('');
      console.log('📋 Próximos passos:');
      console.log('1. Reinicie o VS Code');
      console.log('2. Abra o GitHub Copilot Chat');
      console.log('3. Digite: @mistica list all components');
      console.log('');
      console.log('🎉 Pronto! O Copilot agora conhece o Mística!');

    } catch (error) {
      console.error('❌ Erro na instalação:', error.message);
      process.exit(1);
    }
  }

  async uninstall() {
    console.log('🗑️  Removendo Mística MCP Server...');

    try {
      const existingConfig = await this.readExistingConfig();
      
      // Remover configurações do Mística
      delete existingConfig.mcpServers.mistica;
      delete existingConfig.mcpServers['mistica-dev'];

      await fs.writeFile(
        this.configPaths, 
        JSON.stringify(existingConfig, null, 2), 
        'utf-8'
      );

      console.log('✅ Mística MCP Server removido com sucesso!');
      console.log('🔄 Reinicie o VS Code para aplicar as mudanças');

    } catch (error) {
      console.error('❌ Erro na remoção:', error.message);
    }
  }

  async status() {
    console.log('📊 Status do Mística MCP Server');
    console.log('');

    const exists = await this.checkIfExists();
    console.log(`📁 Arquivo config: ${exists ? '✅ Existe' : '❌ Não existe'}`);
    console.log(`📂 Localização: ${this.configPaths}`);

    if (exists) {
      const config = await this.readExistingConfig();
      const hasMistica = !!config.mcpServers?.mistica;
      const hasMisticaDev = !!config.mcpServers?.['mistica-dev'];
      
      console.log(`🎯 Servidor Mística: ${hasMistica ? '✅ Configurado' : '❌ Não configurado'}`);
      console.log(`🔧 Servidor Dev: ${hasMisticaDev ? '✅ Configurado' : '❌ Não configurado'}`);
    }

    // Verificar build
    const distPath = path.join(this.currentPath, 'dist', 'index.js');
    try {
      await fs.access(distPath);
      console.log('🏗️  Build: ✅ Disponível');
    } catch {
      console.log('🏗️  Build: ❌ Não encontrado (execute: npm run build)');
    }
  }
}

// CLI
const command = process.argv[2];
const installer = new MisticaMCPInstaller();

switch (command) {
  case 'install':
    installer.install();
    break;
  case 'uninstall':
    installer.uninstall();
    break;
  case 'status':
    installer.status();
    break;
  default:
    console.log('');
    console.log('🎯 Mística MCP Server Installer');
    console.log('');
    console.log('Comandos disponíveis:');
    console.log('  install    - Instala o servidor MCP');
    console.log('  uninstall  - Remove o servidor MCP');
    console.log('  status     - Verifica status da instalação');
    console.log('');
    console.log('Exemplos:');
    console.log('  node setup.js install');
    console.log('  node setup.js status');
}
