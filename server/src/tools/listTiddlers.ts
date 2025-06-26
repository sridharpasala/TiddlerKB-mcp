import { z } from 'zod';
import { TiddlyWikiService } from '../services/TiddlyWikiService.js';

const ListTiddlersSchema = z.object({
  limit: z.number().optional().describe('Maximum number of tiddlers to return'),
});

export const listTiddlersTool = {
  definition: {
    name: 'list_tiddlers',
    description: 'List all tiddlers in the wiki',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of tiddlers to return' }
      }
    },
  },
  
  handler: async (args: unknown, wikiService: TiddlyWikiService) => {
    const params = ListTiddlersSchema.parse(args);
    const tiddlers = await wikiService.listTiddlers();
    
    const sorted = tiddlers.sort((a, b) => {
      const aDate = new Date(a.modified || a.created || 0).getTime();
      const bDate = new Date(b.modified || b.created || 0).getTime();
      return bDate - aDate;
    });
    
    const limited = params.limit ? sorted.slice(0, params.limit) : sorted;
    
    const list = limited.map(t => {
      const tags = t.tags?.length ? ` [${t.tags.join(', ')}]` : '';
      return `- ${t.title}${tags}`;
    }).join('\n');
    
    return {
      content: [
        {
          type: 'text',
          text: `Found ${tiddlers.length} tiddlers${params.limit ? ` (showing ${limited.length})` : ''}:\n\n${list}`,
        },
      ],
    };
  },
};