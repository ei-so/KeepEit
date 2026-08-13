/**
 * Helper utilities for backward compatibility between Markdown and Visual Rich Text (HTML)
 */

export function isHtmlContent(content: string): boolean {
  if (!content) return false;
  return (
    /<\/(p|h[1-6]|ul|ol|li|div|strong|b|em|i|blockquote|code|pre|a|span|del|s)>/i.test(content) ||
    /<(br|hr)\s*\/?>/i.test(content)
  );
}

export function markdownToHtml(md: string): string {
  if (!md) return '';
  if (isHtmlContent(md)) return md;

  const lines = md.split('\n');
  let html = '';
  let inUl = false;
  let inOl = false;

  const parseInline = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Bullet List (- or *)
    if (line.match(/^[\-\*]\s+/)) {
      if (inOl) {
        html += '</ol>';
        inOl = false;
      }
      if (!inUl) {
        html += '<ul>';
        inUl = true;
      }
      html += `<li>${parseInline(line.replace(/^[\-\*]\s+/, ''))}</li>`;
      continue;
    } else if (inUl) {
      html += '</ul>';
      inUl = false;
    }

    // Numbered List (1. 2.)
    const numMatch = line.match(/^(\d+)\.\s+/);
    if (numMatch) {
      if (inUl) {
        html += '</ul>';
        inUl = false;
      }
      if (!inOl) {
        html += '<ol>';
        inOl = true;
      }
      html += `<li>${parseInline(line.replace(/^(\d+)\.\s+/, ''))}</li>`;
      continue;
    } else if (inOl) {
      html += '</ol>';
      inOl = false;
    }

    // Headings
    if (line.startsWith('# ')) {
      html += `<h1>${parseInline(line.replace(/^#\s+/, ''))}</h1>`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${parseInline(line.replace(/^##\s+/, ''))}</h2>`;
    } else if (line.startsWith('### ')) {
      html += `<h3>${parseInline(line.replace(/^###\s+/, ''))}</h3>`;
    } else if (line.startsWith('> ')) {
      html += `<blockquote>${parseInline(line.replace(/^>\s+/, ''))}</blockquote>`;
    } else if (!line.trim()) {
      if (html.length > 0 && !html.endsWith('<p><br></p>')) {
        html += '<p><br></p>';
      }
    } else {
      html += `<p>${parseInline(line)}</p>`;
    }
  }

  if (inUl) html += '</ul>';
  if (inOl) html += '</ol>';

  return html;
}

export function stripHtmlAndMarkdown(content: string): string {
  if (!content) return 'No content';
  const plain = content.replace(/<[^>]*>/g, ' ');
  const firstLine = plain.split('\n').find((l) => l.trim().length > 0) || '';
  return (
    firstLine
      .replace(/^#+\s*/, '')
      .replace(/^[\-\*]\s*/, '')
      .replace(/^\d+\.\s*/, '')
      .replace(/^>\s*/, '')
      .replace(/`{1,3}/g, '')
      .replace(/\*\*|\*|~~/g, '')
      .replace(/\s+/g, ' ')
      .trim() || 'No content'
  );
}
