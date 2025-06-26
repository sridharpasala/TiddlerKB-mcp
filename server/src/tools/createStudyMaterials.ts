import { z } from 'zod';
import { TiddlyWikiService } from '../services/TiddlyWikiService.js';
import { AIProcessor } from '../services/AIProcessor.js';

const CreateStudyMaterialsSchema = z.object({
  tiddlers: z.array(z.string()).optional().describe('List of tiddler titles to create study materials from'),
  materialType: z.enum(['flashcards', 'quiz', 'outline', 'summary']).describe('Type of study material to generate'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional().describe('Difficulty level'),
  topic: z.string().optional().describe('Specific topic or tag to filter by'),
});

export const createStudyMaterialsTool = {
  definition: {
    name: 'create_study_materials',
    description: 'Generate educational study materials (flashcards, quizzes, outlines) from tiddler content',
    inputSchema: {
      type: 'object',
      properties: {
        tiddlers: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of tiddler titles to create study materials from'
        },
        materialType: {
          type: 'string',
          enum: ['flashcards', 'quiz', 'outline', 'summary'],
          description: 'Type of study material to generate'
        },
        difficulty: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced'],
          description: 'Difficulty level'
        },
        topic: {
          type: 'string',
          description: 'Specific topic or tag to filter by'
        }
      },
      required: ['materialType']
    },
  },
  
  handler: async (args: unknown, wikiService: TiddlyWikiService) => {
    const params = CreateStudyMaterialsSchema.parse(args);
    
    let sourceTiddlers;
    
    if (params.tiddlers && params.tiddlers.length > 0) {
      // Get specific tiddlers
      sourceTiddlers = [];
      for (const title of params.tiddlers) {
        const tiddler = await wikiService.getTiddler(title);
        if (tiddler) {
          sourceTiddlers.push(tiddler);
        }
      }
      
      if (sourceTiddlers.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: None of the specified tiddlers were found.',
            },
          ],
        };
      }
    } else {
      // Get all tiddlers or filter by topic
      sourceTiddlers = await wikiService.listTiddlers();
      
      if (params.topic) {
        sourceTiddlers = sourceTiddlers.filter(t => 
          t.tags?.some(tag => tag.toLowerCase().includes(params.topic!.toLowerCase())) ||
          t.title.toLowerCase().includes(params.topic!.toLowerCase()) ||
          t.text.toLowerCase().includes(params.topic!.toLowerCase())
        );
      }
      
      if (sourceTiddlers.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: params.topic 
                ? `No tiddlers found matching topic "${params.topic}"`
                : 'No tiddlers found to create study materials from.',
            },
          ],
        };
      }
    }

    const aiProcessor = new AIProcessor();
    const studyMaterial = aiProcessor.createStudyMaterials(sourceTiddlers, params.materialType);
    
    // Override difficulty if specified
    if (params.difficulty) {
      studyMaterial.metadata.difficulty = params.difficulty;
    }

    let response = `# Study Materials: ${params.materialType.charAt(0).toUpperCase() + params.materialType.slice(1)}\n\n`;
    response += `**Source:** ${sourceTiddlers.length} tiddlers\n`;
    response += `**Difficulty:** ${studyMaterial.metadata.difficulty}\n`;
    response += `**Estimated Time:** ${studyMaterial.metadata.estimatedTime}\n`;
    if (params.topic) response += `**Topic Filter:** ${params.topic}\n`;
    response += `**Generated:** ${new Date().toISOString().split('T')[0]}\n\n`;
    response += '---\n\n';

    // Format content based on material type
    switch (params.materialType) {
      case 'flashcards':
        response += formatFlashcards(studyMaterial.content.cards);
        break;
      case 'quiz':
        response += formatQuiz(studyMaterial.content.questions);
        break;
      case 'outline':
        response += formatOutline(studyMaterial.content.outline);
        break;
      case 'summary':
        response += studyMaterial.content.summary;
        break;
    }

    // Add study tips
    response += '\n\n---\n\n';
    response += '## 📚 Study Tips\n\n';
    
    switch (params.materialType) {
      case 'flashcards':
        response += '- Review cards in random order\n';
        response += '- Focus on cards you get wrong\n';
        response += '- Space out review sessions over time\n';
        response += '- Try to explain concepts in your own words\n';
        break;
      case 'quiz':
        response += '- Take the quiz without looking at notes first\n';
        response += '- Review explanations for wrong answers\n';
        response += '- Retake after studying gaps\n';
        response += '- Time yourself to improve recall speed\n';
        break;
      case 'outline':
        response += '- Start with main topics, then drill down\n';
        response += '- Create mental connections between sections\n';
        response += '- Use the outline to test your knowledge\n';
        response += '- Expand each point with your own examples\n';
        break;
      case 'summary':
        response += '- Read through the summary first\n';
        response += '- Identify key concepts and relationships\n';
        response += '- Test yourself on main points\n';
        response += '- Refer back to original tiddlers for details\n';
        break;
    }

    // Add metadata
    response += `\n## 📊 Material Metadata\n\n`;
    response += `- **Source tiddlers:** ${sourceTiddlers.map(t => `[[${t.title}]]`).join(', ')}\n`;
    response += `- **Topics covered:** ${studyMaterial.metadata.topics.join(', ')}\n`;
    response += `- **Content length:** ${sourceTiddlers.reduce((sum, t) => sum + t.text.length, 0)} characters\n`;
    response += `- **Difficulty level:** ${studyMaterial.metadata.difficulty}\n`;

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  },
};

function formatFlashcards(cards: Array<{front: string; back: string}>): string {
    let content = '## Flashcards\n\n';
    
    cards.forEach((card, index) => {
      content += `### Card ${index + 1}\n\n`;
      content += `**Q:** ${card.front}\n\n`;
      content += `**A:** ${card.back}\n\n`;
      content += '---\n\n';
    });
    
    return content;
  }

function formatQuiz(questions: Array<{
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }>): string {
    let content = '## Quiz Questions\n\n';
    
    questions.forEach((q, index) => {
      content += `### Question ${index + 1}\n\n`;
      content += `${q.question}\n\n`;
      
      q.options.forEach((option, optIndex) => {
        const letter = String.fromCharCode(65 + optIndex); // A, B, C, D
        const marker = optIndex === q.correct ? '✅' : '   ';
        content += `${marker} ${letter}. ${option}\n`;
      });
      
      content += `\n**Explanation:** ${q.explanation}\n\n`;
      content += '---\n\n';
    });
    
    return content;
  }

function formatOutline(outline: any): string {
    let content = '## Study Outline\n\n';
    
    Object.entries(outline).forEach(([category, items]: [string, any]) => {
      content += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
      
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          content += `#### ${item.title}\n\n`;
          if (item.keyPoints && Array.isArray(item.keyPoints)) {
            item.keyPoints.forEach((point: string) => {
              content += `- ${point}\n`;
            });
          }
          content += '\n';
        });
      }
      
      content += '\n';
    });
    
    return content;
  }