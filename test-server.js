#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test the MCP server
const serverPath = join(__dirname, 'dist', 'index.js');

console.log('Testing Bitcoin Chart MCP Server...');
console.log('Server path:', serverPath);

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Send initialization message
const initMessage = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

// Test getting tools
const toolsMessage = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list',
  params: {}
};

// Test getting current price
const priceMessage = {
  jsonrpc: '2.0',
  id: 3,
  method: 'tools/call',
  params: {
    name: 'get_bitcoin_price',
    arguments: {}
  }
};

server.stdout.on('data', (data) => {
  console.log('Server output:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

// Send test messages
setTimeout(() => {
  console.log('Sending initialize message...');
  server.stdin.write(JSON.stringify(initMessage) + '\n');
}, 100);

setTimeout(() => {
  console.log('Sending tools list request...');
  server.stdin.write(JSON.stringify(toolsMessage) + '\n');
}, 500);

setTimeout(() => {
  console.log('Sending price request...');
  server.stdin.write(JSON.stringify(priceMessage) + '\n');
}, 1000);

setTimeout(() => {
  console.log('Closing server...');
  server.kill();
}, 3000);