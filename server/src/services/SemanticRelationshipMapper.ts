import { 
  OntologyProperty, 
  OntologyRelationship, 
  ExtractedRelationship,
  ExtractedConcept,
  PropertyConstraint 
} from '../types/ontology.js';
import { Tiddler } from '../types/tiddler.js';

export interface SemanticPattern {
  pattern: RegExp;
  relationshipType: string;
  confidence: number;
  bidirectional: boolean;
  properties?: Record<string, any>;
}

export interface PropertyInference {
  name: string;
  domain: string[];
  range: string[];
  type: 'datatype' | 'object' | 'annotation';
  confidence: number;
  evidence: string[];
  constraints: PropertyConstraint[];
}

export class SemanticRelationshipMapper {
  private semanticPatterns: SemanticPattern[] = [
    // Taxonomic relationships
    {
      pattern: /(.+?)\s+(?:is|are)\s+(?:a|an|the)\s+(.+)/i,
      relationshipType: 'is-a',
      confidence: 0.8,
      bidirectional: false
    },
    {
      pattern: /(.+?)\s+(?:subclass|subtype|kind|type)\s+of\s+(.+)/i,
      relationshipType: 'is-a',
      confidence: 0.9,
      bidirectional: false
    },

    // Compositional relationships
    {
      pattern: /(.+?)\s+(?:has|have|contains|includes)\s+(.+)/i,
      relationshipType: 'has-a',
      confidence: 0.7,
      bidirectional: false
    },
    {
      pattern: /(.+?)\s+(?:part|component|element|member)\s+of\s+(.+)/i,
      relationshipType: 'part-of',
      confidence: 0.8,
      bidirectional: false
    },
    {
      pattern: /(.+?)\s+(?:consists|composed)\s+of\s+(.+)/i,
      relationshipType: 'composed-of',
      confidence: 0.8,
      bidirectional: false
    },

    // Causal relationships
    {
      pattern: /(.+?)\s+(?:causes|leads to|results in|triggers|produces)\s+(.+)/i,
      relationshipType: 'causes',
      confidence: 0.8,
      bidirectional: false
    },
    {
      pattern: /(.+?)\s+(?:caused by|triggered by|results from)\s+(.+)/i,
      relationshipType: 'caused-by',
      confidence: 0.8,
      bidirectional: false
    },

    // Functional relationships
    {
      pattern: /(.+?)\s+(?:enables|allows|permits|facilitates)\s+(.+)/i,
      relationshipType: 'enables',
      confidence: 0.7,
      bidirectional: false
    },
    {
      pattern: /(.+?)\s+(?:requires|needs|depends on)\s+(.+)/i,
      relationshipType: 'depends-on',
      confidence: 0.8,
      bidirectional: false
    },
    {
      pattern: /(.+?)\s+(?:uses|utilizes|employs)\s+(.+)/i,
      relationshipType: 'uses',
      confidence: 0.6,
      bidirectional: false
    },

    // Spatial relationships
    {
      pattern: /(.+?)\s+(?:located|situated|positioned)\s+(?:in|at|on)\s+(.+)/i,
      relationshipType: 'located-in',
      confidence: 0.8,
      bidirectional: false
    },
    {
      pattern: /(.+?)\s+(?:adjacent|next|close)\s+to\s+(.+)/i,
      relationshipType: 'adjacent-to',
      confidence: 0.7,
      bidirectional: true
    },

    // Temporal relationships
    {
      pattern: /(.+?)\s+(?:before|precedes)\s+(.+)/i,
      relationshipType: 'precedes',
      confidence: 0.8,
      bidirectional: false
    },
    {
      pattern: /(.+?)\s+(?:after|follows|succeeds)\s+(.+)/i,
      relationshipType: 'follows',
      confidence: 0.8,
      bidirectional: false
    },
    {
      pattern: /(.+?)\s+(?:during|while|throughout)\s+(.+)/i,
      relationshipType: 'during',
      confidence: 0.7,
      bidirectional: false
    },

    // Similarity relationships
    {
      pattern: /(.+?)\s+(?:similar|like|resembles|comparable)\s+(?:to\s+)?(.+)/i,
      relationshipType: 'similar-to',
      confidence: 0.6,
      bidirectional: true
    },
    {
      pattern: /(.+?)\s+(?:different|unlike|distinct)\s+(?:from\s+)?(.+)/i,
      relationshipType: 'different-from',
      confidence: 0.6,
      bidirectional: true
    },

    // Association relationships
    {
      pattern: /(.+?)\s+(?:related|associated|connected|linked)\s+(?:to|with)\s+(.+)/i,
      relationshipType: 'related-to',
      confidence: 0.5,
      bidirectional: true
    },
    {
      pattern: /(.+?)\s+(?:corresponds|maps|matches|aligns)\s+(?:to|with)\s+(.+)/i,
      relationshipType: 'corresponds-to',
      confidence: 0.7,
      bidirectional: true
    }
  ];

  async mapRelationships(
    tiddlers: Tiddler[],
    concepts: ExtractedConcept[]
  ): Promise<{
    relationships: OntologyRelationship[];
    properties: OntologyProperty[];
  }> {
    const extractedRelationships = this.extractRelationships(tiddlers, concepts);
    const relationships = this.convertToOntologyRelationships(extractedRelationships);
    const properties = this.inferProperties(relationships, concepts);

    return { relationships, properties };
  }

  private extractRelationships(
    tiddlers: Tiddler[],
    concepts: ExtractedConcept[]
  ): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];
    const conceptNames = new Set(concepts
      .filter(c => c.name && typeof c.name === 'string')
      .map(c => c.name.toLowerCase()));

    for (const tiddler of tiddlers) {
      const text = tiddler.text || '';
      if (!text) continue; // Skip tiddlers without text
      const sentences = this.splitIntoSentences(text);

      for (const sentence of sentences) {
        const foundRelationships = this.extractFromSentence(sentence, conceptNames);
        
        for (const rel of foundRelationships) {
          rel.evidence.push(`From "${tiddler.title || 'Untitled'}": ${sentence.substring(0, 100)}...`);
          relationships.push(rel);
        }
      }
    }

    return this.consolidateRelationships(relationships);
  }

  private extractFromSentence(
    sentence: string,
    conceptNames: Set<string>
  ): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];
    
    for (const pattern of this.semanticPatterns) {
      const matches = sentence.match(pattern.pattern);
      
      if (matches && matches.length >= 3) {
        const source = matches[1].trim().toLowerCase();
        const target = matches[2].trim().toLowerCase();
        
        // Check if both source and target are recognized concepts
        if (this.isRecognizedConcept(source, conceptNames) && 
            this.isRecognizedConcept(target, conceptNames)) {
          
          const relationship: ExtractedRelationship = {
            source,
            target,
            type: pattern.relationshipType,
            strength: pattern.confidence,
            evidence: [sentence],
            confidence: pattern.confidence
          };

          relationships.push(relationship);

          // Add bidirectional relationship if specified
          if (pattern.bidirectional) {
            const reverseRel: ExtractedRelationship = {
              source: target,
              target: source,
              type: pattern.relationshipType,
              strength: pattern.confidence * 0.9,
              evidence: [sentence],
              confidence: pattern.confidence * 0.9
            };
            relationships.push(reverseRel);
          }
        }
      }
    }

    return relationships;
  }

  private isRecognizedConcept(term: string, conceptNames: Set<string>): boolean {
    // Direct match
    if (conceptNames.has(term)) return true;
    
    // Partial match for compound terms
    const words = term.split(/\s+/);
    if (words.length > 1) {
      return words.some(word => conceptNames.has(word));
    }
    
    // Fuzzy match for similar terms
    for (const concept of conceptNames) {
      if (this.calculateStringSimilarity(term, concept) > 0.8) {
        return true;
      }
    }
    
    return false;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private consolidateRelationships(
    relationships: ExtractedRelationship[]
  ): ExtractedRelationship[] {
    const consolidatedMap = new Map<string, ExtractedRelationship>();

    for (const rel of relationships) {
      const key = `${rel.source}|${rel.type}|${rel.target}`;
      const existing = consolidatedMap.get(key);

      if (existing) {
        existing.strength = Math.min(existing.strength + rel.strength * 0.1, 1.0);
        existing.confidence = Math.min(existing.confidence + rel.confidence * 0.1, 1.0);
        existing.evidence.push(...rel.evidence);
      } else {
        consolidatedMap.set(key, { ...rel });
      }
    }

    return Array.from(consolidatedMap.values())
      .filter(rel => rel.strength > 0.3)
      .sort((a, b) => b.strength - a.strength);
  }

  private convertToOntologyRelationships(
    extractedRels: ExtractedRelationship[]
  ): OntologyRelationship[] {
    return extractedRels.map((rel, index) => ({
      id: `rel_${index + 1}`,
      type: rel.type,
      source: this.generateConceptId(rel.source),
      target: this.generateConceptId(rel.target),
      properties: {
        strength: rel.strength,
        evidence: rel.evidence.slice(0, 3) // Keep top 3 evidence items
      },
      confidence: rel.confidence,
      bidirectional: this.isBidirectionalRelationType(rel.type),
      metadata: {
        created: new Date().toISOString(),
        source: 'extracted'
      }
    }));
  }

  private isBidirectionalRelationType(type: string): boolean {
    const bidirectionalTypes = [
      'similar-to', 'different-from', 'related-to', 'corresponds-to', 'adjacent-to'
    ];
    return bidirectionalTypes.includes(type);
  }

  private inferProperties(
    relationships: OntologyRelationship[],
    concepts: ExtractedConcept[]
  ): OntologyProperty[] {
    const propertyInferences = new Map<string, PropertyInference>();

    // Infer properties from relationships
    for (const rel of relationships) {
      const propertyName = this.relationshipToPropertyName(rel.type);
      const inference = propertyInferences.get(propertyName) || {
        name: propertyName,
        domain: [],
        range: [],
        type: this.inferPropertyType(rel.type),
        confidence: 0,
        evidence: [],
        constraints: []
      };

      // Update domain and range
      if (!inference.domain.includes(rel.source)) {
        inference.domain.push(rel.source);
      }
      if (!inference.range.includes(rel.target)) {
        inference.range.push(rel.target);
      }

      // Update confidence and evidence
      inference.confidence = Math.max(inference.confidence, rel.confidence);
      inference.evidence.push(`Inferred from ${rel.source} ${rel.type} ${rel.target}`);

      propertyInferences.set(propertyName, inference);
    }

    // Infer additional properties from concept types
    for (const concept of concepts) {
      const typeProperties = this.getPropertiesForConceptType(concept.type);
      
      for (const propName of typeProperties) {
        const inference = propertyInferences.get(propName) || {
          name: propName,
          domain: [],
          range: [],
          type: 'datatype',
          confidence: 0.6,
          evidence: [],
          constraints: []
        };

        const conceptId = this.generateConceptId(concept.name);
        if (!inference.domain.includes(conceptId)) {
          inference.domain.push(conceptId);
        }

        inference.evidence.push(`Inferred from concept type: ${concept.type}`);
        propertyInferences.set(propName, inference);
      }
    }

    return this.convertToOntologyProperties(Array.from(propertyInferences.values()));
  }

  private relationshipToPropertyName(relationshipType: string): string {
    const mapping: Record<string, string> = {
      'is-a': 'isA',
      'has-a': 'has',
      'part-of': 'partOf',
      'composed-of': 'composedOf',
      'causes': 'causes',
      'caused-by': 'causedBy',
      'enables': 'enables',
      'depends-on': 'dependsOn',
      'uses': 'uses',
      'located-in': 'locatedIn',
      'adjacent-to': 'adjacentTo',
      'precedes': 'precedes',
      'follows': 'follows',
      'during': 'occurs',
      'similar-to': 'similarTo',
      'different-from': 'differentFrom',
      'related-to': 'relatedTo',
      'corresponds-to': 'correspondsTo'
    };

    return mapping[relationshipType] || relationshipType.replace(/-/g, '');
  }

  private inferPropertyType(relationshipType: string): 'datatype' | 'object' | 'annotation' {
    const objectProperties = [
      'is-a', 'has-a', 'part-of', 'composed-of', 'causes', 'caused-by',
      'enables', 'depends-on', 'uses', 'located-in', 'adjacent-to',
      'precedes', 'follows', 'similar-to', 'related-to', 'corresponds-to'
    ];

    const annotationProperties = [
      'different-from', 'during'
    ];

    if (objectProperties.includes(relationshipType)) {
      return 'object';
    } else if (annotationProperties.includes(relationshipType)) {
      return 'annotation';
    }

    return 'datatype';
  }

  private getPropertiesForConceptType(conceptType: string): string[] {
    const typeProperties: Record<string, string[]> = {
      entity: ['hasName', 'hasIdentifier', 'hasDescription', 'hasType'],
      process: ['hasInput', 'hasOutput', 'hasDuration', 'hasSteps', 'hasGoal'],
      quality: ['hasValue', 'hasUnit', 'hasMeasurement', 'hasScale'],
      abstract: ['hasDefinition', 'hasContext', 'hasApplication', 'hasExample']
    };

    return typeProperties[conceptType] || [];
  }

  private convertToOntologyProperties(
    inferences: PropertyInference[]
  ): OntologyProperty[] {
    return inferences
      .filter(inf => inf.confidence > 0.4)
      .map((inf, index) => ({
        id: `prop_${index + 1}`,
        name: inf.name,
        description: `Property inferred from relationship analysis: ${inf.evidence[0]}`,
        domain: inf.domain,
        range: inf.range,
        type: inf.type,
        cardinality: this.inferCardinality(inf),
        constraints: inf.constraints
      }));
  }

  private inferCardinality(inference: PropertyInference): { min: number; max: number | 'unbounded' } {
    // Default cardinality based on property type
    switch (inference.type) {
      case 'datatype':
        return { min: 0, max: 1 }; // Most datatype properties are single-valued
      case 'object':
        return { min: 0, max: 'unbounded' }; // Object properties can have multiple values
      case 'annotation':
        return { min: 0, max: 'unbounded' }; // Annotations can be multiple
      default:
        return { min: 0, max: 1 };
    }
  }

  private generateConceptId(conceptName: string): string {
    return conceptName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  private splitIntoSentences(text: string): string[] {
    return text.split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);
  }

  // Public utility methods
  getRelationshipsByType(
    relationships: OntologyRelationship[],
    type: string
  ): OntologyRelationship[] {
    return relationships.filter(rel => rel.type === type);
  }

  getRelationshipsForConcept(
    relationships: OntologyRelationship[],
    conceptId: string
  ): OntologyRelationship[] {
    return relationships.filter(rel => 
      rel.source === conceptId || rel.target === conceptId
    );
  }

  getPropertiesForDomain(
    properties: OntologyProperty[],
    domainId: string
  ): OntologyProperty[] {
    return properties.filter(prop => prop.domain.includes(domainId));
  }

  validateRelationshipConsistency(
    relationships: OntologyRelationship[]
  ): { consistent: boolean; conflicts: string[] } {
    const conflicts: string[] = [];
    
    // Check for conflicting relationships
    for (let i = 0; i < relationships.length; i++) {
      for (let j = i + 1; j < relationships.length; j++) {
        const rel1 = relationships[i];
        const rel2 = relationships[j];
        
        if (this.areConflictingRelationships(rel1, rel2)) {
          conflicts.push(
            `Conflict between "${rel1.source} ${rel1.type} ${rel1.target}" and "${rel2.source} ${rel2.type} ${rel2.target}"`
          );
        }
      }
    }

    return {
      consistent: conflicts.length === 0,
      conflicts
    };
  }

  private areConflictingRelationships(
    rel1: OntologyRelationship,
    rel2: OntologyRelationship
  ): boolean {
    // Check for direct contradictions
    if (rel1.source === rel2.source && rel1.target === rel2.target) {
      const conflictingPairs = [
        ['is-a', 'part-of'],
        ['similar-to', 'different-from'],
        ['causes', 'caused-by']
      ];
      
      return conflictingPairs.some(([type1, type2]) =>
        (rel1.type === type1 && rel2.type === type2) ||
        (rel1.type === type2 && rel2.type === type1)
      );
    }

    return false;
  }

  // Advanced relationship analysis
  findRelationshipChains(
    relationships: OntologyRelationship[],
    startConcept: string,
    maxDepth = 3
  ): Array<{ path: string[]; types: string[]; confidence: number }> {
    const chains: Array<{ path: string[]; types: string[]; confidence: number }> = [];
    const visited = new Set<string>();

    this.exploreChains(
      relationships,
      startConcept,
      [startConcept],
      [],
      1.0,
      maxDepth,
      visited,
      chains
    );

    return chains.sort((a, b) => b.confidence - a.confidence);
  }

  private exploreChains(
    relationships: OntologyRelationship[],
    currentConcept: string,
    path: string[],
    types: string[],
    confidence: number,
    remainingDepth: number,
    visited: Set<string>,
    chains: Array<{ path: string[]; types: string[]; confidence: number }>
  ): void {
    if (remainingDepth <= 0 || visited.has(currentConcept)) {
      if (path.length > 2) {
        chains.push({ path: [...path], types: [...types], confidence });
      }
      return;
    }

    visited.add(currentConcept);

    const outgoingRels = relationships.filter(rel => rel.source === currentConcept);

    for (const rel of outgoingRels) {
      if (!visited.has(rel.target)) {
        this.exploreChains(
          relationships,
          rel.target,
          [...path, rel.target],
          [...types, rel.type],
          confidence * rel.confidence,
          remainingDepth - 1,
          new Set(visited),
          chains
        );
      }
    }

    visited.delete(currentConcept);
  }
}