import { z } from 'zod';
import { TiddlyWikiService } from '../services/TiddlyWikiService.js';

const UpdateTiddlerSchema = z.object({
  title: z.string().describe('Title of the tiddler to update'),
  text: z.string().optional().describe('New content for the tiddler'),
  tags: z.array(z.string()).optional().describe('New tags for the tiddler'),
  type: z.string().optional().describe('New content type'),
});

export const updateTiddlerTool = {
  definition: {
    name: 'update_tiddler',
    description: 'Update an existing tiddler',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the tiddler to update' },
        text: { type: 'string', description: 'New content for the tiddler' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'New tags for the tiddler'
        },
        type: { type: 'string', description: 'New content type' }
      },
      required: ['title']
    },
  },
  
  handler: async (args: unknown, wikiService: TiddlyWikiService) => {
    const params = UpdateTiddlerSchema.parse(args);
    
    try {
      const updates: any = {};
      if (params.text !== undefined) updates.text = params.text;
      if (params.tags !== undefined) updates.tags = params.tags;
      if (params.type !== undefined) updates.type = params.type;
      
      const updated = await wikiService.updateTiddler(params.title, updates);
      
      return {
        content: [
          {
            type: 'text',
            text: `Updated tiddler "${updated.title}"`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Failed to update tiddler'}`,
          },
        ],
      };
    }
  },
};