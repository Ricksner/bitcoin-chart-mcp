export interface BitcoinPrice {
  timestamp: number;
  price: number;
  volume?: number;
}

export interface ChartConfig {
  timeframe: '1h' | '24h' | '7d' | '30d' | '1y';
  chartType: 'line' | 'candlestick' | 'area';
  width: number;
  height: number;
  currency: 'usd' | 'eur' | 'btc';
}

export interface CoinGeckoResponse {
  prices: [number, number][];
  market_caps?: [number, number][];
  total_volumes?: [number, number][];
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill: boolean;
  }>;
}