import path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export type McpServerKey = 'evidence' | 'policy' | 'resolution';

interface ManagedMcpConnection {
  key: McpServerKey;
  scriptPath: string;
  client: Client | null;
  transport: StdioClientTransport | null;
  connecting: Promise<Client> | null;
  tools: string[];
}

const SERVER_SCRIPTS: Record<McpServerKey, string> = {
  evidence: path.resolve(process.cwd(), 'server/mcp/evidenceServer.ts'),
  policy: path.resolve(process.cwd(), 'server/mcp/policyServer.ts'),
  resolution: path.resolve(process.cwd(), 'server/mcp/resolutionServer.ts'),
};

class McpClientManager {
  private connections: Record<McpServerKey, ManagedMcpConnection> = {
    evidence: {
      key: 'evidence',
      scriptPath: SERVER_SCRIPTS.evidence,
      client: null,
      transport: null,
      connecting: null,
      tools: [],
    },
    policy: {
      key: 'policy',
      scriptPath: SERVER_SCRIPTS.policy,
      client: null,
      transport: null,
      connecting: null,
      tools: [],
    },
    resolution: {
      key: 'resolution',
      scriptPath: SERVER_SCRIPTS.resolution,
      client: null,
      transport: null,
      connecting: null,
      tools: [],
    },
  };

  private resolveTsxBin(): { command: string; argsPrefix: string[] } {
    const localTsx = path.resolve(process.cwd(), 'node_modules/.bin/tsx');
    return { command: localTsx, argsPrefix: [] };
  }

  async getClient(key: McpServerKey): Promise<Client> {
    const conn = this.connections[key];
    if (conn.client) return conn.client;
    if (conn.connecting) return conn.connecting;

    conn.connecting = (async () => {
      const { command, argsPrefix } = this.resolveTsxBin();
      const transport = new StdioClientTransport({
        command,
        args: [...argsPrefix, conn.scriptPath],
        cwd: process.cwd(),
      });

      const client = new Client(
        {
          name: `queuezero-orchestrator-${key}-client`,
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      transport.onclose = () => {
        conn.client = null;
        conn.transport = null;
      };

      await client.connect(transport);
      const listRes = await client.listTools();
      conn.tools = listRes.tools.map((t) => t.name);
      conn.client = client;
      conn.transport = transport;
      conn.connecting = null;
      return client;
    })().catch((err) => {
      conn.connecting = null;
      throw err;
    });

    return conn.connecting;
  }

  async callTool<T = unknown>(
    serverKey: McpServerKey,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{ data: T; durationMs: number; serverName: string }> {
    const started = performance.now();
    const client = await this.getClient(serverKey);
    const result = await client.callTool({
      name: toolName,
      arguments: args,
    });
    const durationMs = Math.max(1, Math.round(performance.now() - started));

    const contentList = Array.isArray(result.content) ? result.content : [];
    const textItem = contentList.find((c: { type?: string }) => c.type === 'text') as
      | { type: string; text?: string }
      | undefined;

    if (result.isError) {
      throw new Error(textItem?.text || `MCP tool ${toolName} failed on ${serverKey} server.`);
    }

    const parsed = textItem?.text ? (JSON.parse(textItem.text) as T) : ({} as T);
    return {
      data: parsed,
      durationMs,
      serverName: `queuezero-${serverKey}-mcp`,
    };
  }

  async getHealthStatus(): Promise<
    Array<{ key: McpServerKey; connected: boolean; tools: string[]; error?: string }>
  > {
    const keys: McpServerKey[] = ['evidence', 'policy', 'resolution'];
    const results = await Promise.all(
      keys.map(async (key) => {
        try {
          await this.getClient(key);
          return {
            key,
            connected: true,
            tools: this.connections[key].tools,
          };
        } catch (err) {
          return {
            key,
            connected: false,
            tools: [],
            error: err instanceof Error ? err.message : 'Failed to connect',
          };
        }
      })
    );
    return results;
  }
}

export const mcpManager = new McpClientManager();
