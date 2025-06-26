import { z } from 'zod';
import { TiddlyWikiService } from '../services/TiddlyWikiService.js';
import { LinkManager } from '../services/LinkManager.js';

const AnalyzeConnectionsSchema = z.object({
  title: z.string().describe('Title of the tiddler to analyze connections for'),
});

export const analyzeConnectionsTool = {
  definition: {
    name: 'analyze_connections',
    description: 'Analyze connections and relationships for a specific tiddler',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the tiddler to analyze connections for' }
      },
      required: ['title']
    },
  },
  
  handler: async (args: unknown, wikiService: TiddlyWikiService) => {
    const params = AnalyzeConnectionsSchema.parse(args);
    
    const tiddler = await wikiService.getTiddler(params.title);
    if (!tiddler) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Tiddler "${params.title}" not found`,
          },
        ],
      };
    }

    const allTiddlers = await wikiService.listTiddlers();
    const tiddlerMap = new Map(allTiddlers.map(t => [t.title, t]));
    
    const linkManager = new LinkManager();
    linkManager.buildLinkGraph(allTiddlers);
    
    const analysis = linkManager.analyzeTiddlerLinks(params.title, tiddlerMap);
    
    let response = `# Connection Analysis for "${params.title}"\n\n`;
    
    response += `## Outgoing Links (${analysis.outgoingLinks.length})\n`;
    if (analysis.outgoingLinks.length > 0) {
      response += analysis.outgoingLinks.map(link => `- [[${link}]]`).join('\n');
    } else {
      response += 'No outgoing links found.';
    }
    
    response += `\n\n## Incoming Links (${analysis.incomingLinks.length})\n`;
    if (analysis.incomingLinks.length > 0) {
      response += analysis.incomingLinks.map(link => `- [[${link}]]`).join('\n');
    } else {
      response += 'No incoming links found.';
    }
    
    if (analysis.brokenLinks.length > 0) {
      response += `\n\n## Broken Links (${analysis.brokenLinks.length})\n`;
      response += analysis.brokenLinks.map(link => `- ${link} (missing)`).join('\n');
    }
    
    if (analysis.suggestedLinks.length > 0) {
      response += `\n\n## Suggested Links\n`;
      response += 'These tiddlers might be related based on content similarity:\n';
      response += analysis.suggestedLinks.map(link => `- [[${link}]]`).join('\n');
    }
    
    if (analysis.orphanedTiddlers.length > 0) {
      response += `\n\n## Orphaned Tiddlers in Wiki\n`;
      response += 'These tiddlers have no incoming links:\n';
      response += analysis.orphanedTiddlers.map(title => `- [[${title}]]`).join('\n');
    }
    
    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  },
};