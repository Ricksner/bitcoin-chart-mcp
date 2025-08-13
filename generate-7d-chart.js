#!/usr/bin/env node

import https from 'https';
import fs from 'fs';

console.log('📊 Creating Bitcoin 7-Day Chart...\n');

function fetchData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function createChart() {
  try {
    console.log('🔄 Fetching Bitcoin 7-day data from CoinGecko...');
    
    const data = await fetchData('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7&interval=daily');
    
    const prices = data.prices || [];
    console.log(`📈 Retrieved ${prices.length} daily data points`);
    
    if (prices.length === 0) {
      console.log('❌ No price data available');
      return;
    }
    
    // Chart configuration
    const width = 900;
    const height = 450;
    const padding = 70;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    // Calculate price metrics
    const priceValues = prices.map(p => p[1]);
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const priceRange = maxPrice - minPrice;
    const currentPrice = priceValues[priceValues.length - 1];
    const startPrice = priceValues[0];
    const priceChange = ((currentPrice - startPrice) / startPrice) * 100;
    const isPositive = priceChange >= 0;
    
    console.log(`💰 Current Price: $${currentPrice.toLocaleString()}`);
    console.log(`📊 7-day Change: ${isPositive ? '+' : ''}${priceChange.toFixed(2)}%`);
    console.log(`📈 Weekly Range: $${minPrice.toFixed(0)} - $${maxPrice.toFixed(0)}`);
    console.log(`📊 Price Movement: ${(priceRange / minPrice * 100).toFixed(1)}% volatility`);
    
    // Generate SVG path points
    const points = prices.map((item, index) => {
      const x = padding + (index / (prices.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((item[1] - minPrice) / priceRange) * chartHeight;
      return { x, y, price: item[1], timestamp: item[0] };
    });
    
    const pathD = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)},${point.y.toFixed(2)}`
    ).join(' ');
    
    // Create SVG chart
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:${isPositive ? '#059669' : '#dc2626'};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${isPositive ? '#10b981' : '#ef4444'};stop-opacity:1" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Background with subtle gradient -->
      <defs>
        <linearGradient id="backgroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#fafafa;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f5f5f5;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#backgroundGradient)" stroke="#e5e7eb" stroke-width="1" rx="16"/>
      
      <!-- Header section -->
      <rect x="0" y="0" width="${width}" height="65" fill="#ffffff" rx="16"/>
      <rect x="0" y="55" width="${width}" height="10" fill="#ffffff"/>
      
      <!-- Grid lines -->
      ${Array.from({length: 6}, (_, i) => {
        const y = padding + (i / 5) * chartHeight;
        return `<line x1="${padding}" y1="${y}" x2="${padding + chartWidth}" y2="${y}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2,2"/>`;
      }).join('')}
      ${Array.from({length: 8}, (_, i) => {
        const x = padding + (i / 7) * chartWidth;
        return `<line x1="${x}" y1="${padding}" x2="${x}" y2="${padding + chartHeight}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2,2"/>`;
      }).join('')}
      
      <!-- Price line with glow effect -->
      <path d="${pathD}" fill="none" stroke="url(#lineGradient)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>
      
      <!-- Data points with larger circles -->
      ${points.map((point, index) => 
        `<circle cx="${point.x}" cy="${point.y}" r="6" fill="${isPositive ? '#10b981' : '#ef4444'}" stroke="white" stroke-width="3"/>
         <circle cx="${point.x}" cy="${point.y}" r="3" fill="white" opacity="0.8"/>`
      ).join('')}
      
      <!-- Chart axes -->
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${padding + chartHeight}" stroke="#475569" stroke-width="2"/>
      <line x1="${padding}" y1="${padding + chartHeight}" x2="${padding + chartWidth}" y2="${padding + chartHeight}" stroke="#475569" stroke-width="2"/>
      
      <!-- Title -->
      <text x="30" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="bold" fill="#0f172a">
        Bitcoin (BTC) - 7 Day Price Chart
      </text>
      
      <!-- Subtitle -->
      <text x="30" y="50" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#64748b">
        Weekly Performance • ${prices.length} daily data points • Live data from CoinGecko API
      </text>
      
      <!-- Current price -->
      <text x="${width - 30}" y="32" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="bold" fill="#0f172a">
        $${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </text>
      
      <!-- Price change with trend indicator -->
      <text x="${width - 30}" y="50" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="${isPositive ? '#10b981' : '#ef4444'}">
        ${isPositive ? '📈' : '📉'} ${isPositive ? '+' : ''}${priceChange.toFixed(2)}% (7 days)
      </text>
      
      <!-- Y-axis price labels -->
      ${Array.from({length: 6}, (_, i) => {
        const price = minPrice + (maxPrice - minPrice) * (1 - i / 5);
        const y = padding + (i / 5) * chartHeight + 5;
        const formattedPrice = price >= 100000 ? `${(price / 1000).toFixed(0)}K` : price.toFixed(0);
        return `<text x="${padding - 15}" y="${y}" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#64748b">$${formattedPrice}</text>`;
      }).join('')}
      
      <!-- X-axis time labels -->
      ${Array.from({length: 8}, (_, i) => {
        const dataIndex = Math.floor((i / 7) * (prices.length - 1));
        const x = padding + (i / 7) * chartWidth;
        const y = padding + chartHeight + 25;
        if (dataIndex < prices.length && prices[dataIndex]) {
          const date = new Date(prices[dataIndex][0]);
          const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          return `<text x="${x}" y="${y}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#64748b">${label}</text>`;
        }
        return '';
      }).join('')}
      
      <!-- Weekly statistics box -->
      <rect x="${width - 220}" y="${padding + 20}" width="180" height="80" fill="rgba(255,255,255,0.95)" stroke="#e2e8f0" stroke-width="1" rx="8"/>
      <text x="${width - 210}" y="${padding + 40}" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="#374151">Weekly Statistics</text>
      <text x="${width - 210}" y="${padding + 55}" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#6b7280">High: $${maxPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</text>
      <text x="${width - 210}" y="${padding + 70}" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#6b7280">Low: $${minPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</text>
      <text x="${width - 210}" y="${padding + 85}" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#6b7280">Volatility: ${(priceRange / minPrice * 100).toFixed(1)}%</text>
      
      <!-- Chart info -->
      <text x="${width / 2}" y="${height - 15}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#94a3b8">
        Generated ${new Date().toLocaleString()} • Professional Bitcoin Price Analysis
      </text>
    </svg>`;
    
    // Save the chart
    const filename = 'bitcoin-7d-chart.svg';
    fs.writeFileSync(filename, svg);
    
    console.log('\n🎉 Bitcoin 7-Day Chart Generated Successfully!');
    console.log(`💾 File: ${filename}`);
    console.log(`📊 Chart Type: 7-day line chart with trend analysis`);
    console.log(`📏 Dimensions: ${width}x${height}px`);
    console.log(`📈 Data Points: ${prices.length} daily price samples`);
    console.log(`🎨 Style: Professional design with glow effects and statistics box`);
    console.log('\n🌐 To view: Open the SVG file in any web browser!');
    
  } catch (error) {
    console.error('❌ Error creating chart:', error.message);
  }
}

createChart();