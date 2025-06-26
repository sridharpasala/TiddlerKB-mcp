#!/usr/bin/env node
import { spawn } from 'child_process';

const testMessage = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'apply_template',
    arguments: {
      templateName: 'daily-journal',
      title: 'Daily Journal - Phase 2 Testing',
      variables: {
        description: 'Testing the new Phase 2 template functionality'
      }
    }
  }
};

const serverProcess = spawn('node', ['dist/index.js'], {
  env: { ...process.env, TIDDLYWIKI_PATH: '../tests' },
  cwd: process.cwd()
});

serverProcess.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());
    console.log('✅ Template applied successfully!');
    console.log(response.result.content[0].text);
    serverProcess.kill();
  } catch (e) {
    // Ignore non-JSON
  }
});

serverProcess.stderr.on('data', (data) => {
  if (data.toString().includes('running on stdio')) {
    console.log('📤 Testing template application...');
    serverProcess.stdin.write(JSON.stringify(testMessage) + '\n');
  }
});

setTimeout(() => {
  console.log('❌ Test timeout');
  serverProcess.kill();
}, 5000);