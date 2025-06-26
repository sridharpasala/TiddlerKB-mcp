import { Tiddler } from '../types/tiddler.js';

export function parseTiddlerFile(content: string): Tiddler | null {
  const lines = content.split('\n');
  const tiddler: Partial<Tiddler> = {};
  let headerEnd = -1;

  // Parse header fields
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Empty line marks end of header
    if (line.trim() === '') {
      headerEnd = i;
      break;
    }

    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const field = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      if (field === 'tags') {
        // Parse tags - handle both bracketed and space-separated
        tiddler.tags = parseTags(value);
      } else {
        tiddler[field] = value;
      }
    }
  }

  // The rest is the text content
  if (headerEnd >= 0) {
    tiddler.text = lines.slice(headerEnd + 1).join('\n').trim();
  }

  // Title is required
  if (!tiddler.title) {
    return null;
  }

  return tiddler as Tiddler;
}

export function serializeTiddler(tiddler: Tiddler): string {
  const lines: string[] = [];

  // Add title first
  lines.push(`title: ${tiddler.title}`);

  // Add other fields
  const fieldOrder = ['created', 'modified', 'tags', 'type'];
  
  for (const field of fieldOrder) {
    if (field in tiddler && tiddler[field] !== undefined) {
      if (field === 'tags' && Array.isArray(tiddler.tags)) {
        const tagStr = tiddler.tags
          .map(tag => tag.includes(' ') ? `[[${tag}]]` : tag)
          .join(' ');
        lines.push(`tags: ${tagStr}`);
      } else {
        lines.push(`${field}: ${tiddler[field]}`);
      }
    }
  }

  // Add custom fields
  for (const [field, value] of Object.entries(tiddler)) {
    if (!['title', 'text', ...fieldOrder].includes(field) && value !== undefined) {
      lines.push(`${field}: ${value}`);
    }
  }

  // Add empty line to separate header from text
  lines.push('');

  // Add text content
  if (tiddler.text) {
    lines.push(tiddler.text);
  }

  return lines.join('\n');
}

function parseTags(tagString: string): string[] {
  const tags: string[] = [];
  const regex = /\[\[([^\]]+)\]\]|(\S+)/g;
  let match;

  while ((match = regex.exec(tagString)) !== null) {
    if (match[1]) {
      // Bracketed tag
      tags.push(match[1]);
    } else if (match[2]) {
      // Non-bracketed tag
      tags.push(match[2]);
    }
  }

  return tags;
}