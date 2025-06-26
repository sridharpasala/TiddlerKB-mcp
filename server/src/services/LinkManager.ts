import { Tiddler } from '../types/tiddler.js';

export interface Link {
  from: string;
  to: string;
  type: 'explicit' | 'implicit' | 'suggested';
}

export interface LinkAnalysis {
  outgoingLinks: string[];
  incomingLinks: string[];
  brokenLinks: string[];
  suggestedLinks: string[];
  orphanedTiddlers: string[];
}

export class LinkManager {
  private linkGraph: Map<string, Set<string>> = new Map();
  private backlinks: Map<string, Set<string>> = new Map();

  buildLinkGraph(tiddlers: Tiddler[]): void {
    // Clear existing graph
    this.linkGraph.clear();
    this.backlinks.clear();

    // Build forward and backward links
    for (const tiddler of tiddlers) {
      if (!tiddler.title) continue; // Skip tiddlers without titles
      const links = this.extractLinks(tiddler.text || '');
      this.linkGraph.set(tiddler.title, new Set(links));

      // Build backlinks
      for (const link of links) {
        if (!this.backlinks.has(link)) {
          this.backlinks.set(link, new Set());
        }
        this.backlinks.get(link)!.add(tiddler.title);
      }
    }
  }

  private extractLinks(text: string): string[] {
    const links: string[] = [];
    
    // Handle null or undefined text
    if (!text || typeof text !== 'string') {
      return links;
    }
    
    // Extract [[WikiLinks]]
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
    let match;
    while ((match = wikiLinkRegex.exec(text)) !== null) {
      links.push(match[1]);
    }

    // Extract CamelCase links (optional, TiddlyWiki classic style)
    const camelCaseRegex = /\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b/g;
    while ((match = camelCaseRegex.exec(text)) !== null) {
      // Only add if it looks like a tiddler reference
      if (!links.includes(match[1]) && !this.isCommonCamelCase(match[1])) {
        links.push(match[1]);
      }
    }

    return [...new Set(links)]; // Remove duplicates
  }

  private isCommonCamelCase(word: string): boolean {
    const common = ['JavaScript', 'TypeScript', 'GitHub', 'TiddlyWiki', 'YouTube', 'LinkedIn'];
    return common.includes(word);
  }

  analyzeTiddlerLinks(tiddlerTitle: string, allTiddlers: Map<string, Tiddler>): LinkAnalysis {
    const outgoingLinks = Array.from(this.linkGraph.get(tiddlerTitle) || []);
    const incomingLinks = Array.from(this.backlinks.get(tiddlerTitle) || []);
    
    // Find broken links
    const brokenLinks = outgoingLinks.filter(link => !allTiddlers.has(link));
    
    // Find orphaned tiddlers (no incoming links)
    const orphanedTiddlers = Array.from(allTiddlers.keys()).filter(title => {
      const incoming = this.backlinks.get(title);
      return (!incoming || incoming.size === 0) && title !== tiddlerTitle;
    });

    // Suggest links based on content similarity
    const tiddler = allTiddlers.get(tiddlerTitle);
    const suggestedLinks = tiddler ? this.suggestLinks(tiddler, allTiddlers) : [];

    return {
      outgoingLinks,
      incomingLinks,
      brokenLinks,
      suggestedLinks,
      orphanedTiddlers: orphanedTiddlers.slice(0, 10) // Limit to 10
    };
  }

  private suggestLinks(tiddler: Tiddler, allTiddlers: Map<string, Tiddler>): string[] {
    const suggestions: string[] = [];
    const tiddlerText = tiddler.text || '';
    const tiddlerWords = this.extractKeywords(tiddlerText.toLowerCase());
    const existingLinks = this.extractLinks(tiddlerText);

    for (const [title, otherTiddler] of allTiddlers.entries()) {
      if (title === tiddler.title || existingLinks.includes(title)) continue;

      // Check if title appears in text but isn't linked
      if (tiddlerText.toLowerCase().includes(title.toLowerCase())) {
        suggestions.push(title);
        continue;
      }

      // Check for keyword overlap
      const otherWords = this.extractKeywords((otherTiddler.text || '').toLowerCase());
      const overlap = tiddlerWords.filter(w => otherWords.includes(w)).length;
      
      if (overlap > 3) { // Arbitrary threshold
        suggestions.push(title);
      }
    }

    return suggestions.slice(0, 5); // Limit suggestions
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an']);
    return text
      .split(/\W+/)
      .filter(word => word.length > 3 && !stopWords.has(word));
  }

  createLink(text: string, link: string): string {
    // Check if link already exists
    if (text.includes(`[[${link}]]`)) {
      return text;
    }

    // Find the link text in the content (case-insensitive)
    const regex = new RegExp(`\\b${link}\\b`, 'gi');
    return text.replace(regex, (match) => `[[${match}]]`);
  }

  removeLink(text: string, link: string): string {
    // Remove [[link]] format
    return text.replace(new RegExp(`\\[\\[${link}\\]\\]`, 'g'), link);
  }

  getConnectionStrength(title1: string, title2: string): number {
    const links1to2 = this.linkGraph.get(title1)?.has(title2) ? 1 : 0;
    const links2to1 = this.linkGraph.get(title2)?.has(title1) ? 1 : 0;
    
    // Bidirectional links are stronger
    return links1to2 + links2to1;
  }

  findPath(from: string, to: string): string[] | null {
    // Simple BFS to find path between tiddlers
    const visited = new Set<string>();
    const queue: Array<{node: string; path: string[]}> = [{node: from, path: [from]}];

    while (queue.length > 0) {
      const {node, path} = queue.shift()!;
      
      if (node === to) {
        return path;
      }

      if (visited.has(node)) continue;
      visited.add(node);

      const links = this.linkGraph.get(node);
      if (links) {
        for (const link of links) {
          queue.push({node: link, path: [...path, link]});
        }
      }
    }

    return null; // No path found
  }
}