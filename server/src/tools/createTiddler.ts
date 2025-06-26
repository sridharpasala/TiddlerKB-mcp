import { z } from 'zod';
import { TiddlyWikiService } from '../services/TiddlyWikiService.js';

const CreateTiddlerSchema = z.object({
  title: z.string().describe('Title of the tiddler'),
  text: z.string().describe('Content of the tiddler'),
  tags: z.array(z.string()).optional().describe('Tags for the tiddler'),
  type: z.string().optional().describe('Content type (e.g., text/vnd.tiddlywiki)'),
});

export const createTiddlerTool = {
  definition: {
    name: 'create_tiddler',
    description: 'Create a new tiddler with specified content',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the tiddler' },
        text: { type: 'string', description: 'Content of the tiddler' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for the tiddler'
        },
        type: { type: 'string', description: 'Content type (e.g., text/vnd.tiddlywiki)' }
      },
      required: ['title', 'text']
    },
  },
  
  handler: async (args: unknown, wikiService: TiddlyWikiService) => {
    const params = CreateTiddlerSchema.parse(args);
    
    // Check if tiddler already exists
    const existing = await wikiService.getTiddler(params.title);
    if (existing) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Tiddler "${params.title}" already exists. Use update_tiddler to modify it.`,
          },
        ],
      };
    }
    
    const tiddler = await wikiService.createTiddler({
      title: params.title,
      text: params.text,
      tags: params.tags,
      type: params.type || 'text/vnd.tiddlywiki',
    });
    
    return {
      content: [
        {
          type: 'text',
          text: `Created tiddler "${tiddler.title}" with ${tiddler.tags?.length || 0} tags`,
        },
      ],
    };
  },
};