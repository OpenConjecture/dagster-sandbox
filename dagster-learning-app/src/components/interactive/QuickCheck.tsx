import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface QuickCheckProps {
  question: string;
  answer: string;
}

export function QuickCheck({ question, answer }: QuickCheckProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-6 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-colors"
      >
        <span className="font-medium text-gray-900">💡 Quick Check: {question}</span>
        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
      
      {isOpen && (
        <div className="p-4 bg-white border-t border-gray-200">
          <p className="text-gray-700">{answer}</p>
        </div>
      )}
    </div>
  );
}