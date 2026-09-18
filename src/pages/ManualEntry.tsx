import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Award,
  Save,
  ChevronRight,
  ChevronLeft,
  User,
  Hash,
  BookOpen,
  Keyboard,
  RotateCcw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Exam, Registration, Result, AnswerKeyItem } from '../types';
import { api, ApiError } from '../api';
import { useToast } from '../context/ToastContext';

interface ManualEntryProps {
  examId: number;
  registrationId: number;
  navigate: (route: string) => void;
}

export const ManualEntry: React.FC<ManualEntryProps> = ({
  examId,
  registrationId,
  navigate,
}) => {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [exam, setExam] = useState<Exam | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [keyItems, setKeyItems] = useState<AnswerKeyItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [activeQ, setActiveQ] = useState<number>(1);

  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const [examData, regs, keyData] = await Promise.all([
        api.getExam(examId),
        api.getRegistrations(examId),
        api.getAnswerKey(examId),
      ]);
      setExam(examData);
      setAllRegistrations(regs);
      setKeyItems(keyData);

      const targetReg = regs.find((r) => r.id === registrationId);
      if (targetReg) {
        setRegistration(targetReg);
      } else {
        toastRef.current.error("O'quvchi ro'yxati topilmadi");
      }

      // If already graded, we could also check if result exists
      try {
        const results = await api.getResults(examId);
        const match = results.find((r) => r.registration_id === registrationId);
        if (match && match.result) {
          setResult(match.result);
        }
      } catch {
        // Soft fail
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toastRef.current.error("Ma'lumotlarni yuklashda xatolik", err.detail);
      } else {
        toastRef.current.error("Ma'lumotlar yuklanmadi");
      }
    } finally {
      setIsLoading(false);
    }
  }, [examId, registrationId]);

  useEffect(() => {
    fetchData();
  }, [examId, registrationId]);

  // Keyboard rapid input
  useEffect(() => {
    if (!exam) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const key = e.key.toUpperCase();

      // Navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveQ((prev) => {
          const next = Math.min(exam.question_count, prev + 1);
          rowRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return next;
        });
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveQ((prev) => {
          const next = Math.max(1, prev - 1);
          rowRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return next;
        });
        return;
      }

      // Choice selection: A, B, C, D
      if (['A', 'B', 'C', 'D'].includes(key)) {
        e.preventDefault();
        setAnswers((prev) => ({
          ...prev,
          [String(activeQ)]: key,
        }));

        // Advance to next question
        if (activeQ < exam.question_count) {
          const next = activeQ + 1;
          setActiveQ(next);
          rowRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
      }

      // Backspace or Delete to clear
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        setAnswers((prev) => {
          const updated = { ...prev };
          delete updated[String(activeQ)];
          return updated;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeQ, exam?.question_count]);

  const handleChoiceClick = (qNum: number, letter: string) => {
    setActiveQ(qNum);
    setAnswers((prev) => ({
      ...prev,
      [String(qNum)]: letter,
    }));

    if (exam && qNum < exam.question_count) {
      const next = qNum + 1;
      setActiveQ(next);
      rowRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleMultiToggle = (qNum: number, letter: string) => {
    setActiveQ(qNum);
    setAnswers((prev) => {
      let cur = prev[String(qNum)] || '';
      if (cur.includes(letter)) {
        cur = cur.replace(letter, '');
      } else {
        cur = (cur + letter).split('').sort().join('');
      }
      if (!cur) {
        const next = { ...prev };
        delete next[String(qNum)];
        return next;
      }
      return { ...prev, [String(qNum)]: cur };
    });
  };

  const handleTextAnswerChange = (qNum: number, val: string) => {
    setAnswers((prev) => {
      if (!val.trim()) {
        const next = { ...prev };
        delete next[String(qNum)];
        return next;
      }
      return { ...prev, [String(qNum)]: val };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const graded = await api.submitAnswers(registrationId, answers);
      setResult(graded);
      toast.success(
        "Ish muvaffaqiyatli baholandi!",
        `Natija: ${graded.percent}% — ${graded.passed ? "O'tdi" : "Yiqildi"}`
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error("Baholashda xatolik yuz berdi", err.detail);
      } else {
        toast.error("Javoblarni yuborib bo'lmadi");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Find next and previous registration in the list
  const currentIndex = allRegistrations.findIndex((r) => r.id === registrationId);
  const prevReg = currentIndex > 0 ? allRegistrations[currentIndex - 1] : null;
  const nextReg =
    currentIndex >= 0 && currentIndex < allRegistrations.length - 1
      ? allRegistrations[currentIndex + 1]
      : null;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="inline-block w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Varaqa ma'lumotlari yuklanmoqda...
        </p>
      </div>
    );
  }

  if (!registration || !exam) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold">O'quvchi yoki imtihon topilmadi</h3>
        <button
          onClick={() => navigate(`/exams/${examId}`)}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
        >
          Imtihonga qaytish
        </button>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Breadcrumbs & Nav between students */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate(`/exams/${examId}?tab=results`)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Imtihon natijalariga qaytish
        </button>

        {/* Prev / Next Student */}
        <div className="flex items-center gap-2">
          {prevReg && (
            <button
              onClick={() => navigate(`/exams/${examId}/manual/${prevReg.id}`)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Oldingi o'quvchi
            </button>
          )}
          {nextReg && (
            <button
              onClick={() => navigate(`/exams/${examId}/manual/${nextReg.id}`)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
            >
              Keyingi o'quvchi
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Student & Exam Context Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Qo'lda kiritish (Manual Entry)
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">
              {registration.student?.full_name}
            </h2>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              <span>
                ID: <strong className="font-mono text-slate-700 dark:text-slate-300">{registration.student?.external_id}</strong>
              </span>
              <span>•</span>
              <span>
                Guruh: <strong className="text-slate-700 dark:text-slate-300">{registration.student?.group_name}</strong>
              </span>
              <span>•</span>
              <span>
                Varaqa kodi:{' '}
                <code className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {registration.sheet_code}
                </code>
              </span>
              {registration.seat && (
                <>
                  <span>•</span>
                  <span>Joy: {registration.seat}</span>
                </>
              )}
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-slate-200 dark:sm:border-slate-800 sm:pl-6">
            <div className="text-xs text-slate-500 dark:text-slate-400">Imtihon</div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {exam.title} ({exam.subject})
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Savollar soni: <strong>{exam.question_count} ta</strong> • O'tish bali:{' '}
              <strong>{exam.pass_percent}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Immediate Result Card (if graded) */}
      {result && (
        <div
          id="graded-result-card"
          className={`p-6 rounded-2xl border shadow-sm animate-in fade-in duration-200 ${
            result.passed
              ? 'bg-emerald-50/90 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
              : 'bg-rose-50/90 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`p-3 rounded-2xl text-white ${
                  result.passed ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                {result.passed ? <CheckCircle2 className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      result.passed
                        ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'
                        : 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200'
                    }`}
                  >
                    {result.passed ? "IMTIHONDAN O'TDI (PASSED)" : "YIQILDI (FAILED)"}
                  </span>
                </div>
                <div className="text-2xl font-black font-mono mt-1 text-slate-900 dark:text-slate-50">
                  {result.percent}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-3 sm:pt-0 sm:pl-6">
              <div>
                <div className="text-xs text-slate-500">To'plangan ball</div>
                <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                  {result.earned_points} / {result.total_points}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">To'g'ri javoblar</div>
                <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                  {result.correct_count} / {result.question_count}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Belgilangan</div>
                <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                  {result.answered_count} ta
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Answer Entry Grid */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Varaqadagi javoblarni belgilang
              </h3>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Belgilandi:{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                {answeredCount} / {exam.question_count}
              </strong>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[550px] overflow-y-auto pr-1">
            {Array.from({ length: exam.question_count }, (_, idx) => {
              const qNum = idx + 1;
              const keyItem = keyItems.find((k) => k.question_number === qNum);
              const isText = keyItem?.qtype === 'TEXT';
              const selectedAnswer = answers[String(qNum)] || '';
              const isActive = activeQ === qNum;

              return (
                <div
                  key={qNum}
                  ref={(el) => {
                    rowRefs.current[qNum] = el;
                  }}
                  onClick={() => setActiveQ(qNum)}
                  className={`p-3 transition rounded-xl ${
                    isActive
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/30'
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Q number */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : selectedAnswer
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                            : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400'
                        }`}
                      >
                        {qNum}
                      </div>

                      {keyItem && (
                        <div className="hidden sm:block text-[11px] text-slate-400">
                          {isText ? 'Qo‘lyozma' : 'Test'}
                        </div>
                      )}
                    </div>

                    {/* Inputs */}
                    <div className="flex-1 max-w-sm flex items-center justify-center">
                      {isText ? (
                        <input
                          type="text"
                          placeholder="Talaba yozgan so'z..."
                          value={selectedAnswer}
                          onChange={(e) => handleTextAnswerChange(qNum, e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          {['A', 'B', 'C', 'D'].map((letter) => {
                            const isChosen = selectedAnswer === letter;
                            const isMulti =
                              selectedAnswer.length > 1 && selectedAnswer.includes(letter);

                            return (
                              <button
                                key={letter}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (e.shiftKey) {
                                    handleMultiToggle(qNum, letter);
                                  } else {
                                    handleChoiceClick(qNum, letter);
                                  }
                                }}
                                className={`w-9 h-8 rounded-lg font-mono font-bold text-xs transition cursor-pointer flex items-center justify-center ${
                                  isChosen
                                    ? 'bg-indigo-600 text-white shadow'
                                    : isMulti
                                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border-2 border-indigo-500'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                {letter}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Clear button per row */}
                    <div className="w-12 text-right">
                      {selectedAnswer && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAnswers((prev) => {
                              const next = { ...prev };
                              delete next[String(qNum)];
                              return next;
                            });
                          }}
                          className="text-[11px] text-slate-400 hover:text-rose-500"
                        >
                          Tozalash
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={() => setAnswers({})}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Barcha javoblarni tozalash
          </button>

          <button
            type="submit"
            id="btn-submit-answers"
            disabled={isSubmitting}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Natijani hisoblash va saqlash
          </button>
        </div>
      </form>
    </div>
  );
};
