#!/usr/bin/env node

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, 'dist', 'index.js');

console.log('📊 Generating Bitcoin 24h Area Chart...\n');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

server.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());
    
    if (response.id === 1) {
      console.log('✅ Server initialized successfully');
    }
    
    if (response.id === 2 && response.result) {
      console.log('🎨 Chart generated successfully!\n');
      
      const content = response.result.content;
      const textContent = content.find(c => c.type === 'text');
      const imageContent = content.find(c => c.type === 'image');
      
      if (textContent) {
        console.log(textContent.text);
      }
      
      if (imageContent && imageContent.data) {
        // Extract SVG data
        const base64Data = imageContent.data.split(',')[1];
        const svgData = Buffer.from(base64Data, 'base64').toString();
        
        // Save to file
        fs.writeFileSync('bitcoin-24h-area-chart.svg', svgData);
        
        console.log('\n💾 Chart saved as: bitcoin-24h-area-chart.svg');
        console.log('📊 Chart Type: 24-hour Area Chart');
        console.log('📏 File Size:', Math.round(svgData.length / 1024), 'KB');
        console.log('\n🌐 Open the SVG file in any web browser to view the chart!');
        
        server.kill();
      }
    }
  } catch (e) {
    // Handle partial JSON responses
  }
});

server.stderr.on('data', (data) => {
  console.log('ℹ️', data.toString().trim());
});

// Initialize server
const init = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'chart-generator', version: '1.0.0' }
  }
};

// Generate 24h area chart
const chartRequest = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'get_bitcoin_chart',
    arguments: {
      timeframe: '24h',
      chartType: 'area',
      width: 800,
      height: 400,
      currency: 'usd'
    }
  }
};

// Send requests
server.stdin.write(JSON.stringify(init) + '\n');

setTimeout(() => {
  server.stdin.write(JSON.stringify(chartRequest) + '\n');
}, 500);

setTimeout(() => {
  if (!server.killed) {
    console.log('\n⏰ Timeout reached');
    server.kill();
  }
}, 10000);