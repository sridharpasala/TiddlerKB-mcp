import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { TiddlyWikiService } from '../services/TiddlyWikiService.js';
import { OntologyManager } from '../services/OntologyManager.js';
import { DomainAnalyzer } from '../services/DomainAnalyzer.js';

const defineKnowledgeClassesSchema = z.object({
  class_definitions: z.array(z.object({
    name: z.string().describe('Name of the class'),
    description: z.string().optional().describe('Description of the class'),
    parent_classes: z.array(z.string()).default([]).describe('Parent class names'),
    properties: z.array(z.string()).default([]).describe('Properties this class should have'),
    constraints: z.array(z.string()).default([]).describe('Constraints for this class')
  })).optional().describe('Manual class definitions'),
  auto_generate: z.boolean().default(true).describe('Whether to auto-generate classes from content'),
  confidence_threshold: z.number().min(0).max(1).default(0.6).describe('Confidence threshold for auto-generated classes'),
  max_classes: z.number().min(1).max(200).default(50).describe('Maximum number of classes to create')
});

export const defineKnowledgeClassesTool: Tool = {
  name: 'define_knowledge_classes',
  description: 'Create formal class definitions with properties and constraints, building hierarchical taxonomies with is-a relationships and managing class inheritance and specialization',
  inputSchema: {
    type: 'object',
    properties: {
      class_definitions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the class' },
            description: { type: 'string', description: 'Description of the class' },
            parent_classes: { type: 'array', items: { type: 'string' }, description: 'Parent class names' },
            properties: { type: 'array', items: { type: 'string' }, description: 'Properties this class should have' },
            constraints: { type: 'array', items: { type: 'string' }, description: 'Constraints for this class' }
          },
          required: ['name']
        },
        description: 'Manual class definitions'
      },
      auto_generate: { type: 'boolean', default: true, description: 'Whether to auto-generate classes from content' },
      confidence_threshold: { type: 'number', minimum: 0, maximum: 1, default: 0.6, description: 'Confidence threshold for auto-generated classes' },
      max_classes: { type: 'number', minimum: 1, maximum: 200, default: 50, description: 'Maximum number of classes to create' }
    }
  }
};

export async function handleDefineKnowledgeClasses(
  args: any,
  wikiService: TiddlyWikiService
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    const validatedArgs = defineKnowledgeClassesSchema.parse(args);
    const ontologyManager = new OntologyManager();
    
    let output = '# Knowledge Class Definitions\n\n';
    let classesCreated = 0;

    // Process manual class definitions first
    if (validatedArgs.class_definitions && validatedArgs.class_definitions.length > 0) {
      output += '## Manually Defined Classes\n\n';
      
      for (const classDef of validatedArgs.class_definitions) {
        const ontologyClass = {
          id: classDef.name ? classDef.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : `class_${Date.now()}`,
          name: classDef.name,
          description: classDef.description || `Manually defined class: ${classDef.name}`,
          superClasses: classDef.parent_classes.map(p => p ? p.toLowerCase().replace(/[^a-z0-9]/g, '_') : '').filter(Boolean),
          subClasses: [],
          properties: [],
          constraints: classDef.constraints.map((constraint, idx) => ({
            id: `constraint_${idx}`,
            type: 'logical' as const,
            expression: constraint,
            description: constraint,
            severity: 'info' as const
          })),
          instances: [],
          metadata: {
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            confidence: 1.0,
            source: 'manual' as const
          }
        };

        ontologyManager.addClass(ontologyClass);
        classesCreated++;
        
        output += `### ${classDef.name}\n`;
        output += `- **ID**: ${ontologyClass.id}\n`;
        output += `- **Description**: ${ontologyClass.description}\n`;
        if (classDef.parent_classes.length > 0) {
          output += `- **Parent Classes**: ${classDef.parent_classes.join(', ')}\n`;
        }
        if (classDef.properties.length > 0) {
          output += `- **Properties**: ${classDef.properties.join(', ')}\n`;
        }
        if (classDef.constraints.length > 0) {
          output += `- **Constraints**: ${classDef.constraints.length}\n`;
        }
        output += '\n';
      }
    }

    // Auto-generate classes from content if requested
    if (validatedArgs.auto_generate) {
      const allTiddlers = await wikiService.listTiddlers();
      
      if (allTiddlers.length > 0) {
        const domainAnalyzer = new DomainAnalyzer();
        const extractionResult = await domainAnalyzer.analyzeDomain(allTiddlers);
        
        const highConfidenceConcepts = extractionResult.concepts
          .filter(c => c.confidence >= validatedArgs.confidence_threshold)
          .slice(0, validatedArgs.max_classes - classesCreated);

        if (highConfidenceConcepts.length > 0) {
          output += '## Auto-Generated Classes\n\n';
          
          for (const concept of highConfidenceConcepts) {
            const ontologyClass = {
              id: concept.name ? concept.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : `class_${Date.now()}`,
              name: concept.name,
              description: `Auto-generated from content analysis. Type: ${concept.type}`,
              superClasses: [],
              subClasses: [],
              properties: [],
              constraints: [],
              instances: concept.contexts,
              metadata: {
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                confidence: concept.confidence,
                source: 'inferred' as const
              }
            };

            ontologyManager.addClass(ontologyClass);
            classesCreated++;
            
            output += `### ${concept.name}\n`;
            output += `- **ID**: ${ontologyClass.id}\n`;
            output += `- **Type**: ${concept.type}\n`;
            output += `- **Confidence**: ${(concept.confidence * 100).toFixed(1)}%\n`;
            output += `- **Frequency**: ${concept.frequency}\n`;
            output += `- **Contexts**: ${concept.contexts.slice(0, 3).join(', ')}${concept.contexts.length > 3 ? '...' : ''}\n`;
            output += '\n';
          }
        }
      }
    }

    // Validate the ontology
    const validation = ontologyManager.validateOntology();
    
    output += '## Validation Results\n\n';
    output += `- **Total Classes Created**: ${classesCreated}\n`;
    output += `- **Ontology Valid**: ${validation.valid ? 'Yes' : 'No'}\n`;
    output += `- **Errors**: ${validation.errors.length}\n`;
    output += `- **Warnings**: ${validation.warnings.length}\n`;
    output += `- **Suggestions**: ${validation.suggestions.length}\n\n`;

    if (validation.errors.length > 0) {
      output += '### Validation Errors\n';
      for (const error of validation.errors.slice(0, 5)) {
        output += `- **${error.type}**: ${error.message}\n`;
      }
      output += '\n';
    }

    if (validation.warnings.length > 0) {
      output += '### Validation Warnings\n';
      for (const warning of validation.warnings.slice(0, 5)) {
        output += `- **${warning.type}**: ${warning.message}\n`;
      }
      output += '\n';
    }

    // Show class hierarchy
    const hierarchy = ontologyManager.getClassHierarchy();
    if (hierarchy) {
      output += '## Class Hierarchy\n\n';
      output += formatHierarchy(hierarchy, 0);
    }

    // Statistics
    const stats = ontologyManager.getOntologyStatistics();
    output += '## Statistics\n\n';
    output += `- **Total Classes**: ${stats.classes.total}\n`;
    output += `- **Classes with Instances**: ${stats.classes.withInstances}\n`;
    output += `- **Root Classes**: ${stats.classes.rootClasses}\n`;
    output += `- **Total Properties**: ${stats.properties.total}\n`;
    output += `- **Total Relationships**: ${stats.relationships.total}\n`;

    return {
      content: [{
        type: 'text',
        text: output
      }]
    };

  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error defining knowledge classes: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

export function formatHierarchy(hierarchy: any, indent: number): string {
  let output = '';
  const spaces = '  '.repeat(indent);
  
  if (Array.isArray(hierarchy)) {
    for (const node of hierarchy) {
      output += formatHierarchy(node, indent);
    }
  } else {
    output += `${spaces}- **${hierarchy.name}** (${hierarchy.instances} instances)\n`;
    if (hierarchy.children && hierarchy.children.length > 0) {
      output += formatHierarchy(hierarchy.children, indent + 1);
    }
  }
  
  return output;
}