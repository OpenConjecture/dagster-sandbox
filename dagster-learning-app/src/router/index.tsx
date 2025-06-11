import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { HomePage } from '@/pages/HomePage';
import { ModulePage } from '@/pages/ModulePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell><HomePage /></AppShell>,
  },
  {
    path: '/modules',
    element: <AppShell><HomePage /></AppShell>,
  },
  {
    path: '/modules/:level/:moduleId',
    element: <AppShell><ModulePage /></AppShell>,
  },
]);