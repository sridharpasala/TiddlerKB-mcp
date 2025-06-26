import { promises as fs } from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { Tiddler, SearchOptions, SearchResult } from '../types/tiddler.js';
import { parseTiddlerFile, serializeTiddler } from '../utils/tiddlerParser.js';

export class TiddlyWikiService {
  private tiddlersPath: string;
  private tiddlersCache: Map<string, Tiddler> = new Map();
  private watcher?: chokidar.FSWatcher;

  constructor(tiddlersPath: string) {
    this.tiddlersPath = tiddlersPath;
    this.initializeWatcher();
    this.loadTiddlers();
  }

  private async initializeWatcher() {
    this.watcher = chokidar.watch(this.tiddlersPath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('add', (filePath) => this.handleFileAdd(filePath))
      .on('change', (filePath) => this.handleFileChange(filePath))
      .on('unlink', (filePath) => this.handleFileRemove(filePath));
  }

  private async loadTiddlers() {
    try {
      await fs.mkdir(this.tiddlersPath, { recursive: true });
      const files = await fs.readdir(this.tiddlersPath);
      
      for (const file of files) {
        if (file.endsWith('.tid')) {
          const filePath = path.join(this.tiddlersPath, file);
          await this.loadTiddler(filePath);
        }
      }
    } catch (error) {
      console.error('Error loading tiddlers:', error);
    }
  }

  private async loadTiddler(filePath: string) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const tiddler = parseTiddlerFile(content);
      if (tiddler) {
        this.tiddlersCache.set(tiddler.title, tiddler);
      }
    } catch (error) {
      console.error(`Error loading tiddler from ${filePath}:`, error);
    }
  }

  private async handleFileAdd(filePath: string) {
    if (path.extname(filePath) === '.tid') {
      await this.loadTiddler(filePath);
    }
  }

  private async handleFileChange(filePath: string) {
    if (path.extname(filePath) === '.tid') {
      await this.loadTiddler(filePath);
    }
  }

  private handleFileRemove(filePath: string) {
    if (path.extname(filePath) === '.tid') {
      const title = path.basename(filePath, '.tid');
      this.tiddlersCache.delete(title);
    }
  }

  async searchTiddlers(options: SearchOptions): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchFields = options.searchIn || ['title', 'text', 'tags'];
    const query = options.caseSensitive ? options.query : options.query.toLowerCase();

    for (const tiddler of this.tiddlersCache.values()) {
      const matches: SearchResult['matches'] = [];
      let score = 0;

      for (const field of searchFields) {
        const fieldValue = this.getFieldValue(tiddler, field);
        const fieldStr = options.caseSensitive ? fieldValue : fieldValue.toLowerCase();

        if (fieldStr.includes(query)) {
          const index = fieldStr.indexOf(query);
          const start = Math.max(0, index - 50);
          const end = Math.min(fieldValue.length, index + query.length + 50);
          
          matches.push({
            field,
            snippet: fieldValue.substring(start, end),
          });

          // Simple scoring: title matches worth more
          score += field === 'title' ? 10 : 1;
        }
      }

      if (matches.length > 0) {
        results.push({ tiddler, score, matches });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Apply limit if specified
    if (options.limit && options.limit > 0) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  async createTiddler(tiddler: Tiddler): Promise<Tiddler> {
    // Add timestamps
    const now = new Date().toISOString();
    tiddler.created = tiddler.created || now;
    tiddler.modified = now;

    // Save to cache
    this.tiddlersCache.set(tiddler.title, tiddler);

    // Save to file
    const fileName = this.sanitizeFileName(tiddler.title) + '.tid';
    const filePath = path.join(this.tiddlersPath, fileName);
    const content = serializeTiddler(tiddler);
    
    await fs.writeFile(filePath, content, 'utf-8');

    return tiddler;
  }

  async updateTiddler(title: string, updates: Partial<Tiddler>): Promise<Tiddler> {
    const existing = this.tiddlersCache.get(title);
    if (!existing) {
      throw new Error(`Tiddler "${title}" not found`);
    }

    // Merge updates
    const updated = {
      ...existing,
      ...updates,
      title: existing.title, // Prevent title changes
      created: existing.created, // Preserve creation date
      modified: new Date().toISOString(),
    };

    // Update cache
    this.tiddlersCache.set(title, updated);

    // Update file
    const fileName = this.sanitizeFileName(title) + '.tid';
    const filePath = path.join(this.tiddlersPath, fileName);
    const content = serializeTiddler(updated);
    
    await fs.writeFile(filePath, content, 'utf-8');

    return updated;
  }

  async getTiddler(title: string): Promise<Tiddler | null> {
    return this.tiddlersCache.get(title) || null;
  }

  async listTiddlers(): Promise<Tiddler[]> {
    return Array.from(this.tiddlersCache.values());
  }

  private getFieldValue(tiddler: Tiddler, field: string): string {
    if (field === 'tags' && Array.isArray(tiddler.tags)) {
      return tiddler.tags.join(' ');
    }
    return String(tiddler[field] || '');
  }

  private sanitizeFileName(title: string): string {
    // Replace invalid filename characters
    return title.replace(/[<>:"/\\|?*]/g, '_');
  }

  async close() {
    if (this.watcher) {
      await this.watcher.close();
    }
  }
}