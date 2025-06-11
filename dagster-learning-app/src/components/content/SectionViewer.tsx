import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import type { Section } from '@/types/content';
import { MarkdownRenderer } from './MarkdownRenderer';

interface SectionViewerProps {
  section: Section;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export function SectionViewer({ 
  section, 
  onPrevious, 
  onNext, 
  hasPrevious, 
  hasNext 
}: SectionViewerProps) {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Section header */}
      <div className="mb-8 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="capitalize px-3 py-1 bg-gray-100 rounded-full">
              {section.type}
            </span>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{section.estimatedMinutes} min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mb-12">
        {section.content ? (
          <MarkdownRenderer content={section.content} />
        ) : (
          <p className="text-gray-500 italic">Loading content...</p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium
            transition-all duration-200
            ${hasPrevious 
              ? 'text-primary-600 hover:bg-primary-50 hover:text-primary-700' 
              : 'text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <ChevronLeft className="h-5 w-5" />
          Previous
        </button>

        <button
          onClick={onNext}
          disabled={!hasNext}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium
            transition-all duration-200
            ${hasNext 
              ? 'bg-primary-600 text-white hover:bg-primary-700' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Next
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}