#!/usr/bin/env node

import fetch from 'node-fetch';
import fs from 'fs';

console.log('📊 Creating Bitcoin 24h Area Chart...\n');

async function createChart() {
  try {
    // Get 24h Bitcoin data
    const response = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly');
    const data = await response.json();
    
    const prices = data.prices || [];
    console.log(`📈 Retrieved ${prices.length} hourly data points`);
    
    if (prices.length === 0) {
      console.log('❌ No price data available');
      return;
    }
    
    // Chart setup
    const width = 800;
    const height = 400;
    const padding = 60;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    // Calculate values
    const priceValues = prices.map(p => p[1]);
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const priceRange = maxPrice - minPrice;
    const currentPrice = priceValues[priceValues.length - 1];
    const startPrice = priceValues[0];
    const priceChange = ((currentPrice - startPrice) / startPrice) * 100;
    const isPositive = priceChange >= 0;
    
    console.log(`💰 Current Price: $${currentPrice.toLocaleString()}`);
    console.log(`📊 24h Change: ${isPositive ? '+' : ''}${priceChange.toFixed(2)}%`);
    console.log(`📈 Price Range: $${minPrice.toFixed(0)} - $${maxPrice.toFixed(0)}`);
    
    // Generate chart points
    const points = prices.map((item, index) => {
      const x = padding + (index / (prices.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((item[1] - minPrice) / priceRange) * chartHeight;
      return { x, y, price: item[1], timestamp: item[0] };
    });
    
    const pathD = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`
    ).join(' ');
    
    const areaPath = `${pathD} L ${padding + chartWidth},${padding + chartHeight} L ${padding},${padding + chartHeight} Z`;
    
    // Generate SVG
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${isPositive ? '#22c55e' : '#ef4444'};stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:${isPositive ? '#22c55e' : '#ef4444'};stop-opacity:0.05" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" rx="8"/>
      
      <!-- Header -->
      <rect x="0" y="0" width="${width}" height="50" fill="#f9fafb" rx="8"/>
      <rect x="0" y="42" width="${width}" height="8" fill="#f9fafb"/>
      
      <!-- Grid -->
      ${Array.from({length: 5}, (_, i) => {
        const y = padding + (i / 4) * chartHeight;
        return `<line x1="${padding}" y1="${y}" x2="${padding + chartWidth}" y2="${y}" stroke="#f3f4f6"/>`;
      }).join('')}
      
      <!-- Area fill -->
      <path d="${areaPath}" fill="url(#areaGradient)"/>
      
      <!-- Price line -->
      <path d="${pathD}" fill="none" stroke="${isPositive ? '#22c55e' : '#ef4444'}" stroke-width="3" stroke-linecap="round"/>
      
      <!-- Points -->
      ${points.filter((_, i) => i % 4 === 0 || i === points.length - 1).map(point => 
        `<circle cx="${point.x}" cy="${point.y}" r="4" fill="${isPositive ? '#22c55e' : '#ef4444'}" stroke="white" stroke-width="2"/>`
      ).join('')}
      
      <!-- Axes -->
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${padding + chartHeight}" stroke="#6b7280"/>
      <line x1="${padding}" y1="${padding + chartHeight}" x2="${padding + chartWidth}" y2="${padding + chartHeight}" stroke="#6b7280"/>
      
      <!-- Title -->
      <text x="20" y="25" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#111827">
        Bitcoin (BTC) - 24 Hour Area Chart
      </text>
      
      <!-- Timeframe -->
      <text x="20" y="42" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">
        Last 24 Hours • ${prices.length} data points
      </text>
      
      <!-- Current Price -->
      <text x="${width - 20}" y="25" text-anchor="end" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#111827">
        $${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </text>
      
      <!-- Price Change -->
      <text x="${width - 20}" y="42" text-anchor="end" font-family="Arial, sans-serif" font-size="14" fill="${isPositive ? '#22c55e' : '#ef4444'}">
        ${isPositive ? '+' : ''}${priceChange.toFixed(2)}%
      </text>
      
      <!-- Y-axis Price Labels -->
      ${Array.from({length: 5}, (_, i) => {
        const price = minPrice + (maxPrice - minPrice) * (1 - i / 4);
        const y = padding + (i / 4) * chartHeight + 4;
        const formattedPrice = price >= 100000 ? `${(price / 1000).toFixed(0)}K` : price.toFixed(0);
        return `<text x="${padding - 10}" y="${y}" text-anchor="end" font-family="Arial, sans-serif" font-size="10" fill="#6b7280">$${formattedPrice}</text>`;
      }).join('')}
      
      <!-- X-axis Time Labels -->
      ${Array.from({length: 7}, (_, i) => {
        const dataIndex = Math.floor((i / 6) * (prices.length - 1));
        const x = padding + (i / 6) * chartWidth;
        const y = padding + chartHeight + 15;
        if (dataIndex < prices.length) {
          const date = new Date(prices[dataIndex][0]);
          const label = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          return `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#6b7280">${label}</text>`;
        }
        return '';
      }).join('')}
      
      <!-- Trend indicator -->
      <text x="${width / 2}" y="${height - 10}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#9ca3af">
        Live Bitcoin Price Chart • CoinGecko API
      </text>
    </svg>`;
    
    // Save chart
    fs.writeFileSync('bitcoin-24h-area-chart.svg', svg);
    
    console.log('\n✅ Chart Generated Successfully!');
    console.log('💾 Saved as: bitcoin-24h-area-chart.svg');
    console.log('📊 Chart Type: 24-hour Area Chart');
    console.log(`🎨 Color: ${isPositive ? 'Green (gains)' : 'Red (losses)'}`);
    console.log('🌐 Open the file in any web browser to view!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createChart();