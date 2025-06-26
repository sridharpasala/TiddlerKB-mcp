# How to View .tid Files

## Quick Start with TiddlyWiki Node.js

### 1. Install TiddlyWiki
```bash
npm install -g tiddlywiki
```

### 2. Create a Wiki Instance
```bash
# Create a new wiki folder
tiddlywiki mywiki --init server

# Copy your .tid files to the tiddlers folder
cp tests/*.tid mywiki/tiddlers/
```

### 3. Start the Server
```bash
tiddlywiki mywiki --listen port=8080
```

### 4. Open in Browser
Navigate to: http://localhost:8080

## Alternative Methods

### Method 1: Import into Existing TiddlyWiki
1. Open any TiddlyWiki (e.g., https://tiddlywiki.com)
2. Drag and drop your `.tid` files onto the wiki
3. Click "Import" to add them

### Method 2: Use TiddlyDesktop
1. Download TiddlyDesktop from https://tiddlywiki.com/static/TiddlyDesktop.html
2. Create a new wiki or open existing
3. Import your `.tid` files

### Method 3: Build Static HTML
```bash
# Build a standalone HTML file with all tiddlers
tiddlywiki mywiki --build index
# Creates mywiki/output/index.html
```

## Understanding the Architecture

```
Your Setup:
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   .tid files    │────▶│  TiddlyWiki     │────▶│   Web Browser   │
│ (Individual     │     │  Node.js Server │     │ (View & Edit)   │
│  tiddlers)      │     │  (Renders HTML) │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         ▲                                                │
         │                                                │
         └────────────────────────────────────────────────┘
                     (Saves back to .tid files)

MCP Integration:
┌─────────────────┐     ┌─────────────────┐
│ Claude Desktop  │────▶│   MCP Server    │
│                 │     │ (Manages .tid   │
│                 │◀────│     files)      │
└─────────────────┘     └─────────────────┘
```

## Workflow Options

### Option 1: Dual Mode (Recommended)
- Use TiddlyWiki server for viewing/manual editing
- Use Claude Desktop + MCP for AI-enhanced operations
- Both work on the same `.tid` files

### Option 2: TiddlyWiki Primary
- Use TiddlyWiki as main interface
- Periodically use Claude for bulk operations

### Option 3: Claude Primary  
- Use Claude Desktop for all operations
- Periodically export to HTML for sharing

## File Sync Considerations

When running both TiddlyWiki server and MCP server:
- Both can read/write the same `.tid` files
- File watching ensures changes are synchronized
- TiddlyWiki auto-reloads when files change
- MCP server detects external changes

## Best Practices

1. **Single Source of Truth**: Keep `.tid` files in one location
2. **Regular Backups**: Version control your `.tid` files
3. **Consistent Naming**: Use meaningful tiddler titles
4. **Organize with Tags**: Leverage TiddlyWiki's tagging system

## Quick Test

To quickly view a single `.tid` file's content:
```bash
# View formatted content
cat ProjectIdeas.tid

# View just the text content
sed -n '/^$/,$p' ProjectIdeas.tid
```

But for proper rendering with WikiText formatting, links, and tags, you need TiddlyWiki.