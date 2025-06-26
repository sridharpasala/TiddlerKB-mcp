import { 
  OntologyClass, 
  ExtractedConcept, 
  ExtractedRelationship,
  ValidationError,
  ValidationWarning 
} from '../types/ontology.js';

export interface HierarchyNode {
  id: string;
  name: string;
  level: number;
  children: HierarchyNode[];
  parent?: string;
  confidence: number;
  evidence: string[];
  properties: string[];
}

export interface HierarchyValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metrics: {
    depth: number;
    breadth: number;
    balance: number;
    coverage: number;
  };
}

export class ConceptHierarchy {
  private hierarchy: Map<string, HierarchyNode> = new Map();
  private rootNodes: Set<string> = new Set();

  buildHierarchy(
    concepts: ExtractedConcept[], 
    relationships: ExtractedRelationship[]
  ): HierarchyNode[] {
    this.initializeNodes(concepts);
    this.buildIsARelationships(relationships);
    this.inferMissingHierarchy(concepts);
    this.calculateLevels();
    
    return this.getRootNodes();
  }

  private initializeNodes(concepts: ExtractedConcept[]): void {
    this.hierarchy.clear();
    this.rootNodes.clear();

    for (const concept of concepts) {
      const node: HierarchyNode = {
        id: this.generateId(concept.name),
        name: concept.name,
        level: 0,
        children: [],
        confidence: concept.confidence,
        evidence: concept.contexts,
        properties: this.inferProperties(concept)
      };

      this.hierarchy.set(node.id, node);
      this.rootNodes.add(node.id);
    }
  }

  private buildIsARelationships(relationships: ExtractedRelationship[]): void {
    const isARelationships = relationships.filter(r => r.type === 'is-a');

    for (const rel of isARelationships) {
      const childId = this.generateId(rel.source);
      const parentId = this.generateId(rel.target);
      
      const childNode = this.hierarchy.get(childId);
      const parentNode = this.hierarchy.get(parentId);

      if (childNode && parentNode) {
        this.addParentChildRelationship(parentNode, childNode, rel.confidence);
      }
    }
  }

  private inferMissingHierarchy(concepts: ExtractedConcept[]): void {
    // Group concepts by type for automatic hierarchy inference
    const conceptsByType = new Map<string, ExtractedConcept[]>();
    
    for (const concept of concepts) {
      if (!conceptsByType.has(concept.type)) {
        conceptsByType.set(concept.type, []);
      }
      conceptsByType.get(concept.type)!.push(concept);
    }

    // Create type-based hierarchies
    for (const [type, typeConcepts] of conceptsByType.entries()) {
      this.createTypeHierarchy(type, typeConcepts);
    }

    // Infer hierarchies based on linguistic patterns
    this.inferLinguisticHierarchies(concepts);
  }

  private createTypeHierarchy(type: string, concepts: ExtractedConcept[]): void {
    // Create abstract parent for each type if it doesn't exist
    const typeParentId = this.generateId(type);
    if (!this.hierarchy.has(typeParentId)) {
      const typeParent: HierarchyNode = {
        id: typeParentId,
        name: type.charAt(0).toUpperCase() + type.slice(1),
        level: 0,
        children: [],
        confidence: 0.8,
        evidence: ['Inferred from concept types'],
        properties: []
      };
      
      this.hierarchy.set(typeParentId, typeParent);
      this.rootNodes.add(typeParentId);
    }

    const typeParent = this.hierarchy.get(typeParentId)!;

    // Group concepts by specificity
    const specificConcepts = this.groupBySpecificity(concepts);
    
    for (const [level, levelConcepts] of specificConcepts.entries()) {
      for (const concept of levelConcepts) {
        const conceptId = this.generateId(concept.name);
        const conceptNode = this.hierarchy.get(conceptId);
        
        if (conceptNode && !conceptNode.parent) {
          if (level === 0) {
            // Most general concepts become direct children of type parent
            this.addParentChildRelationship(typeParent, conceptNode, 0.6);
          } else {
            // More specific concepts become children of less specific ones
            const parentConcepts = specificConcepts.get(level - 1) || [];
            const bestParent = this.findBestParent(concept, parentConcepts);
            
            if (bestParent) {
              const parentId = this.generateId(bestParent.name);
              const parentNode = this.hierarchy.get(parentId);
              if (parentNode) {
                this.addParentChildRelationship(parentNode, conceptNode, 0.5);
              }
            }
          }
        }
      }
    }
  }

  private groupBySpecificity(concepts: ExtractedConcept[]): Map<number, ExtractedConcept[]> {
    const groups = new Map<number, ExtractedConcept[]>();
    
    for (const concept of concepts) {
      const specificity = this.calculateSpecificity(concept);
      const level = specificity < 0.3 ? 0 : specificity < 0.7 ? 1 : 2;
      
      if (!groups.has(level)) {
        groups.set(level, []);
      }
      groups.get(level)!.push(concept);
    }
    
    return groups;
  }

  private calculateSpecificity(concept: ExtractedConcept): number {
    let specificity = 0.5;
    
    // Multi-word concepts are typically more specific
    const wordCount = concept.name.split(/\s+/).length;
    specificity += (wordCount - 1) * 0.2;
    
    // Concepts with lower frequency might be more specific
    if (concept.frequency < 3) {
      specificity += 0.2;
    }
    
    // Concepts appearing in fewer contexts might be more specific
    if (concept.contexts.length < 3) {
      specificity += 0.1;
    }
    
    return Math.min(specificity, 1.0);
  }

  private findBestParent(
    concept: ExtractedConcept, 
    candidates: ExtractedConcept[]
  ): ExtractedConcept | null {
    let bestParent: ExtractedConcept | null = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const score = this.calculateParentScore(concept, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestParent = candidate;
      }
    }

    return bestScore > 0.3 ? bestParent : null;
  }

  private calculateParentScore(child: ExtractedConcept, parent: ExtractedConcept): number {
    let score = 0;

    // Shared contexts indicate potential relationship
    const sharedContexts = child.contexts.filter(ctx => parent.contexts.includes(ctx));
    score += sharedContexts.length * 0.2;

    // Linguistic similarity
    if (child.name.includes(parent.name) || parent.name.includes(child.name)) {
      score += 0.3;
    }

    // Frequency relationship (parent should be more general/frequent)
    if (parent.frequency > child.frequency) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private inferLinguisticHierarchies(concepts: ExtractedConcept[]): void {
    // Look for compound terms that suggest hierarchy
    for (const concept of concepts) {
      const words = concept.name.split(/\s+/);
      
      if (words.length > 1) {
        // Try to find parent concepts based on word parts
        const potentialParents = words.map(word => 
          concepts.find(c => (c.name || '').toLowerCase() === word.toLowerCase())
        ).filter(Boolean) as ExtractedConcept[];

        for (const potentialParent of potentialParents) {
          const childId = this.generateId(concept.name);
          const parentId = this.generateId(potentialParent.name);
          
          const childNode = this.hierarchy.get(childId);
          const parentNode = this.hierarchy.get(parentId);

          if (childNode && parentNode && !childNode.parent) {
            this.addParentChildRelationship(parentNode, childNode, 0.4);
          }
        }
      }
    }
  }

  private addParentChildRelationship(
    parent: HierarchyNode, 
    child: HierarchyNode, 
    confidence: number
  ): void {
    if (child.parent) return; // Child already has a parent
    if (this.wouldCreateCycle(parent.id, child.id)) return; // Avoid cycles

    child.parent = parent.id;
    parent.children.push(child);
    child.confidence = Math.min(child.confidence + confidence * 0.1, 1.0);
    
    this.rootNodes.delete(child.id);
  }

  private wouldCreateCycle(parentId: string, childId: string): boolean {
    const visited = new Set<string>();
    return this.hasCycleDFS(parentId, childId, visited);
  }

  private hasCycleDFS(currentId: string, targetId: string, visited: Set<string>): boolean {
    if (currentId === targetId) return true;
    if (visited.has(currentId)) return false;
    
    visited.add(currentId);
    const current = this.hierarchy.get(currentId);
    
    if (current?.parent) {
      return this.hasCycleDFS(current.parent, targetId, visited);
    }
    
    return false;
  }

  private calculateLevels(): void {
    // Calculate levels from root nodes
    for (const rootId of this.rootNodes) {
      this.calculateNodeLevel(rootId, 0);
    }
  }

  private calculateNodeLevel(nodeId: string, level: number): void {
    const node = this.hierarchy.get(nodeId);
    if (!node) return;

    node.level = level;
    
    for (const child of node.children) {
      this.calculateNodeLevel(child.id, level + 1);
    }
  }

  private generateId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  private inferProperties(concept: ExtractedConcept): string[] {
    const properties: string[] = [];
    
    // Infer properties based on concept type
    switch (concept.type) {
      case 'entity':
        properties.push('hasName', 'hasIdentifier', 'hasDescription');
        break;
      case 'process':
        properties.push('hasInput', 'hasOutput', 'hasDuration', 'hasSteps');
        break;
      case 'quality':
        properties.push('hasValue', 'hasUnit', 'hasMeasurement');
        break;
      case 'abstract':
        properties.push('hasDefinition', 'hasContext', 'hasApplication');
        break;
    }
    
    return properties;
  }

  // Public methods for hierarchy access and manipulation
  getRootNodes(): HierarchyNode[] {
    return Array.from(this.rootNodes)
      .map(id => this.hierarchy.get(id))
      .filter(Boolean) as HierarchyNode[];
  }

  getNode(id: string): HierarchyNode | undefined {
    return this.hierarchy.get(id);
  }

  getNodeByName(name: string): HierarchyNode | undefined {
    const id = this.generateId(name);
    return this.hierarchy.get(id);
  }

  getChildren(nodeId: string): HierarchyNode[] {
    const node = this.hierarchy.get(nodeId);
    return node ? node.children : [];
  }

  getParent(nodeId: string): HierarchyNode | undefined {
    const node = this.hierarchy.get(nodeId);
    return node?.parent ? this.hierarchy.get(node.parent) : undefined;
  }

  getAncestors(nodeId: string): HierarchyNode[] {
    const ancestors: HierarchyNode[] = [];
    let current = this.getParent(nodeId);
    
    while (current) {
      ancestors.push(current);
      current = this.getParent(current.id);
    }
    
    return ancestors;
  }

  getDescendants(nodeId: string): HierarchyNode[] {
    const descendants: HierarchyNode[] = [];
    const node = this.hierarchy.get(nodeId);
    
    if (node) {
      this.collectDescendants(node, descendants);
    }
    
    return descendants;
  }

  private collectDescendants(node: HierarchyNode, descendants: HierarchyNode[]): void {
    for (const child of node.children) {
      descendants.push(child);
      this.collectDescendants(child, descendants);
    }
  }

  getSiblings(nodeId: string): HierarchyNode[] {
    const node = this.hierarchy.get(nodeId);
    if (!node?.parent) return [];
    
    const parent = this.hierarchy.get(node.parent);
    return parent ? parent.children.filter(child => child.id !== nodeId) : [];
  }

  // Hierarchy validation
  validateHierarchy(): HierarchyValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for cycles
    const cycles = this.detectCycles();
    errors.push(...cycles);

    // Check for orphaned nodes
    const orphans = this.detectOrphans();
    warnings.push(...orphans);

    // Check for unbalanced hierarchy
    const balanceWarnings = this.checkBalance();
    warnings.push(...balanceWarnings);

    const metrics = this.calculateHierarchyMetrics();

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metrics
    };
  }

  private detectCycles(): ValidationError[] {
    const errors: ValidationError[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const nodeId of this.hierarchy.keys()) {
      if (!visited.has(nodeId)) {
        const cycle = this.detectCycleDFS(nodeId, visited, recursionStack, []);
        if (cycle.length > 0) {
          errors.push({
            type: 'circular_dependency',
            severity: 'critical',
            message: `Circular dependency in hierarchy: ${cycle.join(' -> ')}`,
            affectedElements: cycle,
            suggestedFix: `Remove relationship between ${cycle[cycle.length - 1]} and ${cycle[0]}`
          });
        }
      }
    }

    return errors;
  }

  private detectCycleDFS(
    nodeId: string,
    visited: Set<string>,
    stack: Set<string>,
    path: string[]
  ): string[] {
    visited.add(nodeId);
    stack.add(nodeId);
    path.push(nodeId);

    const node = this.hierarchy.get(nodeId);
    if (!node) return [];

    for (const child of node.children) {
      if (!visited.has(child.id)) {
        const cycle = this.detectCycleDFS(child.id, visited, stack, [...path]);
        if (cycle.length > 0) return cycle;
      } else if (stack.has(child.id)) {
        const cycleStart = path.indexOf(child.id);
        return path.slice(cycleStart).concat(child.id);
      }
    }

    stack.delete(nodeId);
    return [];
  }

  private detectOrphans(): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    for (const node of this.hierarchy.values()) {
      if (node.children.length === 0 && !this.rootNodes.has(node.id)) {
        // Leaf node that's not a root - check if it's truly isolated
        if (node.confidence < 0.5) {
          warnings.push({
            type: 'orphaned_class',
            message: `Node "${node.name}" appears isolated with low confidence`,
            affectedElements: [node.id],
            recommendation: 'Consider merging with related concepts or improving evidence'
          });
        }
      }
    }

    return warnings;
  }

  private checkBalance(): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const maxDepth = this.calculateMaxDepth();
    const avgBranchingFactor = this.calculateAverageBranchingFactor();

    if (maxDepth > 8) {
      warnings.push({
        type: 'low_coverage',
        message: `Hierarchy is very deep (${maxDepth} levels) which may indicate over-specialization`,
        affectedElements: [],
        recommendation: 'Consider consolidating some intermediate levels'
      });
    }

    if (avgBranchingFactor > 15) {
      warnings.push({
        type: 'low_coverage',
        message: `High branching factor (${avgBranchingFactor.toFixed(1)}) may indicate under-categorization`,
        affectedElements: [],
        recommendation: 'Consider adding intermediate categories'
      });
    }

    return warnings;
  }

  private calculateHierarchyMetrics() {
    const depth = this.calculateMaxDepth();
    const breadth = this.calculateMaxBreadth();
    const balance = this.calculateBalance();
    const coverage = this.calculateCoverage();

    return { depth, breadth, balance, coverage };
  }

  private calculateMaxDepth(): number {
    let maxDepth = 0;
    
    for (const node of this.hierarchy.values()) {
      maxDepth = Math.max(maxDepth, node.level);
    }
    
    return maxDepth + 1;
  }

  private calculateMaxBreadth(): number {
    let maxBreadth = 0;
    
    for (const node of this.hierarchy.values()) {
      maxBreadth = Math.max(maxBreadth, node.children.length);
    }
    
    return maxBreadth;
  }

  private calculateAverageBranchingFactor(): number {
    const nonLeafNodes = Array.from(this.hierarchy.values()).filter(n => n.children.length > 0);
    if (nonLeafNodes.length === 0) return 0;
    
    const totalChildren = nonLeafNodes.reduce((sum, n) => sum + n.children.length, 0);
    return totalChildren / nonLeafNodes.length;
  }

  private calculateBalance(): number {
    // Simple balance metric: variance in depth across leaf nodes
    const leafDepths = Array.from(this.hierarchy.values())
      .filter(n => n.children.length === 0)
      .map(n => n.level);
    
    if (leafDepths.length === 0) return 1;
    
    const avgDepth = leafDepths.reduce((sum, d) => sum + d, 0) / leafDepths.length;
    const variance = leafDepths.reduce((sum, d) => sum + Math.pow(d - avgDepth, 2), 0) / leafDepths.length;
    
    return Math.max(0, 1 - variance / 10); // Normalize variance
  }

  private calculateCoverage(): number {
    // Coverage based on how many nodes have evidence and good confidence
    const wellSupportedNodes = Array.from(this.hierarchy.values())
      .filter(n => n.confidence > 0.5 && n.evidence.length > 0);
    
    return wellSupportedNodes.length / Math.max(this.hierarchy.size, 1);
  }

  // Conversion to OntologyClass
  toOntologyClasses(): OntologyClass[] {
    const classes: OntologyClass[] = [];
    
    for (const node of this.hierarchy.values()) {
      const ontologyClass: OntologyClass = {
        id: node.id,
        name: node.name,
        description: `${node.name} concept derived from hierarchy analysis`,
        superClasses: node.parent ? [node.parent] : [],
        subClasses: node.children.map(c => c.id),
        properties: [], // Would be populated from properties analysis
        constraints: [],
        instances: [],
        metadata: {
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          confidence: node.confidence,
          source: 'inferred'
        }
      };
      
      classes.push(ontologyClass);
    }
    
    return classes;
  }
}