#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, 'dist', 'index.js');

console.log('🚀 Generating Bitcoin 24h Area Chart...\n');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let responseData = '';

// Initialize the server
const initMessage = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'manual-test',
      version: '1.0.0'
    }
  }
};

// Request to generate Bitcoin chart
const chartMessage = {
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

server.stdout.on('data', (data) => {
  const response = data.toString();
  responseData += response;
  
  try {
    const parsed = JSON.parse(response);
    if (parsed.id === 2 && parsed.result) {
      console.log('✅ Chart generated successfully!');
      console.log('\n📊 Chart Details:');
      
      if (parsed.result.content) {
        const textContent = parsed.result.content.find(c => c.type === 'text');
        const imageContent = parsed.result.content.find(c => c.type === 'image');
        
        if (textContent) {
          console.log(textContent.text);
        }
        
        if (imageContent) {
          console.log('🎨 Chart Format:', imageContent.mimeType);
          console.log('📏 Chart Size: ~', Math.round(imageContent.data.length / 1024), 'KB');
          
          // Save the SVG to a file
          const svgData = Buffer.from(imageContent.data.split(',')[1], 'base64').toString();
          
          import('fs').then(fs => {
            fs.writeFileSync('bitcoin-24h-chart.svg', svgData);
            console.log('💾 Chart saved as: bitcoin-24h-chart.svg');
            console.log('\n🌐 You can open this file in any web browser to view the chart!');
            
            server.kill();
          });
        }
      }
    }
  } catch (e) {
    // Ignore parsing errors for partial responses
  }
});

server.on('close', (code) => {
  console.log(`\n🔚 Server process completed`);
});

// Send messages with delays
setTimeout(() => {
  server.stdin.write(JSON.stringify(initMessage) + '\n');
}, 100);

setTimeout(() => {
  server.stdin.write(JSON.stringify(chartMessage) + '\n');
}, 500);

setTimeout(() => {
  if (!server.killed) {
    console.log('\n⏰ Test timeout - killing server');
    server.kill();
  }
}, 10000);