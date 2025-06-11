import { useState } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { Check, Copy } from 'lucide-react';
import clsx from 'clsx';
import { usePreferencesStore } from '@/store/preferencesStore';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
}

export function CodeBlock({ 
  code, 
  language = 'python', 
  filename,
  showLineNumbers = true,
  highlightLines = []
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { preferences } = usePreferencesStore();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const theme = preferences.codeTheme === 'vs-dark' ? themes.vsDark : themes.github;

  return (
    <div className="relative group my-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      {filename && (
        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm">
          <span className="font-mono text-gray-700 dark:text-gray-300">{filename}</span>
          <span className="text-gray-500 dark:text-gray-400">{language}</span>
        </div>
      )}
      
      <div className="relative">
        <Highlight theme={theme} code={code.trim()} language={language}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre 
              className={clsx(
                className,
                'overflow-x-auto p-4 text-sm',
                preferences.fontSize === 'small' && 'text-xs',
                preferences.fontSize === 'large' && 'text-base'
              )} 
              style={style}
            >
              {tokens.map((line, i) => (
                <div
                  key={i}
                  {...getLineProps({ line })}
                  className={clsx(
                    'table-row',
                    highlightLines.includes(i + 1) && 'bg-yellow-100 dark:bg-yellow-900/20'
                  )}
                >
                  {showLineNumbers && (
                    <span className="table-cell select-none pr-4 text-gray-500 text-right">
                      {i + 1}
                    </span>
                  )}
                  <span className="table-cell">
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              ))}
            </pre>
          )}
        </Highlight>
        
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-2 rounded-md bg-gray-800 bg-opacity-50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}