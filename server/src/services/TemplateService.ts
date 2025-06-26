import { Tiddler } from '../types/tiddler.js';

export interface Template {
  name: string;
  description: string;
  fields: Partial<Tiddler>;
  textTemplate: string;
}

export class TemplateService {
  private templates: Map<string, Template> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates() {
    // Daily Journal Template
    this.templates.set('daily-journal', {
      name: 'Daily Journal',
      description: 'Template for daily journal entries',
      fields: {
        tags: ['journal', 'daily'],
        type: 'text/vnd.tiddlywiki'
      },
      textTemplate: `! Daily Journal - {{date}}

!! Morning Thoughts
* 

!! Today's Goals
# 
# 
# 

!! Key Activities
* 

!! Reflections
* 

!! Tomorrow's Priorities
* 

---
//Created: {{timestamp}}//`
    });

    // Meeting Notes Template
    this.templates.set('meeting-notes', {
      name: 'Meeting Notes',
      description: 'Template for meeting notes',
      fields: {
        tags: ['meeting', 'notes'],
        type: 'text/vnd.tiddlywiki'
      },
      textTemplate: `! Meeting: {{title}}

!! Date & Time
{{date}} at {{time}}

!! Attendees
* 

!! Agenda
# 
# 

!! Discussion Points
* 

!! Action Items
|!Task|!Owner|!Due Date|
|||
|||

!! Decisions Made
* 

!! Next Steps
* 

---
//Meeting notes created: {{timestamp}}//`
    });

    // Project Template
    this.templates.set('project', {
      name: 'Project',
      description: 'Template for project documentation',
      fields: {
        tags: ['project'],
        type: 'text/vnd.tiddlywiki'
      },
      textTemplate: `! Project: {{title}}

!! Overview
{{description}}

!! Objectives
# 
# 
# 

!! Stakeholders
* 

!! Timeline
|!Phase|!Start Date|!End Date|!Status|
|Planning||||
|Development||||
|Testing||||
|Deployment||||

!! Resources
* 

!! Risks & Mitigation
|!Risk|!Impact|!Mitigation|
||||

!! Progress Updates
!!! {{date}}
* 

---
//Project created: {{timestamp}}//`
    });

    // Research Notes Template
    this.templates.set('research-notes', {
      name: 'Research Notes',
      description: 'Template for research documentation',
      fields: {
        tags: ['research', 'notes'],
        type: 'text/vnd.tiddlywiki'
      },
      textTemplate: `! Research: {{title}}

!! Research Question
{{question}}

!! Hypothesis


!! Methodology


!! Key Findings
# 
# 
# 

!! Literature Review
* [[]]
* [[]]

!! Data & Analysis


!! Conclusions


!! Future Work


!! References
# 
# 

---
//Research notes created: {{timestamp}}//`
    });

    // Technical Documentation Template
    this.templates.set('technical-doc', {
      name: 'Technical Documentation',
      description: 'Template for technical documentation',
      fields: {
        tags: ['technical', 'documentation'],
        type: 'text/vnd.tiddlywiki'
      },
      textTemplate: `! {{title}}

!! Overview
{{description}}

!! Prerequisites
* 

!! Installation/Setup
\`\`\`bash

\`\`\`

!! Configuration
\`\`\`json

\`\`\`

!! Usage Examples
!!! Basic Example
\`\`\`

\`\`\`

!!! Advanced Example
\`\`\`

\`\`\`

!! API Reference
|!Method|!Parameters|!Returns|!Description|
|||||

!! Troubleshooting
|!Issue|!Solution|
|||

!! Related Topics
* [[]]
* [[]]

---
//Documentation created: {{timestamp}}//`
    });
  }

  getTemplate(name: string): Template | undefined {
    return this.templates.get(name);
  }

  listTemplates(): Array<{name: string; description: string}> {
    return Array.from(this.templates.entries()).map(([name, template]) => ({
      name,
      description: template.description
    }));
  }

  applyTemplate(templateName: string, variables: Record<string, string>): Partial<Tiddler> | null {
    const template = this.templates.get(templateName);
    if (!template) return null;

    // Add default variables
    const now = new Date();
    const defaultVars = {
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      timestamp: now.toISOString(),
      ...variables
    };

    // Replace variables in text template
    let text = template.textTemplate;
    for (const [key, value] of Object.entries(defaultVars)) {
      text = text.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return {
      ...template.fields,
      text,
      created: now.toISOString(),
      modified: now.toISOString()
    };
  }
}