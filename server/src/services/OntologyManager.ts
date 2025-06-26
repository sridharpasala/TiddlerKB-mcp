import { Tiddler } from '../types/tiddler.js';
import { 
  OntologyClass, 
  OntologyProperty, 
  OntologyRelationship, 
  Domain,
  OntologyValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
  OntologyExportFormat
} from '../types/ontology.js';

export class OntologyManager {
  private classes: Map<string, OntologyClass> = new Map();
  private properties: Map<string, OntologyProperty> = new Map();
  private relationships: Map<string, OntologyRelationship> = new Map();
  private domains: Map<string, Domain> = new Map();

  // Core Class Management
  addClass(ontologyClass: OntologyClass): void {
    this.classes.set(ontologyClass.id, ontologyClass);
    this.updateClassHierarchy(ontologyClass);
  }

  getClass(id: string): OntologyClass | undefined {
    return this.classes.get(id);
  }

  getAllClasses(): OntologyClass[] {
    return Array.from(this.classes.values());
  }

  deleteClass(id: string): boolean {
    const cls = this.classes.get(id);
    if (!cls) return false;

    // Remove from hierarchy
    this.removeFromHierarchy(cls);
    
    // Remove associated relationships
    this.removeClassRelationships(id);
    
    this.classes.delete(id);
    return true;
  }

  // Property Management
  addProperty(property: OntologyProperty): void {
    this.properties.set(property.id, property);
  }

  getProperty(id: string): OntologyProperty | undefined {
    return this.properties.get(id);
  }

  getAllProperties(): OntologyProperty[] {
    return Array.from(this.properties.values());
  }

  // Relationship Management
  addRelationship(relationship: OntologyRelationship): void {
    this.relationships.set(relationship.id, relationship);
    
    if (relationship.bidirectional) {
      this.createBidirectionalRelationship(relationship);
    }
  }

  getRelationship(id: string): OntologyRelationship | undefined {
    return this.relationships.get(id);
  }

  getRelationshipsForClass(classId: string): OntologyRelationship[] {
    return Array.from(this.relationships.values()).filter(rel => 
      rel.source === classId || rel.target === classId
    );
  }

  // Domain Management
  addDomain(domain: Domain): void {
    this.domains.set(domain.id, domain);
  }

  getDomain(id: string): Domain | undefined {
    return this.domains.get(id);
  }

  getAllDomains(): Domain[] {
    return Array.from(this.domains.values());
  }

  // Hierarchy Operations
  getClassHierarchy(rootClassId?: string): any {
    const root = rootClassId ? this.getClass(rootClassId) : this.findRootClasses();
    if (!root) return null;
    return this.buildHierarchyTree(root);
  }

  private findRootClasses(): OntologyClass[] {
    return Array.from(this.classes.values()).filter(cls => 
      cls.superClasses.length === 0
    );
  }

  private buildHierarchyTree(classes: OntologyClass | OntologyClass[]): any {
    if (Array.isArray(classes)) {
      return classes.map(cls => this.buildHierarchyTree(cls));
    }

    const cls = classes;
    return {
      id: cls.id,
      name: cls.name,
      description: cls.description,
      instances: cls.instances.length,
      children: cls.subClasses.map(subId => {
        const subClass = this.getClass(subId);
        return subClass ? this.buildHierarchyTree(subClass) : null;
      }).filter(Boolean)
    };
  }

  // Validation
  validateOntology(): OntologyValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Check for circular dependencies
    errors.push(...this.detectCircularDependencies());
    
    // Check for orphaned classes
    warnings.push(...this.detectOrphanedClasses());
    
    // Check for missing relationships
    suggestions.push(...this.suggestMissingRelationships());
    
    // Calculate metrics
    const metrics = this.calculateOntologyMetrics();

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      metrics
    };
  }

  private detectCircularDependencies(): ValidationError[] {
    const errors: ValidationError[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const cls of this.classes.values()) {
      if (!visited.has(cls.id)) {
        const cycle = this.detectCycleInHierarchy(cls.id, visited, recursionStack, []);
        if (cycle.length > 0) {
          errors.push({
            type: 'circular_dependency',
            severity: 'critical',
            message: `Circular dependency detected in class hierarchy: ${cycle.join(' -> ')}`,
            affectedElements: cycle,
            suggestedFix: `Remove inheritance relationship between ${cycle[cycle.length - 1]} and ${cycle[0]}`
          });
        }
      }
    }

    return errors;
  }

  private detectCycleInHierarchy(
    classId: string, 
    visited: Set<string>, 
    stack: Set<string>,
    path: string[]
  ): string[] {
    visited.add(classId);
    stack.add(classId);
    path.push(classId);

    const cls = this.getClass(classId);
    if (!cls) return [];

    for (const superClassId of cls.superClasses) {
      if (!visited.has(superClassId)) {
        const cycle = this.detectCycleInHierarchy(superClassId, visited, stack, [...path]);
        if (cycle.length > 0) return cycle;
      } else if (stack.has(superClassId)) {
        // Found cycle
        const cycleStart = path.indexOf(superClassId);
        return path.slice(cycleStart).concat(superClassId);
      }
    }

    stack.delete(classId);
    return [];
  }

  private detectOrphanedClasses(): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    for (const cls of this.classes.values()) {
      if (cls.instances.length === 0 && cls.subClasses.length === 0) {
        const hasRelationships = this.getRelationshipsForClass(cls.id).length > 0;
        
        if (!hasRelationships) {
          warnings.push({
            type: 'orphaned_class',
            message: `Class "${cls.name}" has no instances, subclasses, or relationships`,
            affectedElements: [cls.id],
            recommendation: 'Consider adding instances or connecting to other classes'
          });
        }
      }
    }

    return warnings;
  }

  private suggestMissingRelationships(): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = [];
    
    // Suggest relationships based on common patterns
    for (const cls of this.classes.values()) {
      const relatedClasses = this.findPotentiallyRelatedClasses(cls);
      
      for (const related of relatedClasses) {
        const existingRel = Array.from(this.relationships.values()).find(rel =>
          (rel.source === cls.id && rel.target === related.id) ||
          (rel.source === related.id && rel.target === cls.id)
        );

        if (!existingRel) {
          suggestions.push({
            type: 'add_relationship',
            confidence: related.confidence,
            description: `Consider adding relationship between "${cls.name}" and "${related.name}"`,
            impact: related.confidence > 0.7 ? 'high' : 'medium',
            implementation: `Add semantic relationship based on content analysis`
          });
        }
      }
    }

    return suggestions;
  }

  private findPotentiallyRelatedClasses(cls: OntologyClass): Array<{id: string, name: string, confidence: number}> {
    // Simple implementation - in practice, this would use semantic analysis
    return Array.from(this.classes.values())
      .filter(other => other.id !== cls.id)
      .map(other => ({
        id: other.id,
        name: other.name,
        confidence: this.calculateSemanticSimilarity(cls, other)
      }))
      .filter(result => result.confidence > 0.5)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  private calculateSemanticSimilarity(cls1: OntologyClass, cls2: OntologyClass): number {
    // Simple keyword-based similarity - could be enhanced with embeddings
    const words1 = this.extractKeywords(cls1.name + ' ' + (cls1.description || ''));
    const words2 = this.extractKeywords(cls2.name + ' ' + (cls2.description || ''));
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  private extractKeywords(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 10);
  }

  private calculateOntologyMetrics(): any {
    const totalClasses = this.classes.size;
    const totalProperties = this.properties.size;
    const totalRelationships = this.relationships.size;

    const classesWithInstances = Array.from(this.classes.values())
      .filter(cls => cls.instances.length > 0).length;

    const consistency = this.calculateConsistencyScore();
    const completeness = classesWithInstances / Math.max(totalClasses, 1);
    const clarity = this.calculateClarityScore();
    const coverage = this.calculateCoverageScore();

    return {
      consistency,
      completeness,
      clarity,
      coverage
    };
  }

  private calculateConsistencyScore(): number {
    const validation = this.validateOntology();
    const errorWeight = 0.7;
    const warningWeight = 0.3;
    
    const errorPenalty = validation.errors.length * errorWeight;
    const warningPenalty = validation.warnings.length * warningWeight;
    const totalPenalty = errorPenalty + warningPenalty;
    
    return Math.max(0, 1 - (totalPenalty / Math.max(this.classes.size, 1)));
  }

  private calculateClarityScore(): number {
    const classesWithDescriptions = Array.from(this.classes.values())
      .filter(cls => cls.description && cls.description.length > 0).length;
    
    return classesWithDescriptions / Math.max(this.classes.size, 1);
  }

  private calculateCoverageScore(): number {
    // This would be calculated based on how well the ontology covers the source material
    // For now, return a placeholder
    return 0.8;
  }

  // Export functionality
  exportToFormat(format: OntologyExportFormat['format']): OntologyExportFormat {
    const timestamp = new Date().toISOString();
    
    switch (format) {
      case 'json-ld':
        return this.exportToJsonLD(timestamp);
      case 'owl':
        return this.exportToOWL(timestamp);
      case 'rdf':
        return this.exportToRDF(timestamp);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private exportToJsonLD(timestamp: string): OntologyExportFormat {
    const context = {
      "@context": {
        "@vocab": "http://example.org/ontology#",
        "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
        "owl": "http://www.w3.org/2002/07/owl#"
      }
    };

    const classes = Array.from(this.classes.values()).map(cls => ({
      "@type": "owl:Class",
      "@id": cls.id,
      "rdfs:label": cls.name,
      "rdfs:comment": cls.description,
      "rdfs:subClassOf": cls.superClasses.map(id => ({ "@id": id }))
    }));

    const properties = Array.from(this.properties.values()).map(prop => ({
      "@type": prop.type === 'object' ? "owl:ObjectProperty" : "owl:DatatypeProperty",
      "@id": prop.id,
      "rdfs:label": prop.name,
      "rdfs:comment": prop.description,
      "rdfs:domain": prop.domain.map(id => ({ "@id": id })),
      "rdfs:range": prop.range.map(id => ({ "@id": id }))
    }));

    const jsonld = {
      ...context,
      "@graph": [...classes, ...properties]
    };

    return {
      format: 'json-ld',
      content: JSON.stringify(jsonld, null, 2),
      metadata: {
        exportedAt: timestamp,
        version: '1.0',
        classes: this.classes.size,
        properties: this.properties.size,
        relationships: this.relationships.size
      }
    };
  }

  private exportToOWL(timestamp: string): OntologyExportFormat {
    // Simplified OWL export - would need a proper OWL library for production
    let owl = `<?xml version="1.0"?>
<rdf:RDF xmlns="http://example.org/ontology#"
     xml:base="http://example.org/ontology"
     xmlns:owl="http://www.w3.org/2002/07/owl#"
     xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
     xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#">
    
    <owl:Ontology rdf:about="http://example.org/ontology"/>
`;

    // Add classes
    for (const cls of this.classes.values()) {
      owl += `
    <owl:Class rdf:about="#${cls.id}">
        <rdfs:label>${cls.name}</rdfs:label>`;
      
      if (cls.description) {
        owl += `
        <rdfs:comment>${cls.description}</rdfs:comment>`;
      }
      
      for (const superClass of cls.superClasses) {
        owl += `
        <rdfs:subClassOf rdf:resource="#${superClass}"/>`;
      }
      
      owl += `
    </owl:Class>`;
    }

    owl += `
</rdf:RDF>`;

    return {
      format: 'owl',
      content: owl,
      metadata: {
        exportedAt: timestamp,
        version: '1.0',
        classes: this.classes.size,
        properties: this.properties.size,
        relationships: this.relationships.size
      }
    };
  }

  private exportToRDF(timestamp: string): OntologyExportFormat {
    // Similar to OWL but in RDF/XML format
    return this.exportToOWL(timestamp);
  }

  // Helper methods
  private updateClassHierarchy(ontologyClass: OntologyClass): void {
    // Update subclass relationships
    for (const superClassId of ontologyClass.superClasses) {
      const superClass = this.getClass(superClassId);
      if (superClass && !superClass.subClasses.includes(ontologyClass.id)) {
        superClass.subClasses.push(ontologyClass.id);
        this.classes.set(superClassId, superClass);
      }
    }
  }

  private removeFromHierarchy(cls: OntologyClass): void {
    // Remove from super classes
    for (const superClassId of cls.superClasses) {
      const superClass = this.getClass(superClassId);
      if (superClass) {
        superClass.subClasses = superClass.subClasses.filter(id => id !== cls.id);
        this.classes.set(superClassId, superClass);
      }
    }

    // Update sub classes
    for (const subClassId of cls.subClasses) {
      const subClass = this.getClass(subClassId);
      if (subClass) {
        subClass.superClasses = subClass.superClasses.filter(id => id !== cls.id);
        this.classes.set(subClassId, subClass);
      }
    }
  }

  private removeClassRelationships(classId: string): void {
    const toRemove: string[] = [];
    
    for (const [id, rel] of this.relationships.entries()) {
      if (rel.source === classId || rel.target === classId) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.relationships.delete(id);
    }
  }

  private createBidirectionalRelationship(relationship: OntologyRelationship): void {
    // Create reverse relationship if it doesn't exist
    const reverseId = `${relationship.target}-${relationship.type}-${relationship.source}`;
    
    if (!this.relationships.has(reverseId)) {
      const reverseRel: OntologyRelationship = {
        ...relationship,
        id: reverseId,
        source: relationship.target,
        target: relationship.source
      };
      
      this.relationships.set(reverseId, reverseRel);
    }
  }

  // Statistics and reporting
  getOntologyStatistics(): any {
    return {
      classes: {
        total: this.classes.size,
        withInstances: Array.from(this.classes.values()).filter(c => c.instances.length > 0).length,
        rootClasses: this.findRootClasses().length
      },
      properties: {
        total: this.properties.size,
        datatype: Array.from(this.properties.values()).filter(p => p.type === 'datatype').length,
        object: Array.from(this.properties.values()).filter(p => p.type === 'object').length
      },
      relationships: {
        total: this.relationships.size,
        bidirectional: Array.from(this.relationships.values()).filter(r => r.bidirectional).length
      },
      domains: this.domains.size
    };
  }
}