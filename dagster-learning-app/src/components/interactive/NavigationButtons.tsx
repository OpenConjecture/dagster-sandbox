import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NavigationButtonsProps {
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  nextLabel?: string;
  previousLabel?: string;
}

export function NavigationButtons({
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  nextLabel = 'Next',
  previousLabel = 'Previous'
}: NavigationButtonsProps) {
  return (
    <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
      <div>
        {hasPrevious && onPrevious ? (
          <button
            onClick={onPrevious}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {previousLabel}
          </button>
        ) : (
          <div></div>
        )}
      </div>

      <div>
        {hasNext && onNext ? (
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            {nextLabel}
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <div></div>
        )}
      </div>
    </div>
  );
}