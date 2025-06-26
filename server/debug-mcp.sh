#!/bin/bash
# Debug script for TiddlyWiki MCP server

echo "🔍 Debugging TiddlyWiki MCP Server..."
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo ""

# Test if the server can start
echo "Testing server startup..."
timeout 2s node dist/index.js 2>&1 | head -n 10

echo ""
echo "✅ If you see 'TiddlyWiki MCP Server running on stdio', the server is working!"
echo ""
echo "📋 Claude Desktop config location:"
echo "~/Library/Application Support/Claude/claude_desktop_config.json"
echo ""
echo "🔧 To fix common issues:"
echo "1. Restart Claude Desktop"
echo "2. Check View > Logs in Claude Desktop for error messages"
echo "3. Ensure Node.js is in your PATH"