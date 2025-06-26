#!/usr/bin/env node
import { spawn } from 'child_process';

const listToolsMessage = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

const serverProcess = spawn('node', ['dist/index.js'], {
  env: { ...process.env, TIDDLYWIKI_PATH: '../tests' },
  cwd: process.cwd()
});

serverProcess.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());
    if (response.result?.tools) {
      console.log(`🎉 Total tools available: ${response.result.tools.length}`);
      console.log('\nTool names:');
      response.result.tools.forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name}`);
      });
    }
    serverProcess.kill();
  } catch (e) {
    // Ignore non-JSON
  }
});

serverProcess.stderr.on('data', (data) => {
  if (data.toString().includes('running on stdio')) {
    serverProcess.stdin.write(JSON.stringify(listToolsMessage) + '\n');
  }
});

setTimeout(() => serverProcess.kill(), 3000);