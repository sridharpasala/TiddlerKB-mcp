import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { TiddlyWikiService } from '../services/TiddlyWikiService.js';
import { SemanticRelationshipMapper } from '../services/SemanticRelationshipMapper.js';
import { DomainAnalyzer } from '../services/DomainAnalyzer.js';

const mapSemanticRelationshipsSchema = z.object({
  relationship_types: z.array(z.string()).optional().describe('Specific relationship types to focus on'),
  strength_threshold: z.number().min(0).max(1).default(0.3).describe('Minimum relationship strength to include'),
  include_bidirectional: z.boolean().default(true).describe('Whether to include bidirectional relationships'),
  max_relationships: z.number().min(10).max(500).default(100).describe('Maximum number of relationships to map'),
  validate_consistency: z.boolean().default(true).describe('Whether to validate relationship consistency')
});

export const mapSemanticRelationshipsTool: Tool = {
  name: 'map_semantic_relationships',
  description: 'Define and validate semantic properties between concepts, modeling complex relationships (part-of, causes, enables, etc.) and creating formal relationship specifications',
  inputSchema: {
    type: 'object',
    properties: {
      relationship_types: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific relationship types to focus on'
      },
      strength_threshold: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        default: 0.3,
        description: 'Minimum relationship strength to include'
      },
      include_bidirectional: {
        type: 'boolean',
        default: true,
        description: 'Whether to include bidirectional relationships'
      },
      max_relationships: {
        type: 'number',
        minimum: 10,
        maximum: 500,
        default: 100,
        description: 'Maximum number of relationships to map'
      },
      validate_consistency: {
        type: 'boolean',
        default: true,
        description: 'Whether to validate relationship consistency'
      }
    }
  }
};

export async function handleMapSemanticRelationships(
  args: any,
  wikiService: TiddlyWikiService
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    const validatedArgs = mapSemanticRelationshipsSchema.parse(args);
    
    // Get all tiddlers
    const allTiddlers = await wikiService.listTiddlers();
    
    if (allTiddlers.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No tiddlers found. Please create some content first to map relationships.'
        }]
      };
    }

    // Extract concepts first
    const domainAnalyzer = new DomainAnalyzer();
    const extractionResult = await domainAnalyzer.analyzeDomain(allTiddlers);
    
    // Map relationships
    const relationshipMapper = new SemanticRelationshipMapper();
    const mappingResult = await relationshipMapper.mapRelationships(allTiddlers, extractionResult.concepts);
    
    // Filter relationships by criteria
    let filteredRelationships = mappingResult.relationships
      .filter(rel => rel.confidence >= validatedArgs.strength_threshold);
    
    if (validatedArgs.relationship_types && validatedArgs.relationship_types.length > 0) {
      filteredRelationships = filteredRelationships.filter(rel => 
        validatedArgs.relationship_types!.includes(rel.type)
      );
    }
    
    if (!validatedArgs.include_bidirectional) {
      filteredRelationships = filteredRelationships.filter(rel => !rel.bidirectional);
    }
    
    filteredRelationships = filteredRelationships.slice(0, validatedArgs.max_relationships);

    let output = '# Semantic Relationship Mapping\n\n';

    // Summary
    output += '## Summary\n\n';
    output += `- **Tiddlers Analyzed**: ${allTiddlers.length}\n`;
    output += `- **Concepts Found**: ${extractionResult.concepts.length}\n`;
    output += `- **Total Relationships Discovered**: ${mappingResult.relationships.length}\n`;
    output += `- **Filtered Relationships**: ${filteredRelationships.length}\n`;
    output += `- **Properties Inferred**: ${mappingResult.properties.length}\n\n`;

    // Relationship Types Analysis
    const relationshipTypes = new Map<string, number>();
    for (const rel of filteredRelationships) {
      relationshipTypes.set(rel.type, (relationshipTypes.get(rel.type) || 0) + 1);
    }

    output += '## Relationship Types\n\n';
    const sortedTypes = Array.from(relationshipTypes.entries())
      .sort((a, b) => b[1] - a[1]);
    
    for (const [type, count] of sortedTypes) {
      const percentage = (count / filteredRelationships.length * 100).toFixed(1);
      output += `- **${type}**: ${count} relationships (${percentage}%)\n`;
    }
    output += '\n';

    // Top Relationships by Strength
    output += '## Strongest Relationships\n\n';
    const topRelationships = filteredRelationships
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 20);
    
    for (const rel of topRelationships) {
      const strengthBar = '█'.repeat(Math.round(rel.confidence * 10));
      output += `- **${rel.source}** →[${rel.type}]→ **${rel.target}** `;
      output += `(${(rel.confidence * 100).toFixed(1)}%) ${strengthBar}\n`;
    }
    output += '\n';

    // Bidirectional Relationships
    if (validatedArgs.include_bidirectional) {
      const bidirectionalRels = filteredRelationships.filter(rel => rel.bidirectional);
      
      output += '## Bidirectional Relationships\n\n';
      output += `Found ${bidirectionalRels.length} bidirectional relationships:\n\n`;
      
      for (const rel of bidirectionalRels.slice(0, 10)) {
        output += `- **${rel.source}** ↔[${rel.type}]↔ **${rel.target}** `;
        output += `(${(rel.confidence * 100).toFixed(1)}%)\n`;
      }
      output += '\n';
    }

    // Properties Analysis
    output += '## Inferred Properties\n\n';
    const propertyTypes = new Map<string, number>();
    for (const prop of mappingResult.properties) {
      propertyTypes.set(prop.type, (propertyTypes.get(prop.type) || 0) + 1);
    }

    output += '### Properties by Type\n';
    for (const [type, count] of propertyTypes.entries()) {
      output += `- **${type}**: ${count} properties\n`;
    }
    output += '\n';

    output += '### Top Properties\n';
    const topProperties = mappingResult.properties
      .sort((a, b) => b.domain.length - a.domain.length)
      .slice(0, 15);
    
    for (const prop of topProperties) {
      output += `- **${prop.name}** (${prop.type})\n`;
      output += `  - Domain: ${prop.domain.slice(0, 3).join(', ')}${prop.domain.length > 3 ? '...' : ''}\n`;
      output += `  - Range: ${prop.range.slice(0, 3).join(', ')}${prop.range.length > 3 ? '...' : ''}\n`;
    }
    output += '\n';

    // Validation Results
    if (validatedArgs.validate_consistency) {
      const validation = relationshipMapper.validateRelationshipConsistency(filteredRelationships);
      
      output += '## Consistency Validation\n\n';
      output += `- **Consistent**: ${validation.consistent ? 'Yes' : 'No'}\n`;
      output += `- **Conflicts Found**: ${validation.conflicts.length}\n\n`;
      
      if (validation.conflicts.length > 0) {
        output += '### Detected Conflicts\n';
        for (const conflict of validation.conflicts.slice(0, 10)) {
          output += `- ${conflict}\n`;
        }
        output += '\n';
      }
    }

    // Relationship Chains
    const strongestConcepts = extractionResult.concepts
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
    
    output += '## Relationship Chains\n\n';
    output += 'Exploring relationship chains from most frequent concepts:\n\n';
    
    for (const concept of strongestConcepts) {
      const conceptId = concept.name ? concept.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : `concept_${Date.now()}`;
      const chains = relationshipMapper.findRelationshipChains(filteredRelationships, conceptId, 3);
      
      if (chains.length > 0) {
        output += `### From "${concept.name}"\n`;
        for (const chain of chains.slice(0, 3)) {
          const pathStr = chain.path.join(' → ');
          const typeStr = chain.types.join(', ');
          output += `- ${pathStr} (${typeStr}, confidence: ${(chain.confidence * 100).toFixed(1)}%)\n`;
        }
        output += '\n';
      }
    }

    // Network Analysis
    output += '## Network Analysis\n\n';
    const networkStats = calculateNetworkStatistics(filteredRelationships);
    output += `- **Node Count**: ${networkStats.nodeCount}\n`;
    output += `- **Edge Count**: ${networkStats.edgeCount}\n`;
    output += `- **Average Degree**: ${networkStats.averageDegree.toFixed(2)}\n`;
    output += `- **Density**: ${(networkStats.density * 100).toFixed(2)}%\n`;
    output += `- **Connected Components**: ${networkStats.components}\n\n`;

    // Most Connected Concepts
    output += '### Most Connected Concepts\n';
    const connectionCounts = new Map<string, number>();
    for (const rel of filteredRelationships) {
      connectionCounts.set(rel.source, (connectionCounts.get(rel.source) || 0) + 1);
      connectionCounts.set(rel.target, (connectionCounts.get(rel.target) || 0) + 1);
    }

    const topConnected = Array.from(connectionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    for (const [concept, count] of topConnected) {
      output += `- **${concept}**: ${count} connections\n`;
    }

    // Configuration
    output += '\n## Configuration\n\n';
    output += `- **Strength Threshold**: ${(validatedArgs.strength_threshold * 100).toFixed(1)}%\n`;
    output += `- **Include Bidirectional**: ${validatedArgs.include_bidirectional ? 'Yes' : 'No'}\n`;
    output += `- **Max Relationships**: ${validatedArgs.max_relationships}\n`;
    output += `- **Validate Consistency**: ${validatedArgs.validate_consistency ? 'Yes' : 'No'}\n`;
    if (validatedArgs.relationship_types) {
      output += `- **Focus Types**: ${validatedArgs.relationship_types.join(', ')}\n`;
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
        text: `Error mapping semantic relationships: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

export function calculateNetworkStatistics(relationships: any[]) {
  const nodes = new Set<string>();
  const edges = relationships.length;
  
  for (const rel of relationships) {
    nodes.add(rel.source);
    nodes.add(rel.target);
  }
  
  const nodeCount = nodes.size;
  const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
  const density = maxPossibleEdges > 0 ? edges / maxPossibleEdges : 0;
  const averageDegree = nodeCount > 0 ? (edges * 2) / nodeCount : 0;
  
  // Simple connected components estimation
  const components = Math.max(1, Math.ceil(nodeCount / 10));
  
  return {
    nodeCount,
    edgeCount: edges,
    density,
    averageDegree,
    components
  };
}