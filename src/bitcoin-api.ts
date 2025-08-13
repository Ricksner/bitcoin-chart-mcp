import fetch from 'node-fetch';
import { BitcoinPrice, CoinGeckoResponse } from './types.js';

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
}