import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useModule } from '@/hooks/useContent';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { SectionViewer } from '@/components/content/SectionViewer';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react';

export function ModulePage() {
  const { level, moduleId } = useParams<{ level: string; moduleId: string }>();
  const navigate = useNavigate();
  const { module, loading, error } = useModule(level || '', moduleId || '');
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !module) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">
          {error?.message || 'Module not found'}
        </p>
        <button
          onClick={() => navigate('/')}
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Return to Home
        </button>
      </div>
    );
  }

  const currentSection = module.sections[currentSectionIndex];
  const percentComplete = Math.round((completedSections.size / module.sections.length) * 100);

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  };

  const handleNext = () => {
    // Mark current section as completed
    if (currentSection) {
      setCompletedSections(prev => new Set([...prev, currentSection.id]));
    }

    if (currentSectionIndex < module.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Module Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Modules
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">{module.title}</h1>
        <p className="text-lg text-gray-600 mb-4">{module.description}</p>
        
        {/* Progress bar */}
        <div className="bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
        <p className="text-sm text-gray-600">{percentComplete}% Complete</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar - Section List */}
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Sections</h3>
            <nav className="space-y-2">
              {module.sections.map((section, index) => {
                const isCompleted = completedSections.has(section.id);
                const isCurrent = index === currentSectionIndex;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setCurrentSectionIndex(index)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg text-sm
                      flex items-center gap-2 transition-all duration-200
                      ${isCurrent 
                        ? 'bg-primary-50 text-primary-700 font-medium' 
                        : 'hover:bg-gray-50 text-gray-700'
                      }
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className="truncate">{section.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Learning Objectives */}
          {module.learningObjectives.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 mt-6">
              <h4 className="font-semibold text-blue-900 mb-2">Learning Objectives</h4>
              <ul className="space-y-1">
                {module.learningObjectives.map((objective, index) => (
                  <li key={index} className="text-sm text-blue-800 flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            {currentSection && (
              <SectionViewer
                section={currentSection}
                onPrevious={handlePrevious}
                onNext={handleNext}
                hasPrevious={currentSectionIndex > 0}
                hasNext={currentSectionIndex < module.sections.length - 1}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}