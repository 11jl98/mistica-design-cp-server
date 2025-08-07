/**
 * 🏗️ Interfaces - Tipos e interfaces compartilhadas
 * 
 * Responsabilidade: Definir tipos comuns usados em todo o projeto
 */

export interface MisticaComponent {
  name: string;
  category: string;
  description: string;
  version?: string;
  url?: string;
  props?: any[];
  examples?: any[];
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: any;
}
