#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { searchTiddlersTool } from './tools/searchTiddlers.js';
import { createTiddlerTool } from './tools/createTiddler.js';
import { updateTiddlerTool } from './tools/updateTiddler.js';
import { listTiddlersTool } from './tools/listTiddlers.js';
import { analyzeConnectionsTool } from './tools/analyzeConnections.js';
import { suggestTagsTool } from './tools/suggestTags.js';
import { findRelatedContentTool } from './tools/findRelatedContent.js';
import { applyTemplateTool, listTemplatesTools } from './tools/applyTemplate.js';
import { generateSummaryTool } from './tools/generateSummary.js';
import { findKnowledgeGapsTool } from './tools/findKnowledgeGaps.js';
import { enhanceContentTool } from './tools/enhanceContent.js';
import { createStudyMaterialsTool } from './tools/createStudyMaterials.js';
import { analyzeDomainOntologyTool, handleAnalyzeDomainOntology } from './tools/analyzeDomainOntology.js';
import { defineKnowledgeClassesTool, handleDefineKnowledgeClasses } from './tools/defineKnowledgeClasses.js';
import { mapSemanticRelationshipsTool, handleMapSemanticRelationships } from './tools/mapSemanticRelationships.js';
import { validateOntologicalStructureTool, handleValidateOntologicalStructure } from './tools/validateOntologicalStructure.js';
import { generateFormalSpecificationTool, handleGenerateFormalSpecification } from './tools/generateFormalSpecification.js';
import { TiddlyWikiService } from './services/TiddlyWikiService.js';

const server = new Server(
  {
    name: 'tiddlywiki-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize TiddlyWiki service
const tiddlyWikiPath = process.env.TIDDLYWIKI_PATH || './tiddlers';
const wikiService = new TiddlyWikiService(tiddlyWikiPath);

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      searchTiddlersTool.definition,
      createTiddlerTool.definition,
      updateTiddlerTool.definition,
      listTiddlersTool.definition,
      analyzeConnectionsTool.definition,
      suggestTagsTool.definition,
      findRelatedContentTool.definition,
      applyTemplateTool.definition,
      listTemplatesTools.definition,
      generateSummaryTool.definition,
      findKnowledgeGapsTool.definition,
      enhanceContentTool.definition,
      createStudyMaterialsTool.definition,
      analyzeDomainOntologyTool,
      defineKnowledgeClassesTool,
      mapSemanticRelationshipsTool,
      validateOntologicalStructureTool,
      generateFormalSpecificationTool,
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_tiddlers':
        return await searchTiddlersTool.handler(args, wikiService);
      
      case 'create_tiddler':
        return await createTiddlerTool.handler(args, wikiService);
      
      case 'update_tiddler':
        return await updateTiddlerTool.handler(args, wikiService);
      
      case 'list_tiddlers':
        return await listTiddlersTool.handler(args, wikiService);
      
      case 'analyze_connections':
        return await analyzeConnectionsTool.handler(args, wikiService);
      
      case 'suggest_tags':
        return await suggestTagsTool.handler(args, wikiService);
      
      case 'find_related_content':
        return await findRelatedContentTool.handler(args, wikiService);
      
      case 'apply_template':
        return await applyTemplateTool.handler(args, wikiService);
      
      case 'list_templates':
        return await listTemplatesTools.handler(args, wikiService);
      
      case 'generate_summary':
        return await generateSummaryTool.handler(args, wikiService);
      
      case 'find_knowledge_gaps':
        return await findKnowledgeGapsTool.handler(args, wikiService);
      
      case 'enhance_content':
        return await enhanceContentTool.handler(args, wikiService);
      
      case 'create_study_materials':
        return await createStudyMaterialsTool.handler(args, wikiService);
      
      case 'analyze_domain_ontology':
        return await handleAnalyzeDomainOntology(args, wikiService);
      
      case 'define_knowledge_classes':
        return await handleDefineKnowledgeClasses(args, wikiService);
      
      case 'map_semantic_relationships':
        return await handleMapSemanticRelationships(args, wikiService);
      
      case 'validate_ontological_structure':
        return await handleValidateOntologicalStructure(args, wikiService);
      
      case 'generate_formal_specification':
        return await handleGenerateFormalSpecification(args, wikiService);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('TiddlyWiki MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});