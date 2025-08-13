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
                  enum: ['usd', 'eur', 'gbp', 'jpy'],
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
                  enum: ['usd', 'eur', 'gbp', 'jpy'],
                  default: 'usd',
                  description: 'Currency for price display',
                },
              },
            },
          },
          {
            name: 'get_fear_greed_index',
            description: 'Get Bitcoin Fear & Greed Index - market sentiment indicator',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_market_metrics',
            description: 'Get global cryptocurrency market metrics and Bitcoin dominance',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_onchain_metrics',
            description: 'Get Bitcoin network on-chain metrics like hash rate and difficulty',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_technical_indicators',
            description: 'Get Bitcoin technical analysis indicators (RSI, SMA, EMA, volatility)',
            inputSchema: {
              type: 'object',
              properties: {
                currency: {
                  type: 'string',
                  enum: ['usd', 'eur', 'gbp', 'jpy'],
                  default: 'usd',
                  description: 'Currency for price calculations',
                },
              },
            },
          },
          {
            name: 'get_news_sentiment',
            description: 'Get Bitcoin-related news with sentiment analysis',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_correlation_data',
            description: 'Get Bitcoin correlation with traditional assets (stocks, gold, etc.)',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_whale_alerts',
            description: 'Get recent large Bitcoin transactions (whale movements)',
            inputSchema: {
              type: 'object',
              properties: {},
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

        if (name === 'get_fear_greed_index') {
          const fearGreedData = await this.bitcoinAPI.getFearGreedIndex();
          
          return {
            content: [
              {
                type: 'text',
                text: `Bitcoin Fear & Greed Index: ${fearGreedData.value}/100 (${fearGreedData.value_classification})\n` +
                     `Last Updated: ${new Date(fearGreedData.timestamp).toLocaleString()}\n` +
                     `Next Update: ${fearGreedData.time_until_update}s`,
              },
            ],
          };
        }

        if (name === 'get_market_metrics') {
          const marketData = await this.bitcoinAPI.getGlobalMarketData();
          
          return {
            content: [
              {
                type: 'text',
                text: `Global Crypto Market Cap: $${(marketData.market_cap / 1e12).toFixed(2)}T\n` +
                     `24h Change: ${marketData.market_cap_change_24h.toFixed(2)}%\n` +
                     `Total Volume: $${(marketData.total_volume / 1e9).toFixed(2)}B\n` +
                     `Bitcoin Dominance: ${marketData.market_cap_percentage.toFixed(2)}%\n` +
                     `Active Cryptocurrencies: ${marketData.active_cryptocurrencies}`,
              },
            ],
          };
        }

        if (name === 'get_onchain_metrics') {
          const onChainData = await this.bitcoinAPI.getOnChainMetrics();
          
          return {
            content: [
              {
                type: 'text',
                text: `Bitcoin Network Metrics:\n` +
                     `Hash Rate: ${onChainData.hash_rate}\n` +
                     `Difficulty: ${onChainData.difficulty}\n` +
                     `Block Height: ${onChainData.block_height.toLocaleString()}\n` +
                     `Mempool Size: ${onChainData.mempool_size} transactions\n` +
                     `24h Transactions: ${onChainData.transactions_24h.toLocaleString()}\n` +
                     `Average Network Fee: $${onChainData.network_fees_avg.toFixed(2)}`,
              },
            ],
          };
        }

        if (name === 'get_technical_indicators') {
          const currency = (args?.currency as string) || 'usd';
          const indicators = await this.bitcoinAPI.getTechnicalIndicators(currency);
          
          return {
            content: [
              {
                type: 'text',
                text: `Bitcoin Technical Indicators:\n` +
                     `RSI (14): ${indicators.rsi.toFixed(2)}\n` +
                     `SMA 20: $${indicators.sma_20.toLocaleString()}\n` +
                     `SMA 50: $${indicators.sma_50.toLocaleString()}\n` +
                     `SMA 200: $${indicators.sma_200.toLocaleString()}\n` +
                     `EMA 12: $${indicators.ema_12.toLocaleString()}\n` +
                     `EMA 26: $${indicators.ema_26.toLocaleString()}\n` +
                     `7d Volatility: ${indicators.volatility_7d.toFixed(2)}%\n` +
                     `30d Volatility: ${indicators.volatility_30d.toFixed(2)}%`,
              },
            ],
          };
        }

        if (name === 'get_news_sentiment') {
          const news = await this.bitcoinAPI.getNewsAndSentiment();
          
          const newsText = news.map(item => 
            `📰 ${item.title}\n` +
            `${item.description}\n` +
            `Sentiment: ${item.sentiment_score > 0 ? '📈 Positive' : item.sentiment_score < 0 ? '📉 Negative' : '😐 Neutral'} (${item.sentiment_score.toFixed(2)})\n` +
            `Source: ${item.source}\n` +
            `Published: ${new Date(item.published_at).toLocaleDateString()}\n` +
            `URL: ${item.url}\n`
          ).join('\n---\n');
          
          return {
            content: [
              {
                type: 'text',
                text: `Recent Bitcoin News & Sentiment:\n\n${newsText}`,
              },
            ],
          };
        }

        if (name === 'get_correlation_data') {
          const correlations = await this.bitcoinAPI.getCorrelationData();
          
          const correlationText = correlations.map(corr =>
            `${corr.asset_1} vs ${corr.asset_2}: ${(corr.correlation * 100).toFixed(1)}% correlation (${corr.period})`
          ).join('\n');
          
          return {
            content: [
              {
                type: 'text',
                text: `Bitcoin Asset Correlations:\n${correlationText}\n\nLast Updated: ${new Date(correlations[0].last_updated).toLocaleString()}`,
              },
            ],
          };
        }

        if (name === 'get_whale_alerts') {
          const whales = await this.bitcoinAPI.getWhaleAlerts();
          
          const whaleText = whales.map(whale =>
            `🐋 Large Transaction Alert\n` +
            `Amount: ${whale.amount.toLocaleString()} BTC ($${(whale.amount_usd / 1e6).toFixed(1)}M)\n` +
            `Type: ${whale.transaction_type}\n` +
            `From: ${whale.from.owner || 'Unknown'} (${whale.from.owner_type})\n` +
            `To: ${whale.to.owner || 'Unknown'} (${whale.to.owner_type})\n` +
            `Time: ${new Date(whale.timestamp).toLocaleString()}\n` +
            `Hash: ${whale.hash}`
          ).join('\n\n---\n\n');
          
          return {
            content: [
              {
                type: 'text',
                text: `Recent Whale Movements:\n\n${whaleText}`,
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