import { z } from 'zod';
import { TiddlyWikiService } from '../services/TiddlyWikiService.js';
import { AIProcessor } from '../services/AIProcessor.js';

const FindKnowledgeGapsSchema = z.object({
  scope: z.enum(['all', 'category', 'tags']).optional().describe('Scope of analysis'),
  filter: z.string().optional().describe('Category or tag to filter by'),
  minPriority: z.enum(['low', 'medium', 'high']).optional().describe('Minimum priority level to show'),
});

export const findKnowledgeGapsTool = {
  definition: {
    name: 'find_knowledge_gaps',
    description: 'Analyze knowledge base to identify gaps, incomplete content, and missing connections',
    inputSchema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['all', 'category', 'tags'],
          description: 'Scope of analysis'
        },
        filter: {
          type: 'string',
          description: 'Category or tag to filter by'
        },
        minPriority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Minimum priority level to show'
        }
      }
    },
  },
  
  handler: async (args: unknown, wikiService: TiddlyWikiService) => {
    const params = FindKnowledgeGapsSchema.parse(args);
    
    let tiddlersToAnalyze = await wikiService.listTiddlers();
    
    if (tiddlersToAnalyze.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No tiddlers found to analyze.',
          },
        ],
      };
    }

    // Filter based on scope
    if (params.scope === 'category' && params.filter) {
      const filterText = params.filter;
      tiddlersToAnalyze = tiddlersToAnalyze.filter(t => 
        t.title.toLowerCase().includes(filterText.toLowerCase()) ||
        t.text.toLowerCase().includes(filterText.toLowerCase())
      );
    } else if (params.scope === 'tags' && params.filter) {
      const filterText = params.filter;
      tiddlersToAnalyze = tiddlersToAnalyze.filter(t => 
        t.tags?.some(tag => tag.toLowerCase().includes(filterText.toLowerCase()))
      );
    }

    const aiProcessor = new AIProcessor();
    const gaps = aiProcessor.findKnowledgeGaps(tiddlersToAnalyze);
    
    // Filter by priority if specified
    const filteredGaps = params.minPriority 
      ? gaps.filter(gap => {
          const priorities = { low: 1, medium: 2, high: 3 };
          const minLevel = priorities[params.minPriority as keyof typeof priorities];
          return priorities[gap.priority] >= minLevel;
        })
      : gaps;

    let response = `# Knowledge Gap Analysis\n\n`;
    response += `**Scope:** ${tiddlersToAnalyze.length} tiddlers analyzed\n`;
    if (params.filter) response += `**Filter:** ${params.filter}\n`;
    response += `**Generated:** ${new Date().toISOString().split('T')[0]}\n\n`;
    
    if (filteredGaps.length === 0) {
      response += '✅ No significant knowledge gaps identified in the current scope.\n\n';
      response += 'Your knowledge base appears well-connected and comprehensive within the analyzed area.';
    } else {
      response += `Found ${filteredGaps.length} knowledge gaps:\n\n`;
      
      // Group by priority
      const groupedGaps = {
        high: filteredGaps.filter(g => g.priority === 'high'),
        medium: filteredGaps.filter(g => g.priority === 'medium'),
        low: filteredGaps.filter(g => g.priority === 'low'),
      };

      Object.entries(groupedGaps).forEach(([priority, gapsInPriority]) => {
        if (gapsInPriority.length === 0) return;
        
        const emoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
        response += `## ${emoji} ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority (${gapsInPriority.length})\n\n`;
        
        gapsInPriority.forEach((gap, index) => {
          response += `### ${index + 1}. ${gap.topic}\n\n`;
          response += `**Issue:** ${gap.description}\n\n`;
          response += `**Suggestion:** ${gap.suggestedContent}\n\n`;
          
          if (gap.relatedTiddlers.length > 0) {
            response += `**Related Tiddlers:** ${gap.relatedTiddlers.map(t => `[[${t}]]`).join(', ')}\n\n`;
          }
          
          response += '---\n\n';
        });
      });
    }

    // Add recommendations
    response += `## 📋 Action Recommendations\n\n`;
    
    const highPriorityCount = filteredGaps.filter(g => g.priority === 'high').length;
    const incompleteCount = filteredGaps.filter(g => g.description.includes('Incomplete')).length;
    const connectionCount = filteredGaps.filter(g => g.description.includes('connections')).length;
    
    if (highPriorityCount > 0) {
      response += `1. **Immediate Focus:** Address ${highPriorityCount} high-priority gaps first\n`;
    }
    
    if (incompleteCount > 0) {
      response += `2. **Content Enhancement:** Expand ${incompleteCount} incomplete tiddlers\n`;
    }
    
    if (connectionCount > 0) {
      response += `3. **Link Building:** Create connections between isolated topics\n`;
    }
    
    response += `4. **Regular Review:** Schedule periodic gap analysis to maintain knowledge quality\n`;

    // Add statistics
    response += `\n## 📊 Analysis Statistics\n\n`;
    response += `- **Tiddlers analyzed:** ${tiddlersToAnalyze.length}\n`;
    response += `- **Total gaps found:** ${gaps.length}\n`;
    response += `- **High priority:** ${gaps.filter(g => g.priority === 'high').length}\n`;
    response += `- **Medium priority:** ${gaps.filter(g => g.priority === 'medium').length}\n`;
    response += `- **Low priority:** ${gaps.filter(g => g.priority === 'low').length}\n`;
    response += `- **Coverage score:** ${Math.round((1 - gaps.length / tiddlersToAnalyze.length) * 100)}%\n`;

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