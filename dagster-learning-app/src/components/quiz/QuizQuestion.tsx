import type { Question } from '@/types/quiz';
import clsx from 'clsx';

interface QuizQuestionProps {
  question: Question;
  answer: any;
  onAnswer: (answer: any) => void;
}

export function QuizQuestion({ question, answer, onAnswer }: QuizQuestionProps) {
  switch (question.type) {
    case 'multiple-choice':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">{question.question}</h3>
          <div className="space-y-2">
            {question.options.map((option, index) => (
              <label
                key={index}
                className={clsx(
                  'flex items-center p-4 rounded-lg border cursor-pointer transition-all',
                  answer === index
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={index}
                  checked={answer === index}
                  onChange={() => onAnswer(index)}
                  className="sr-only"
                />
                <div className={clsx(
                  'w-4 h-4 rounded-full border-2 mr-3 flex-shrink-0',
                  answer === index
                    ? 'border-primary-500 bg-primary-500'
                    : 'border-gray-300'
                )}>
                  {answer === index && (
                    <div className="w-full h-full rounded-full bg-white scale-50" />
                  )}
                </div>
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        </div>
      );

    case 'true-false':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">{question.question}</h3>
          <div className="flex gap-4">
            {[true, false].map((value) => (
              <button
                key={value.toString()}
                onClick={() => onAnswer(value)}
                className={clsx(
                  'flex-1 py-3 px-6 rounded-lg font-medium transition-all',
                  answer === value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {value ? 'True' : 'False'}
              </button>
            ))}
          </div>
        </div>
      );

    case 'multiple-select':
      const selectedAnswers = answer || [];
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">{question.question}</h3>
          <p className="text-sm text-gray-600">Select all that apply</p>
          <div className="space-y-2">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswers.includes(index);
              return (
                <label
                  key={index}
                  className={clsx(
                    'flex items-center p-4 rounded-lg border cursor-pointer transition-all',
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      const newAnswers = isSelected
                        ? selectedAnswers.filter((a: number) => a !== index)
                        : [...selectedAnswers, index];
                      onAnswer(newAnswers);
                    }}
                    className="sr-only"
                  />
                  <div className={clsx(
                    'w-4 h-4 rounded border-2 mr-3 flex-shrink-0 flex items-center justify-center',
                    isSelected
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300'
                  )}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className="text-gray-700">{option}</span>
                </label>
              );
            })}
          </div>
        </div>
      );

    case 'code-completion':
      const blanksAnswers = answer || new Array(question.blanks.length).fill('');
      const parts = question.codeTemplate.split('___');
      
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">{question.question}</h3>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
            {parts.map((part, index) => (
              <span key={index}>
                {part}
                {index < parts.length - 1 && (
                  <input
                    type="text"
                    value={blanksAnswers[index] || ''}
                    onChange={(e) => {
                      const newAnswers = [...blanksAnswers];
                      newAnswers[index] = e.target.value;
                      onAnswer(newAnswers);
                    }}
                    className="inline-block mx-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-primary-400 font-mono"
                    style={{ width: `${Math.max(8, (blanksAnswers[index]?.length || 8) + 2)}ch` }}
                  />
                )}
              </span>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}