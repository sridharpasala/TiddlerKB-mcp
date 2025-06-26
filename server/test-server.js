#!/usr/bin/env node
import { spawn } from 'child_process';
import { createInterface } from 'readline';

// Test messages based on MCP protocol
const testMessages = [
  // List available tools
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  },
  // Search for tiddlers
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'search_tiddlers',
      arguments: {
        query: 'knowledge',
        limit: 5
      }
    }
  },
  // List all tiddlers
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'list_tiddlers',
      arguments: {}
    }
  },
  // Create a new tiddler
  {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'create_tiddler',
      arguments: {
        title: 'TestTiddler',
        text: 'This is a test tiddler created by the MCP server test script.',
        tags: ['test', 'mcp', 'automated']
      }
    }
  }
];

// Start the server
const serverProcess = spawn('node', ['dist/index.js'], {
  env: { ...process.env, TIDDLYWIKI_PATH: '../tests' },
  cwd: process.cwd()
});

// Create readline interface for server output
const rl = createInterface({
  input: serverProcess.stdout,
  output: process.stdout,
  terminal: false
});

// Handle server output
rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    console.log('\n📥 Response:', JSON.stringify(response, null, 2));
  } catch (e) {
    // Not JSON, just log it
    if (line.trim()) console.log('Server:', line);
  }
});

// Handle server errors
serverProcess.stderr.on('data', (data) => {
  console.error('Server Error:', data.toString());
});

// Send test messages
async function runTests() {
  console.log('🚀 Starting MCP Server Tests...\n');
  
  for (const [index, message] of testMessages.entries()) {
    console.log(`\n📤 Test ${index + 1}: ${message.method} ${message.params.name || ''}`);
    console.log('Request:', JSON.stringify(message, null, 2));
    
    serverProcess.stdin.write(JSON.stringify(message) + '\n');
    
    // Wait a bit between messages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Wait for final responses
  setTimeout(() => {
    console.log('\n✅ Tests completed. Shutting down server...');
    serverProcess.kill();
    process.exit(0);
  }, 3000);
}

// Wait for server to start
setTimeout(runTests, 1000);