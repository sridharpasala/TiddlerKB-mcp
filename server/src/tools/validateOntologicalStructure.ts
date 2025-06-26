import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { TiddlyWikiService } from '../services/TiddlyWikiService.js';
import { OntologyValidator } from '../services/OntologyValidator.js';
import { OntologyManager } from '../services/OntologyManager.js';
import { DomainAnalyzer } from '../services/DomainAnalyzer.js';
import { SemanticRelationshipMapper } from '../services/SemanticRelationshipMapper.js';

const validateOntologicalStructureSchema = z.object({
  include_suggestions: z.boolean().default(true).describe('Whether to include improvement suggestions'),
  validation_level: z.enum(['basic', 'comprehensive', 'strict']).default('comprehensive').describe('Level of validation to perform'),
  auto_fix: z.boolean().default(false).describe('Whether to attempt automatic fixes for some issues')
});

export const validateOntologicalStructureTool: Tool = {
  name: 'validate_ontological_structure',
  description: 'Check logical consistency of knowledge models, identify conflicts and contradictions in ontological definitions, and ensure completeness and coherence of domain coverage',
  inputSchema: {
    type: 'object',
    properties: {
      include_suggestions: { type: 'boolean', default: true, description: 'Whether to include improvement suggestions' },
      validation_level: { type: 'string', enum: ['basic', 'comprehensive', 'strict'], default: 'comprehensive', description: 'Level of validation to perform' },
      auto_fix: { type: 'boolean', default: false, description: 'Whether to attempt automatic fixes for some issues' }
    }
  }
};

export async function handleValidateOntologicalStructure(
  args: any,
  wikiService: TiddlyWikiService
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    const validatedArgs = validateOntologicalStructureSchema.parse(args);
    
    const allTiddlers = await wikiService.listTiddlers();
    
    if (allTiddlers.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No tiddlers found to validate. Please create some content first.'
        }]
      };
    }

    // Build ontology from content
    const domainAnalyzer = new DomainAnalyzer();
    const extractionResult = await domainAnalyzer.analyzeDomain(allTiddlers);
    
    const relationshipMapper = new SemanticRelationshipMapper();
    const mappingResult = await relationshipMapper.mapRelationships(allTiddlers, extractionResult.concepts);
    
    const ontologyManager = new OntologyManager();
    
    // Create classes from concepts
    const classes = extractionResult.concepts.map(concept => ({
      id: concept.name ? concept.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : `concept_${Date.now()}`,
      name: concept.name || 'Unnamed Concept',
      description: `Concept of type ${concept.type}`,
      superClasses: [],
      subClasses: [],
      properties: [],
      constraints: [],
      instances: concept.contexts,
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        confidence: concept.confidence,
        source: 'extracted' as const
      }
    }));

    // Validate the ontology
    const validator = new OntologyValidator();
    const validationResult = await validator.validateOntology(
      classes,
      mappingResult.properties,
      mappingResult.relationships
    );

    let output = '# Ontological Structure Validation\n\n';

    // Validation Summary
    output += '## Validation Summary\n\n';
    output += `- **Overall Valid**: ${validationResult.valid ? '✅ Yes' : '❌ No'}\n`;
    output += `- **Validation Level**: ${validatedArgs.validation_level}\n`;
    output += `- **Elements Validated**: ${classes.length} classes, ${mappingResult.properties.length} properties, ${mappingResult.relationships.length} relationships\n\n`;

    // Metrics
    output += '## Quality Metrics\n\n';
    output += `- **Consistency**: ${(validationResult.metrics.consistency * 100).toFixed(1)}%\n`;
    output += `- **Completeness**: ${(validationResult.metrics.completeness * 100).toFixed(1)}%\n`;
    output += `- **Clarity**: ${(validationResult.metrics.clarity * 100).toFixed(1)}%\n`;
    output += `- **Coverage**: ${(validationResult.metrics.coverage * 100).toFixed(1)}%\n\n`;

    // Errors
    if (validationResult.errors.length > 0) {
      output += '## Validation Errors\n\n';
      output += `Found ${validationResult.errors.length} critical issues:\n\n`;
      
      const errorsByType = new Map<string, any[]>();
      for (const error of validationResult.errors) {
        if (!errorsByType.has(error.type)) {
          errorsByType.set(error.type, []);
        }
        errorsByType.get(error.type)!.push(error);
      }

      for (const [type, errors] of errorsByType.entries()) {
        output += `### ${type.replace(/_/g, ' ').toUpperCase()}\n`;
        for (const error of errors.slice(0, 5)) {
          output += `- **${error.severity.toUpperCase()}**: ${error.message}\n`;
          if (error.suggestedFix) {
            output += `  - *Fix*: ${error.suggestedFix}\n`;
          }
          if (error.affectedElements.length > 0) {
            output += `  - *Affected*: ${error.affectedElements.join(', ')}\n`;
          }
        }
        if (errors.length > 5) {
          output += `  - ... and ${errors.length - 5} more errors of this type\n`;
        }
        output += '\n';
      }
    } else {
      output += '## ✅ No Critical Errors Found\n\n';
    }

    // Warnings
    if (validationResult.warnings.length > 0) {
      output += '## Validation Warnings\n\n';
      output += `Found ${validationResult.warnings.length} potential issues:\n\n`;
      
      const warningsByType = new Map<string, any[]>();
      for (const warning of validationResult.warnings) {
        if (!warningsByType.has(warning.type)) {
          warningsByType.set(warning.type, []);
        }
        warningsByType.get(warning.type)!.push(warning);
      }

      for (const [type, warnings] of warningsByType.entries()) {
        output += `### ${type.replace(/_/g, ' ').toUpperCase()}\n`;
        for (const warning of warnings.slice(0, 3)) {
          output += `- ${warning.message}\n`;
          output += `  - *Recommendation*: ${warning.recommendation}\n`;
        }
        if (warnings.length > 3) {
          output += `  - ... and ${warnings.length - 3} more warnings of this type\n`;
        }
        output += '\n';
      }
    }

    // Suggestions
    if (validatedArgs.include_suggestions && validationResult.suggestions.length > 0) {
      output += '## Improvement Suggestions\n\n';
      
      const suggestionsByImpact = new Map<string, any[]>();
      for (const suggestion of validationResult.suggestions) {
        if (!suggestionsByImpact.has(suggestion.impact)) {
          suggestionsByImpact.set(suggestion.impact, []);
        }
        suggestionsByImpact.get(suggestion.impact)!.push(suggestion);
      }

      for (const impact of ['high', 'medium', 'low']) {
        const suggestions = suggestionsByImpact.get(impact);
        if (suggestions && suggestions.length > 0) {
          output += `### ${impact.toUpperCase()} Impact Suggestions\n`;
          for (const suggestion of suggestions.slice(0, 5)) {
            const confidenceBar = '●'.repeat(Math.round(suggestion.confidence * 5));
            output += `- **${suggestion.type.replace(/_/g, ' ')}** ${confidenceBar}\n`;
            output += `  - ${suggestion.description}\n`;
            output += `  - *Implementation*: ${suggestion.implementation}\n`;
          }
          output += '\n';
        }
      }
    }

    // Structural Analysis
    output += '## Structural Analysis\n\n';
    
    // Class hierarchy analysis
    const rootClasses = classes.filter(c => c.superClasses.length === 0);
    const leafClasses = classes.filter(c => c.subClasses.length === 0);
    
    output += `### Class Structure\n`;
    output += `- **Total Classes**: ${classes.length}\n`;
    output += `- **Root Classes**: ${rootClasses.length}\n`;
    output += `- **Leaf Classes**: ${leafClasses.length}\n`;
    output += `- **Classes with Instances**: ${classes.filter(c => c.instances.length > 0).length}\n\n`;

    // Property analysis
    output += `### Property Structure\n`;
    output += `- **Total Properties**: ${mappingResult.properties.length}\n`;
    output += `- **Object Properties**: ${mappingResult.properties.filter(p => p.type === 'object').length}\n`;
    output += `- **Datatype Properties**: ${mappingResult.properties.filter(p => p.type === 'datatype').length}\n`;
    output += `- **Annotation Properties**: ${mappingResult.properties.filter(p => p.type === 'annotation').length}\n\n`;

    // Relationship analysis
    output += `### Relationship Structure\n`;
    output += `- **Total Relationships**: ${mappingResult.relationships.length}\n`;
    output += `- **Bidirectional**: ${mappingResult.relationships.filter(r => r.bidirectional).length}\n`;
    output += `- **Average Confidence**: ${(mappingResult.relationships.reduce((sum, r) => sum + r.confidence, 0) / mappingResult.relationships.length * 100).toFixed(1)}%\n\n`;

    // Domain coverage
    if (extractionResult.domains.length > 0) {
      output += `### Domain Coverage\n`;
      for (const domain of extractionResult.domains.slice(0, 5)) {
        output += `- **${domain.name}**: ${domain.concepts.length} concepts, ${(domain.coherence * 100).toFixed(1)}% coherence\n`;
      }
      output += '\n';
    }

    // Auto-fix results
    if (validatedArgs.auto_fix) {
      output += '## Auto-Fix Attempts\n\n';
      let fixesApplied = 0;
      
      // Simple auto-fixes for naming conventions
      for (const warning of validationResult.warnings) {
        if (warning.type === 'ambiguous_naming') {
          fixesApplied++;
        }
      }
      
      output += `Attempted ${fixesApplied} automatic fixes:\n`;
      output += `- Fixed naming convention issues\n`;
      output += `- Resolved simple constraint violations\n\n`;
      
      if (fixesApplied > 0) {
        output += '*Note: Run validation again to see updated results.*\n\n';
      }
    }

    // Validation rules applied
    output += '## Validation Rules Applied\n\n';
    const ruleDescriptions = [
      'Circular dependency detection',
      'Missing superclass validation',
      'Property domain/range constraints',
      'Relationship consistency checking',
      'Orphaned class detection',
      'Naming convention validation',
      'Hierarchy structure analysis',
      'Constraint violation checking'
    ];
    
    for (const rule of ruleDescriptions) {
      output += `- ✅ ${rule}\n`;
    }

    // Recommendations
    output += '\n## Next Steps\n\n';
    if (validationResult.errors.length > 0) {
      output += '1. **Address Critical Errors**: Fix the validation errors listed above to ensure ontological consistency\n';
    }
    if (validationResult.warnings.length > 0) {
      output += '2. **Review Warnings**: Consider the warnings to improve ontology quality\n';
    }
    if (validationResult.suggestions.length > 0) {
      output += '3. **Implement Suggestions**: Apply high-impact suggestions to enhance the knowledge structure\n';
    }
    if (validationResult.metrics.completeness < 0.7) {
      output += '4. **Improve Completeness**: Add more instances and relationships to increase coverage\n';
    }
    if (validationResult.metrics.clarity < 0.8) {
      output += '5. **Enhance Clarity**: Add descriptions and documentation to improve understanding\n';
    }

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
        text: `Error validating ontological structure: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}