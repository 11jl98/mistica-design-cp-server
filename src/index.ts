#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MisticaTools } from "./tools/MisticaTools.js";
import { CacheManager } from "./cache/CacheManager.js";

class MisticaMCPServer {
  private server: Server;
  private misticaTools: MisticaTools;

  constructor() {
    this.server = new Server(
      {
        name: "mistica-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    const cacheManager = new CacheManager();
    this.misticaTools = new MisticaTools(cacheManager);
    this.setupHandlers();
  }

  private setupHandlers() {
    // Handler para listar ferramentas disponíveis
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const toolsMap = this.misticaTools.getAllTools();
      const tools = Object.values(toolsMap);

      console.error(
        `📋 Listando ${tools.length} ferramentas do Mística MCP Server`
      );

      return {
        tools: tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Handler para executar ferramentas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      console.error(`🔧 Executando ferramenta: ${name}`);
      console.error(`📥 Argumentos:`, JSON.stringify(args, null, 2));

      try {
        const result = await this.misticaTools.executeTool(name, args || {});

        console.error(`✅ Ferramenta ${name} executada com sucesso`);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error(`❌ Erro ao executar ferramenta ${name}:`, error);

        const errorMessage =
          error instanceof Error ? error.message : "Erro desconhecido";

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: errorMessage,
                  tool: name,
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    });

    process.on("SIGINT", async () => {
      console.error("🛑 Recebido SIGINT, fechando servidor...");
      await this.server.close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.error("🛑 Recebido SIGTERM, fechando servidor...");
      await this.server.close();
      process.exit(0);
    });
  }

  async start() {
    const transport = new StdioServerTransport();

    console.error("🚀 Iniciando Mística MCP Server...");
    console.error("📚 Design System: Telefónica Mística");
    console.error("🔗 Documentação: https://mistica-web.vercel.app");
    console.error("⚡ Servidor pronto para receber comandos");

    await this.server.connect(transport);
  }
}

// Inicializar servidor
const server = new MisticaMCPServer();
server.start().catch((error) => {
  console.error("💥 Erro fatal ao iniciar servidor:", error);
  process.exit(1);
});
