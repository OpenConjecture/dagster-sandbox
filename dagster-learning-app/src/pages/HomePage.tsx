import { useNavigate } from 'react-router-dom';
import { useCurriculum } from '@/hooks/useContent';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ModuleCard } from '@/components/content/ModuleCard';
import { Sparkles, Target, Clock } from 'lucide-react';

// Mock module data - in real app this would come from the API
const mockModules = [
  {
    id: '01-fundamentals',
    level: 'beginner',
    title: 'Dagster Fundamentals',
    description: 'Learn the core concepts of Dagster including assets, ops, jobs, and schedules.',
    estimatedHours: 4,
    prerequisites: [],
    learningObjectives: [
      'Understand Dagster\'s core concepts',
      'Build your first pipeline',
      'Work with assets and ops'
    ],
    sections: [
      {
        id: '01-introduction',
        title: 'Introduction to Dagster',
        type: 'theory' as const,
        estimatedMinutes: 30,
        file: 'sections/01-introduction.md'
      },
      {
        id: '02-core-concepts',
        title: 'Core Concepts',
        type: 'theory' as const,
        estimatedMinutes: 45,
        file: 'sections/02-core-concepts.md'
      }
    ]
  },
  {
    id: '02-working-with-assets',
    level: 'beginner',
    title: 'Working with Software-Defined Assets',
    description: 'Master Dagster\'s software-defined assets to build maintainable data pipelines.',
    estimatedHours: 6,
    prerequisites: ['01-fundamentals'],
    learningObjectives: [
      'Define and materialize assets',
      'Create asset dependencies',
      'Use asset groups and partitions'
    ],
    sections: []
  }
];

export function HomePage() {
  const { curriculum, loading, error } = useCurriculum();
  const navigate = useNavigate();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    console.warn('Error loading curriculum, using fallback data:', error);
  }

  const handleModuleClick = (level: string, moduleId: string) => {
    navigate(`/modules/${level}/${moduleId}`);
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12 bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-primary-600 rounded-2xl flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Master Dagster Step by Step
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Interactive learning platform for building modern data pipelines with Dagster
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <Target className="h-5 w-5 text-primary-600" />
              <span>Hands-on Projects</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="h-5 w-5 text-primary-600" />
              <span>Self-Paced Learning</span>
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum Overview */}
      <section>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Learning Path</h2>
          <p className="text-gray-600">
            Start with the fundamentals and progress through advanced topics
          </p>
        </div>

        {curriculum?.levels.map((level) => (
          <div key={level.id} className="mb-10">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2 capitalize">
                {level.title}
              </h3>
              <p className="text-gray-600">{level.description}</p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {mockModules
                .filter(module => module.level === level.id)
                .map((module, index) => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    isLocked={index > 0 && module.prerequisites.length > 0}
                    onClick={() => handleModuleClick(level.id, module.id)}
                  />
                ))}
            </div>
          </div>
        )) || (
          // Fallback UI when curriculum is not loaded
          <div className="mb-10">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2 capitalize">
                Beginner Track
              </h3>
              <p className="text-gray-600">Start your Dagster journey from the basics</p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {mockModules.map((module, index) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  isLocked={index > 0 && module.prerequisites.length > 0}
                  onClick={() => handleModuleClick('beginner', module.id)}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}