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
  currency: 'usd' | 'eur' | 'btc' | 'gbp' | 'jpy';
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

// New interfaces for enhanced financial data
export interface FearGreedIndex {
  value: number;
  value_classification: string;
  timestamp: number;
  time_until_update: number;
}

export interface MarketMetrics {
  market_cap: number;
  market_cap_change_24h: number;
  total_volume: number;
  total_volume_change_24h: number;
  market_cap_percentage: number;
  active_cryptocurrencies: number;
  upcoming_icos: number;
  ongoing_icos: number;
  ended_icos: number;
}

export interface OnChainMetrics {
  hash_rate: string;
  difficulty: string;
  block_height: number;
  mempool_size: number;
  transactions_24h: number;
  active_addresses_24h: number;
  network_fees_avg: number;
}

export interface TechnicalIndicators {
  rsi: number;
  sma_20: number;
  sma_50: number;
  sma_200: number;
  ema_12: number;
  ema_26: number;
  volatility_7d: number;
  volatility_30d: number;
}

export interface NewsItem {
  title: string;
  description: string;
  url: string;
  published_at: string;
  sentiment_score: number;
  source: string;
}

export interface CorrelationData {
  asset_1: string;
  asset_2: string;
  correlation: number;
  period: string;
  last_updated: string;
}

export interface WhaleAlert {
  blockchain: string;
  symbol: string;
  amount: number;
  amount_usd: number;
  transaction_type: string;
  hash: string;
  from: {
    address: string;
    owner: string;
    owner_type: string;
  };
  to: {
    address: string;
    owner: string;
    owner_type: string;
  };
  timestamp: number;
}