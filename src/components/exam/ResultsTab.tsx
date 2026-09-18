import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  RefreshCw,
  Award,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  ArrowUpDown,
  Edit3,
} from 'lucide-react';
import { Exam, ResultRow, ResultsSummary, QuestionStat } from '../../types';
import { api, ApiError } from '../../api';
import { useToast } from '../../context/ToastContext';

interface ResultsTabProps {
  exam: Exam;
  navigate: (route: string) => void;
}

type SortField = 'name' | 'group' | 'sheet_code' | 'percent' | 'points' | 'status';
type SortOrder = 'asc' | 'desc';

export const ResultsTab: React.FC<ResultsTabProps> = ({ exam, navigate }) => {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [results, setResults] = useState<ResultRow[]>([]);
  const [summary, setSummary] = useState<ResultsSummary | null>(null);
  const [stats, setStats] = useState<QuestionStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isRegrading, setIsRegrading] = useState(false);

  // Filters & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASSED' | 'FAILED' | 'ABSENT' | 'PENDING'>('ALL');
  const [sortField, setSortField] = useState<SortField>('percent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [hoveredQuestion, setHoveredQuestion] = useState<QuestionStat | null>(null);

  const fetchResultsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resList, sumData, statData] = await Promise.all([
        api.getResults(exam.id),
        api.getResultsSummary(exam.id),
        api.getQuestionStats(exam.id),
      ]);
      setResults(resList);
      setSummary(sumData);
      setStats(statData);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toastRef.current.error("Natijalarni yuklashda xatolik", err.detail);
      } else {
        toastRef.current.error("Natijalar ma'lumotlari yuklanmadi");
      }
    } finally {
      setIsLoading(false);
    }
  }, [exam.id]);

  useEffect(() => {
    fetchResultsData();
  }, [exam.id]);

  const handleExcelExport = async () => {
    setIsExporting(true);
    try {
      await api.downloadResultsExcel(
        exam.id,
        `natijalar_imtihon_${exam.id}_${exam.subject.replace(/\s+/g, '_')}.xlsx`
      );
      toast.success("Excel hisobot muvaffaqiyatli yuklab olindi");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error("Excel yuklab olishda xatolik", err.detail);
      } else {
        toast.error("Excel hisobotini yuklab bo'lmadi");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleRegrade = async () => {
    setIsRegrading(true);
    try {
      const res = await api.regradeExam(exam.id);
      toast.success(
        "Qayta baholash yakunlandi",
        `${res.regraded} ta ish muvaffaqiyatli qayta hisoblandi`
      );
      fetchResultsData();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error("Qayta baholashda xatolik", err.detail);
      } else {
        toast.error("Qayta hisoblab bo'lmadi");
      }
    } finally {
      setIsRegrading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filter and sort results
  const filteredResults = results
    .filter((row) => {
      const sName = row.student_name || '';
      const sId = row.external_id || '';
      const sGroup = row.group_name || '';
      const sCode = row.sheet_code || '';

      const matchesSearch =
        sName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sGroup.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sCode.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'ABSENT') return row.absent;
      if (statusFilter === 'PENDING') return !row.absent && !row.result;
      if (statusFilter === 'PASSED') return row.result?.passed === true;
      if (statusFilter === 'FAILED') return row.result && row.result.passed === false;

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = (a.student_name || '').localeCompare(b.student_name || '');
      } else if (sortField === 'group') {
        comparison = (a.group_name || '').localeCompare(b.group_name || '');
      } else if (sortField === 'sheet_code') {
        comparison = (a.sheet_code || '').localeCompare(b.sheet_code || '');
      } else if (sortField === 'percent') {
        const pA = a.result?.percent ?? -1;
        const pB = b.result?.percent ?? -1;
        comparison = pA - pB;
      } else if (sortField === 'points') {
        const pA = a.result?.earned_points ?? -1;
        const pB = b.result?.earned_points ?? -1;
        comparison = pA - pB;
      } else if (sortField === 'status') {
        const sA = a.absent ? 0 : a.result ? (a.result.passed ? 3 : 2) : 1;
        const sB = b.absent ? 0 : b.result ? (b.result.passed ? 3 : 2) : 1;
        comparison = sA - sB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Highlight questions under 30%
  const lowPassQuestions = stats.filter((s) => s.correct_percent < 30);

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Imtihon natijalari va statistikasi
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            O'quvchilar ko'rsatkichlari, savollar tahlili va Excel eksport
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="regrade-exam-btn"
            onClick={handleRegrade}
            disabled={isRegrading || isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            title="Barcha ishlarni joriy kalit bo'yicha qayta baholash"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegrading ? 'animate-spin' : ''}`} />
            Qayta hisoblash
          </button>

          <button
            id="export-excel-btn"
            onClick={handleExcelExport}
            disabled={isExporting || results.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            Excel yuklab olish (.xlsx)
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Average */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>O'rtacha natija</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
            {summary?.average_percent !== undefined
              ? `${Number(summary.average_percent).toFixed(1)}%`
              : '—'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            O'tish chegarasi: <strong>{exam.pass_percent}%</strong>
          </div>
        </div>

        {/* Highest */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Eng yuqori ball</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {summary?.highest_percent !== undefined ? `${summary.highest_percent}%` : '—'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Maksimal ko'rsatkich</div>
        </div>

        {/* Lowest */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Eng past ball</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
            {summary?.lowest_percent !== undefined ? `${summary.lowest_percent}%` : '—'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Minimal ko'rsatkich</div>
        </div>

        {/* Graded vs Pending */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Baholangan / Kutilmoqda</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
            <span className="text-emerald-600 dark:text-emerald-400">{summary?.graded ?? 0}</span>
            <span className="text-slate-300 dark:text-slate-700 mx-1">/</span>
            <span className="text-amber-600 dark:text-amber-400">{summary?.pending ?? 0}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Jami ro'yxatda: <strong>{summary?.registered ?? 0} ta</strong>
          </div>
        </div>

        {/* Passed count / rate */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>O'tganlar (Passed)</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
            {summary?.passed ?? 0} ta
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Kelmaganlar (Absent): <strong>{summary?.absent ?? 0} ta</strong>
          </div>
        </div>
      </div>

      {/* Question Stats Bar Chart with <30% Alerts */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Savollar bo'yicha to'g'ri javoblar tahlili (Stats)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Har bir savol uchun to'g'ri yechilganlik foizi. 30% dan past savollar alohida
              belgilangan.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-400">&ge; 60% yaxshi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500" />
              <span className="text-slate-600 dark:text-slate-400">30% - 59% o'rtacha</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-rose-500" />
              <span className="text-slate-600 dark:text-slate-400">&lt; 30% xavfli</span>
            </div>
          </div>
        </div>

        {/* Low performance warning alert */}
        {lowPassQuestions.length > 0 && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/80 flex items-start gap-3 text-xs text-rose-950 dark:text-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">
                Diqqat! {lowPassQuestions.length} ta savolda to'g'ri javoblar 30% dan past:
              </span>{' '}
              Savollar:{' '}
              {lowPassQuestions.map((q) => (
                <span
                  key={q.question_number}
                  className="font-mono font-bold px-1.5 py-0.5 rounded bg-rose-200/70 dark:bg-rose-900 text-rose-900 dark:text-rose-100 mx-0.5"
                >
                  #{q.question_number} ({q.correct_percent}%)
                </span>
              ))}
              .
              <p className="mt-1 text-rose-800 dark:text-rose-300">
                Odatda bu mavzudagi o'quv bo'shlig'i yoki <em>noto'g'ri kiritilgan javoblar kaliti</em>
                dan dalolat beradi. Javoblar kalitini qayta tekshirib ko'rishingiz tavsiya etiladi.
              </p>
            </div>
          </div>
        )}

        {/* Interactive SVG Bar Chart */}
        {stats.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Statistik ma'lumotlar mavjud emas (hali hech qaysi ish baholanmagan)
          </div>
        ) : (
          <div className="pt-4 overflow-x-auto">
            <div
              className="flex items-end gap-1.5 min-w-[600px] h-48 pb-6 pt-6 border-b border-slate-200 dark:border-slate-800 relative"
            >
              {/* 30% threshold guide line */}
              <div
                className="absolute left-0 right-0 border-b border-dashed border-rose-400 dark:border-rose-600/70 pointer-events-none z-10"
                style={{ bottom: `${(30 / 100) * 144 + 24}px` }}
              >
                <span className="text-[10px] font-mono font-bold text-rose-500 bg-white/80 dark:bg-slate-900/80 px-1 ml-1 rounded">
                  30% chegara
                </span>
              </div>

              {stats.map((stat) => {
                const isUnder30 = stat.correct_percent < 30;
                const isGood = stat.correct_percent >= 60;
                const heightPx = Math.max(8, (stat.correct_percent / 100) * 144);

                return (
                  <div
                    key={stat.question_number}
                    onMouseEnter={() => setHoveredQuestion(stat)}
                    onMouseLeave={() => setHoveredQuestion(null)}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                  >
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-12 z-30 transition bg-slate-900 text-white text-[11px] py-1 px-2.5 rounded-lg whitespace-nowrap shadow-lg">
                      #{stat.question_number}: {stat.correct_percent}% to'g'ri ({stat.correct}/{stat.sat || stat.answered})
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPx}px` }}
                      className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                        isUnder30
                          ? 'bg-rose-500 group-hover:bg-rose-600'
                          : isGood
                          ? 'bg-emerald-500 group-hover:bg-emerald-600'
                          : 'bg-amber-500 group-hover:bg-amber-600'
                      }`}
                    />

                    {/* Question number label */}
                    <span
                      className={`absolute -bottom-5 text-[10px] font-mono font-semibold ${
                        isUnder30
                          ? 'text-rose-600 dark:text-rose-400 font-bold'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {stat.question_number}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Results Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="O'quvchi ismi, ID yoki varaq kodi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Barchasi ({results.length})
            </button>
            <button
              onClick={() => setStatusFilter('PASSED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === 'PASSED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              O'tganlar ({results.filter((r) => r.result?.passed).length})
            </button>
            <button
              onClick={() => setStatusFilter('FAILED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === 'FAILED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Yiqilganlar ({results.filter((r) => r.result && !r.result.passed).length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Kutilmoqda ({results.filter((r) => !r.absent && !r.result).length})
            </button>
            <button
              onClick={() => setStatusFilter('ABSENT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === 'ABSENT'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Kelmadi ({results.filter((r) => r.absent).length})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-5 -mb-5">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th
                  onClick={() => handleSort('sheet_code')}
                  className="px-5 py-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Varaqa kodi</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="px-5 py-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>O'quvchi & ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('group')}
                  className="px-5 py-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Guruh</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('points')}
                  className="px-5 py-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Ball / Savollar</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('percent')}
                  className="px-5 py-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Foiz (%)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-5 py-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Natija holati</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-5 py-3.5 text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-xs text-slate-500">
                    Natijalar topilmadi
                  </td>
                </tr>
              ) : (
                filteredResults.map((row) => {
                  const res = row.result;
                  return (
                    <tr
                      key={row.registration_id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <code className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {row.sheet_code}
                        </code>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {row.student_name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          ID: {row.external_id || '-'}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                        {row.group_name || '-'}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {row.absent ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : res ? (
                          <div className="text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {res.earned_points} / {res.total_points} ball
                            </span>
                            <div className="text-[11px] text-slate-400">
                              {res.correct_count} ta to'g'ri ({res.answered_count} ta belgilangan)
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            Kutilmoqda
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {row.absent ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : res ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono font-bold text-sm ${
                                res.passed
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {res.percent}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {row.absent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Kelmadi (Absent)
                          </span>
                        ) : res ? (
                          res.passed ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              O'tdi (Passed)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              <XCircle className="w-3.5 h-3.5" />
                              Yiqildi (Failed)
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3.5 h-3.5" />
                            Baholanmagan
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <button
                          onClick={() => navigate(`/exams/${exam.id}/manual/${row.registration_id}`)}
                          title="Javoblarni kiritish yoki tekshirish"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{res ? "Tekshirish" : "Qo'lda kiritish"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
