# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TiddlyWiki-Claude Desktop MCP (Model Context Protocol) integration project. The goal is to create an MCP server that enables AI-enhanced personal knowledge management by connecting TiddlyWiki with Claude Desktop.

## Project Status

Currently in planning phase - the repository contains a comprehensive planning document (`tiddlywiki_mcp_plan.md`) that outlines the full implementation roadmap.

## Development Commands

### Setup and Build
```bash
cd server
npm install        # Install dependencies
npm run build      # Build TypeScript to JavaScript
npm run dev        # Run in development mode with auto-reload
npm run lint       # Run ESLint
```

### Testing
```bash
node test-server.js  # Run local test suite
```

### Configuration
Set the `TIDDLYWIKI_PATH` environment variable to point to your tiddlers directory:
```bash
export TIDDLYWIKI_PATH="/path/to/your/tiddlers"
```

## Architecture Overview

The planned architecture consists of:

1. **Core Operations Layer**: CRUD operations for tiddlers, search functionality, file system integration
2. **AI Enhancement Layer**: Content analysis, relationship mapping, knowledge extraction
3. **TiddlyWiki Integration**: JSON/tid format handling, metadata preservation, wiki structure understanding
4. **Claude Desktop Interface**: MCP protocol implementation with defined tools

## Key MCP Tools to be Implemented

- `search_tiddlers`: Search across content, tags, and metadata
- `create_tiddler`: Generate new notes with AI assistance
- `update_tiddler`: Intelligently modify existing content
- `analyze_connections`: Map relationships between concepts
- `suggest_tags`: AI-powered tag recommendations
- `find_knowledge_gaps`: Identify missing information
- `generate_summary`: Create content overviews
- `link_related_content`: Automatic linking between related tiddlers

## TiddlyWiki Format Considerations

- Support both `.tid` files and JSON exports
- Respect field structure: title, text, tags, created, modified, type, custom fields
- Use `[[double bracket]]` linking syntax
- Maintain metadata and versioning

## Implementation Phases

1. **Foundation (Weeks 1-3)**: Basic MCP server and CRUD operations
2. **Enhanced Operations (Weeks 4-6)**: Intelligent content analysis and relationships
3. **AI Features (Weeks 7-10)**: Summarization, gap analysis, content enhancement
4. **Advanced Workflows (Weeks 11-14)**: Research sessions, project tracking, exports
5. **Optimization (Weeks 15-16)**: Performance, testing, documentation

For detailed specifications and implementation plans, refer to `tiddlywiki_mcp_plan.md`.