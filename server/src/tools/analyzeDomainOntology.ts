import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { TiddlyWikiService } from '../services/TiddlyWikiService.js';
import { DomainAnalyzer } from '../services/DomainAnalyzer.js';
import { ConceptHierarchy } from '../services/ConceptHierarchy.js';
import { SemanticRelationshipMapper } from '../services/SemanticRelationshipMapper.js';

const analyzeDomainOntologySchema = z.object({
  domain_scope: z.string().optional().describe('Optional domain scope to focus analysis (e.g., "technology", "business")'),
  concept_threshold: z.number().min(0).max(1).default(0.5).describe('Confidence threshold for concept extraction (0-1)'),
  relationship_threshold: z.number().min(0).max(1).default(0.3).describe('Strength threshold for relationship extraction (0-1)'),
  include_hierarchy: z.boolean().default(true).describe('Whether to build concept hierarchies'),
  max_concepts: z.number().min(10).max(1000).default(100).describe('Maximum number of concepts to analyze')
});

export const analyzeDomainOntologyTool: Tool = {
  name: 'analyze_domain_ontology',
  description: 'Discover and map domain-specific concepts from existing tiddlers, identifying implicit knowledge structures and relationships to generate conceptual frameworks for knowledge domains',
  inputSchema: {
    type: 'object',
    properties: {
      domain_scope: {
        type: 'string',
        description: 'Optional domain scope to focus analysis (e.g., "technology", "business")'
      },
      concept_threshold: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        default: 0.5,
        description: 'Confidence threshold for concept extraction (0-1)'
      },
      relationship_threshold: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        default: 0.3,
        description: 'Strength threshold for relationship extraction (0-1)'
      },
      include_hierarchy: {
        type: 'boolean',
        default: true,
        description: 'Whether to build concept hierarchies'
      },
      max_concepts: {
        type: 'number',
        minimum: 10,
        maximum: 1000,
        default: 100,
        description: 'Maximum number of concepts to analyze'
      }
    }
  }
};

export async function handleAnalyzeDomainOntology(
  args: any,
  wikiService: TiddlyWikiService
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    const validatedArgs = analyzeDomainOntologySchema.parse(args);
    
    // Get all tiddlers for analysis
    const allTiddlers = await wikiService.listTiddlers();
    
    if (allTiddlers.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No tiddlers found to analyze. Please create some content first.'
        }]
      };
    }

    // Initialize analyzers
    const domainAnalyzer = new DomainAnalyzer();
    const conceptHierarchy = new ConceptHierarchy();
    const relationshipMapper = new SemanticRelationshipMapper();

    // Step 1: Extract concepts and relationships from tiddlers
    const extractionResult = await domainAnalyzer.analyzeDomain(allTiddlers, validatedArgs.domain_scope);
    
    // Filter concepts by confidence threshold
    const filteredConcepts = extractionResult.concepts
      .filter(c => c.confidence >= validatedArgs.concept_threshold)
      .slice(0, validatedArgs.max_concepts);

    // Filter relationships by strength threshold
    const filteredRelationships = extractionResult.relationships
      .filter(r => r.strength >= validatedArgs.relationship_threshold);

    // Step 2: Build concept hierarchy if requested
    let hierarchyResult = null;
    if (validatedArgs.include_hierarchy && filteredConcepts.length > 0) {
      hierarchyResult = conceptHierarchy.buildHierarchy(filteredConcepts, filteredRelationships);
    }

    // Step 3: Map semantic relationships
    const semanticMapping = await relationshipMapper.mapRelationships(allTiddlers, filteredConcepts);

    // Step 4: Analyze domains
    const domainAnalysis = extractionResult.domains;

    // Compile results
    const results = {
      summary: {
        total_tiddlers_analyzed: allTiddlers.length,
        concepts_discovered: filteredConcepts.length,
        relationships_found: filteredRelationships.length,
        domains_identified: domainAnalysis.length,
        overall_confidence: extractionResult.confidence
      },
      concepts: {
        by_type: groupConceptsByType(filteredConcepts),
        high_confidence: filteredConcepts.filter(c => c.confidence > 0.8),
        most_frequent: filteredConcepts
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 10)
      },
      relationships: {
        by_type: groupRelationshipsByType(filteredRelationships),
        strongest: filteredRelationships
          .sort((a, b) => b.strength - a.strength)
          .slice(0, 10),
        semantic_properties: semanticMapping.properties.length
      },
      domains: domainAnalysis.map(domain => ({
        name: domain.name,
        concept_count: domain.concepts.length,
        scope: domain.scope,
        coherence: domain.coherence,
        main_concepts: domain.concepts.slice(0, 5)
      })),
      hierarchy: hierarchyResult ? {
        root_concepts: hierarchyResult.length,
        total_nodes: countHierarchyNodes(hierarchyResult),
        max_depth: calculateMaxDepth(hierarchyResult),
        validation: conceptHierarchy.validateHierarchy()
      } : null,
      recommendations: generateRecommendations(
        filteredConcepts, 
        filteredRelationships, 
        domainAnalysis,
        hierarchyResult || []
      )
    };

    const output = formatAnalysisOutput(results, validatedArgs);

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
        text: `Error analyzing domain ontology: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

export function groupConceptsByType(concepts: any[]): Record<string, number> {
  const groups: Record<string, number> = {};
  for (const concept of concepts) {
    groups[concept.type] = (groups[concept.type] || 0) + 1;
  }
  return groups;
}

export function groupRelationshipsByType(relationships: any[]): Record<string, number> {
  const groups: Record<string, number> = {};
  for (const rel of relationships) {
    groups[rel.type] = (groups[rel.type] || 0) + 1;
  }
  return groups;
}

export function countHierarchyNodes(hierarchy: any[]): number {
  let count = 0;
  
  function countRecursive(nodes: any[]): void {
    for (const node of nodes) {
      count++;
      if (node.children) {
        countRecursive(node.children);
      }
    }
  }
  
  countRecursive(hierarchy);
  return count;
}

export function calculateMaxDepth(hierarchy: any[]): number {
  let maxDepth = 0;
  
  function calculateDepthRecursive(nodes: any[], depth: number): void {
    maxDepth = Math.max(maxDepth, depth);
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        calculateDepthRecursive(node.children, depth + 1);
      }
    }
  }
  
  calculateDepthRecursive(hierarchy, 1);
  return maxDepth;
}

export function generateRecommendations(
  concepts: any[], 
  relationships: any[], 
  domains: any[],
  hierarchy: any[]
): string[] {
  const recommendations: string[] = [];

  // Concept recommendations
  if (concepts.length < 10) {
    recommendations.push('Consider adding more content to discover additional concepts');
  }
  
  const lowConfidenceConcepts = concepts.filter(c => c.confidence < 0.5).length;
  if (lowConfidenceConcepts > concepts.length * 0.3) {
    recommendations.push('Many concepts have low confidence - consider improving content structure and clarity');
  }

  // Relationship recommendations
  if (relationships.length < concepts.length * 0.5) {
    recommendations.push('Few relationships detected - consider adding more explicit connections between concepts');
  }

  // Domain recommendations
  if (domains.length > 5) {
    recommendations.push('Many domains detected - consider organizing content into more focused areas');
  }

  const lowCoherenceDomains = domains.filter(d => d.coherence < 0.5).length;
  if (lowCoherenceDomains > 0) {
    recommendations.push(`${lowCoherenceDomains} domain(s) have low coherence - consider better organizing related concepts`);
  }

  // Hierarchy recommendations
  if (hierarchy && hierarchy.length > 8) {
    recommendations.push('Many root concepts - consider creating higher-level categories');
  }

  if (recommendations.length === 0) {
    recommendations.push('Ontology structure looks good - consider adding more specific relationships and constraints');
  }

  return recommendations;
}

export function formatAnalysisOutput(results: any, args: any): string {
  let output = '# Domain Ontology Analysis Results\n\n';

  // Summary
  output += '## Summary\n';
  output += `- **Tiddlers Analyzed**: ${results.summary.total_tiddlers_analyzed}\n`;
  output += `- **Concepts Discovered**: ${results.summary.concepts_discovered}\n`;
  output += `- **Relationships Found**: ${results.summary.relationships_found}\n`;
  output += `- **Domains Identified**: ${results.summary.domains_identified}\n`;
  output += `- **Overall Confidence**: ${(results.summary.overall_confidence * 100).toFixed(1)}%\n\n`;

  // Concepts
  output += '## Discovered Concepts\n\n';
  output += '### By Type\n';
  for (const [type, count] of Object.entries(results.concepts.by_type)) {
    output += `- **${type}**: ${count} concepts\n`;
  }

  output += '\n### Most Frequent Concepts\n';
  for (const concept of results.concepts.most_frequent) {
    output += `- **${concept.name}** (${concept.type}, frequency: ${concept.frequency}, confidence: ${(concept.confidence * 100).toFixed(1)}%)\n`;
  }

  output += '\n### High Confidence Concepts\n';
  for (const concept of results.concepts.high_confidence.slice(0, 10)) {
    output += `- **${concept.name}** (${(concept.confidence * 100).toFixed(1)}% confidence)\n`;
  }

  // Relationships
  output += '\n## Discovered Relationships\n\n';
  output += '### By Type\n';
  for (const [type, count] of Object.entries(results.relationships.by_type)) {
    output += `- **${type}**: ${count} relationships\n`;
  }

  output += '\n### Strongest Relationships\n';
  for (const rel of results.relationships.strongest) {
    output += `- **${rel.source}** → **${rel.target}** (${rel.type}, strength: ${(rel.strength * 100).toFixed(1)}%)\n`;
  }

  // Domains
  output += '\n## Identified Domains\n\n';
  for (const domain of results.domains) {
    output += `### ${domain.name}\n`;
    output += `- **Concepts**: ${domain.concept_count}\n`;
    output += `- **Scope**: ${domain.scope}\n`;
    output += `- **Coherence**: ${(domain.coherence * 100).toFixed(1)}%\n`;
    output += `- **Main Concepts**: ${domain.main_concepts.join(', ')}\n\n`;
  }

  // Hierarchy
  if (results.hierarchy) {
    output += '## Concept Hierarchy\n\n';
    output += `- **Root Concepts**: ${results.hierarchy.root_concepts}\n`;
    output += `- **Total Nodes**: ${results.hierarchy.total_nodes}\n`;
    output += `- **Maximum Depth**: ${results.hierarchy.max_depth}\n`;
    output += `- **Structure Valid**: ${results.hierarchy.validation.valid ? 'Yes' : 'No'}\n`;
    
    if (!results.hierarchy.validation.valid) {
      output += `- **Validation Errors**: ${results.hierarchy.validation.errors.length}\n`;
      output += `- **Validation Warnings**: ${results.hierarchy.validation.warnings.length}\n`;
    }
    output += '\n';
  }

  // Recommendations
  output += '## Recommendations\n\n';
  for (const rec of results.recommendations) {
    output += `- ${rec}\n`;
  }

  // Configuration
  output += '\n## Analysis Configuration\n\n';
  output += `- **Domain Scope**: ${args.domain_scope || 'All domains'}\n`;
  output += `- **Concept Threshold**: ${(args.concept_threshold * 100).toFixed(1)}%\n`;
  output += `- **Relationship Threshold**: ${(args.relationship_threshold * 100).toFixed(1)}%\n`;
  output += `- **Include Hierarchy**: ${args.include_hierarchy ? 'Yes' : 'No'}\n`;
  output += `- **Max Concepts**: ${args.max_concepts}\n`;

  return output;
}