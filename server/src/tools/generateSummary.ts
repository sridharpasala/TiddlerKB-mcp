import { z } from 'zod';
import { TiddlyWikiService } from '../services/TiddlyWikiService.js';
import { AIProcessor } from '../services/AIProcessor.js';

const GenerateSummarySchema = z.object({
  tiddlers: z.array(z.string()).optional().describe('List of tiddler titles to summarize (if empty, uses all tiddlers)'),
  style: z.enum(['brief', 'detailed', 'bullet-points', 'executive']).optional().describe('Summary style'),
  maxLength: z.number().optional().describe('Maximum length for brief summaries'),
  focus: z.enum(['main-points', 'action-items', 'conclusions', 'overview']).optional().describe('What to focus on'),
});

export const generateSummaryTool = {
  definition: {
    name: 'generate_summary',
    description: 'Generate AI-powered summaries of tiddlers with different styles and focus areas',
    inputSchema: {
      type: 'object',
      properties: {
        tiddlers: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of tiddler titles to summarize (if empty, uses all tiddlers)'
        },
        style: {
          type: 'string',
          enum: ['brief', 'detailed', 'bullet-points', 'executive'],
          description: 'Summary style'
        },
        maxLength: {
          type: 'number',
          description: 'Maximum length for brief summaries'
        },
        focus: {
          type: 'string',
          enum: ['main-points', 'action-items', 'conclusions', 'overview'],
          description: 'What to focus on'
        }
      }
    },
  },
  
  handler: async (args: unknown, wikiService: TiddlyWikiService) => {
    const params = GenerateSummarySchema.parse(args);
    
    let tiddlersToSummarize;
    
    if (params.tiddlers && params.tiddlers.length > 0) {
      // Get specific tiddlers
      tiddlersToSummarize = [];
      for (const title of params.tiddlers) {
        const tiddler = await wikiService.getTiddler(title);
        if (tiddler) {
          tiddlersToSummarize.push(tiddler);
        }
      }
      
      if (tiddlersToSummarize.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: None of the specified tiddlers were found.',
            },
          ],
        };
      }
    } else {
      // Get all tiddlers
      tiddlersToSummarize = await wikiService.listTiddlers();
      
      if (tiddlersToSummarize.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No tiddlers found to summarize.',
            },
          ],
        };
      }
    }

    const aiProcessor = new AIProcessor();
    const summaryOptions = {
      style: params.style || 'detailed' as const,
      maxLength: params.maxLength,
      focus: params.focus || 'overview' as const,
    };
    
    const summary = aiProcessor.generateSummary(tiddlersToSummarize, summaryOptions);
    
    let response = `# Knowledge Base Summary\n\n`;
    response += `**Scope:** ${tiddlersToSummarize.length} tiddlers\n`;
    response += `**Style:** ${summaryOptions.style}\n`;
    if (params.focus) response += `**Focus:** ${params.focus}\n`;
    response += `**Generated:** ${new Date().toISOString().split('T')[0]}\n\n`;
    response += '---\n\n';
    response += summary;
    
    // Add metadata
    response += '\n\n---\n\n';
    response += `## Summary Metadata\n`;
    response += `- **Tiddlers analyzed:** ${tiddlersToSummarize.map(t => t.title).join(', ')}\n`;
    response += `- **Total content length:** ${tiddlersToSummarize.reduce((sum, t) => sum + t.text.length, 0)} characters\n`;
    response += `- **Categories represented:** ${[...new Set(tiddlersToSummarize.map(t => t.tags?.[0] || 'untagged'))].join(', ')}\n`;

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