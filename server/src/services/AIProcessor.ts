import { Tiddler } from '../types/tiddler.js';

export interface SummaryOptions {
  style: 'brief' | 'detailed' | 'bullet-points' | 'executive';
  maxLength?: number;
  focus?: 'main-points' | 'action-items' | 'conclusions' | 'overview';
}

export interface KnowledgeGap {
  topic: string;
  description: string;
  suggestedContent: string;
  relatedTiddlers: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface StudyMaterial {
  type: 'flashcards' | 'quiz' | 'outline' | 'summary';
  content: any;
  metadata: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime: string;
    topics: string[];
  };
}

export class AIProcessor {
  // Content Summarization
  generateSummary(tiddlers: Tiddler[], options: SummaryOptions): string {
    const combinedContent = tiddlers.map(t => `## ${t.title}\n${t.text}`).join('\n\n');
    
    switch (options.style) {
      case 'brief':
        return this.createBriefSummary(combinedContent, options.maxLength);
      case 'bullet-points':
        return this.createBulletPointSummary(tiddlers);
      case 'executive':
        return this.createExecutiveSummary(tiddlers);
      case 'detailed':
      default:
        return this.createDetailedSummary(tiddlers, options);
    }
  }

  private createBriefSummary(content: string, maxLength: number = 200): string {
    // Extract key sentences
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    const keyPhrases = this.extractKeyPhrases(content);
    
    let summary = `**Brief Summary**\n\n`;
    summary += `This collection covers ${keyPhrases.slice(0, 3).join(', ')}. `;
    
    // Add most informative sentence
    const importantSentence = sentences.find(s => 
      keyPhrases.some(phrase => s.toLowerCase().includes(phrase.toLowerCase()))
    );
    
    if (importantSentence) {
      summary += importantSentence.trim();
    }
    
    return summary.length > maxLength ? summary.substring(0, maxLength) + '...' : summary;
  }

  private createBulletPointSummary(tiddlers: Tiddler[]): string {
    let summary = `**Key Points Summary**\n\n`;
    
    tiddlers.forEach(tiddler => {
      const keyPoints = this.extractKeyPoints(tiddler.text);
      if (keyPoints.length > 0) {
        summary += `**${tiddler.title}:**\n`;
        keyPoints.forEach(point => summary += `• ${point}\n`);
        summary += '\n';
      }
    });
    
    return summary;
  }

  private createExecutiveSummary(tiddlers: Tiddler[]): string {
    const categories = this.categorizeTiddlers(tiddlers);
    
    let summary = `**Executive Summary**\n\n`;
    summary += `**Scope:** Analysis of ${tiddlers.length} knowledge items across ${Object.keys(categories).length} categories.\n\n`;
    
    Object.entries(categories).forEach(([category, items]) => {
      summary += `**${category.charAt(0).toUpperCase() + category.slice(1)}** (${items.length} items):\n`;
      const keyThemes = this.extractThemes(items);
      summary += keyThemes.slice(0, 2).map(theme => `• ${theme}`).join('\n') + '\n\n';
    });
    
    return summary;
  }

  private createDetailedSummary(tiddlers: Tiddler[], options: SummaryOptions): string {
    let summary = `**Detailed Summary**\n\n`;
    
    // Group by category or topic
    const grouped = this.groupTiddlersByTopic(tiddlers);
    
    Object.entries(grouped).forEach(([topic, items]) => {
      summary += `## ${topic}\n\n`;
      
      items.forEach(tiddler => {
        const keyPoints = this.extractKeyPoints(tiddler.text);
        summary += `**${tiddler.title}:**\n`;
        summary += keyPoints.slice(0, 3).map(point => `• ${point}`).join('\n') + '\n\n';
      });
    });
    
    return summary;
  }

  // Knowledge Gap Analysis
  findKnowledgeGaps(tiddlers: Tiddler[]): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const topics = this.extractAllTopics(tiddlers);
    const connections = this.analyzeTopicConnections(tiddlers, topics);
    
    // Find missing connections
    for (const topic of topics) {
      const relatedTopics = connections[topic] || [];
      const missingConnections = topics.filter(t => 
        t !== topic && !relatedTopics.includes(t)
      );
      
      if (missingConnections.length > 0) {
        gaps.push({
          topic,
          description: `Limited connections between ${topic} and other topics`,
          suggestedContent: `Consider exploring relationships between ${topic} and ${missingConnections.slice(0, 2).join(', ')}`,
          relatedTiddlers: tiddlers.filter(t => 
            t.text.toLowerCase().includes(topic.toLowerCase())
          ).map(t => t.title),
          priority: missingConnections.length > 5 ? 'high' : 'medium'
        });
      }
    }
    
    // Find incomplete topics
    const incompleteTiddlers = tiddlers.filter(t => 
      t.text.length < 100 || 
      !t.tags || 
      t.tags.length === 0
    );
    
    incompleteTiddlers.forEach(tiddler => {
      gaps.push({
        topic: tiddler.title,
        description: 'Incomplete or minimal content',
        suggestedContent: 'Expand with more details, examples, or connections to related topics',
        relatedTiddlers: [tiddler.title],
        priority: 'medium'
      });
    });
    
    return gaps.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Content Enhancement
  enhanceContent(tiddler: Tiddler, allTiddlers: Tiddler[]): Partial<Tiddler> {
    const enhancements: Partial<Tiddler> = {};
    
    // Suggest additional tags
    const suggestedTags = this.suggestAdditionalTags(tiddler, allTiddlers);
    if (suggestedTags.length > 0) {
      enhancements.tags = [...(tiddler.tags || []), ...suggestedTags];
    }
    
    // Enhance content with links
    const enhancedText = this.addSuggestedLinks(tiddler.text, allTiddlers);
    if (enhancedText !== tiddler.text) {
      enhancements.text = enhancedText;
    }
    
    return enhancements;
  }

  // Study Material Generation
  createStudyMaterials(tiddlers: Tiddler[], type: StudyMaterial['type']): StudyMaterial {
    switch (type) {
      case 'flashcards':
        return this.generateFlashcards(tiddlers);
      case 'quiz':
        return this.generateQuiz(tiddlers);
      case 'outline':
        return this.generateOutline(tiddlers);
      case 'summary':
      default:
        return this.generateStudySummary(tiddlers);
    }
  }

  private generateFlashcards(tiddlers: Tiddler[]): StudyMaterial {
    const cards: Array<{front: string; back: string}> = [];
    
    tiddlers.forEach(tiddler => {
      const keyTerms = this.extractKeyTerms(tiddler.text);
      keyTerms.forEach(term => {
        const context = this.getTermContext(term, tiddler.text);
        cards.push({
          front: `What is ${term}?`,
          back: context || `Term from ${tiddler.title}`
        });
      });
    });
    
    return {
      type: 'flashcards',
      content: { cards: cards.slice(0, 20) }, // Limit to 20 cards
      metadata: {
        difficulty: 'intermediate',
        estimatedTime: `${Math.ceil(cards.length * 0.5)} minutes`,
        topics: tiddlers.map(t => t.title)
      }
    };
  }

  private generateQuiz(tiddlers: Tiddler[]): StudyMaterial {
    const questions: Array<{
      question: string;
      options: string[];
      correct: number;
      explanation: string;
    }> = [];
    
    tiddlers.forEach(tiddler => {
      const facts = this.extractFacts(tiddler.text);
      facts.slice(0, 2).forEach(fact => {
        questions.push({
          question: `According to ${tiddler.title}, ${fact}?`,
          options: ['True', 'False', 'Partially True', 'Not Mentioned'],
          correct: 0,
          explanation: `This information is found in ${tiddler.title}`
        });
      });
    });
    
    return {
      type: 'quiz',
      content: { questions: questions.slice(0, 10) },
      metadata: {
        difficulty: 'intermediate',
        estimatedTime: `${questions.length * 2} minutes`,
        topics: tiddlers.map(t => t.title)
      }
    };
  }

  private generateOutline(tiddlers: Tiddler[]): StudyMaterial {
    const outline = this.createHierarchicalOutline(tiddlers);
    
    return {
      type: 'outline',
      content: { outline },
      metadata: {
        difficulty: 'beginner',
        estimatedTime: '15 minutes',
        topics: tiddlers.map(t => t.title)
      }
    };
  }

  private generateStudySummary(tiddlers: Tiddler[]): StudyMaterial {
    const summary = this.generateSummary(tiddlers, { style: 'detailed' });
    
    return {
      type: 'summary',
      content: { summary },
      metadata: {
        difficulty: 'intermediate',
        estimatedTime: '10 minutes',
        topics: tiddlers.map(t => t.title)
      }
    };
  }

  // Helper methods
  private extractKeyPhrases(text: string): string[] {
    const phrases = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    return [...new Set(phrases)].slice(0, 10);
  }

  private extractKeyPoints(text: string): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 3).map(s => s.trim());
  }

  private categorizeTiddlers(tiddlers: Tiddler[]): Record<string, Tiddler[]> {
    const categories: Record<string, Tiddler[]> = {};
    
    tiddlers.forEach(tiddler => {
      const category = this.inferCategory(tiddler);
      if (!categories[category]) categories[category] = [];
      categories[category].push(tiddler);
    });
    
    return categories;
  }

  private inferCategory(tiddler: Tiddler): string {
    const title = (tiddler.title || '').toLowerCase();
    const text = (tiddler.text || '').toLowerCase();
    
    if (title.includes('daily') || title.includes('journal')) return 'journal';
    if (title.includes('project') || text.includes('project')) return 'project';
    if (title.includes('research') || text.includes('research')) return 'research';
    if (title.includes('technical') || text.includes('technical')) return 'technical';
    if (title.includes('meeting') || text.includes('meeting')) return 'meeting';
    
    return 'general';
  }

  private extractThemes(tiddlers: Tiddler[]): string[] {
    const allText = tiddlers.map(t => t.text || '').join(' ');
    return this.extractKeyPhrases(allText);
  }

  private groupTiddlersByTopic(tiddlers: Tiddler[]): Record<string, Tiddler[]> {
    const groups: Record<string, Tiddler[]> = {};
    
    tiddlers.forEach(tiddler => {
      const topic = tiddler.tags?.[0] || this.inferCategory(tiddler);
      if (!groups[topic]) groups[topic] = [];
      groups[topic].push(tiddler);
    });
    
    return groups;
  }

  private extractAllTopics(tiddlers: Tiddler[]): string[] {
    const topics = new Set<string>();
    
    tiddlers.forEach(tiddler => {
      if (tiddler.tags) {
        tiddler.tags.forEach(tag => topics.add(tag));
      }
      // Extract potential topics from title and content
      const titleWords = tiddler.title.split(/\W+/).filter(w => w.length > 3);
      titleWords.forEach(word => topics.add(word));
    });
    
    return Array.from(topics);
  }

  private analyzeTopicConnections(tiddlers: Tiddler[], topics: string[]): Record<string, string[]> {
    const connections: Record<string, string[]> = {};
    
    topics.forEach(topic => {
      connections[topic] = [];
      tiddlers.forEach(tiddler => {
        if (tiddler.text.toLowerCase().includes(topic.toLowerCase())) {
          topics.forEach(otherTopic => {
            if (otherTopic !== topic && 
                tiddler.text.toLowerCase().includes(otherTopic.toLowerCase())) {
              if (!connections[topic].includes(otherTopic)) {
                connections[topic].push(otherTopic);
              }
            }
          });
        }
      });
    });
    
    return connections;
  }

  private suggestAdditionalTags(tiddler: Tiddler, allTiddlers: Tiddler[]): string[] {
    const existingTags = new Set(tiddler.tags || []);
    const allTags = new Set<string>();
    
    allTiddlers.forEach(t => {
      if (t.tags) t.tags.forEach(tag => allTags.add(tag));
    });
    
    return Array.from(allTags).filter(tag => 
      !existingTags.has(tag) && 
      tiddler.text.toLowerCase().includes(tag.toLowerCase())
    ).slice(0, 3);
  }

  private addSuggestedLinks(text: string, allTiddlers: Tiddler[]): string {
    let enhancedText = text;
    
    allTiddlers.forEach(tiddler => {
      const title = tiddler.title;
      if (text.includes(title) && !text.includes(`[[${title}]]`)) {
        enhancedText = enhancedText.replace(
          new RegExp(`\\b${title}\\b`, 'g'),
          `[[${title}]]`
        );
      }
    });
    
    return enhancedText;
  }

  private extractKeyTerms(text: string): string[] {
    const terms = text.match(/\b[A-Z][a-zA-Z]{3,}\b/g) || [];
    return [...new Set(terms)].slice(0, 5);
  }

  private getTermContext(term: string, text: string): string {
    const sentences = text.split(/[.!?]+/);
    const contextSentence = sentences.find(s => s.includes(term));
    return contextSentence?.trim() || '';
  }

  private extractFacts(text: string): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 3).map(s => s.trim());
  }

  private createHierarchicalOutline(tiddlers: Tiddler[]): any {
    const outline: any = {};
    
    tiddlers.forEach(tiddler => {
      const category = this.inferCategory(tiddler);
      if (!outline[category]) outline[category] = [];
      outline[category].push({
        title: tiddler.title,
        keyPoints: this.extractKeyPoints(tiddler.text)
      });
    });
    
    return outline;
  }
}