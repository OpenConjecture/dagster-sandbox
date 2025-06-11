import { useEffect, useState } from 'react';
import { remark } from 'remark';
import html from 'remark-html';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-json';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    async function processMarkdown() {
      const result = await remark()
        .use(html, { sanitize: false })
        .process(content);
      
      setHtmlContent(result.toString());
    }

    processMarkdown();
  }, [content]);

  useEffect(() => {
    // Highlight code blocks after content is rendered
    if (htmlContent) {
      Prism.highlightAll();
    }
  }, [htmlContent]);

  return (
    <div 
      className="prose prose-lg max-w-none prose-headings:font-semibold prose-code:font-mono prose-code:text-sm prose-pre:bg-gray-900"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}