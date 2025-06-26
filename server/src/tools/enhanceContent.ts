import { z } from 'zod';
import { TiddlyWikiService } from '../services/TiddlyWikiService.js';
import { AIProcessor } from '../services/AIProcessor.js';

const EnhanceContentSchema = z.object({
  title: z.string().describe('Title of the tiddler to enhance'),
  enhancements: z.array(z.enum(['tags', 'links', 'structure', 'all'])).optional().describe('Types of enhancements to apply'),
  applyChanges: z.boolean().optional().describe('Whether to apply changes directly to the tiddler'),
});

export const enhanceContentTool = {
  definition: {
    name: 'enhance_content',
    description: 'Intelligently enhance tiddler content with better tags, links, and structure',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the tiddler to enhance'
        },
        enhancements: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['tags', 'links', 'structure', 'all']
          },
          description: 'Types of enhancements to apply'
        },
        applyChanges: {
          type: 'boolean',
          description: 'Whether to apply changes directly to the tiddler'
        }
      },
      required: ['title']
    },
  },
  
  handler: async (args: unknown, wikiService: TiddlyWikiService) => {
    const params = EnhanceContentSchema.parse(args);
    
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
    const aiProcessor = new AIProcessor();
    
    const enhancements = params.enhancements || ['all'];
    const shouldEnhanceAll = enhancements.includes('all');
    
    let response = `# Content Enhancement for "${params.title}"\n\n`;
    response += `**Original Content Analysis:**\n`;
    response += `- Length: ${tiddler.text.length} characters\n`;
    response += `- Current tags: ${tiddler.tags?.join(', ') || 'none'}\n`;
    response += `- Links found: ${(tiddler.text.match(/\[\[[^\]]+\]\]/g) || []).length}\n\n`;

    const suggestedEnhancements = aiProcessor.enhanceContent(tiddler, allTiddlers);
    let hasChanges = false;
    let enhancedTiddler = { ...tiddler };

    // Tag Enhancement
    if (shouldEnhanceAll || enhancements.includes('tags')) {
      const newTags = suggestedEnhancements.tags;
      if (newTags && newTags.length > (tiddler.tags?.length || 0)) {
        const addedTags = newTags.filter(tag => !(tiddler.tags || []).includes(tag));
        if (addedTags.length > 0) {
          response += `## 🏷️ Tag Enhancements\n\n`;
          response += `**Suggested additional tags:** ${addedTags.join(', ')}\n\n`;
          
          if (params.applyChanges) {
            enhancedTiddler.tags = newTags;
            hasChanges = true;
            response += `✅ Applied tag enhancements\n\n`;
          } else {
            response += `💡 Use \`applyChanges: true\` to apply these tag suggestions\n\n`;
          }
        }
      }
    }

    // Link Enhancement
    if (shouldEnhanceAll || enhancements.includes('links')) {
      const enhancedText = suggestedEnhancements.text;
      if (enhancedText && enhancedText !== tiddler.text) {
        const originalLinks = (tiddler.text.match(/\[\[[^\]]+\]\]/g) || []).length;
        const newLinks = (enhancedText.match(/\[\[[^\]]+\]\]/g) || []).length;
        const addedLinks = newLinks - originalLinks;
        
        if (addedLinks > 0) {
          response += `## 🔗 Link Enhancements\n\n`;
          response += `**Added ${addedLinks} new links** to existing tiddlers\n\n`;
          
          // Show a preview of changes
          const linkRegex = /\[\[[^\]]+\]\]/g;
          const newLinksArray = enhancedText.match(linkRegex) || [];
          const originalLinksArray = tiddler.text.match(linkRegex) || [];
          const addedLinksSet = new Set(newLinksArray);
          const originalLinksSet = new Set(originalLinksArray);
          const addedLinksArray = Array.from(addedLinksSet).filter(link => !originalLinksSet.has(link));
          
          if (addedLinksArray.length > 0) {
            response += `**New links added:** ${addedLinksArray.join(', ')}\n\n`;
          }
          
          if (params.applyChanges) {
            enhancedTiddler.text = enhancedText;
            hasChanges = true;
            response += `✅ Applied link enhancements\n\n`;
          } else {
            response += `💡 Use \`applyChanges: true\` to apply these link suggestions\n\n`;
          }
        }
      }
    }

    // Structure Enhancement
    if (shouldEnhanceAll || enhancements.includes('structure')) {
      response += `## 📋 Structure Enhancement Suggestions\n\n`;
      
      const hasHeadings = tiddler.text.includes('!');
      const hasBulletPoints = tiddler.text.includes('*') || tiddler.text.includes('#');
      const hasCodeBlocks = tiddler.text.includes('```');
      
      const suggestions = [];
      
      if (!hasHeadings && tiddler.text.length > 200) {
        suggestions.push('Add headings to organize long content into sections');
      }
      
      if (!hasBulletPoints && tiddler.text.includes('\n') && tiddler.text.length > 100) {
        suggestions.push('Use bullet points or numbered lists for better readability');
      }
      
      if (tiddler.text.toLowerCase().includes('code') && !hasCodeBlocks) {
        suggestions.push('Use code blocks (```) for better code formatting');
      }
      
      if (suggestions.length > 0) {
        suggestions.forEach((suggestion, index) => {
          response += `${index + 1}. ${suggestion}\n`;
        });
        response += '\n';
      } else {
        response += '✅ Content structure looks good!\n\n';
      }
    }

    // Apply changes if requested
    if (params.applyChanges && hasChanges) {
      try {
        await wikiService.updateTiddler(params.title, {
          text: enhancedTiddler.text,
          tags: enhancedTiddler.tags,
          modified: new Date().toISOString(),
        });
        
        response += `## ✅ Changes Applied Successfully\n\n`;
        response += `The tiddler has been updated with the suggested enhancements.\n\n`;
      } catch (error) {
        response += `## ❌ Error Applying Changes\n\n`;
        response += `Failed to update tiddler: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`;
      }
    }

    // Summary
    response += `## 📊 Enhancement Summary\n\n`;
    if (hasChanges && params.applyChanges) {
      response += `- **Status:** Enhancements applied\n`;
      response += `- **New tag count:** ${enhancedTiddler.tags?.length || 0}\n`;
      response += `- **New link count:** ${(enhancedTiddler.text.match(/\[\[[^\]]+\]\]/g) || []).length}\n`;
    } else if (hasChanges) {
      response += `- **Status:** Enhancements suggested (not applied)\n`;
      response += `- **Potential improvements:** Available\n`;
      response += `- **To apply:** Rerun with \`applyChanges: true\`\n`;
    } else {
      response += `- **Status:** No enhancements needed\n`;
      response += `- **Quality:** Content appears well-structured\n`;
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