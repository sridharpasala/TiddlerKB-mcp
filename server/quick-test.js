#!/usr/bin/env node
import { spawn } from 'child_process';

const serverProcess = spawn('node', ['dist/index.js'], {
  env: { ...process.env, TIDDLYWIKI_PATH: '../tests' },
  cwd: process.cwd()
});

const listToolsMessage = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

serverProcess.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());
    console.log('✅ Tools registered:', response.result.tools.map(t => t.name));
    serverProcess.kill();
  } catch (e) {
    // Not JSON, ignore
  }
});

setTimeout(() => {
  serverProcess.stdin.write(JSON.stringify(listToolsMessage) + '\n');
}, 100);

setTimeout(() => {
  console.log('❌ No response - server may not be working');
  serverProcess.kill();
}, 2000);