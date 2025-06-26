#!/usr/bin/env node
import { spawn } from 'child_process';

const testMessages = [
  // Test knowledge gap analysis
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'find_knowledge_gaps',
      arguments: {}
    }
  },
  // Test content enhancement
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'enhance_content',
      arguments: {
        title: 'ProjectIdeas',
        enhancements: ['tags', 'links']
      }
    }
  },
  // Test summary generation
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'generate_summary',
      arguments: {
        style: 'executive',
        tiddlers: ['ResearchNotes/KnowledgeManagement', 'TechnicalNotes/MCP']
      }
    }
  },
  // Test study materials creation
  {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'create_study_materials',
      arguments: {
        materialType: 'flashcards',
        topic: 'research'
      }
    }
  }
];

const serverProcess = spawn('node', ['dist/index.js'], {
  env: { ...process.env, TIDDLYWIKI_PATH: '../tests' },
  cwd: process.cwd()
});

let responseCount = 0;
const testNames = ['Knowledge Gaps', 'Content Enhancement', 'Summary Generation', 'Study Materials'];

serverProcess.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());
    responseCount++;
    
    console.log(`\n📥 ${testNames[responseCount - 1]} Result:`);
    
    if (response.result?.content?.[0]?.text) {
      const text = response.result.content[0].text;
      console.log(text.substring(0, 400) + (text.length > 400 ? '...' : ''));
    }
    
    if (responseCount >= testMessages.length) {
      console.log('\n✅ All Phase 3 tests completed!');
      serverProcess.kill();
    }
  } catch (e) {
    // Ignore non-JSON responses
  }
});

serverProcess.stderr.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('running on stdio')) {
    console.log('🚀 Testing Phase 3 AI-Powered Features...\n');
    
    // Send test messages with delays
    testMessages.forEach((message, index) => {
      setTimeout(() => {
        console.log(`📤 Test ${index + 1}: ${testNames[index]}`);
        serverProcess.stdin.write(JSON.stringify(message) + '\n');
      }, index * 2000);
    });
  }
});

setTimeout(() => {
  console.log('\n❌ Test timeout');
  serverProcess.kill();
}, 15000);