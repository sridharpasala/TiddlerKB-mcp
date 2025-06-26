import { Tiddler } from '../types/tiddler.js';

export interface AnalysisResult {
  keywords: string[];
  suggestedTags: string[];
  relatedLinks: string[];
  category: string;
  summary: string;
}

export class ContentAnalyzer {
  private stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was', 'were',
    'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'to',
    'of', 'in', 'for', 'with', 'it', 'this', 'that', 'these', 'those', 'and',
    'or', 'but', 'if', 'then', 'else', 'when', 'where', 'how', 'why', 'what'
  ]);

  analyzeContent(tiddler: Tiddler): AnalysisResult {
    const title = tiddler.title || '';
    const content = tiddler.text || '';
    const text = `${title} ${content}`.toLowerCase();
    const words = this.tokenize(text);
    const keywords = this.extractKeywords(words);
    const suggestedTags = this.generateTagSuggestions(keywords, tiddler);
    const relatedLinks = this.findPotentialLinks(content);
    const category = this.categorizeContent(keywords, tiddler);
    const summary = this.generateSummary(content);

    return {
      keywords,
      suggestedTags,
      relatedLinks,
      category,
      summary
    };
  }

  private tokenize(text: string): string[] {
    return text
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.stopWords.has(word));
  }

  private extractKeywords(words: string[]): string[] {
    const frequency = new Map<string, number>();
    
    for (const word of words) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private generateTagSuggestions(keywords: string[], tiddler: Tiddler): string[] {
    const suggestions = new Set<string>();
    
    // Add existing tags
    if (tiddler.tags) {
      tiddler.tags.forEach(tag => suggestions.add(tag));
    }

    // Category-based tags
    if (keywords.some(k => ['project', 'task', 'todo'].includes(k))) {
      suggestions.add('project');
    }
    if (keywords.some(k => ['research', 'study', 'analysis'].includes(k))) {
      suggestions.add('research');
    }
    if (keywords.some(k => ['daily', 'journal', 'log'].includes(k))) {
      suggestions.add('journal');
    }
    if (keywords.some(k => ['technical', 'code', 'programming', 'api'].includes(k))) {
      suggestions.add('technical');
    }
    if (keywords.some(k => ['idea', 'brainstorm', 'concept'].includes(k))) {
      suggestions.add('ideas');
    }

    // Top keywords as potential tags
    keywords.slice(0, 3).forEach(keyword => {
      if (keyword.length > 4) {
        suggestions.add(keyword);
      }
    });

    return Array.from(suggestions);
  }

  private findPotentialLinks(text: string): string[] {
    const links: string[] = [];
    
    // Find existing WikiLinks
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
    let match;
    while ((match = wikiLinkRegex.exec(text)) !== null) {
      links.push(match[1]);
    }

    // Find potential CamelCase links
    const camelCaseRegex = /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g;
    while ((match = camelCaseRegex.exec(text)) !== null) {
      if (!links.includes(match[0])) {
        links.push(match[0]);
      }
    }

    return links;
  }

  private categorizeContent(keywords: string[], tiddler: Tiddler): string {
    // Simple rule-based categorization
    const title = tiddler.title.toLowerCase();
    
    if (title.includes('daily') || title.includes('journal')) {
      return 'journal';
    }
    if (keywords.some(k => ['project', 'task', 'milestone'].includes(k))) {
      return 'project';
    }
    if (keywords.some(k => ['research', 'study', 'paper'].includes(k))) {
      return 'research';
    }
    if (keywords.some(k => ['technical', 'code', 'api', 'function'].includes(k))) {
      return 'technical';
    }
    if (keywords.some(k => ['meeting', 'agenda', 'minutes'].includes(k))) {
      return 'meeting';
    }
    
    return 'general';
  }

  private generateSummary(text: string): string {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length === 0) return text.substring(0, 100) + '...';
    
    // Simple extractive summary - first 2 sentences
    return sentences.slice(0, 2).join(' ').trim();
  }

  findSimilarContent(tiddler: Tiddler, allTiddlers: Tiddler[]): Array<{tiddler: Tiddler; similarity: number}> {
    const sourceKeywords = new Set(this.extractKeywords(this.tokenize(
      `${tiddler.title} ${tiddler.text}`.toLowerCase()
    )));

    const similarities = allTiddlers
      .filter(t => t.title !== tiddler.title)
      .map(targetTiddler => {
        const targetKeywords = new Set(this.extractKeywords(this.tokenize(
          `${targetTiddler.title} ${targetTiddler.text}`.toLowerCase()
        )));

        // Jaccard similarity
        const intersection = new Set([...sourceKeywords].filter(x => targetKeywords.has(x)));
        const union = new Set([...sourceKeywords, ...targetKeywords]);
        const similarity = intersection.size / union.size;

        return { tiddler: targetTiddler, similarity };
      })
      .filter(result => result.similarity > 0.1)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    return similarities;
  }
}