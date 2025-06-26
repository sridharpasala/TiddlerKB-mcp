import { z } from 'zod';
import { TiddlyWikiService } from '../services/TiddlyWikiService.js';

const SearchTiddlersSchema = z.object({
  query: z.string().describe('Search query string'),
  searchIn: z.array(z.enum(['title', 'text', 'tags'])).optional()
    .describe('Fields to search in (defaults to all)'),
  limit: z.number().optional().describe('Maximum number of results to return'),
  caseSensitive: z.boolean().optional().describe('Whether to perform case-sensitive search'),
});

export const searchTiddlersTool = {
  definition: {
    name: 'search_tiddlers',
    description: 'Search for tiddlers by content, title, or tags',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query string' },
        searchIn: {
          type: 'array',
          items: { type: 'string', enum: ['title', 'text', 'tags'] },
          description: 'Fields to search in (defaults to all)'
        },
        limit: { type: 'number', description: 'Maximum number of results to return' },
        caseSensitive: { type: 'boolean', description: 'Whether to perform case-sensitive search' }
      },
      required: ['query']
    },
  },
  
  handler: async (args: unknown, wikiService: TiddlyWikiService) => {
    const params = SearchTiddlersSchema.parse(args);
    const results = await wikiService.searchTiddlers(params);
    
    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No tiddlers found matching "${params.query}"`,
          },
        ],
      };
    }
    
    const formattedResults = results.map((result, index) => {
      const matches = result.matches.map(m => `  - ${m.field}: ...${m.snippet}...`).join('\n');
      return `${index + 1}. ${result.tiddler.title} (score: ${result.score})\n${matches}`;
    }).join('\n\n');
    
    return {
      content: [
        {
          type: 'text',
          text: `Found ${results.length} matching tiddlers:\n\n${formattedResults}`,
        },
      ],
    };
  },
};