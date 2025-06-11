import { useState, useEffect } from 'react';
import type { Quiz, Question, QuizAttempt } from '@/types/quiz';
import { QuizQuestion } from './QuizQuestion';
import { QuizResults } from './QuizResults';
import { useProgressStore } from '@/store/progressStore';
import { Clock, AlertCircle } from 'lucide-react';

interface QuizContainerProps {
  quiz: Quiz;
  moduleId: string;
  onComplete: () => void;
}

export function QuizContainer({ quiz, moduleId, onComplete }: QuizContainerProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(quiz.timeLimit ? quiz.timeLimit * 60 : null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  
  const { setQuizScore } = useProgressStore();

  // Timer logic
  useEffect(() => {
    if (!timeRemaining || showResults) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev && prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, showResults]);

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const calculateScore = (): number => {
    let totalScore = 0;
    
    quiz.questions.forEach((question) => {
      const userAnswer = answers[question.id];
      if (!userAnswer) return;

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
            selected.length === question.correctAnswers.length &&
            selected.every((ans) => question.correctAnswers.includes(ans));
          break;
        case 'code-completion':
          const blanks = userAnswer as string[];
          correct = blanks.every((blank, i) => blank === question.blanks[i]);
          break;
      }

      if (correct) {
        totalScore += question.points;
      }
    });

    const maxScore = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    return Math.round((totalScore / maxScore) * 100);
  };

  const handleSubmit = () => {
    const score = calculateScore();
    const passed = score >= quiz.passingScore;

    const quizAttempt: QuizAttempt = {
      quizId: quiz.id,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      answers,
      score,
      passed,
    };

    setAttempt(quizAttempt);
    setQuizScore(moduleId, score);
    setShowResults(true);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showResults && attempt) {
    return (
      <QuizResults
        quiz={quiz}
        attempt={attempt}
        onRetry={() => {
          setCurrentQuestion(0);
          setAnswers({});
          setShowResults(false);
          setTimeRemaining(quiz.timeLimit ? quiz.timeLimit * 60 : null);
        }}
        onComplete={onComplete}
      />
    );
  }

  const question = quiz.questions[currentQuestion];
  const isAnswered = !!answers[question.id];

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{quiz.title}</h2>
          {timeRemaining && (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-5 w-5" />
              <span className="font-mono">{formatTime(timeRemaining)}</span>
            </div>
          )}
        </div>
        
        <p className="text-gray-600 mb-4">{quiz.description}</p>
        
        {/* Progress bar */}
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
          />
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          Question {currentQuestion + 1} of {quiz.questions.length}
        </div>
      </div>

      <QuizQuestion
        question={question}
        answer={answers[question.id]}
        onAnswer={(answer) => handleAnswer(question.id, answer)}
      />

      <div className="flex items-center justify-between mt-8">
        <button
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <div className="flex items-center gap-2">
          {!isAnswered && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Please answer before continuing</span>
            </div>
          )}
        </div>

        <button
          onClick={handleNext}
          disabled={!isAnswered}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {currentQuestion === quiz.questions.length - 1 ? 'Submit Quiz' : 'Next'}
        </button>
      </div>
    </div>
  );
}