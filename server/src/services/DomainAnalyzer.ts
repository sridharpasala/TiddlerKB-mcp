import { Tiddler } from '../types/tiddler.js';
import { 
  ConceptExtractionResult, 
  ExtractedConcept, 
  ExtractedRelationship, 
  ExtractedDomain 
} from '../types/ontology.js';

export class DomainAnalyzer {
  private stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
  ]);

  private conceptTypes = {
    entity: ['person', 'organization', 'place', 'thing', 'object', 'system', 'tool', 'device'],
    process: ['process', 'method', 'procedure', 'workflow', 'algorithm', 'technique', 'approach'],
    quality: ['property', 'attribute', 'characteristic', 'feature', 'quality', 'trait'],
    abstract: ['concept', 'idea', 'theory', 'principle', 'rule', 'law', 'pattern']
  };

  async analyzeDomain(tiddlers: Tiddler[], domainScope?: string): Promise<ConceptExtractionResult> {
    const concepts = await this.extractConcepts(tiddlers);
    const relationships = await this.extractRelationships(tiddlers, concepts);
    const domains = await this.identifyDomains(tiddlers, concepts);
    
    const confidence = this.calculateOverallConfidence(concepts, relationships, domains);

    return {
      concepts,
      relationships,
      domains,
      confidence
    };
  }

  private async extractConcepts(tiddlers: Tiddler[]): Promise<ExtractedConcept[]> {
    const conceptMap = new Map<string, ExtractedConcept>();
    
    for (const tiddler of tiddlers) {
      // Safely handle potentially undefined tiddler properties
      const title = tiddler.title || '';
      const text = tiddler.text || '';
      const combinedText = `${title} ${text}`.toLowerCase();
      const words = this.tokenize(combinedText);
      const phrases = this.extractPhrases(combinedText);
      
      // Extract single-word concepts
      for (const word of words) {
        if (this.isValidConcept(word)) {
          this.addOrUpdateConcept(conceptMap, word, title);
        }
      }
      
      // Extract multi-word phrases
      for (const phrase of phrases) {
        if (this.isValidConcept(phrase)) {
          this.addOrUpdateConcept(conceptMap, phrase, title);
        }
      }
      
      // Extract concepts from tags
      if (tiddler.tags && Array.isArray(tiddler.tags)) {
        for (const tag of tiddler.tags) {
          if (tag && typeof tag === 'string') {
            this.addOrUpdateConcept(conceptMap, tag.toLowerCase(), title);
          }
        }
      }
    }

    return Array.from(conceptMap.values())
      .filter(concept => concept.frequency > 1)
      .sort((a, b) => b.frequency - a.frequency);
  }

  private async extractRelationships(
    tiddlers: Tiddler[], 
    concepts: ExtractedConcept[]
  ): Promise<ExtractedRelationship[]> {
    const relationships: ExtractedRelationship[] = [];
    const conceptNames = new Set(concepts.map(c => c.name));

    for (const tiddler of tiddlers) {
      const text = (tiddler.text || '').toLowerCase();
      const sentences = this.splitIntoSentences(text);
      
      for (const sentence of sentences) {
        const foundConcepts = Array.from(conceptNames).filter(concept => 
          sentence.includes(concept)
        );
        
        if (foundConcepts.length >= 2) {
          const relationshipType = this.identifyRelationshipType(sentence, foundConcepts);
          
          for (let i = 0; i < foundConcepts.length; i++) {
            for (let j = i + 1; j < foundConcepts.length; j++) {
              const existing = relationships.find(r => 
                (r.source === foundConcepts[i] && r.target === foundConcepts[j]) ||
                (r.source === foundConcepts[j] && r.target === foundConcepts[i])
              );
              
              if (existing) {
                existing.strength += 0.1;
                existing.evidence.push(sentence.substring(0, 100));
              } else {
                relationships.push({
                  source: foundConcepts[i],
                  target: foundConcepts[j],
                  type: relationshipType,
                  strength: 0.3,
                  evidence: [sentence.substring(0, 100)],
                  confidence: this.calculateRelationshipConfidence(sentence, foundConcepts[i], foundConcepts[j])
                });
              }
            }
          }
        }
      }
    }

    return relationships
      .filter(r => r.strength > 0.2)
      .sort((a, b) => b.strength - a.strength);
  }

  private async identifyDomains(
    tiddlers: Tiddler[], 
    concepts: ExtractedConcept[]
  ): Promise<ExtractedDomain[]> {
    const domains: ExtractedDomain[] = [];
    const conceptClusters = this.clusterConceptsByDomain(concepts);
    
    for (const [domainName, domainConcepts] of conceptClusters.entries()) {
      const scope = this.determineDomainScope(tiddlers, domainConcepts);
      const coherence = this.calculateDomainCoherence(domainConcepts, concepts);
      
      domains.push({
        name: domainName,
        concepts: domainConcepts.map(c => c.name),
        scope,
        coherence
      });
    }

    return domains.sort((a, b) => b.coherence - a.coherence);
  }

  private tokenize(text: string): string[] {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.stopWords.has(word));
  }

  private extractPhrases(text: string): string[] {
    const phrases: string[] = [];
    const sentences = this.splitIntoSentences(text);
    
    for (const sentence of sentences) {
      const words = sentence.split(/\s+/);
      
      // Extract 2-3 word phrases
      for (let i = 0; i < words.length - 1; i++) {
        const twoWordPhrase = `${words[i]} ${words[i + 1]}`.replace(/[^\w\s]/g, '').trim();
        if (twoWordPhrase.length > 5 && this.isValidPhrase(twoWordPhrase)) {
          phrases.push(twoWordPhrase);
        }
        
        if (i < words.length - 2) {
          const threeWordPhrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`.replace(/[^\w\s]/g, '').trim();
          if (threeWordPhrase.length > 8 && this.isValidPhrase(threeWordPhrase)) {
            phrases.push(threeWordPhrase);
          }
        }
      }
    }
    
    return phrases;
  }

  private splitIntoSentences(text: string): string[] {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  }

  private isValidConcept(concept: string): boolean {
    return concept.length > 2 && 
           !this.stopWords.has(concept) && 
           /^[a-zA-Z]/.test(concept) &&
           !/^\d+$/.test(concept);
  }

  private isValidPhrase(phrase: string): boolean {
    const words = phrase.split(/\s+/);
    return words.length >= 2 && 
           words.every(word => this.isValidConcept(word)) &&
           !words.some(word => this.stopWords.has(word));
  }

  private addOrUpdateConcept(
    conceptMap: Map<string, ExtractedConcept>, 
    name: string, 
    context: string
  ): void {
    const existing = conceptMap.get(name);
    
    if (existing) {
      existing.frequency++;
      if (!existing.contexts.includes(context)) {
        existing.contexts.push(context);
      }
    } else {
      conceptMap.set(name, {
        name,
        type: this.inferConceptType(name),
        frequency: 1,
        contexts: [context],
        confidence: this.calculateConceptConfidence(name)
      });
    }
  }

  private inferConceptType(concept: string): 'entity' | 'process' | 'quality' | 'abstract' {
    const lowerConcept = concept.toLowerCase();
    
    for (const [type, indicators] of Object.entries(this.conceptTypes)) {
      if (indicators.some(indicator => lowerConcept.includes(indicator))) {
        return type as 'entity' | 'process' | 'quality' | 'abstract';
      }
    }
    
    // Default classification based on linguistic patterns
    if (lowerConcept.endsWith('ing') || lowerConcept.endsWith('tion') || lowerConcept.endsWith('ment')) {
      return 'process';
    } else if (lowerConcept.endsWith('ness') || lowerConcept.endsWith('ity') || lowerConcept.endsWith('able')) {
      return 'quality';
    } else if (concept[0] === concept[0].toUpperCase()) {
      return 'entity';
    }
    
    return 'abstract';
  }

  private calculateConceptConfidence(concept: string): number {
    let confidence = 0.5;
    
    // Boost confidence for proper nouns
    if (concept[0] === concept[0].toUpperCase()) {
      confidence += 0.2;
    }
    
    // Boost confidence for compound words
    if (concept.includes(' ') || concept.includes('-')) {
      confidence += 0.1;
    }
    
    // Boost confidence for technical terms
    if (concept.includes('_') || /[A-Z]/.test(concept.substring(1))) {
      confidence += 0.15;
    }
    
    return Math.min(confidence, 1.0);
  }

  private identifyRelationshipType(
    sentence: string, 
    concepts: string[]
  ): string {
    const relationshipPatterns = {
      'is-a': /\b(is|are|was|were)\s+(a|an|the)?\s*\b/,
      'has-a': /\b(has|have|had|contains|includes)\b/,
      'part-of': /\b(part of|belongs to|component of|element of)\b/,
      'causes': /\b(causes|leads to|results in|triggers)\b/,
      'enables': /\b(enables|allows|permits|facilitates)\b/,
      'similar-to': /\b(similar to|like|resembles|comparable to)\b/,
      'related-to': /\b(related to|associated with|connected to|linked to)\b/
    };
    
    for (const [type, pattern] of Object.entries(relationshipPatterns)) {
      if (pattern.test(sentence)) {
        return type;
      }
    }
    
    return 'related-to';
  }

  private calculateRelationshipConfidence(
    sentence: string, 
    concept1: string, 
    concept2: string
  ): number {
    let confidence = 0.3;
    
    const distance = Math.abs(sentence.indexOf(concept1) - sentence.indexOf(concept2));
    const proximity = Math.max(0, 1 - distance / sentence.length);
    confidence += proximity * 0.3;
    
    // Boost confidence for explicit relationship words
    if (/\b(is|are|has|have|causes|enables)\b/.test(sentence)) {
      confidence += 0.2;
    }
    
    return Math.min(confidence, 1.0);
  }

  private clusterConceptsByDomain(concepts: ExtractedConcept[]): Map<string, ExtractedConcept[]> {
    const clusters = new Map<string, ExtractedConcept[]>();
    
    // Simple domain clustering based on concept types and common contexts
    const domainKeywords = {
      'Technology': ['software', 'system', 'data', 'computer', 'digital', 'algorithm', 'code'],
      'Business': ['organization', 'management', 'strategy', 'process', 'customer', 'market'],
      'Science': ['research', 'method', 'theory', 'analysis', 'experiment', 'hypothesis'],
      'Education': ['learning', 'knowledge', 'skill', 'training', 'teaching', 'course'],
      'Personal': ['life', 'experience', 'goal', 'habit', 'reflection', 'journal']
    };
    
    for (const concept of concepts) {
      let assignedDomain = 'General';
      let maxScore = 0;
      
      for (const [domain, keywords] of Object.entries(domainKeywords)) {
        const score = keywords.reduce((sum, keyword) => {
          return sum + (concept.name.toLowerCase().includes(keyword) ? 1 : 0) +
                 (concept.contexts.some(ctx => ctx.toLowerCase().includes(keyword)) ? 0.5 : 0);
        }, 0);
        
        if (score > maxScore) {
          maxScore = score;
          assignedDomain = domain;
        }
      }
      
      if (!clusters.has(assignedDomain)) {
        clusters.set(assignedDomain, []);
      }
      
      clusters.get(assignedDomain)!.push(concept);
    }
    
    return clusters;
  }

  private determineDomainScope(tiddlers: Tiddler[], concepts: ExtractedConcept[]): string {
    const conceptNames = concepts.map(c => c.name);
    const relevantTiddlers = tiddlers.filter(t => 
      conceptNames.some(name => 
        (t.title || '').toLowerCase().includes(name) || 
        (t.text || '').toLowerCase().includes(name)
      )
    );
    
    const totalWords = relevantTiddlers.reduce((sum, t) => sum + (t.text || '').split(/\s+/).length, 0);
    
    if (totalWords > 10000) return 'comprehensive';
    if (totalWords > 5000) return 'moderate';
    if (totalWords > 1000) return 'focused';
    return 'limited';
  }

  private calculateDomainCoherence(
    domainConcepts: ExtractedConcept[], 
    allConcepts: ExtractedConcept[]
  ): number {
    if (domainConcepts.length === 0) return 0;
    
    // Calculate coherence based on shared contexts
    const sharedContexts = this.findSharedContexts(domainConcepts);
    const coherenceScore = sharedContexts.length / Math.max(domainConcepts.length, 1);
    
    // Normalize by domain size
    const sizeNormalization = Math.min(1, domainConcepts.length / 10);
    
    return Math.min(coherenceScore * sizeNormalization, 1.0);
  }

  private findSharedContexts(concepts: ExtractedConcept[]): string[] {
    if (concepts.length === 0) return [];
    
    const contextCounts = new Map<string, number>();
    
    for (const concept of concepts) {
      for (const context of concept.contexts) {
        contextCounts.set(context, (contextCounts.get(context) || 0) + 1);
      }
    }
    
    return Array.from(contextCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([context, _]) => context);
  }

  private calculateOverallConfidence(
    concepts: ExtractedConcept[], 
    relationships: ExtractedRelationship[], 
    domains: ExtractedDomain[]
  ): number {
    const conceptConfidence = concepts.reduce((sum, c) => sum + c.confidence, 0) / Math.max(concepts.length, 1);
    const relationshipConfidence = relationships.reduce((sum, r) => sum + r.confidence, 0) / Math.max(relationships.length, 1);
    const domainConfidence = domains.reduce((sum, d) => sum + d.coherence, 0) / Math.max(domains.length, 1);
    
    return (conceptConfidence + relationshipConfidence + domainConfidence) / 3;
  }

  // Analysis utilities
  getConceptsByType(concepts: ExtractedConcept[], type: string): ExtractedConcept[] {
    return concepts.filter(c => c.type === type);
  }

  getHighConfidenceConcepts(concepts: ExtractedConcept[], threshold = 0.7): ExtractedConcept[] {
    return concepts.filter(c => c.confidence > threshold);
  }

  getStrongestRelationships(relationships: ExtractedRelationship[], count = 10): ExtractedRelationship[] {
    return relationships
      .sort((a, b) => b.strength - a.strength)
      .slice(0, count);
  }

  getDomainsByCoherence(domains: ExtractedDomain[], threshold = 0.5): ExtractedDomain[] {
    return domains.filter(d => d.coherence > threshold);
  }
}