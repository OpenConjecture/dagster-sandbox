import type { Quiz, QuizAttempt } from '@/types/quiz';
import { CheckCircle, XCircle, RefreshCw, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

interface QuizResultsProps {
  quiz: Quiz;
  attempt: QuizAttempt;
  onRetry: () => void;
  onComplete: () => void;
}

export function QuizResults({ quiz, attempt, onRetry, onComplete }: QuizResultsProps) {
  const getQuestionResult = (questionId: string) => {
    const question = quiz.questions.find(q => q.id === questionId);
    if (!question) return { correct: false, userAnswer: null };

    const userAnswer = attempt.answers[questionId];
    let correct = false;

    switch (question.type) {
      case 'multiple-choice':
        correct = userAnswer === question.correctAnswer;
        break;
      case 'true-false':
        correct = userAnswer === question.correctAnswer;
        break;
      case 'multiple-select':
        const selected = userAnswer as number[];
        correct = 
          selected?.length === question.correctAnswers.length &&
          selected.every((ans) => question.correctAnswers.includes(ans));
        break;
      case 'code-completion':
        const blanks = userAnswer as string[];
        correct = blanks?.every((blank, i) => blank === question.blanks[i]);
        break;
    }

    return { correct, userAnswer };
  };

  const correctAnswers = quiz.questions.filter(q => 
    getQuestionResult(q.id).correct
  ).length;

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className={clsx(
          'w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center',
          attempt.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        )}>
          {attempt.passed ? (
            <CheckCircle className="w-8 h-8" />
          ) : (
            <XCircle className="w-8 h-8" />
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {attempt.passed ? 'Congratulations!' : 'Keep Learning!'}
        </h2>
        
        <p className="text-gray-600 mb-4">
          {attempt.passed 
            ? `You passed the ${quiz.title} with a score of ${attempt.score}%`
            : `You scored ${attempt.score}%. You need ${quiz.passingScore}% to pass.`
          }
        </p>

        <div className="flex justify-center items-center gap-4 text-sm text-gray-500">
          <span>{correctAnswers} of {quiz.questions.length} correct</span>
          <span>•</span>
          <span>{attempt.score}%</span>
        </div>
      </div>

      {/* Question Breakdown */}
      <div className="space-y-4 mb-8">
        <h3 className="text-lg font-medium text-gray-900">Question Breakdown</h3>
        {quiz.questions.map((question, index) => {
          const result = getQuestionResult(question.id);
          return (
            <div
              key={question.id}
              className={clsx(
                'p-4 rounded-lg border',
                result.correct 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-red-200 bg-red-50'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={clsx(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                  result.correct ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                )}>
                  {result.correct ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                </div>
                
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-2">
                    Question {index + 1}: {question.question}
                  </p>
                  
                  {!result.correct && (
                    <div className="text-sm">
                      <p className="text-gray-700 mb-1">
                        <span className="font-medium">Explanation:</span> {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-gray-500">
                  {question.points} pts
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        {!attempt.passed && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Quiz
          </button>
        )}
        
        <button
          onClick={onComplete}
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          {attempt.passed ? 'Continue Learning' : 'Continue Anyway'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}