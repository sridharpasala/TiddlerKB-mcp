import { 
  OntologyClass, 
  OntologyProperty, 
  OntologyRelationship,
  OntologyValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
  OntologyConstraint
} from '../types/ontology.js';

export interface ValidationRule {
  name: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  validator: (context: ValidationContext) => ValidationResult;
}

export interface ValidationContext {
  classes: Map<string, OntologyClass>;
  properties: Map<string, OntologyProperty>;
  relationships: Map<string, OntologyRelationship>;
}

export interface ValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
}

export class OntologyValidator {
  private validationRules: ValidationRule[] = [
    {
      name: 'circular_hierarchy',
      description: 'Detect circular dependencies in class hierarchies',
      severity: 'critical',
      validator: this.validateCircularDependencies.bind(this)
    },
    {
      name: 'missing_superclass',
      description: 'Check for references to non-existent superclasses',
      severity: 'major',
      validator: this.validateSuperclassReferences.bind(this)
    },
    {
      name: 'property_domain_range',
      description: 'Validate property domain and range constraints',
      severity: 'major',
      validator: this.validatePropertyConstraints.bind(this)
    },
    {
      name: 'relationship_consistency',
      description: 'Check for contradictory relationships',
      severity: 'major',
      validator: this.validateRelationshipConsistency.bind(this)
    },
    {
      name: 'orphaned_classes',
      description: 'Identify isolated classes with no connections',
      severity: 'minor',
      validator: this.validateOrphanedClasses.bind(this)
    },
    {
      name: 'naming_conventions',
      description: 'Check adherence to naming conventions',
      severity: 'minor',
      validator: this.validateNamingConventions.bind(this)
    },
    {
      name: 'hierarchy_depth',
      description: 'Check for overly deep or shallow hierarchies',
      severity: 'minor',
      validator: this.validateHierarchyStructure.bind(this)
    },
    {
      name: 'constraint_violations',
      description: 'Validate ontological constraints',
      severity: 'major',
      validator: this.validateConstraints.bind(this)
    }
  ];

  async validateOntology(
    classes: OntologyClass[],
    properties: OntologyProperty[],
    relationships: OntologyRelationship[]
  ): Promise<OntologyValidationResult> {
    const context: ValidationContext = {
      classes: new Map(classes.map(c => [c.id, c])),
      properties: new Map(properties.map(p => [p.id, p])),
      relationships: new Map(relationships.map(r => [r.id, r]))
    };

    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];
    const allSuggestions: ValidationSuggestion[] = [];

    // Run all validation rules
    for (const rule of this.validationRules) {
      try {
        const result = rule.validator(context);
        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);
        allSuggestions.push(...result.suggestions);
      } catch (error) {
        allErrors.push({
          type: 'logical_inconsistency',
          severity: 'critical',
          message: `Validation rule '${rule.name}' failed: ${error}`,
          affectedElements: [],
          suggestedFix: 'Review ontology structure and fix any malformed elements'
        });
      }
    }

    // Calculate metrics
    const metrics = this.calculateValidationMetrics(context, allErrors, allWarnings);

    return {
      valid: allErrors.filter(e => e.severity === 'critical').length === 0,
      errors: allErrors,
      warnings: allWarnings,
      suggestions: allSuggestions,
      metrics
    };
  }

  private validateCircularDependencies(context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const classId of context.classes.keys()) {
      if (!visited.has(classId)) {
        const cycle = this.detectCycle(classId, context.classes, visited, recursionStack, []);
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

    return { errors, warnings: [], suggestions: [] };
  }

  private detectCycle(
    classId: string,
    classes: Map<string, OntologyClass>,
    visited: Set<string>,
    stack: Set<string>,
    path: string[]
  ): string[] {
    visited.add(classId);
    stack.add(classId);
    path.push(classId);

    const cls = classes.get(classId);
    if (!cls) return [];

    for (const superClassId of cls.superClasses) {
      if (!visited.has(superClassId)) {
        const cycle = this.detectCycle(superClassId, classes, visited, stack, [...path]);
        if (cycle.length > 0) return cycle;
      } else if (stack.has(superClassId)) {
        const cycleStart = path.indexOf(superClassId);
        return path.slice(cycleStart).concat(superClassId);
      }
    }

    stack.delete(classId);
    return [];
  }

  private validateSuperclassReferences(context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];

    for (const cls of context.classes.values()) {
      for (const superClassId of cls.superClasses) {
        if (!context.classes.has(superClassId)) {
          errors.push({
            type: 'missing_superclass',
            severity: 'major',
            message: `Class "${cls.name}" references non-existent superclass "${superClassId}"`,
            affectedElements: [cls.id, superClassId],
            suggestedFix: `Define the missing superclass "${superClassId}" or remove the reference`
          });
        }
      }
    }

    return { errors, warnings: [], suggestions: [] };
  }

  private validatePropertyConstraints(context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const property of context.properties.values()) {
      // Check domain constraints
      for (const domainId of property.domain) {
        if (!context.classes.has(domainId)) {
          errors.push({
            type: 'constraint_violation',
            severity: 'major',
            message: `Property "${property.name}" has non-existent class "${domainId}" in domain`,
            affectedElements: [property.id, domainId],
            suggestedFix: `Define the missing class "${domainId}" or remove from property domain`
          });
        }
      }

      // Check range constraints for object properties
      if (property.type === 'object') {
        for (const rangeId of property.range) {
          if (!context.classes.has(rangeId)) {
            errors.push({
              type: 'constraint_violation',
              severity: 'major',
              message: `Object property "${property.name}" has non-existent class "${rangeId}" in range`,
              affectedElements: [property.id, rangeId],
              suggestedFix: `Define the missing class "${rangeId}" or remove from property range`
            });
          }
        }
      }

      // Check cardinality constraints
      if (property.cardinality.min < 0) {
        errors.push({
          type: 'constraint_violation',
          severity: 'major',
          message: `Property "${property.name}" has invalid minimum cardinality (${property.cardinality.min})`,
          affectedElements: [property.id],
          suggestedFix: 'Set minimum cardinality to 0 or higher'
        });
      }

      if (typeof property.cardinality.max === 'number' && 
          property.cardinality.max < property.cardinality.min) {
        errors.push({
          type: 'constraint_violation',
          severity: 'major',
          message: `Property "${property.name}" has maximum cardinality less than minimum`,
          affectedElements: [property.id],
          suggestedFix: 'Ensure maximum cardinality is greater than or equal to minimum'
        });
      }

      // Warn about unused properties
      const isUsed = Array.from(context.relationships.values()).some(rel =>
        rel.properties && Object.keys(rel.properties).includes(property.name)
      );

      if (!isUsed && property.domain.length === 0) {
        warnings.push({
          type: 'orphaned_class',
          message: `Property "${property.name}" appears to be unused`,
          affectedElements: [property.id],
          recommendation: 'Consider removing unused property or adding proper domain/range'
        });
      }
    }

    return { errors, warnings, suggestions: [] };
  }

  private validateRelationshipConsistency(context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const relationships = Array.from(context.relationships.values());

    // Check for contradictory relationships
    for (let i = 0; i < relationships.length; i++) {
      for (let j = i + 1; j < relationships.length; j++) {
        const rel1 = relationships[i];
        const rel2 = relationships[j];

        if (this.areContradictory(rel1, rel2)) {
          errors.push({
            type: 'logical_inconsistency',
            severity: 'major',
            message: `Contradictory relationships: "${rel1.source} ${rel1.type} ${rel1.target}" vs "${rel2.source} ${rel2.type} ${rel2.target}"`,
            affectedElements: [rel1.id, rel2.id],
            suggestedFix: 'Resolve the contradiction by removing or modifying one of the relationships'
          });
        }
      }
    }

    // Check for missing reverse relationships where expected
    for (const rel of relationships) {
      if (rel.bidirectional) {
        const reverseExists = relationships.some(r =>
          r.source === rel.target && 
          r.target === rel.source && 
          r.type === rel.type
        );

        if (!reverseExists) {
          warnings.push({
            type: 'redundant_relationship',
            message: `Bidirectional relationship "${rel.source} ${rel.type} ${rel.target}" is missing its reverse`,
            affectedElements: [rel.id],
            recommendation: 'Add the reverse relationship or mark as unidirectional'
          });
        }
      }
    }

    return { errors, warnings, suggestions: [] };
  }

  private areContradictory(rel1: OntologyRelationship, rel2: OntologyRelationship): boolean {
    if (rel1.source !== rel2.source || rel1.target !== rel2.target) {
      return false;
    }

    const contradictoryPairs = [
      ['is-a', 'part-of'],
      ['similar-to', 'different-from'],
      ['causes', 'prevents'],
      ['enables', 'disables']
    ];

    return contradictoryPairs.some(([type1, type2]) =>
      (rel1.type === type1 && rel2.type === type2) ||
      (rel1.type === type2 && rel2.type === type1)
    );
  }

  private validateOrphanedClasses(context: ValidationContext): ValidationResult {
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    for (const cls of context.classes.values()) {
      const hasConnections = this.classHasConnections(cls, context);
      
      if (!hasConnections) {
        warnings.push({
          type: 'orphaned_class',
          message: `Class "${cls.name}" has no relationships or hierarchy connections`,
          affectedElements: [cls.id],
          recommendation: 'Connect class to hierarchy or add relationships with other classes'
        });

        // Suggest potential connections
        const similarClasses = this.findSimilarClasses(cls, context);
        if (similarClasses.length > 0) {
          suggestions.push({
            type: 'add_relationship',
            confidence: 0.6,
            description: `Consider connecting "${cls.name}" to similar classes: ${similarClasses.map(c => c.name).join(', ')}`,
            impact: 'medium',
            implementation: 'Add semantic relationships or hierarchy connections'
          });
        }
      }
    }

    return { errors: [], warnings, suggestions };
  }

  private classHasConnections(cls: OntologyClass, context: ValidationContext): boolean {
    // Check hierarchy connections
    if (cls.superClasses.length > 0 || cls.subClasses.length > 0) {
      return true;
    }

    // Check relationship connections
    const hasRelationships = Array.from(context.relationships.values()).some(rel =>
      rel.source === cls.id || rel.target === cls.id
    );

    return hasRelationships;
  }

  private findSimilarClasses(cls: OntologyClass, context: ValidationContext): OntologyClass[] {
    const similar: OntologyClass[] = [];

    for (const otherCls of context.classes.values()) {
      if (otherCls.id === cls.id) continue;

      const similarity = this.calculateClassSimilarity(cls, otherCls);
      if (similarity > 0.5) {
        similar.push(otherCls);
      }
    }

    return similar.slice(0, 3); // Return top 3 similar classes
  }

  private calculateClassSimilarity(cls1: OntologyClass, cls2: OntologyClass): number {
    let similarity = 0;

    // Name similarity
    similarity += this.stringSimilarity(cls1.name, cls2.name) * 0.4;

    // Description similarity
    if (cls1.description && cls2.description) {
      similarity += this.stringSimilarity(cls1.description, cls2.description) * 0.3;
    }

    // Common instances
    const commonInstances = cls1.instances.filter(i => cls2.instances.includes(i));
    similarity += (commonInstances.length / Math.max(cls1.instances.length, cls2.instances.length, 1)) * 0.3;

    return similarity;
  }

  private stringSimilarity(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  private validateNamingConventions(context: ValidationContext): ValidationResult {
    const warnings: ValidationWarning[] = [];

    // Check class naming conventions
    for (const cls of context.classes.values()) {
      if (!this.isValidClassName(cls.name)) {
        warnings.push({
          type: 'ambiguous_naming',
          message: `Class name "${cls.name}" doesn't follow naming conventions`,
          affectedElements: [cls.id],
          recommendation: 'Use PascalCase for class names (e.g., "ConceptName")'
        });
      }
    }

    // Check property naming conventions
    for (const prop of context.properties.values()) {
      if (!this.isValidPropertyName(prop.name)) {
        warnings.push({
          type: 'ambiguous_naming',
          message: `Property name "${prop.name}" doesn't follow naming conventions`,
          affectedElements: [prop.id],
          recommendation: 'Use camelCase for property names (e.g., "propertyName")'
        });
      }
    }

    return { errors: [], warnings, suggestions: [] };
  }

  private isValidClassName(name: string): boolean {
    // Check if starts with uppercase and uses PascalCase
    return /^[A-Z][a-zA-Z0-9]*$/.test(name);
  }

  private isValidPropertyName(name: string): boolean {
    // Check if starts with lowercase and uses camelCase
    return /^[a-z][a-zA-Z0-9]*$/.test(name);
  }

  private validateHierarchyStructure(context: ValidationContext): ValidationResult {
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Calculate hierarchy metrics
    const hierarchyMetrics = this.calculateHierarchyMetrics(context);

    if (hierarchyMetrics.maxDepth > 8) {
      warnings.push({
        type: 'low_coverage',
        message: `Hierarchy is very deep (${hierarchyMetrics.maxDepth} levels)`,
        affectedElements: [],
        recommendation: 'Consider consolidating some intermediate levels to reduce complexity'
      });
    }

    if (hierarchyMetrics.avgBranchingFactor > 12) {
      warnings.push({
        type: 'low_coverage',
        message: `High branching factor (${hierarchyMetrics.avgBranchingFactor.toFixed(1)})`,
        affectedElements: [],
        recommendation: 'Consider adding intermediate categories to organize concepts better'
      });
    }

    if (hierarchyMetrics.rootClasses > 5) {
      suggestions.push({
        type: 'refine_hierarchy',
        confidence: 0.7,
        description: `Many root classes (${hierarchyMetrics.rootClasses}) - consider adding top-level categories`,
        impact: 'medium',
        implementation: 'Create abstract superclasses to organize root concepts'
      });
    }

    return { errors: [], warnings, suggestions };
  }

  private calculateHierarchyMetrics(context: ValidationContext) {
    const classes = Array.from(context.classes.values());
    
    let maxDepth = 0;
    let totalBranching = 0;
    let nonLeafClasses = 0;
    let rootClasses = 0;

    for (const cls of classes) {
      // Calculate depth
      const depth = this.calculateClassDepth(cls.id, context.classes);
      maxDepth = Math.max(maxDepth, depth);

      // Calculate branching factor
      if (cls.subClasses.length > 0) {
        totalBranching += cls.subClasses.length;
        nonLeafClasses++;
      }

      // Count root classes
      if (cls.superClasses.length === 0) {
        rootClasses++;
      }
    }

    const avgBranchingFactor = nonLeafClasses > 0 ? totalBranching / nonLeafClasses : 0;

    return {
      maxDepth,
      avgBranchingFactor,
      rootClasses,
      totalClasses: classes.length
    };
  }

  private calculateClassDepth(classId: string, classes: Map<string, OntologyClass>): number {
    const visited = new Set<string>();
    return this.calculateClassDepthRecursive(classId, classes, visited);
  }

  private calculateClassDepthRecursive(
    classId: string, 
    classes: Map<string, OntologyClass>,
    visited: Set<string>
  ): number {
    if (visited.has(classId)) return 0; // Avoid infinite recursion
    
    visited.add(classId);
    const cls = classes.get(classId);
    
    if (!cls || cls.superClasses.length === 0) {
      return 0;
    }

    let maxParentDepth = 0;
    for (const superClassId of cls.superClasses) {
      const parentDepth = this.calculateClassDepthRecursive(superClassId, classes, new Set(visited));
      maxParentDepth = Math.max(maxParentDepth, parentDepth);
    }

    return maxParentDepth + 1;
  }

  private validateConstraints(context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const cls of context.classes.values()) {
      for (const constraint of cls.constraints) {
        const validationResult = this.validateConstraint(constraint, cls, context);
        
        if (!validationResult.valid) {
          if (constraint.severity === 'error') {
            errors.push({
              type: 'constraint_violation',
              severity: 'major',
              message: validationResult.message,
              affectedElements: [cls.id, constraint.id],
              suggestedFix: validationResult.suggestion
            });
          } else {
            warnings.push({
              type: 'low_coverage',
              message: validationResult.message,
              affectedElements: [cls.id, constraint.id],
              recommendation: validationResult.suggestion
            });
          }
        }
      }
    }

    return { errors, warnings, suggestions: [] };
  }

  private validateConstraint(
    constraint: OntologyConstraint,
    cls: OntologyClass,
    context: ValidationContext
  ): { valid: boolean; message: string; suggestion: string } {
    // This is a simplified constraint validation
    // In practice, this would parse and evaluate formal constraint expressions
    
    switch (constraint.type) {
      case 'cardinality':
        return this.validateCardinalityConstraint(constraint, cls);
      case 'value':
        return this.validateValueConstraint(constraint, cls);
      case 'logical':
        return this.validateLogicalConstraint(constraint, cls, context);
      default:
        return {
          valid: true,
          message: 'Unknown constraint type',
          suggestion: 'Review constraint definition'
        };
    }
  }

  private validateCardinalityConstraint(
    constraint: OntologyConstraint,
    cls: OntologyClass
  ): { valid: boolean; message: string; suggestion: string } {
    // Simplified cardinality validation
    const instanceCount = cls.instances.length;
    
    return {
      valid: instanceCount >= 0, // Basic validation
      message: `Cardinality constraint validation for ${cls.name}`,
      suggestion: 'Ensure proper instance management'
    };
  }

  private validateValueConstraint(
    constraint: OntologyConstraint,
    cls: OntologyClass
  ): { valid: boolean; message: string; suggestion: string } {
    return {
      valid: true, // Placeholder - would implement actual value constraint checking
      message: `Value constraint validation for ${cls.name}`,
      suggestion: 'Review value constraints'
    };
  }

  private validateLogicalConstraint(
    constraint: OntologyConstraint,
    cls: OntologyClass,
    context: ValidationContext
  ): { valid: boolean; message: string; suggestion: string } {
    return {
      valid: true, // Placeholder - would implement logical constraint reasoning
      message: `Logical constraint validation for ${cls.name}`,
      suggestion: 'Review logical constraints'
    };
  }

  private calculateValidationMetrics(
    context: ValidationContext,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ) {
    const totalElements = context.classes.size + context.properties.size + context.relationships.size;
    
    const consistency = Math.max(0, 1 - (errors.length * 0.1 + warnings.length * 0.05));
    const completeness = this.calculateCompleteness(context);
    const clarity = this.calculateClarity(context);
    const coverage = this.calculateCoverage(context);

    return {
      consistency,
      completeness,
      clarity,
      coverage
    };
  }

  private calculateCompleteness(context: ValidationContext): number {
    const classesWithInstances = Array.from(context.classes.values())
      .filter(c => c.instances.length > 0).length;
    
    return classesWithInstances / Math.max(context.classes.size, 1);
  }

  private calculateClarity(context: ValidationContext): number {
    const elementsWithDescriptions = 
      Array.from(context.classes.values()).filter(c => c.description).length +
      Array.from(context.properties.values()).filter(p => p.description).length;
    
    const totalElements = context.classes.size + context.properties.size;
    
    return elementsWithDescriptions / Math.max(totalElements, 1);
  }

  private calculateCoverage(context: ValidationContext): number {
    // Coverage based on relationship density
    const expectedRelationships = context.classes.size * (context.classes.size - 1) / 10; // Conservative estimate
    const actualRelationships = context.relationships.size;
    
    return Math.min(actualRelationships / Math.max(expectedRelationships, 1), 1);
  }

  // Public utility methods
  getValidationRules(): ValidationRule[] {
    return [...this.validationRules];
  }

  addCustomValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
  }

  removeValidationRule(ruleName: string): boolean {
    const index = this.validationRules.findIndex(r => r.name === ruleName);
    if (index !== -1) {
      this.validationRules.splice(index, 1);
      return true;
    }
    return false;
  }
}