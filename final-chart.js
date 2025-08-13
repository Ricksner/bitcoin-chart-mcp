#!/usr/bin/env node

import https from 'https';
import fs from 'fs';

console.log('📊 Creating Bitcoin 24h Area Chart...\n');

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
    console.log('🔄 Fetching Bitcoin 24h data from CoinGecko...');
    
    const data = await fetchData('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1');
    
    const prices = data.prices || [];
    console.log(`📈 Retrieved ${prices.length} data points`);
    
    if (prices.length === 0) {
      console.log('❌ No price data available');
      return;
    }
    
    // Chart configuration
    const width = 800;
    const height = 400;
    const padding = 60;
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
    console.log(`📊 24h Change: ${isPositive ? '+' : ''}${priceChange.toFixed(2)}%`);
    console.log(`📈 Range: $${minPrice.toFixed(0)} - $${maxPrice.toFixed(0)}`);
    
    // Generate SVG path points
    const points = prices.map((item, index) => {
      const x = padding + (index / (prices.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((item[1] - minPrice) / priceRange) * chartHeight;
      return { x, y, price: item[1], timestamp: item[0] };
    });
    
    const pathD = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)},${point.y.toFixed(2)}`
    ).join(' ');
    
    const areaPath = `${pathD} L ${(padding + chartWidth).toFixed(2)},${(padding + chartHeight).toFixed(2)} L ${padding},${(padding + chartHeight).toFixed(2)} Z`;
    
    // Create SVG chart
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${isPositive ? '#10b981' : '#ef4444'};stop-opacity:0.4" />
          <stop offset="100%" style="stop-color:${isPositive ? '#10b981' : '#ef4444'};stop-opacity:0.05" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" rx="12"/>
      
      <!-- Header section -->
      <rect x="0" y="0" width="${width}" height="55" fill="#f8fafc" rx="12"/>
      <rect x="0" y="43" width="${width}" height="12" fill="#f8fafc"/>
      
      <!-- Grid lines -->
      ${Array.from({length: 5}, (_, i) => {
        const y = padding + (i / 4) * chartHeight;
        return `<line x1="${padding}" y1="${y}" x2="${padding + chartWidth}" y2="${y}" stroke="#f1f5f9" stroke-width="1"/>`;
      }).join('')}
      ${Array.from({length: 7}, (_, i) => {
        const x = padding + (i / 6) * chartWidth;
        return `<line x1="${x}" y1="${padding}" x2="${x}" y2="${padding + chartHeight}" stroke="#f1f5f9" stroke-width="1"/>`;
      }).join('')}
      
      <!-- Area fill -->
      <path d="${areaPath}" fill="url(#areaGradient)" stroke="none"/>
      
      <!-- Price line -->
      <path d="${pathD}" fill="none" stroke="${isPositive ? '#10b981' : '#ef4444'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      
      <!-- Data points -->
      ${points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 12)) === 0 || i === points.length - 1).map(point => 
        `<circle cx="${point.x}" cy="${point.y}" r="4" fill="${isPositive ? '#10b981' : '#ef4444'}" stroke="white" stroke-width="2"/>`
      ).join('')}
      
      <!-- Chart axes -->
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${padding + chartHeight}" stroke="#64748b" stroke-width="1"/>
      <line x1="${padding}" y1="${padding + chartHeight}" x2="${padding + chartWidth}" y2="${padding + chartHeight}" stroke="#64748b" stroke-width="1"/>
      
      <!-- Title -->
      <text x="24" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold" fill="#0f172a">
        Bitcoin (BTC) Live Chart
      </text>
      
      <!-- Subtitle -->
      <text x="24" y="45" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#64748b">
        24-Hour Area Chart • ${prices.length} data points • Live data from CoinGecko
      </text>
      
      <!-- Current price -->
      <text x="${width - 24}" y="28" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="bold" fill="#0f172a">
        $${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </text>
      
      <!-- Price change -->
      <text x="${width - 24}" y="45" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="${isPositive ? '#10b981' : '#ef4444'}">
        ${isPositive ? '↗' : '↘'} ${isPositive ? '+' : ''}${priceChange.toFixed(2)}% (24h)
      </text>
      
      <!-- Y-axis price labels -->
      ${Array.from({length: 5}, (_, i) => {
        const price = minPrice + (maxPrice - minPrice) * (1 - i / 4);
        const y = padding + (i / 4) * chartHeight + 5;
        const formattedPrice = price >= 100000 ? `${(price / 1000).toFixed(0)}K` : price.toFixed(0);
        return `<text x="${padding - 12}" y="${y}" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#64748b">$${formattedPrice}</text>`;
      }).join('')}
      
      <!-- X-axis time labels -->
      ${Array.from({length: 7}, (_, i) => {
        const dataIndex = Math.floor((i / 6) * (prices.length - 1));
        const x = padding + (i / 6) * chartWidth;
        const y = padding + chartHeight + 20;
        if (dataIndex < prices.length && prices[dataIndex]) {
          const date = new Date(prices[dataIndex][0]);
          const label = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          return `<text x="${x}" y="${y}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#64748b">${label}</text>`;
        }
        return '';
      }).join('')}
      
      <!-- Chart info -->
      <text x="${width / 2}" y="${height - 12}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="#94a3b8">
        Generated ${new Date().toLocaleString()} • Real-time cryptocurrency data
      </text>
    </svg>`;
    
    // Save the chart
    const filename = 'bitcoin-24h-area-chart.svg';
    fs.writeFileSync(filename, svg);
    
    console.log('\n🎉 Bitcoin 24h Area Chart Generated Successfully!');
    console.log(`💾 File: ${filename}`);
    console.log(`📊 Chart Type: Area chart with ${isPositive ? 'green' : 'red'} gradient (${isPositive ? 'gains' : 'losses'})`);
    console.log(`📏 Dimensions: ${width}x${height}px`);
    console.log(`📈 Data Points: ${prices.length} price samples over 24 hours`);
    console.log('\n🌐 To view: Open the SVG file in any web browser!');
    
  } catch (error) {
    console.error('❌ Error creating chart:', error.message);
  }
}

createChart();