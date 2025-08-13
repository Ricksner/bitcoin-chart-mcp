#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { BitcoinAPI } from './bitcoin-api.js';
import { ChartGenerator } from './chart-generator.js';
import { ChartConfig } from './types.js';

class BitcoinChartMCPServer {
  private server: Server;
  private bitcoinAPI: BitcoinAPI;
  private chartGenerator: ChartGenerator;

  constructor() {
    this.server = new Server(
      {
        name: 'bitcoin-chart-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.bitcoinAPI = new BitcoinAPI();
    this.chartGenerator = new ChartGenerator();

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'bitcoin://chart/svg/current',
            mimeType: 'image/svg+xml',
            name: 'Current Bitcoin Price Chart (SVG)',
            description: 'Real-time Bitcoin price chart in SVG format',
          },
          {
            uri: 'bitcoin://price/current',
            mimeType: 'application/json',
            name: 'Current Bitcoin Price',
            description: 'Current Bitcoin price data',
          },
        ],
      };
    });

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        if (uri === 'bitcoin://price/current') {
          const priceData = await this.bitcoinAPI.getCurrentPrice();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(priceData, null, 2),
              },
            ],
          };
        }

        if (uri.startsWith('bitcoin://chart/svg/')) {
          const timeframe = this.extractTimeframeFromUri(uri) || '7d';
          
          const historicalData = await this.bitcoinAPI.getMarketChart(timeframe);
          
          const svgChart = await this.chartGenerator.generateSVGChart(historicalData, {
            timeframe: timeframe as any,
            chartType: 'line',
            width: 800,
            height: 400,
          });
          
          return {
            contents: [
              {
                uri,
                mimeType: 'image/svg+xml',
                text: svgChart,
              },
            ],
          };
        }

        throw new Error(`Unknown resource: ${uri}`);
      } catch (error) {
        throw new Error(`Failed to read resource ${uri}: ${error}`);
      }
    });

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_bitcoin_chart',
            description: 'Generate a Bitcoin price chart with customizable options',
            inputSchema: {
              type: 'object',
              properties: {
                timeframe: {
                  type: 'string',
                  enum: ['1h', '24h', '7d', '30d', '1y'],
                  default: '7d',
                  description: 'Time period for the chart',
                },
                chartType: {
                  type: 'string',
                  enum: ['line', 'area'],
                  default: 'line',
                  description: 'Type of chart to generate',
                },
                width: {
                  type: 'number',
                  default: 800,
                  description: 'Chart width in pixels',
                },
                height: {
                  type: 'number',
                  default: 400,
                  description: 'Chart height in pixels',
                },
                currency: {
                  type: 'string',
                  enum: ['usd', 'eur'],
                  default: 'usd',
                  description: 'Currency for price display',
                },
              },
            },
          },
          {
            name: 'get_bitcoin_price',
            description: 'Get current Bitcoin price and market data',
            inputSchema: {
              type: 'object',
              properties: {
                currency: {
                  type: 'string',
                  enum: ['usd', 'eur'],
                  default: 'usd',
                  description: 'Currency for price display',
                },
              },
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (name === 'get_bitcoin_price') {
          const currency = (args?.currency as string) || 'usd';
          const priceData = await this.bitcoinAPI.getCurrentPrice(currency);
          
          return {
            content: [
              {
                type: 'text',
                text: `Current Bitcoin Price: $${priceData.price.toLocaleString()}\\n` +
                     `24h Volume: $${priceData.volume?.toLocaleString()}\\n` +
                     `Last Updated: ${new Date(priceData.timestamp).toLocaleString()}`,
              },
            ],
          };
        }

        if (name === 'get_bitcoin_chart') {
          const config: Partial<ChartConfig> = {
            timeframe: (args?.timeframe as any) || '7d',
            chartType: (args?.chartType as any) || 'line',
            width: (args?.width as number) || 800,
            height: (args?.height as number) || 400,
            currency: (args?.currency as any) || 'usd',
          };

          const historicalData = await this.bitcoinAPI.getMarketChart(
            config.timeframe!,
            config.currency
          );

          const svgChart = await this.chartGenerator.generateSVGChart(historicalData, config);
          
          return {
            content: [
              {
                type: 'text',
                text: `Bitcoin ${config.timeframe} Chart Generated:\\n\\n`,
              },
              {
                type: 'image',
                data: `data:image/svg+xml;base64,${Buffer.from(svgChart).toString('base64')}`,
                mimeType: 'image/svg+xml',
              },
            ],
          };
        }

        throw new Error(`Unknown tool: ${name}`);
      } catch (error) {
        throw new Error(`Tool execution failed: ${error}`);
      }
    });
  }

  private extractTimeframeFromUri(uri: string): string | null {
    const match = uri.match(/timeframe=([^&]+)/);
    return match ? match[1] : null;
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Bitcoin Chart MCP Server running on stdio');
  }
}

// Start the server
const server = new BitcoinChartMCPServer();
server.run().catch(console.error);