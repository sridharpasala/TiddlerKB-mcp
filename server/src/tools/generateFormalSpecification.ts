import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { TiddlyWikiService } from '../services/TiddlyWikiService.js';
import { OntologyManager } from '../services/OntologyManager.js';
import { DomainAnalyzer } from '../services/DomainAnalyzer.js';
import { SemanticRelationshipMapper } from '../services/SemanticRelationshipMapper.js';

const generateFormalSpecificationSchema = z.object({
  format: z.enum(['owl', 'rdf', 'json-ld', 'turtle', 'skos']).default('json-ld').describe('Output format for the formal specification'),
  include_metadata: z.boolean().default(true).describe('Whether to include metadata in the specification'),
  namespace_uri: z.string().default('http://example.org/ontology#').describe('Base namespace URI for the ontology'),
  ontology_title: z.string().optional().describe('Title for the ontology'),
  ontology_description: z.string().optional().describe('Description of the ontology')
});

export const generateFormalSpecificationTool: Tool = {
  name: 'generate_formal_specification',
  description: 'Export ontologies to standard formats (OWL, RDF, JSON-LD), create machine-readable knowledge specifications, and generate semantic metadata for enhanced interoperability',
  inputSchema: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        enum: ['owl', 'rdf', 'json-ld', 'turtle', 'skos'],
        default: 'json-ld',
        description: 'Output format for the formal specification'
      },
      include_metadata: {
        type: 'boolean',
        default: true,
        description: 'Whether to include metadata in the specification'
      },
      namespace_uri: {
        type: 'string',
        default: 'http://example.org/ontology#',
        description: 'Base namespace URI for the ontology'
      },
      ontology_title: {
        type: 'string',
        description: 'Title for the ontology'
      },
      ontology_description: {
        type: 'string',
        description: 'Description of the ontology'
      }
    }
  }
};

export async function handleGenerateFormalSpecification(
  args: any,
  wikiService: TiddlyWikiService
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    const validatedArgs = generateFormalSpecificationSchema.parse(args);
    
    const allTiddlers = await wikiService.listTiddlers();
    
    if (allTiddlers.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No tiddlers found to generate specification from. Please create some content first.'
        }]
      };
    }

    // Build ontology from content
    const domainAnalyzer = new DomainAnalyzer();
    const extractionResult = await domainAnalyzer.analyzeDomain(allTiddlers);
    
    const relationshipMapper = new SemanticRelationshipMapper();
    const mappingResult = await relationshipMapper.mapRelationships(allTiddlers, extractionResult.concepts);
    
    const ontologyManager = new OntologyManager();
    
    // Add classes to ontology
    for (const concept of extractionResult.concepts) {
      const ontologyClass = {
        id: concept.name ? concept.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : `concept_${Date.now()}`,
        name: concept.name || 'Unnamed Concept',
        description: `Concept extracted from TiddlyWiki content. Type: ${concept.type}`,
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
      };
      
      ontologyManager.addClass(ontologyClass);
    }

    // Add properties to ontology
    for (const property of mappingResult.properties) {
      ontologyManager.addProperty(property);
    }

    // Add relationships to ontology
    for (const relationship of mappingResult.relationships) {
      ontologyManager.addRelationship(relationship);
    }

    // Generate formal specification
    const exportFormat = ontologyManager.exportToFormat(validatedArgs.format);
    
    let output = '# Formal Ontology Specification\n\n';

    // Metadata
    output += '## Specification Metadata\n\n';
    output += `- **Format**: ${validatedArgs.format.toUpperCase()}\n`;
    output += `- **Generated**: ${exportFormat.metadata.exportedAt}\n`;
    output += `- **Version**: ${exportFormat.metadata.version}\n`;
    output += `- **Classes**: ${exportFormat.metadata.classes}\n`;
    output += `- **Properties**: ${exportFormat.metadata.properties}\n`;
    output += `- **Relationships**: ${exportFormat.metadata.relationships}\n`;
    output += `- **Namespace**: ${validatedArgs.namespace_uri}\n`;
    
    if (validatedArgs.ontology_title) {
      output += `- **Title**: ${validatedArgs.ontology_title}\n`;
    }
    if (validatedArgs.ontology_description) {
      output += `- **Description**: ${validatedArgs.ontology_description}\n`;
    }
    output += '\n';

    // Statistics
    output += '## Ontology Statistics\n\n';
    const stats = ontologyManager.getOntologyStatistics();
    output += `- **Total Classes**: ${stats.classes.total}\n`;
    output += `- **Classes with Instances**: ${stats.classes.withInstances}\n`;
    output += `- **Root Classes**: ${stats.classes.rootClasses}\n`;
    output += `- **Object Properties**: ${stats.properties.object}\n`;
    output += `- **Datatype Properties**: ${stats.properties.datatype}\n`;
    output += `- **Bidirectional Relationships**: ${stats.relationships.bidirectional}\n`;
    output += `- **Domains**: ${stats.domains}\n\n`;

    // Validation
    const validation = ontologyManager.validateOntology();
    output += '## Specification Validation\n\n';
    output += `- **Valid**: ${validation.valid ? '✅' : '❌'}\n`;
    output += `- **Consistency**: ${(validation.metrics.consistency * 100).toFixed(1)}%\n`;
    output += `- **Completeness**: ${(validation.metrics.completeness * 100).toFixed(1)}%\n`;
    output += `- **Clarity**: ${(validation.metrics.clarity * 100).toFixed(1)}%\n`;
    output += `- **Coverage**: ${(validation.metrics.coverage * 100).toFixed(1)}%\n\n`;

    if (!validation.valid) {
      output += `**Warning**: The ontology has ${validation.errors.length} validation errors. Consider fixing these before using the specification.\n\n`;
    }

    // Format-specific information
    output += `## ${validatedArgs.format.toUpperCase()} Specification\n\n`;
    
    switch (validatedArgs.format) {
      case 'json-ld':
        output += 'JSON-LD format provides semantic web compatibility with JSON syntax:\n\n';
        output += '### Key Features\n';
        output += '- **@context**: Defines namespace mappings\n';
        output += '- **@graph**: Contains all ontology elements\n';
        output += '- **Linked Data**: Compatible with semantic web standards\n';
        output += '- **JSON**: Easy to parse and integrate with web applications\n\n';
        break;
        
      case 'owl':
        output += 'OWL (Web Ontology Language) format for formal reasoning:\n\n';
        output += '### Key Features\n';
        output += '- **XML/RDF syntax**: Standard semantic web format\n';
        output += '- **Reasoning support**: Compatible with OWL reasoners\n';
        output += '- **Formal semantics**: Enables logical inference\n';
        output += '- **Tool compatibility**: Works with Protégé and other ontology editors\n\n';
        break;
        
      case 'rdf':
        output += 'RDF (Resource Description Framework) format:\n\n';
        output += '### Key Features\n';
        output += '- **Triple-based**: Subject-predicate-object statements\n';
        output += '- **Graph structure**: Natural representation of relationships\n';
        output += '- **Standards compliant**: W3C standard format\n';
        output += '- **Flexible**: Easy to merge with other RDF data\n\n';
        break;
        
      case 'turtle':
        output += 'Turtle format for human-readable RDF:\n\n';
        output += '### Key Features\n';
        output += '- **Compact syntax**: More readable than RDF/XML\n';
        output += '- **Prefix support**: Abbreviated URIs\n';
        output += '- **RDF compatible**: Can be converted to other RDF formats\n';
        output += '- **Editor friendly**: Easier to write and edit manually\n\n';
        break;
        
      case 'skos':
        output += 'SKOS (Simple Knowledge Organization System) format:\n\n';
        output += '### Key Features\n';
        output += '- **Thesaurus support**: Designed for vocabularies and taxonomies\n';
        output += '- **Concept schemes**: Organized knowledge structures\n';
        output += '- **Hierarchical relations**: Broader/narrower relationships\n';
        output += '- **Multilingual**: Support for multiple languages\n\n';
        break;
    }

    // Usage instructions
    output += '### Usage Instructions\n\n';
    output += '1. **Save the specification** to a file with appropriate extension:\n';
    output += `   - JSON-LD: \`.jsonld\`\n`;
    output += `   - OWL: \`.owl\`\n`;
    output += `   - RDF: \`.rdf\`\n`;
    output += `   - Turtle: \`.ttl\`\n`;
    output += `   - SKOS: \`.rdf\` or \`.skos\`\n\n`;
    
    output += '2. **Load in tools**:\n';
    output += `   - Protégé (OWL, RDF)\n`;
    output += `   - Apache Jena (all formats)\n`;
    output += `   - RDF libraries in various programming languages\n`;
    output += `   - Semantic web applications\n\n`;

    output += '3. **Integrate with systems**:\n';
    output += `   - Import into knowledge graphs\n`;
    output += `   - Use for semantic search\n`;
    output += `   - Enable automated reasoning\n`;
    output += `   - Support data integration projects\n\n`;

    // The actual specification content
    output += '## Formal Specification Content\n\n';
    output += '```' + validatedArgs.format + '\n';
    output += exportFormat.content;
    output += '\n```\n\n';

    // Additional metadata if requested
    if (validatedArgs.include_metadata) {
      output += '## Extended Metadata\n\n';
      output += '### Source Information\n';
      output += `- **Source Tiddlers**: ${allTiddlers.length}\n`;
      output += `- **Extraction Date**: ${new Date().toISOString()}\n`;
      output += `- **Generator**: TiddlyWiki MCP Server v0.1.0\n\n`;
      
      output += '### Content Analysis\n';
      output += `- **Concepts Extracted**: ${extractionResult.concepts.length}\n`;
      output += `- **Relationships Mapped**: ${mappingResult.relationships.length}\n`;
      output += `- **Domains Identified**: ${extractionResult.domains.length}\n`;
      output += `- **Average Confidence**: ${(extractionResult.confidence * 100).toFixed(1)}%\n\n`;
      
      output += '### Quality Metrics\n';
      output += `- **Ontology Consistency**: ${(validation.metrics.consistency * 100).toFixed(1)}%\n`;
      output += `- **Knowledge Coverage**: ${(validation.metrics.coverage * 100).toFixed(1)}%\n`;
      output += `- **Structural Clarity**: ${(validation.metrics.clarity * 100).toFixed(1)}%\n`;
      output += `- **Completeness Score**: ${(validation.metrics.completeness * 100).toFixed(1)}%\n\n`;
    }

    // Recommendations
    output += '## Recommendations for Use\n\n';
    
    if (validation.valid) {
      output += '✅ **Ready for Production**: The ontology passed validation and can be used in production systems.\n\n';
    } else {
      output += '⚠️ **Review Required**: Address validation issues before production use.\n\n';
    }
    
    output += '### Best Practices\n';
    output += '- **Version Control**: Track changes to the ontology over time\n';
    output += '- **Documentation**: Maintain clear documentation of concepts and relationships\n';
    output += '- **Regular Updates**: Refresh the ontology as your knowledge base evolves\n';
    output += '- **Validation**: Regularly validate the ontology for consistency\n';
    output += '- **Backup**: Keep backups of both source tiddlers and generated specifications\n';

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
        text: `Error generating formal specification: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}