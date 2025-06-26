#!/usr/bin/env node
import { spawn } from 'child_process';

const testMessages = [
  // List available tools (should now show 9 tools)
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  },
  // Test template listing
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'list_templates',
      arguments: {}
    }
  },
  // Test tag suggestions
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'suggest_tags',
      arguments: {
        title: 'ResearchNotes/KnowledgeManagement'
      }
    }
  },
  // Test connection analysis
  {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'analyze_connections',
      arguments: {
        title: 'ProjectIdeas'
      }
    }
  },
  // Test finding related content
  {
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'find_related_content',
      arguments: {
        title: 'TechnicalNotes/MCP',
        limit: 3
      }
    }
  }
];

const serverProcess = spawn('node', ['dist/index.js'], {
  env: { ...process.env, TIDDLYWIKI_PATH: '../tests' },
  cwd: process.cwd()
});

let responseCount = 0;

serverProcess.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());
    responseCount++;
    
    console.log(`\n📥 Response ${responseCount}:`);
    
    if (response.result?.tools) {
      console.log(`✅ Found ${response.result.tools.length} tools:`, 
        response.result.tools.map(t => t.name));
    } else if (response.result?.content?.[0]?.text) {
      const text = response.result.content[0].text;
      console.log(text.substring(0, 300) + (text.length > 300 ? '...' : ''));
    }
    
    if (responseCount >= testMessages.length) {
      console.log('\n✅ All Phase 2 tests completed!');
      serverProcess.kill();
    }
  } catch (e) {
    // Ignore non-JSON responses
  }
});

serverProcess.stderr.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('running on stdio')) {
    console.log('🚀 Server started, running Phase 2 tests...\n');
    
    // Send test messages with delays
    testMessages.forEach((message, index) => {
      setTimeout(() => {
        console.log(`📤 Test ${index + 1}: ${message.params.name || 'tools/list'}`);
        serverProcess.stdin.write(JSON.stringify(message) + '\n');
      }, index * 1000);
    });
  }
});

setTimeout(() => {
  console.log('\n❌ Test timeout');
  serverProcess.kill();
}, 10000);