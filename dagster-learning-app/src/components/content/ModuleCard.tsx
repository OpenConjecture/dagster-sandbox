import { Clock, Lock, CheckCircle, BookOpen } from 'lucide-react';
import type { Module, ModuleProgress } from '@/types/content';

interface ModuleCardProps {
  module: Module;
  progress?: ModuleProgress;
  isLocked?: boolean;
  onClick: () => void;
}

export function ModuleCard({ module, progress, isLocked = false, onClick }: ModuleCardProps) {
  const percentComplete = progress 
    ? Math.round((progress.completedSections.length / module.sections.length) * 100)
    : 0;

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border-2 p-6 
        transition-all duration-200 cursor-pointer
        ${isLocked 
          ? 'border-gray-200 bg-gray-50 opacity-60' 
          : 'border-blue-200 bg-white hover:shadow-lg hover:scale-105'
        }
      `}
      onClick={!isLocked ? onClick : undefined}
    >
      {/* Progress indicator */}
      <div 
        className="absolute top-0 left-0 h-1 bg-primary-500 transition-all duration-300"
        style={{ width: `${percentComplete}%` }} 
      />
      
      {/* Lock overlay */}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
          <Lock className="h-12 w-12 text-gray-400" />
        </div>
      )}
      
      {/* Content */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            {module.title}
          </h3>
          {percentComplete === 100 && (
            <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
          )}
        </div>
        
        <p className="text-gray-600 line-clamp-2">
          {module.description}
        </p>
        
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{module.estimatedHours}h</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>{module.sections.length} sections</span>
          </div>
        </div>
        
        {/* Progress bar */}
        {!isLocked && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium text-gray-900">{percentComplete}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
              <div 
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-300"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}