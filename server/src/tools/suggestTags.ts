import { z } from 'zod';
import { TiddlyWikiService } from '../services/TiddlyWikiService.js';
import { ContentAnalyzer } from '../services/ContentAnalyzer.js';

const SuggestTagsSchema = z.object({
  title: z.string().describe('Title of the tiddler to suggest tags for'),
  includeExisting: z.boolean().optional().describe('Include existing tags in suggestions'),
});

export const suggestTagsTool = {
  definition: {
    name: 'suggest_tags',
    description: 'Suggest relevant tags for a tiddler based on content analysis',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the tiddler to suggest tags for' },
        includeExisting: { type: 'boolean', description: 'Include existing tags in suggestions' }
      },
      required: ['title']
    },
  },
  
  handler: async (args: unknown, wikiService: TiddlyWikiService) => {
    const params = SuggestTagsSchema.parse(args);
    
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

    const analyzer = new ContentAnalyzer();
    const analysis = analyzer.analyzeContent(tiddler);
    
    // Get all existing tags from the wiki for context
    const allTiddlers = await wikiService.listTiddlers();
    const existingTags = new Set<string>();
    allTiddlers.forEach(t => {
      if (t.tags) {
        t.tags.forEach(tag => existingTags.add(tag));
      }
    });

    const currentTags = new Set(tiddler.tags || []);
    const newSuggestions = analysis.suggestedTags.filter(tag => 
      params.includeExisting || !currentTags.has(tag)
    );

    let response = `# Tag Suggestions for "${params.title}"\n\n`;
    
    if (tiddler.tags && tiddler.tags.length > 0) {
      response += `## Current Tags\n`;
      response += tiddler.tags.map(tag => `- ${tag}`).join('\n');
      response += '\n\n';
    }
    
    response += `## Suggested Tags\n`;
    if (newSuggestions.length > 0) {
      response += 'Based on content analysis:\n';
      newSuggestions.forEach(tag => {
        const isExisting = existingTags.has(tag);
        const isNew = !currentTags.has(tag);
        const status = isExisting ? '(existing in wiki)' : '(new)';
        response += `- ${tag} ${status}\n`;
      });
    } else {
      response += 'No new tag suggestions found.';
    }

    response += `\n\n## Content Analysis\n`;
    response += `**Category:** ${analysis.category}\n`;
    response += `**Keywords:** ${analysis.keywords.slice(0, 5).join(', ')}\n`;
    
    if (analysis.relatedLinks.length > 0) {
      response += `**Related Links:** ${analysis.relatedLinks.join(', ')}\n`;
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