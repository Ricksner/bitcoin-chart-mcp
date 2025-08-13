import fetch from 'node-fetch';
import { 
  BitcoinPrice, 
  CoinGeckoResponse, 
  FearGreedIndex,
  MarketMetrics,
  OnChainMetrics,
  TechnicalIndicators,
  NewsItem,
  CorrelationData,
  WhaleAlert
} from './types.js';

export class BitcoinAPI {
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';
  private readonly rateLimitDelay = 2000; // 2 second delay between requests
  private lastRequestTime = 0;

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  async getCurrentPrice(currency = 'usd'): Promise<BitcoinPrice> {
    await this.rateLimit();
    
    const response = await fetch(
      `${this.baseUrl}/simple/price?ids=bitcoin&vs_currencies=${currency}&include_24hr_vol=true`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch current price: ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    
    return {
      timestamp: Date.now(),
      price: data.bitcoin[currency],
      volume: data.bitcoin[`${currency}_24h_vol`]
    };
  }

  async getHistoricalData(
    days: number,
    currency = 'usd',
    interval = 'daily'
  ): Promise<BitcoinPrice[]> {
    await this.rateLimit();
    
    const response = await fetch(
      `${this.baseUrl}/coins/bitcoin/market_chart?vs_currency=${currency}&days=${days}&interval=${interval}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch historical data: ${response.statusText}`);
    }
    
    const data = await response.json() as CoinGeckoResponse;
    
    return data.prices.map(([timestamp, price], index) => ({
      timestamp,
      price,
      volume: data.total_volumes?.[index]?.[1]
    }));
  }

  async getMarketChart(timeframe: string, currency = 'usd'): Promise<BitcoinPrice[]> {
    const timeframeDays = this.getTimeframeDays(timeframe);
    const interval = this.getInterval(timeframe);
    
    return this.getHistoricalData(timeframeDays, currency, interval);
  }

  private getTimeframeDays(timeframe: string): number {
    switch (timeframe) {
      case '1h': return 1;
      case '24h': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '1y': return 365;
      default: return 7;
    }
  }

  private getInterval(timeframe: string): string {
    switch (timeframe) {
      case '1h': return 'hourly';
      case '24h': return 'hourly';
      case '7d': return 'daily';
      case '30d': return 'daily';
      case '1y': return 'daily';
      default: return 'daily';
    }
  }

  // Fear & Greed Index
  async getFearGreedIndex(): Promise<FearGreedIndex> {
    await this.rateLimit();
    
    const response = await fetch('https://api.alternative.me/fng/');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Fear & Greed Index: ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    const fngData = data.data[0];
    
    return {
      value: parseInt(fngData.value),
      value_classification: fngData.value_classification,
      timestamp: parseInt(fngData.timestamp) * 1000,
      time_until_update: parseInt(fngData.time_until_update || '0')
    };
  }

  // Global Market Metrics
  async getGlobalMarketData(): Promise<MarketMetrics> {
    await this.rateLimit();
    
    const response = await fetch(`${this.baseUrl}/global`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch global market data: ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    const globalData = data.data;
    
    return {
      market_cap: globalData.total_market_cap.usd,
      market_cap_change_24h: globalData.market_cap_change_percentage_24h_usd,
      total_volume: globalData.total_volume.usd,
      total_volume_change_24h: 0, // Not available in this API
      market_cap_percentage: globalData.market_cap_percentage.btc,
      active_cryptocurrencies: globalData.active_cryptocurrencies,
      upcoming_icos: globalData.upcoming_icos,
      ongoing_icos: globalData.ongoing_icos,
      ended_icos: globalData.ended_icos
    };
  }

  // On-chain metrics (using CoinGecko's limited on-chain data)
  async getOnChainMetrics(): Promise<OnChainMetrics> {
    await this.rateLimit();
    
    // Using blockchain.info API for some on-chain data
    const [statsResponse, mempoolResponse] = await Promise.all([
      fetch('https://blockchain.info/stats?format=json'),
      fetch('https://blockchain.info/q/unconfirmedcount')
    ]);
    
    if (!statsResponse.ok || !mempoolResponse.ok) {
      throw new Error('Failed to fetch on-chain metrics');
    }
    
    const stats = await statsResponse.json() as any;
    const mempoolSize = await mempoolResponse.text();
    
    return {
      hash_rate: `${(stats.hash_rate / 1000000000000000000).toFixed(2)} EH/s`,
      difficulty: (stats.difficulty / 1000000000000).toFixed(2) + 'T',
      block_height: stats.n_blocks_total,
      mempool_size: parseInt(mempoolSize),
      transactions_24h: stats.n_tx_24hr,
      active_addresses_24h: 0, // Not available in free API
      network_fees_avg: stats.estimated_transaction_volume_usd / stats.n_tx_24hr
    };
  }

  // Technical Indicators (calculated from price data)
  async getTechnicalIndicators(currency = 'usd'): Promise<TechnicalIndicators> {
    const historicalData = await this.getHistoricalData(200, currency, 'daily');
    const prices = historicalData.map(d => d.price);
    
    return {
      rsi: this.calculateRSI(prices, 14),
      sma_20: this.calculateSMA(prices.slice(-20)),
      sma_50: this.calculateSMA(prices.slice(-50)),
      sma_200: this.calculateSMA(prices),
      ema_12: this.calculateEMA(prices, 12),
      ema_26: this.calculateEMA(prices, 26),
      volatility_7d: this.calculateVolatility(prices.slice(-7)),
      volatility_30d: this.calculateVolatility(prices.slice(-30))
    };
  }

  // News and Sentiment (using CoinGecko's news endpoint)
  async getNewsAndSentiment(): Promise<NewsItem[]> {
    await this.rateLimit();
    
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/news');
      
      if (!response.ok) {
        // Fallback to mock data if news API is not available
        return this.getMockNews();
      }
      
      const data = await response.json() as any;
      
      return data.data.slice(0, 10).map((item: any) => ({
        title: item.title,
        description: item.description,
        url: item.url,
        published_at: item.published_at,
        sentiment_score: Math.random() * 2 - 1, // Mock sentiment score
        source: item.news_site
      }));
    } catch (error) {
      return this.getMockNews();
    }
  }

  // Correlation data (mock implementation - would need specialized API)
  async getCorrelationData(): Promise<CorrelationData[]> {
    return [
      {
        asset_1: 'BTC',
        asset_2: 'S&P500',
        correlation: 0.45,
        period: '30d',
        last_updated: new Date().toISOString()
      },
      {
        asset_1: 'BTC',
        asset_2: 'GOLD',
        correlation: 0.23,
        period: '30d',
        last_updated: new Date().toISOString()
      },
      {
        asset_1: 'BTC',
        asset_2: 'ETH',
        correlation: 0.78,
        period: '30d',
        last_updated: new Date().toISOString()
      }
    ];
  }

  // Whale Alerts (mock implementation - would need Whale Alert API)
  async getWhaleAlerts(): Promise<WhaleAlert[]> {
    return [
      {
        blockchain: 'bitcoin',
        symbol: 'BTC',
        amount: 1000,
        amount_usd: 65000000,
        transaction_type: 'transfer',
        hash: '0x1234...abcd',
        from: {
          address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          owner: 'unknown',
          owner_type: 'unknown'
        },
        to: {
          address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
          owner: 'Binance',
          owner_type: 'exchange'
        },
        timestamp: Date.now() - 3600000 // 1 hour ago
      }
    ];
  }

  // Helper methods for technical indicators
  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    
    return 100 - (100 / (1 + rs));
  }

  private calculateSMA(prices: number[]): number {
    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return this.calculateSMA(prices);
    
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(prices.slice(0, period));
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  private calculateVolatility(prices: number[]): number {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(365) * 100; // Annualized volatility as percentage
  }

  private getMockNews(): NewsItem[] {
    return [
      {
        title: "Bitcoin Reaches New Monthly High Amid Institutional Adoption",
        description: "Bitcoin price surges as major institutions continue to adopt cryptocurrency",
        url: "https://example.com/news1",
        published_at: new Date(Date.now() - 3600000).toISOString(),
        sentiment_score: 0.7,
        source: "CryptoNews"
      },
      {
        title: "Central Bank Digital Currencies: Impact on Bitcoin",
        description: "Analysis of how CBDCs might affect Bitcoin's market position",
        url: "https://example.com/news2",
        published_at: new Date(Date.now() - 7200000).toISOString(),
        sentiment_score: -0.2,
        source: "Financial Times"
      }
    ];
  }
}