# TiddlyWiki MCP Server

MCP (Model Context Protocol) server for integrating TiddlyWiki with Claude Desktop.

## Features

### Phase 1 (Complete)
- ✅ Basic CRUD operations for tiddlers
- ✅ File system monitoring for .tid files
- ✅ Simple text search functionality
- ✅ TiddlyWiki format parsing

### Phase 2 (Complete)
- ✅ Advanced content analysis and categorization
- ✅ Automatic tag suggestion system
- ✅ Link detection and relationship mapping
- ✅ Template system for different note types
- ✅ Content similarity detection

### Phase 3 (Complete)
- ✅ AI-powered content summarization and synthesis
- ✅ Knowledge gap analysis and identification
- ✅ Intelligent content enhancement
- ✅ Educational study materials generation
- ✅ Cross-reference optimization

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the server:
```bash
npm run build
```

3. Configure Claude Desktop to use this MCP server by adding to your config:
```json
{
  "mcpServers": {
    "tiddlywiki": {
      "command": "node",
      "args": ["/path/to/server/dist/index.js"],
      "env": {
        "TIDDLYWIKI_PATH": "/path/to/your/tiddlers"
      }
    }
  }
}
```

## Development

Run in development mode with auto-reload:
```bash
npm run dev
```

## Environment Variables

- `TIDDLYWIKI_PATH`: Path to your tiddlers directory (default: `./tiddlers`)

## Available Tools

### Basic Operations
- **search_tiddlers**: Search for tiddlers by content, title, or tags
- **create_tiddler**: Create a new tiddler with specified content
- **update_tiddler**: Update an existing tiddler
- **list_tiddlers**: List all tiddlers in the wiki

### Advanced Analysis (Phase 2)
- **analyze_connections**: Analyze links and relationships for a tiddler
- **suggest_tags**: Get AI-powered tag suggestions based on content
- **find_related_content**: Find similar tiddlers using content analysis
- **apply_template**: Create tiddlers using predefined templates
- **list_templates**: View available templates (daily-journal, meeting-notes, project, research-notes, technical-doc)

### AI-Powered Features (Phase 3)
- **generate_summary**: Create intelligent summaries with multiple styles (brief, detailed, executive, bullet-points)
- **find_knowledge_gaps**: Identify gaps, missing connections, and areas for improvement
- **enhance_content**: Intelligently improve content with better tags, links, and structure
- **create_study_materials**: Generate flashcards, quizzes, outlines, and study summaries