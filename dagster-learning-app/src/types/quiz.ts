export interface Quiz {
  id: string;
  title: string;
  description: string;
  passingScore: number;
  timeLimit?: number; // in minutes
  questions: Question[];
}

export type Question = 
  | MultipleChoiceQuestion 
  | TrueFalseQuestion 
  | CodeCompletionQuestion
  | MultipleSelectQuestion;

export interface BaseQuestion {
  id: string;
  points: number;
  explanation: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true-false';
  question: string;
  correctAnswer: boolean;
}

export interface CodeCompletionQuestion extends BaseQuestion {
  type: 'code-completion';
  question: string;
  codeTemplate: string;
  blanks: string[];
}

export interface MultipleSelectQuestion extends BaseQuestion {
  type: 'multiple-select';
  question: string;
  options: string[];
  correctAnswers: number[];
}

export interface QuizAttempt {
  quizId: string;
  startedAt: string;
  completedAt?: string;
  answers: Record<string, any>;
  score: number;
  passed: boolean;
}