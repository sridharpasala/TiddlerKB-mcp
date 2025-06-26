import { z } from 'zod';
import { TiddlyWikiService } from '../services/TiddlyWikiService.js';
import { TemplateService } from '../services/TemplateService.js';

const ApplyTemplateSchema = z.object({
  templateName: z.string().describe('Name of the template to apply'),
  title: z.string().describe('Title for the new tiddler'),
  variables: z.record(z.string()).optional().describe('Variables to substitute in the template'),
});

const ListTemplatesSchema = z.object({});

export const applyTemplateTool = {
  definition: {
    name: 'apply_template',
    description: 'Create a new tiddler using a predefined template',
    inputSchema: {
      type: 'object',
      properties: {
        templateName: { type: 'string', description: 'Name of the template to apply' },
        title: { type: 'string', description: 'Title for the new tiddler' },
        variables: { 
          type: 'object', 
          description: 'Variables to substitute in the template',
          additionalProperties: { type: 'string' }
        }
      },
      required: ['templateName', 'title']
    },
  },
  
  handler: async (args: unknown, wikiService: TiddlyWikiService) => {
    const params = ApplyTemplateSchema.parse(args);
    
    // Check if tiddler already exists
    const existing = await wikiService.getTiddler(params.title);
    if (existing) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Tiddler "${params.title}" already exists. Choose a different title.`,
          },
        ],
      };
    }

    const templateService = new TemplateService();
    
    // Add title to variables
    const variables = { 
      title: params.title,
      ...params.variables 
    };
    
    const tiddlerData = templateService.applyTemplate(params.templateName, variables);
    if (!tiddlerData) {
      const available = templateService.listTemplates();
      const templateList = available.map(t => `- ${t.name}: ${t.description}`).join('\n');
      
      return {
        content: [
          {
            type: 'text',
            text: `Error: Template "${params.templateName}" not found.\n\nAvailable templates:\n${templateList}`,
          },
        ],
      };
    }

    // Create the tiddler
    const tiddler = await wikiService.createTiddler({
      title: params.title,
      text: tiddlerData.text || '',
      ...tiddlerData
    });

    return {
      content: [
        {
          type: 'text',
          text: `Created tiddler "${tiddler.title}" using template "${params.templateName}"`,
        },
      ],
    };
  },
};

export const listTemplatesTools = {
  definition: {
    name: 'list_templates',
    description: 'List all available templates',
    inputSchema: {
      type: 'object',
      properties: {}
    },
  },
  
  handler: async (args: unknown, wikiService: TiddlyWikiService) => {
    const templateService = new TemplateService();
    const templates = templateService.listTemplates();
    
    let response = '# Available Templates\n\n';
    
    templates.forEach(template => {
      response += `## ${template.name}\n`;
      response += `${template.description}\n\n`;
    });
    
    response += '## Usage\n';
    response += 'Use the `apply_template` tool with the template name to create a new tiddler.\n\n';
    response += 'Example: `apply_template` with templateName="daily-journal" and title="Daily Journal 2024-06-25"';

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