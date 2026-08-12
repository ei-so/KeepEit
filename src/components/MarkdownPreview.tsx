import React from 'react';

interface MarkdownPreviewProps {
  content: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  if (!content || !content.trim()) {
    return (
      <div className="text-xs text-[var(--text-muted)] italic p-4">
        (Empty note content)
      </div>
    );
  }

  // Parse inline elements (bold, italic, strikethrough, inline code, links)
  const parseInline = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let keyIndex = 0;

    // Pattern matching regex for inline markdown
    // 1: Bold **text**
    // 2: Italic *text*
    // 3: Strikethrough ~~text~~
    // 4: Inline Code `code`
    // 5: Link [label](url)
    const regex = /(\*\*(.*?)\*\*|\*(.*?)\*|~~(.*?)~~|`(.*?)`|\[(.*?)\]\((.*?)\))/g;

    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(text.substring(lastIndex, match.index));
      }

      if (match[2] !== undefined) {
        // Bold
        nodes.push(
          <strong key={keyIndex++} className="font-bold text-[var(--text-primary)]">
            {match[2]}
          </strong>
        );
      } else if (match[3] !== undefined) {
        // Italic
        nodes.push(
          <em key={keyIndex++} className="italic text-[var(--text-primary)]">
            {match[3]}
          </em>
        );
      } else if (match[4] !== undefined) {
        // Strikethrough
        nodes.push(
          <del key={keyIndex++} className="line-through text-[var(--text-muted)]">
            {match[4]}
          </del>
        );
      } else if (match[5] !== undefined) {
        // Inline Code
        nodes.push(
          <code
            key={keyIndex++}
            className="px-1.5 py-0.5 rounded-keepeit bg-[var(--bg-surface)] border-keepeit font-mono text-[11px] text-[var(--accent-seal)]"
          >
            {match[5]}
          </code>
        );
      } else if (match[6] !== undefined && match[7] !== undefined) {
        // Link
        const href = match[7].startsWith('http') ? match[7] : `https://${match[7]}`;
        nodes.push(
          <a
            key={keyIndex++}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent-seal)] underline hover:opacity-80 transition-opacity"
          >
            {match[6]}
          </a>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      nodes.push(text.substring(lastIndex));
    }

    return nodes;
  };

  // Block level parser
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced Code Block start/end
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <div key={`codeblock-${i}`} className="my-3">
            {codeBlockLang && (
              <span className="text-[9px] font-mono-label text-[var(--text-muted)] uppercase block mb-1">
                {codeBlockLang}
              </span>
            )}
            <pre className="p-3 bg-[var(--bg-surface)] border-keepeit rounded-keepeit font-mono text-xs overflow-x-auto text-[var(--text-primary)] leading-relaxed">
              <code>{codeBlockLines.join('\n')}</code>
            </pre>
          </div>
        );
        codeBlockLines = [];
        codeBlockLang = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().replace(/^```/, '');
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h1
          key={`h1-${i}`}
          className="font-display font-bold text-xl text-[var(--text-primary)] mt-5 mb-2 pb-1 border-b border-keepeit"
        >
          {parseInline(line.replace(/^#\s+/, ''))}
        </h1>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="font-display font-bold text-lg text-[var(--text-primary)] mt-4 mb-2">
          {parseInline(line.replace(/^##\s+/, ''))}
        </h2>
      );
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="font-display font-bold text-base text-[var(--text-primary)] mt-3 mb-1.5">
          {parseInline(line.replace(/^###\s+/, ''))}
        </h3>
      );
      continue;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`bq-${i}`}
          className="border-l-3 border-[var(--accent-seal)] pl-3.5 py-1.5 my-2.5 italic text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] rounded-r-keepeit"
        >
          {parseInline(line.replace(/^>\s+/, ''))}
        </blockquote>
      );
      continue;
    }

    // Unordered List (- or *)
    if (line.match(/^[\-\*]\s+/)) {
      elements.push(
        <div key={`ul-${i}`} className="flex items-start gap-2 my-1 pl-2 text-xs">
          <span className="text-[var(--accent-seal)] font-bold shrink-0 mt-0.5">•</span>
          <span className="text-[var(--text-primary)] leading-relaxed">
            {parseInline(line.replace(/^[\-\*]\s+/, ''))}
          </span>
        </div>
      );
      continue;
    }

    // Ordered List (1. 2. etc)
    const numMatch = line.match(/^(\d+)\.\s+/);
    if (numMatch) {
      elements.push(
        <div key={`ol-${i}`} className="flex items-start gap-2 my-1 pl-2 text-xs">
          <span className="font-mono text-[var(--accent-seal)] font-semibold shrink-0 text-[11px] mt-0.5">
            {numMatch[1]}.
          </span>
          <span className="text-[var(--text-primary)] leading-relaxed">
            {parseInline(line.replace(/^(\d+)\.\s+/, ''))}
          </span>
        </div>
      );
      continue;
    }

    // Empty Line
    if (!line.trim()) {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
      continue;
    }

    // Normal Paragraph
    elements.push(
      <p key={`p-${i}`} className="text-xs text-[var(--text-primary)] leading-relaxed my-1.5">
        {parseInline(line)}
      </p>
    );
  }

  // Handle unclosed code block if any
  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <pre key="unclosed-code" className="p-3 bg-[var(--bg-surface)] border-keepeit rounded-keepeit font-mono text-xs text-[var(--text-primary)]">
        <code>{codeBlockLines.join('\n')}</code>
      </pre>
    );
  }

  return <div className="space-y-1 font-sans selection:bg-[var(--accent-seal-soft)]">{elements}</div>;
};
