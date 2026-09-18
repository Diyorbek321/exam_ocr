import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { ExamsList } from './pages/ExamsList';
import { ExamDetail } from './pages/ExamDetail';
import { StudentsList } from './pages/StudentsList';
import { ManualEntry } from './pages/ManualEntry';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    // Check hash first (e.g. #/exams/1?tab=key) then pathname
    const hash = window.location.hash.replace(/^#/, '');
    if (hash && hash.startsWith('/')) {
      return hash;
    }
    return window.location.pathname + window.location.search;
  });

  const navigate = useCallback((route: string) => {
    // If inside preview iframe, updating hash gives reliable back/forward and persistence
    if (window.location.hash !== '#' + route) {
      window.location.hash = route;
    }
    try {
      window.history.pushState(null, '', '#' + route);
    } catch {
      // ignore
    }
    setCurrentPath((prev) => (prev !== route ? route : prev));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handleUrlChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      const next = (hash && hash.startsWith('/'))
        ? hash
        : window.location.pathname + window.location.search;
      setCurrentPath((prev) => (prev !== next ? next : prev));
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Parse route
  const cleanPath = currentPath.split('?')[0] || '/';
  const searchParams = new URLSearchParams(currentPath.includes('?') ? currentPath.split('?')[1] : '');

  // Route matching:
  // 1. /exams/:id/manual/:registrationId
  const manualMatch = cleanPath.match(/^\/exams\/(\d+)\/manual\/(\d+)$/);
  // 2. /exams/:id
  const examDetailMatch = cleanPath.match(/^\/exams\/(\d+)$/);
  // 3. /students
  const isStudents = cleanPath === '/students';

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
        <Navbar currentRoute={cleanPath} navigate={navigate} />

        <main className="flex-1 pb-16">
          {manualMatch ? (
            <ManualEntry
              examId={parseInt(manualMatch[1], 10)}
              registrationId={parseInt(manualMatch[2], 10)}
              navigate={navigate}
            />
          ) : examDetailMatch ? (
            <ExamDetail
              examId={parseInt(examDetailMatch[1], 10)}
              activeTab={searchParams.get('tab') || 'key'}
              navigate={navigate}
            />
          ) : isStudents ? (
            <StudentsList />
          ) : (
            <ExamsList navigate={navigate} />
          )}
        </main>
      </div>
    </ToastProvider>
  );
}
