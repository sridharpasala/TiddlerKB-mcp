# TiddlerKB-MCP

AI-enhanced personal knowledge management through TiddlyWiki and Claude Desktop integration using the Model Context Protocol (MCP).

## Overview

TiddlerKB-MCP is an MCP server that bridges TiddlyWiki with Claude Desktop, enabling AI-powered knowledge management capabilities. It transforms your TiddlyWiki into an intelligent knowledge base with advanced analysis, content generation, and relationship mapping features.

## Features

### Core Capabilities
- **Smart Search**: Semantic search across tiddlers with AI understanding
- **Content Management**: Create, update, and enhance tiddlers with AI assistance
- **Relationship Analysis**: Discover hidden connections between concepts
- **Knowledge Gaps**: Identify missing information in your knowledge base
- **Auto-tagging**: AI-powered tag suggestions based on content analysis

### Advanced Features
- **Domain Ontology Analysis**: Build formal knowledge structures from your notes
- **Semantic Relationships**: Map complex relationships between concepts
- **Study Materials**: Generate flashcards, quizzes, and summaries
- **Content Enhancement**: Improve structure, add links, and enrich content
- **Template System**: Use predefined templates for consistent note-taking

## Installation

### Prerequisites
- Node.js 18+ 
- TiddlyWiki 5.x
- Claude Desktop app

### Setup

1. Clone the repository:
```bash
git clone https://github.com/Blendcepts/TiddlerKB-mcp.git
cd TiddlerKB-mcp
```

2. Install dependencies:
```bash
cd server
npm install
```

3. Build the TypeScript code:
```bash
npm run build
```

4. Configure Claude Desktop by adding to your config file:
```json
{
  "mcpServers": {
    "tiddlywiki": {
      "command": "node",
      "args": ["/path/to/TiddlerKB-mcp/server/dist/index.js"],
      "env": {
        "TIDDLYWIKI_PATH": "/path/to/your/tiddlers"
      }
    }
  }
}
```

## Usage

### Basic Operations

**Search for tiddlers:**
```
Search for notes about "machine learning"
```

**Create a new tiddler:**
```
Create a tiddler titled "Project Ideas" about innovative AI applications
```

**Analyze connections:**
```
Show me how "Knowledge Management" relates to other concepts
```

### Advanced Operations

**Generate study materials:**
```
Create flashcards from my notes on "API Design Patterns"
```

**Find knowledge gaps:**
```
What topics in my knowledge base need more detail?
```

**Build domain ontology:**
```
Analyze the domain structure of my technology notes
```

## Available MCP Tools

### Content Management
- `search_tiddlers` - Search by content, title, or tags
- `create_tiddler` - Create new tiddlers with AI assistance
- `update_tiddler` - Modify existing tiddlers
- `list_tiddlers` - List all tiddlers in your wiki

### Analysis Tools
- `analyze_connections` - Map relationships for a tiddler
- `suggest_tags` - Get AI-powered tag recommendations
- `find_related_content` - Discover similar tiddlers
- `find_knowledge_gaps` - Identify incomplete areas

### Enhancement Tools
- `enhance_content` - Improve structure and add links
- `generate_summary` - Create summaries of tiddlers
- `create_study_materials` - Generate learning materials
- `apply_template` - Use templates for new content

### Ontology Tools
- `analyze_domain_ontology` - Extract domain concepts
- `define_knowledge_classes` - Create formal class definitions
- `map_semantic_relationships` - Define concept relationships
- `validate_ontological_structure` - Check consistency
- `generate_formal_specification` - Export to standard formats

## Configuration

Set environment variables:

```bash
# Path to your TiddlyWiki tiddlers directory
export TIDDLYWIKI_PATH="/path/to/tiddlers"

# Optional: Custom templates directory
export TEMPLATES_PATH="/path/to/templates"
```

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Architecture

The project follows a modular architecture:

- **Core Services**: TiddlyWiki file operations and parsing
- **AI Services**: Content analysis, relationship mapping, summarization
- **MCP Interface**: Protocol implementation for Claude Desktop
- **Tool Handlers**: Individual tool implementations

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Project Status

### ✅ Completed Phases (1-4)
- **Phase 1: Foundation** - Core CRUD operations and search
- **Phase 2: Enhanced Operations** - Smart tagging and templates
- **Phase 3: AI Features** - Summaries, gap analysis, content enhancement
- **Phase 4: Ontology Architecture** - Formal knowledge representation

### 🚧 Pending Development

#### Phase 5: Advanced Workflows & Integration (Planned)
**Goal**: Build sophisticated workflow automation and export capabilities

**Planned Features:**
- **Research Session Management**
  - Session-based note organization
  - Context preservation across sessions
  - Research progress tracking
  
- **Project Tracking Integration**
  - Task management within tiddlers
  - Progress visualization
  - Milestone tracking
  
- **Advanced Export Capabilities**
  - Academic paper formatting
  - Knowledge graph exports
  - Custom report generation
  
- **Workflow Automation**
  - Scheduled content analysis
  - Automated knowledge base maintenance
  - Smart archiving and cleanup
  
- **Quality Control Systems**
  - Content validation rules
  - Consistency checking
  - Automated review workflows

**Planned Tools:**
- `manage_research_session` - Session-based organization
- `track_project` - Project management integration
- `export_knowledge_graph` - Advanced visualization exports
- `automate_workflow` - Custom workflow definition
- `quality_check` - Content quality validation

#### Future Enhancements
- Real-time sync with TiddlyWiki
- Multi-wiki support
- Plugin system for custom tools
- Web interface for configuration
- Collaborative features

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/Blendcepts/TiddlerKB-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Blendcepts/TiddlerKB-mcp/discussions)
- **Documentation**: [Wiki](https://github.com/Blendcepts/TiddlerKB-mcp/wiki)

## Acknowledgments

- TiddlyWiki community for the amazing personal wiki system
- Anthropic for Claude and the Model Context Protocol
- Contributors and testers who helped shape this project

---

Built with ❤️ for the knowledge management community