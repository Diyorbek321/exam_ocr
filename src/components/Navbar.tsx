import React, { useState, useEffect } from 'react';
import {
  FileText,
  Users,
  Moon,
  Sun,
  Server,
  CheckCircle2,
  AlertCircle,
  Settings,
  X,
} from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl } from '../api';
import { useToast } from '../context/ToastContext';

interface NavbarProps {
  currentRoute: string;
  navigate: (route: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRoute, navigate }) => {
  const toast = useToast();
  const [isDark, setIsDark] = useState<boolean>(() => {
    return (
      localStorage.getItem('exam_ocr_theme') === 'dark' ||
      (!('exam_ocr_theme' in localStorage) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  const [showApiModal, setShowApiModal] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(getApiBaseUrl());
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('exam_ocr_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('exam_ocr_theme', 'light');
    }
  }, [isDark]);

  // Check API health / connectivity
  const checkHealth = async (urlToCheck?: string) => {
    setApiStatus('checking');
    const target = (urlToCheck || getApiBaseUrl()).replace(/\/+$/, '');
    try {
      // Try fetching /api/exams or root with a short timeout
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 3500);
      const res = await fetch(`${target}/api/exams`, { signal: ctrl.signal });
      clearTimeout(timeout);
      if (res.ok || res.status === 200 || res.status === 401 || res.status === 403) {
        setApiStatus('online');
      } else {
        setApiStatus('offline');
      }
    } catch {
      setApiStatus('offline');
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(() => checkHealth(), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(apiUrlInput);
    setShowApiModal(false);
    toast.success('API manzili yangilandi', apiUrlInput);
    checkHealth(apiUrlInput);
    // Reload data by triggering hashchange or event
    window.dispatchEvent(new Event('exam_ocr_api_changed'));
  };

  const isExamsActive = currentRoute === '/' || currentRoute.startsWith('/exams');
  const isStudentsActive = currentRoute === '/students';

  return (
    <>
      <header
        id="app-header"
        className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-600/20 group-hover:bg-indigo-700 transition">
                EO
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg text-slate-900 dark:text-slate-50 tracking-tight font-mono">
                    exam_ocr
                  </span>
                  <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                    Boshqaruv
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  Qog'oz imtihonlarni avtomatlashtirilgan baholash
                </p>
              </div>
            </button>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-1.5 ml-4">
              <button
                id="nav-exams-btn"
                onClick={() => navigate('/')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  isExamsActive
                    ? 'bg-slate-100 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60'
                }`}
              >
                <FileText className="w-4 h-4" />
                Imtihonlar
              </button>

              <button
                id="nav-students-btn"
                onClick={() => navigate('/students')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  isStudentsActive
                    ? 'bg-slate-100 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-4 h-4" />
                O'quvchilar bazasi
              </button>
            </nav>
          </div>

          {/* Right actions: Backend status, Dark mode */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* API Connection Indicator */}
            <button
              id="api-status-badge"
              onClick={() => {
                setApiUrlInput(getApiBaseUrl());
                setShowApiModal(true);
              }}
              title="API server sozlamalari va holati"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <Server className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline font-mono text-[11px] max-w-[130px] truncate text-slate-600 dark:text-slate-300">
                {getApiBaseUrl().replace(/^https?:\/\//, '')}
              </span>
              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  apiStatus === 'online'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : apiStatus === 'offline'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-amber-500 dark:text-amber-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    apiStatus === 'online'
                      ? 'bg-emerald-500 animate-pulse'
                      : apiStatus === 'offline'
                      ? 'bg-rose-500'
                      : 'bg-amber-400 animate-ping'
                  }`}
                />
                <span className="hidden md:inline">
                  {apiStatus === 'online'
                    ? 'Online'
                    : apiStatus === 'offline'
                    ? 'Ulanmagan'
                    : 'Tekshirilmoqda'}
                </span>
              </span>
            </button>

            {/* Dark mode toggle */}
            <button
              id="theme-toggle-btn"
              onClick={() => setIsDark(!isDark)}
              className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title={isDark ? "Yorug' rejimga o'tish" : "Qorong'u rejimga o'tish"}
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
          </div>
        </div>

        {/* Mobile bottom nav for small screens */}
        <div className="md:hidden flex border-t border-slate-200 dark:border-slate-800 px-4 py-2 gap-2 bg-slate-50/70 dark:bg-slate-900/70">
          <button
            onClick={() => navigate('/')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold ${
              isExamsActive
                ? 'bg-white shadow-sm text-indigo-600 dark:bg-slate-800 dark:text-indigo-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <FileText className="w-4 h-4" />
            Imtihonlar
          </button>
          <button
            onClick={() => navigate('/students')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold ${
              isStudentsActive
                ? 'bg-white shadow-sm text-indigo-600 dark:bg-slate-800 dark:text-indigo-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Users className="w-4 h-4" />
            O'quvchilar
          </button>
        </div>
      </header>

      {/* API Configuration Modal */}
      {showApiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            id="api-settings-modal"
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Backend API sozlamalari
                </h3>
              </div>
              <button
                onClick={() => setShowApiModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveApiUrl} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  API asosiy manzili (Base URL)
                </label>
                <input
                  type="url"
                  required
                  value={apiUrlInput}
                  onChange={(e) => setApiUrlInput(e.target.value)}
                  placeholder="http://127.0.0.1:8000"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-slate-100"
                />
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Standart qiymat: <code className="font-mono">http://127.0.0.1:8000</code>. Agar backend server boshqa port yoki masofaviy serverda ishlayotgan bo'lsa, bu yerda belgilang.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Joriy holat:
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                      apiStatus === 'online'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : apiStatus === 'offline'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-amber-500 dark:text-amber-400'
                    }`}
                  >
                    {apiStatus === 'online' && <CheckCircle2 className="w-4 h-4" />}
                    {apiStatus === 'offline' && <AlertCircle className="w-4 h-4" />}
                    {apiStatus === 'online'
                      ? 'Server bilan aloqa bor (200 OK)'
                      : apiStatus === 'offline'
                      ? 'Server javob bermayapti'
                      : 'Ulanish tekshirilmoqda...'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => checkHealth(apiUrlInput)}
                  className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Qayta tekshirish
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setApiUrlInput('http://127.0.0.1:8000');
                    setApiBaseUrl('http://127.0.0.1:8000');
                    checkHealth('http://127.0.0.1:8000');
                  }}
                  className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:underline cursor-pointer"
                >
                  Standartga qaytarish
                </button>
                <button
                  type="button"
                  onClick={() => setShowApiModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Yopish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/30 cursor-pointer"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
