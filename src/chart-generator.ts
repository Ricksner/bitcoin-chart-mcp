import { BitcoinPrice, ChartConfig } from './types.js';

export class ChartGenerator {
  async generateSVGChart(
    data: BitcoinPrice[],
    config: Partial<ChartConfig> = {}
  ): Promise<string> {
    const width = config.width || 800;
    const height = config.height || 400;
    const padding = 60;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    if (data.length === 0) {
      return this.createEmptySVG(width, height);
    }

    const minPrice = Math.min(...data.map(d => d.price));
    const maxPrice = Math.max(...data.map(d => d.price));
    const priceRange = maxPrice - minPrice;

    const points = data.map((item, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((item.price - minPrice) / priceRange) * chartHeight;
      return { x, y, price: item.price, timestamp: item.timestamp };
    });

    const pathD = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`
    ).join(' ');

    const isArea = config.chartType === 'area';
    const areaPath = isArea ? 
      `${pathD} L ${padding + chartWidth},${padding + chartHeight} L ${padding},${padding + chartHeight} Z` : 
      '';

    const currentPrice = data[data.length - 1]?.price || 0;
    const priceChange = data.length > 1 ? 
      ((currentPrice - data[0].price) / data[0].price) * 100 : 0;
    const isPositive = priceChange >= 0;

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#f7931a;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#f7931a;stop-opacity:0.05" />
          </linearGradient>
          <linearGradient id="positiveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#22c55e;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#22c55e;stop-opacity:0.05" />
          </linearGradient>
          <linearGradient id="negativeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#ef4444;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#ef4444;stop-opacity:0.05" />
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="${width}" height="${height}" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" rx="8"/>
        
        <!-- Header Background -->
        <rect x="0" y="0" width="${width}" height="50" fill="#f9fafb" stroke="none" rx="8"/>
        <rect x="0" y="42" width="${width}" height="8" fill="#f9fafb" stroke="none"/>
        
        <!-- Grid lines -->
        ${this.generateGridLines(width, height, padding, chartWidth, chartHeight)}
        
        <!-- Area fill -->
        ${isArea ? `<path d="${areaPath}" fill="${isPositive ? 'url(#positiveGradient)' : 'url(#negativeGradient)'}" stroke="none"/>` : ''}
        
        <!-- Price line -->
        <path d="${pathD}" fill="none" stroke="${isPositive ? '#22c55e' : '#ef4444'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        
        <!-- Data points -->
        ${points.map((point, index) => 
          index % Math.max(1, Math.floor(points.length / 10)) === 0 || index === points.length - 1 ?
          `<circle cx="${point.x}" cy="${point.y}" r="4" fill="${isPositive ? '#22c55e' : '#ef4444'}" stroke="white" stroke-width="2"/>` : ''
        ).join('')}
        
        <!-- Axes -->
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${padding + chartHeight}" stroke="#6b7280" stroke-width="1"/>
        <line x1="${padding}" y1="${padding + chartHeight}" x2="${padding + chartWidth}" y2="${padding + chartHeight}" stroke="#6b7280" stroke-width="1"/>
        
        <!-- Title -->
        <text x="20" y="25" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" fill="#111827">
          Bitcoin (BTC) Price Chart
        </text>
        
        <!-- Timeframe -->
        <text x="20" y="42" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#6b7280">
          ${this.formatTimeframe(config.timeframe || '7d')}
        </text>
        
        <!-- Current Price -->
        <text x="${width - 20}" y="25" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold" fill="#111827">
          $${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </text>
        
        <!-- Price Change -->
        <text x="${width - 20}" y="42" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="${isPositive ? '#22c55e' : '#ef4444'}">
          ${isPositive ? '+' : ''}${priceChange.toFixed(2)}%
        </text>
        
        <!-- Y-axis labels (prices) -->
        ${this.generatePriceLabels(minPrice, maxPrice, padding, chartHeight)}
        
        <!-- X-axis labels (time) -->
        ${this.generateTimeLabels(data, padding, chartWidth, chartHeight, config.timeframe || '7d')}
        
        <!-- Hover tooltips preparation -->
        ${points.map((point, index) => `
          <g class="tooltip-group" opacity="0">
            <rect x="${point.x - 40}" y="${point.y - 35}" width="80" height="30" fill="#1f2937" rx="4" stroke="#374151"/>
            <text x="${point.x}" y="${point.y - 20}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="white">
              $${point.price.toLocaleString()}
            </text>
            <text x="${point.x}" y="${point.y - 10}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" fill="#d1d5db">
              ${new Date(point.timestamp).toLocaleDateString()}
            </text>
          </g>
        `).join('')}
        
        <!-- Interactive overlay -->
        <rect x="${padding}" y="${padding}" width="${chartWidth}" height="${chartHeight}" fill="transparent" stroke="none"/>
        
        <style>
          .tooltip-group {
            pointer-events: none;
            transition: opacity 0.2s ease;
          }
          svg:hover .tooltip-group {
            opacity: 1;
          }
        </style>
      </svg>
    `;
  }

  private generateGridLines(width: number, height: number, padding: number, chartWidth: number, chartHeight: number): string {
    let gridLines = '';
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i / 4) * chartHeight;
      gridLines += `<line x1="${padding}" y1="${y}" x2="${padding + chartWidth}" y2="${y}" stroke="#f3f4f6" stroke-width="1"/>`;
    }
    
    // Vertical grid lines
    for (let i = 0; i <= 6; i++) {
      const x = padding + (i / 6) * chartWidth;
      gridLines += `<line x1="${x}" y1="${padding}" x2="${x}" y2="${padding + chartHeight}" stroke="#f3f4f6" stroke-width="1"/>`;
    }
    
    return gridLines;
  }

  private generatePriceLabels(minPrice: number, maxPrice: number, padding: number, chartHeight: number): string {
    let labels = '';
    
    for (let i = 0; i <= 4; i++) {
      const price = minPrice + (maxPrice - minPrice) * (1 - i / 4);
      const y = padding + (i / 4) * chartHeight + 4;
      labels += `<text x="${padding - 10}" y="${y}" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="#6b7280">
        $${this.formatPrice(price)}
      </text>`;
    }
    
    return labels;
  }

  private generateTimeLabels(data: BitcoinPrice[], padding: number, chartWidth: number, chartHeight: number, timeframe: string): string {
    if (data.length === 0) return '';
    
    let labels = '';
    const labelCount = 6;
    
    for (let i = 0; i <= labelCount; i++) {
      const dataIndex = Math.floor((i / labelCount) * (data.length - 1));
      const x = padding + (i / labelCount) * chartWidth;
      const y = padding + chartHeight + 15;
      
      if (dataIndex < data.length) {
        const date = new Date(data[dataIndex].timestamp);
        let label = '';
        
        if (timeframe === '1h' || timeframe === '24h') {
          label = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } else if (timeframe === '7d') {
          label = date.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
          label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        
        labels += `<text x="${x}" y="${y}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="#6b7280">
          ${label}
        </text>`;
      }
    }
    
    return labels;
  }

  private formatPrice(price: number): string {
    if (price >= 1000000) {
      return (price / 1000000).toFixed(1) + 'M';
    } else if (price >= 1000) {
      return (price / 1000).toFixed(0) + 'K';
    } else {
      return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
  }

  private formatTimeframe(timeframe: string): string {
    const formats: Record<string, string> = {
      '1h': 'Last Hour',
      '24h': 'Last 24 Hours',
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days',
      '1y': 'Last Year'
    };
    return formats[timeframe] || 'Last 7 Days';
  }

  private createEmptySVG(width: number, height: number): string {
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1" rx="8"/>
        <text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#9ca3af">
          No data available
        </text>
      </svg>
    `;
  }
}