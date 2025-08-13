#!/usr/bin/env node

import fetch from 'node-fetch';
import fs from 'fs';

console.log('🚀 Creating Bitcoin 24h Area Chart Demo...\n');

// Generate demo chart with current data
async function createBitcoinChart() {
  try {
    // Get current price
    const priceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_vol=true');
    const priceData = await priceResponse.json();
    const currentPrice = priceData.bitcoin.usd;
    const volume = priceData.bitcoin.usd_24h_vol;
    
    console.log(`💰 Current Bitcoin Price: $${currentPrice.toLocaleString()}`);
    console.log(`📊 24h Volume: $${volume?.toLocaleString()}\n`);
    
    // Get 24h historical data
    const histResponse = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly');
    const histData = await histResponse.json();
    
    const prices = histData.prices || [];
    console.log(`📈 Retrieved ${prices.length} data points for 24h chart\n`);
    
    if (prices.length === 0) {
      console.log('❌ No price data available');
      return;
    }
    
    // Calculate chart dimensions
    const width = 800;
    const height = 400;
    const padding = 60;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    // Calculate price range
    const priceValues = prices.map(p => p[1]);
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const priceRange = maxPrice - minPrice;
    const priceChange = ((currentPrice - priceValues[0]) / priceValues[0]) * 100;
    const isPositive = priceChange >= 0;
    
    console.log(`📊 Price Range: $${minPrice.toFixed(0)} - $${maxPrice.toFixed(0)}`);
    console.log(`📈 24h Change: ${isPositive ? '+' : ''}${priceChange.toFixed(2)}%\n`);
    
    // Generate SVG points
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
      ${Array.from({length: 5}, (_, i) => {
        const y = padding + (i / 4) * chartHeight;
        return `<line x1="${padding}" y1="${y}" x2="${padding + chartWidth}" y2="${y}" stroke="#f3f4f6" stroke-width="1"/>`;
      }).join('')}
      
      ${Array.from({length: 7}, (_, i) => {
        const x = padding + (i / 6) * chartWidth;
        return `<line x1="${x}" y1="${padding}" x2="${x}" y2="${padding + chartHeight}" stroke="#f3f4f6" stroke-width="1"/>`;
      }).join('')}
      
      <!-- Area fill -->
      <path d="${areaPath}" fill="${isPositive ? 'url(#positiveGradient)' : 'url(#negativeGradient)'}" stroke="none"/>
      
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
        Last 24 Hours
      </text>
      
      <!-- Current Price -->
      <text x="${width - 20}" y="25" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold" fill="#111827">
        $${currentPrice.toLocaleString()}
      </text>
      
      <!-- Price Change -->
      <text x="${width - 20}" y="42" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="${isPositive ? '#22c55e' : '#ef4444'}">
        ${isPositive ? '+' : ''}${priceChange.toFixed(2)}%
      </text>
      
      <!-- Y-axis labels -->
      ${Array.from({length: 5}, (_, i) => {
        const price = minPrice + (maxPrice - minPrice) * (1 - i / 4);
        const y = padding + (i / 4) * chartHeight + 4;
        const formattedPrice = price >= 1000 ? (price / 1000).toFixed(0) + 'K' : price.toFixed(0);
        return `<text x="${padding - 10}" y="${y}" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="#6b7280">$${formattedPrice}</text>`;
      }).join('')}
      
      <!-- X-axis labels -->
      ${Array.from({length: 7}, (_, i) => {
        const dataIndex = Math.floor((i / 6) * (prices.length - 1));
        const x = padding + (i / 6) * chartWidth;
        const y = padding + chartHeight + 15;
        if (dataIndex < prices.length) {
          const date = new Date(prices[dataIndex][0]);
          const label = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          return `<text x="${x}" y="${y}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="#6b7280">${label}</text>`;
        }
        return '';
      }).join('')}
    </svg>`;
    
    // Save the chart
    fs.writeFileSync('bitcoin-24h-area-chart-demo.svg', svg);
    
    console.log('✅ Bitcoin 24h Area Chart Generated Successfully!');
    console.log('💾 Saved as: bitcoin-24h-area-chart-demo.svg');
    console.log('🌐 Open this file in any web browser to view the chart!');
    console.log(`📊 Chart shows ${isPositive ? 'gains' : 'losses'} in green/red coloring`);
    
  } catch (error) {
    console.error('❌ Error creating chart:', error.message);
  }
}

createBitcoinChart();