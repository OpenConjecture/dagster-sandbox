import { useMemo } from 'react';
import { remark } from 'remark';
import html from 'remark-html';
import { CodeBlock } from '@/components/code/CodeBlock';
import { Callout } from '@/components/interactive/Callout';
import { QuickCheck } from '@/components/interactive/QuickCheck';
import { Collapsible } from '@/components/interactive/Collapsible';
import { NavigationButtons } from '@/components/interactive/NavigationButtons';

interface MarkdownRendererProps {
  content: string;
  components?: Record<string, React.ComponentType<any>>;
}

export function MarkdownRenderer({ content, components = {} }: MarkdownRendererProps) {
  const processedContent = useMemo(() => {
    // Process markdown to HTML
    const result = remark().use(html).processSync(content);
    return result.toString();
  }, [content]);

  // Parse custom components
  const renderContent = () => {
    // This is a simplified version - in production, use a proper MDX parser
    const parts = processedContent.split(/(<[A-Z]\w+[^>]*>[\s\S]*?<\/[A-Z]\w+>)/);
    
    return parts.map((part, index) => {
      // Check if this part is a custom component
      const componentMatch = part.match(/<([A-Z]\w+)([^>]*)>([\s\S]*?)<\/\1>/);
      
      if (componentMatch) {
        const [, componentName, propsString, children] = componentMatch;
        
        // Parse props (simplified)
        const props: any = {};
        const propsRegex = /(\w+)=["']([^"']+)["']/g;
        let match;
        while ((match = propsRegex.exec(propsString))) {
          props[match[1]] = match[2];
        }

        // Handle built-in components
        switch (componentName) {
          case 'CodeBlock':
            return <CodeBlock key={index} {...props} code={children.trim()} />;
          case 'Callout':
            return <Callout key={index} {...props}>{children}</Callout>;
          case 'QuickCheck':
            return <QuickCheck key={index} {...props} />;
          case 'Collapsible':
            return <Collapsible key={index} {...props}>{children}</Collapsible>;
          case 'NavigationButtons':
            return <NavigationButtons key={index} {...props} />;
          default:
            // Check custom components
            const Component = components[componentName];
            if (Component) {
              return <Component key={index} {...props}>{children}</Component>;
            }
            return <div key={index}>{part}</div>;
        }
      }

      // Regular HTML content
      return (
        <div 
          key={index} 
          className="prose prose-lg max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: part }}
        />
      );
    });
  };

  return <div>{renderContent()}</div>;
}