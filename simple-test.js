#!/usr/bin/env node

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, 'dist', 'index.js');

console.log('🧪 Testing Bitcoin MCP Server...\n');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';

server.stdout.on('data', (data) => {
  buffer += data.toString();
  console.log('📤 Server Response:', data.toString());
});

server.stderr.on('data', (data) => {
  console.log('⚠️ Server Error:', data.toString());
});

// 1. Initialize
const init = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0.0' }
  }
};

// 2. Get current price (simpler test)
const priceRequest = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'get_bitcoin_price',
    arguments: { currency: 'usd' }
  }
};

console.log('🔄 Sending initialization...');
server.stdin.write(JSON.stringify(init) + '\n');

setTimeout(() => {
  console.log('💰 Requesting Bitcoin price...');
  server.stdin.write(JSON.stringify(priceRequest) + '\n');
}, 1000);

setTimeout(() => {
  server.kill('SIGTERM');
}, 5000);