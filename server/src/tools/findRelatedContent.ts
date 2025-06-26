import { z } from 'zod';
import { TiddlyWikiService } from '../services/TiddlyWikiService.js';
import { ContentAnalyzer } from '../services/ContentAnalyzer.js';

const FindRelatedContentSchema = z.object({
  title: z.string().describe('Title of the tiddler to find related content for'),
  limit: z.number().optional().describe('Maximum number of related tiddlers to return'),
  minSimilarity: z.number().optional().describe('Minimum similarity threshold (0-1)'),
});

export const findRelatedContentTool = {
  definition: {
    name: 'find_related_content',
    description: 'Find tiddlers with similar content based on keyword analysis',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the tiddler to find related content for' },
        limit: { type: 'number', description: 'Maximum number of related tiddlers to return' },
        minSimilarity: { type: 'number', description: 'Minimum similarity threshold (0-1)' }
      },
      required: ['title']
    },
  },
  
  handler: async (args: unknown, wikiService: TiddlyWikiService) => {
    const params = FindRelatedContentSchema.parse(args);
    const limit = params.limit || 5;
    const minSimilarity = params.minSimilarity || 0.1;
    
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
    const analyzer = new ContentAnalyzer();
    
    const similarContent = analyzer.findSimilarContent(tiddler, allTiddlers)
      .filter(result => result.similarity >= minSimilarity)
      .slice(0, limit);

    let response = `# Related Content for "${params.title}"\n\n`;
    
    if (similarContent.length === 0) {
      response += `No related content found with similarity >= ${minSimilarity}.`;
      return {
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };
    }

    response += `Found ${similarContent.length} related tiddlers:\n\n`;
    
    similarContent.forEach((result, index) => {
      const percentage = Math.round(result.similarity * 100);
      response += `## ${index + 1}. [[${result.tiddler.title}]] (${percentage}% similar)\n`;
      
      // Show tags if available
      if (result.tiddler.tags && result.tiddler.tags.length > 0) {
        response += `**Tags:** ${result.tiddler.tags.join(', ')}\n`;
      }
      
      // Show a snippet of the content
      const snippet = result.tiddler.text.length > 150 
        ? result.tiddler.text.substring(0, 150) + '...'
        : result.tiddler.text;
      response += `**Preview:** ${snippet}\n\n`;
    });

    // Show analysis of the source tiddler
    const sourceAnalysis = analyzer.analyzeContent(tiddler);
    response += `## Analysis of "${params.title}"\n`;
    response += `**Category:** ${sourceAnalysis.category}\n`;
    response += `**Key Topics:** ${sourceAnalysis.keywords.slice(0, 5).join(', ')}\n`;
    
    if (sourceAnalysis.suggestedTags.length > 0) {
      response += `**Suggested Tags:** ${sourceAnalysis.suggestedTags.join(', ')}\n`;
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