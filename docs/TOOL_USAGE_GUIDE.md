# TiddlyWiki MCP Server - Comprehensive Tool Usage Guide

This guide provides practical examples and use cases for all 21 tools implemented across Phases 1-4 of the TiddlyWiki MCP integration.

## Table of Contents
- [Phase 1: Foundation Tools](#phase-1-foundation-tools)
- [Phase 2: Enhanced Operations](#phase-2-enhanced-operations)
- [Phase 3: AI-Powered Features](#phase-3-ai-powered-features)
- [Phase 4: Ontological Architecture](#phase-4-ontological-architecture)
- [Combined Workflows](#combined-workflows)
- [Advanced Use Cases](#advanced-use-cases)

---

## Phase 1: Foundation Tools

### Basic Content Management

#### 1. Creating Content

**Prompt**: *"Create a new tiddler about machine learning fundamentals with appropriate tags"*

```
Use create_tiddler with:
- title: "Machine Learning Fundamentals"
- text: "Machine learning is a subset of artificial intelligence..."
- tags: ["ai", "machine-learning", "fundamentals", "technology"]
```

**Prompt**: *"Search for all tiddlers related to 'project management' in titles and content"*

```
Use search_tiddlers with:
- query: "project management"
- search_in: ["title", "text"]
- limit: 10
```

#### 2. Content Discovery

**Prompt**: *"Find all tiddlers that mention 'Python' but limit to 5 results"*

```
Use search_tiddlers with:
- query: "Python"
- limit: 5
```

**Prompt**: *"List all tiddlers created in the last week"*

```
Use list_tiddlers with:
- sort_by: "created"
- filter_tags: []
- limit: 20
```

#### 3. Content Updates

**Prompt**: *"Update the 'Project Plan' tiddler to add a new tag 'urgent' and modify the text"*

```
Use update_tiddler with:
- title: "Project Plan"
- updates: {
  "tags": ["planning", "project", "urgent"],
  "text": "Updated project plan with new timeline..."
}
```

---

## Phase 2: Enhanced Operations

### Intelligent Content Analysis

#### 4. Connection Analysis

**Prompt**: *"Analyze the connections between concepts in my knowledge base and show me the relationship network"*

```
Use analyze_connections with:
- focus_tiddler: (optional specific tiddler)
- max_connections: 20
- include_tags: true
```

#### 5. Smart Tagging

**Prompt**: *"Suggest appropriate tags for my content about data science projects"*

```
Use suggest_tags with:
- content: "Working on data preprocessing, model training, and evaluation metrics"
- max_suggestions: 8
- include_existing: true
```

#### 6. Content Discovery

**Prompt**: *"Find content related to my machine learning tiddler that I might have missed"*

```
Use find_related_content with:
- reference_tiddler: "Machine Learning Fundamentals"
- similarity_threshold: 0.3
- max_results: 10
```

#### 7. Template Application

**Prompt**: *"Apply a meeting notes template to create a structured note"*

```
First: list_templates to see available templates
Then: apply_template with:
- template_name: "meeting-notes"
- variables: {
  "meeting_title": "Weekly Team Sync",
  "date": "2024-01-15",
  "attendees": "Alice, Bob, Carol"
}
```

---

## Phase 3: AI-Powered Features

### Advanced Knowledge Management

#### 8. Content Summarization

**Prompt**: *"Generate a comprehensive summary of all my research on artificial intelligence"*

```
Use generate_summary with:
- tiddler_titles: ["AI Research", "Machine Learning", "Neural Networks"]
- summary_type: "comprehensive"
- max_length: 500
```

#### 9. Knowledge Gap Analysis

**Prompt**: *"Identify what's missing in my knowledge base about software development"*

```
Use find_knowledge_gaps with:
- domain: "software development"
- analysis_depth: "detailed"
- suggest_research: true
```

#### 10. Content Enhancement

**Prompt**: *"Enhance my basic notes on blockchain technology with more detailed information"*

```
Use enhance_content with:
- tiddler_title: "Blockchain Basics"
- enhancement_type: "expand"
- focus_areas: ["technical details", "use cases", "examples"]
```

#### 11. Study Materials

**Prompt**: *"Create study materials for my computer science concepts"*

```
Use create_study_materials with:
- topic: "Computer Science Fundamentals"
- material_types: ["flashcards", "quiz", "summary"]
- difficulty_level: "intermediate"
- source_tiddlers: ["Algorithms", "Data Structures", "Programming"]
```

---

## Phase 4: Ontological Architecture

### Formal Knowledge Representation

#### 12. Domain Analysis

**Prompt**: *"Analyze my knowledge base to discover the main conceptual domains and their relationships"*

```
Use analyze_domain_ontology with:
- domain_scope: (optional: "technology" or "business")
- concept_threshold: 0.6
- relationship_threshold: 0.4
- include_hierarchy: true
- max_concepts: 100
```

#### 13. Class Definition

**Prompt**: *"Define formal knowledge classes for my business domain concepts"*

```
Use define_knowledge_classes with:
- class_definitions: [
  {
    "name": "BusinessProcess",
    "description": "A systematic series of business activities",
    "parent_classes": ["Process"],
    "properties": ["hasOwner", "hasDuration", "hasOutput"]
  }
]
- auto_generate: true
- confidence_threshold: 0.7
```

#### 14. Relationship Mapping

**Prompt**: *"Map all semantic relationships in my knowledge base with focus on causal relationships"*

```
Use map_semantic_relationships with:
- relationship_types: ["causes", "enables", "depends-on"]
- strength_threshold: 0.4
- include_bidirectional: true
- validate_consistency: true
```

#### 15. Structure Validation

**Prompt**: *"Validate my knowledge base structure for logical consistency and suggest improvements"*

```
Use validate_ontological_structure with:
- include_suggestions: true
- validation_level: "comprehensive"
- auto_fix: false
```

#### 16. Formal Export

**Prompt**: *"Export my knowledge base as a formal OWL ontology for use in semantic applications"*

```
Use generate_formal_specification with:
- format: "owl"
- include_metadata: true
- namespace_uri: "http://mycompany.com/ontology#"
- ontology_title: "Company Knowledge Base"
```

---

## Combined Workflows

### Workflow 1: Research Project Setup

**Scenario**: Starting a new research project on "Sustainable Technology"

```
1. create_tiddler: Create main project tiddler
   - title: "Sustainable Technology Research"
   - tags: ["research", "sustainability", "technology"]

2. suggest_tags: Get additional relevant tags
   - content: "sustainable technology research renewable energy"

3. find_knowledge_gaps: Identify research areas
   - domain: "sustainable technology"
   - analysis_depth: "detailed"

4. apply_template: Create structured research plan
   - template_name: "research-project"
   - variables: {"project_name": "Sustainable Technology"}
```

### Workflow 2: Knowledge Base Analysis & Improvement

**Scenario**: Analyzing and improving an existing knowledge base

```
1. analyze_domain_ontology: Understand current structure
   - concept_threshold: 0.5
   - include_hierarchy: true

2. validate_ontological_structure: Check for issues
   - validation_level: "comprehensive"
   - include_suggestions: true

3. map_semantic_relationships: Identify missing connections
   - strength_threshold: 0.3
   - validate_consistency: true

4. enhance_content: Improve weak areas identified
   - enhancement_type: "expand"

5. generate_formal_specification: Export final structure
   - format: "json-ld"
```

### Workflow 3: Learning Session

**Scenario**: Studying machine learning concepts

```
1. search_tiddlers: Find all ML-related content
   - query: "machine learning"
   - search_in: ["title", "text", "tags"]

2. analyze_connections: See how concepts relate
   - focus_tiddler: "Machine Learning Fundamentals"
   - max_connections: 15

3. find_knowledge_gaps: Identify learning gaps
   - domain: "machine learning"

4. create_study_materials: Generate study aids
   - topic: "Machine Learning"
   - material_types: ["flashcards", "quiz"]

5. generate_summary: Create overview
   - summary_type: "educational"
```

### Workflow 4: Business Process Documentation

**Scenario**: Documenting and formalizing business processes

```
1. list_templates: Check available business templates
2. apply_template: Create process documentation
   - template_name: "business-process"

3. suggest_tags: Get relevant business tags
   - content: "business process workflow automation"

4. define_knowledge_classes: Create formal process classes
   - class_definitions: [business process definitions]

5. map_semantic_relationships: Define process relationships
   - relationship_types: ["precedes", "depends-on", "enables"]

6. validate_ontological_structure: Ensure consistency
   - validation_level: "strict"
```

---

## Advanced Use Cases

### Use Case 1: Academic Research Management

**Tools Used**: 8-10 tools in sequence

**Prompt**: *"Help me manage my PhD research on artificial intelligence, from literature review to formal knowledge representation"*

```
Phase 1: Content Creation & Organization
→ create_tiddler: Research proposal, literature notes
→ suggest_tags: Academic, AI, research domains
→ apply_template: Paper review template

Phase 2: Analysis & Discovery
→ analyze_connections: Find research theme connections
→ find_related_content: Discover overlooked papers
→ find_knowledge_gaps: Identify research opportunities

Phase 3: Knowledge Synthesis
→ generate_summary: Create literature review
→ enhance_content: Deepen key concept explanations
→ create_study_materials: Exam preparation

Phase 4: Formal Representation
→ analyze_domain_ontology: Map AI domain structure
→ define_knowledge_classes: Formal AI concept classes
→ generate_formal_specification: Export as research ontology
```

### Use Case 2: Corporate Knowledge Management

**Tools Used**: 12-15 tools across all phases

**Prompt**: *"Transform our company's scattered documentation into a formal, searchable knowledge base"*

```
Phase 1: Content Audit & Organization
→ list_tiddlers: Inventory existing content
→ search_tiddlers: Find duplicate/similar content
→ update_tiddler: Standardize formats

Phase 2: Intelligent Processing
→ suggest_tags: Standardize tagging across departments
→ analyze_connections: Map information relationships
→ apply_template: Standardize document structures

Phase 3: Knowledge Enhancement
→ find_knowledge_gaps: Identify missing documentation
→ enhance_content: Improve incomplete sections
→ generate_summary: Create department overviews

Phase 4: Formal Structure
→ analyze_domain_ontology: Understand business domains
→ define_knowledge_classes: Create business concept classes
→ map_semantic_relationships: Define business rules
→ validate_ontological_structure: Ensure consistency
→ generate_formal_specification: Export for enterprise systems
```

### Use Case 3: Personal Learning Journey

**Tools Used**: Full toolkit integration

**Prompt**: *"Create a comprehensive learning system for web development that adapts and grows with my progress"*

```
Setup Phase:
→ apply_template: Learning plan template
→ create_tiddler: Learning goals and milestones

Discovery Phase:
→ search_tiddlers: Find existing web dev content
→ find_knowledge_gaps: Identify learning areas
→ suggest_tags: Organize by skill level/topic

Study Phase:
→ create_study_materials: Flashcards, quizzes
→ analyze_connections: See how concepts relate
→ enhance_content: Deepen understanding

Assessment Phase:
→ generate_summary: Progress summaries
→ validate_ontological_structure: Check knowledge consistency
→ map_semantic_relationships: Understand skill dependencies

Evolution Phase:
→ analyze_domain_ontology: Adapt learning structure
→ generate_formal_specification: Export learning path
```

---

## Tool Combination Strategies

### Strategy 1: Content-First Approach
Start with content creation → Add intelligence → Formalize structure
`create_tiddler → suggest_tags → analyze_connections → define_knowledge_classes`

### Strategy 2: Analysis-First Approach
Analyze existing content → Identify gaps → Enhance → Validate
`analyze_domain_ontology → find_knowledge_gaps → enhance_content → validate_ontological_structure`

### Strategy 3: Template-Driven Approach
Use templates for consistency → Analyze patterns → Formalize
`apply_template → analyze_connections → map_semantic_relationships → generate_formal_specification`

### Strategy 4: Iterative Improvement
Continuous cycle of analysis, enhancement, and validation
`search_tiddlers → enhance_content → validate_ontological_structure → (repeat)`

---

## Tips for Effective Tool Usage

### 1. Start Simple, Build Complexity
- Begin with basic tools (Phase 1)
- Add intelligence features (Phase 2-3)
- Formalize when ready (Phase 4)

### 2. Use Thresholds Wisely
- Lower thresholds = more results, less precision
- Higher thresholds = fewer results, higher precision
- Adjust based on your knowledge base size

### 3. Combine Validation Tools
- Always validate after major changes
- Use suggestions to guide improvements
- Export formal specs for external validation

### 4. Leverage Templates
- Create consistent structures
- Speed up content creation
- Ensure completeness

### 5. Monitor Knowledge Gaps
- Regular gap analysis prevents knowledge debt
- Use gap findings to guide learning/research
- Fill gaps before formalizing

---

## Quick Reference

### Most Commonly Used Combinations

**Content Creation**: `create_tiddler → suggest_tags → apply_template`

**Content Discovery**: `search_tiddlers → find_related_content → analyze_connections`

**Knowledge Analysis**: `analyze_domain_ontology → find_knowledge_gaps → validate_ontological_structure`

**Study Preparation**: `generate_summary → create_study_materials → enhance_content`

**Formal Export**: `validate_ontological_structure → generate_formal_specification`

### Troubleshooting Common Issues

**Low Quality Results**: Increase confidence/threshold values
**Missing Connections**: Lower relationship thresholds
**Validation Errors**: Check for circular dependencies, fix naming
**Export Failures**: Validate structure first, check format compatibility

---

This comprehensive guide demonstrates how the 21 tools work together to create powerful knowledge management workflows, from simple content creation to sophisticated ontological modeling.