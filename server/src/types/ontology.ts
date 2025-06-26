export interface OntologyClass {
  id: string;
  name: string;
  description?: string;
  superClasses: string[];
  subClasses: string[];
  properties: OntologyProperty[];
  constraints: OntologyConstraint[];
  instances: string[]; // Tiddler titles that are instances of this class
  metadata: {
    created: string;
    modified: string;
    confidence: number; // 0-1 score for AI-generated classes
    source: 'manual' | 'inferred' | 'extracted';
  };
}

export interface OntologyProperty {
  id: string;
  name: string;
  description?: string;
  domain: string[]; // Classes that can have this property
  range: string[]; // Possible value types or target classes
  type: 'datatype' | 'object' | 'annotation';
  cardinality: {
    min: number;
    max: number | 'unbounded';
  };
  constraints: PropertyConstraint[];
}

export interface OntologyRelationship {
  id: string;
  type: string;
  source: string; // Class or instance ID
  target: string; // Class or instance ID
  properties: Record<string, any>;
  confidence: number;
  bidirectional: boolean;
  metadata: {
    created: string;
    source: 'manual' | 'inferred' | 'extracted';
  };
}

export interface OntologyConstraint {
  id: string;
  type: 'restriction' | 'cardinality' | 'value' | 'logical';
  expression: string; // Formal constraint expression
  description: string;
  severity: 'error' | 'warning' | 'info';
}

export interface PropertyConstraint {
  type: 'range' | 'pattern' | 'length' | 'unique';
  value: any;
  message: string;
}

export interface Domain {
  id: string;
  name: string;
  description: string;
  scope: string[];
  classes: string[]; // Class IDs
  properties: string[]; // Property IDs
  relationships: string[]; // Relationship IDs
  coverage: number; // 0-1 score of how well the domain is covered
  coherence: number; // 0-1 score of logical consistency
}

export interface OntologyValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  metrics: {
    consistency: number;
    completeness: number;
    clarity: number;
    coverage: number;
  };
}

export interface ValidationError {
  type: 'circular_dependency' | 'missing_superclass' | 'constraint_violation' | 'logical_inconsistency';
  severity: 'critical' | 'major' | 'minor';
  message: string;
  affectedElements: string[];
  suggestedFix?: string;
}

export interface ValidationWarning {
  type: 'ambiguous_naming' | 'low_coverage' | 'redundant_relationship' | 'orphaned_class';
  message: string;
  affectedElements: string[];
  recommendation: string;
}

export interface ValidationSuggestion {
  type: 'merge_classes' | 'add_relationship' | 'refine_hierarchy' | 'add_constraint';
  confidence: number;
  description: string;
  impact: 'high' | 'medium' | 'low';
  implementation: string;
}

export interface ConceptExtractionResult {
  concepts: ExtractedConcept[];
  relationships: ExtractedRelationship[];
  domains: ExtractedDomain[];
  confidence: number;
}

export interface ExtractedConcept {
  name: string;
  type: 'entity' | 'process' | 'quality' | 'abstract';
  frequency: number;
  contexts: string[]; // Tiddler titles where found
  suggestedClass?: string;
  confidence: number;
}

export interface ExtractedRelationship {
  source: string;
  target: string;
  type: string;
  strength: number;
  evidence: string[]; // Supporting text snippets
  confidence: number;
}

export interface ExtractedDomain {
  name: string;
  concepts: string[];
  scope: string;
  coherence: number;
}

export interface OntologyExportFormat {
  format: 'owl' | 'rdf' | 'json-ld' | 'turtle' | 'skos';
  content: string;
  metadata: {
    exportedAt: string;
    version: string;
    classes: number;
    properties: number;
    relationships: number;
  };
}

export interface OntologyMergeResult {
  mergedOntology: {
    classes: OntologyClass[];
    properties: OntologyProperty[];
    relationships: OntologyRelationship[];
  };
  conflicts: MergeConflict[];
  resolutions: MergeResolution[];
  statistics: {
    originalClasses: number;
    mergedClasses: number;
    conflictsResolved: number;
  };
}

export interface MergeConflict {
  type: 'duplicate_class' | 'conflicting_hierarchy' | 'incompatible_property';
  elements: string[];
  description: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface MergeResolution {
  conflictId: string;
  strategy: 'merge' | 'rename' | 'prioritize' | 'manual';
  description: string;
  confidence: number;
}