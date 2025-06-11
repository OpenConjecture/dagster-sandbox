import { AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

interface CalloutProps {
  type: 'info' | 'warning' | 'tip' | 'error';
  children: React.ReactNode;
}

export function Callout({ type, children }: CalloutProps) {
  const icons = {
    info: <Info className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    tip: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
  };

  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    tip: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div className={clsx(
      'my-4 p-4 border rounded-lg flex gap-3',
      styles[type]
    )}>
      <div className="flex-shrink-0 mt-0.5">
        {icons[type]}
      </div>
      <div className="flex-1 text-sm">
        {children}
      </div>
    </div>
  );
}