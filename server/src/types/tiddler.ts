export interface Tiddler {
  title: string;
  text: string;
  tags?: string[];
  created?: string;
  modified?: string;
  type?: string;
  [key: string]: any; // Support for custom fields
}

export interface TiddlerMetadata {
  title: string;
  tags?: string[];
  created?: string;
  modified?: string;
  type?: string;
}

export interface SearchOptions {
  query: string;
  searchIn?: ('title' | 'text' | 'tags')[];
  limit?: number;
  caseSensitive?: boolean;
}

export interface SearchResult {
  tiddler: Tiddler;
  score: number;
  matches: {
    field: string;
    snippet: string;
  }[];
}