import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  KeyRound,
  Save,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Settings2,
  Lock,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Exam, AnswerKeyItem, QuestionType, MatchMode } from '../../types';
import { api, ApiError } from '../../api';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../ConfirmModal';

interface AnswerKeyTabProps {
  exam: Exam;
  onExamUpdated: (exam: Exam) => void;
}

export const AnswerKeyTab: React.FC<AnswerKeyTabProps> = ({ exam, onExamUpdated }) => {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [items, setItems] = useState<AnswerKeyItem[]>([]);
  const [initialItems, setInitialItems] = useState<AnswerKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<number>(1);
  const [expandedSettings, setExpandedSettings] = useState<Record<number, boolean>>({});
  const [regradedCount, setRegradedCount] = useState<number | null>(null);

  // Locked patch confirmation modal
  const [showPatchConfirm, setShowPatchConfirm] = useState(false);

  // References for rows for auto-scrolling
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const isLocked = exam.status === 'LOCKED' || exam.status === 'CLOSED';

  // Initialize or fetch answer key
  const fetchAnswerKey = useCallback(async () => {
    setIsLoading(true);
    setRegradedCount(null);
    try {
      const existing = await api.getAnswerKey(exam.id);
      // Ensure we have N items (1 to exam.question_count)
      const mapped: AnswerKeyItem[] = [];
      for (let i = 1; i <= exam.question_count; i++) {
        const found = existing.find((item) => item.question_number === i);
        if (found) {
          mapped.push({
            question_number: i,
            qtype: found.qtype || 'CHOICE',
            correct_answer: found.correct_answer || '',
            match_mode: found.match_mode || 'IGNORE_CASE',
            tolerance: found.tolerance !== undefined ? found.tolerance : 1,
            points: found.points !== undefined ? found.points : 1,
          });
        } else {
          mapped.push({
            question_number: i,
            qtype: 'CHOICE',
            correct_answer: '',
            match_mode: 'IGNORE_CASE',
            tolerance: 1,
            points: 1,
          });
        }
      }
      setItems(mapped);
      setInitialItems(JSON.parse(JSON.stringify(mapped)));
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toastRef.current.error("Javoblar kalitini yuklashda xatolik", err.detail);
      } else {
        toastRef.current.error("Javoblar kaliti yuklanmadi");
      }
      // Fallback generate blank items
      const blanks: AnswerKeyItem[] = Array.from({ length: exam.question_count }, (_, idx) => ({
        question_number: idx + 1,
        qtype: 'CHOICE',
        correct_answer: '',
        match_mode: 'IGNORE_CASE',
        tolerance: 1,
        points: 1,
      }));
      setItems(blanks);
      setInitialItems(JSON.parse(JSON.stringify(blanks)));
    } finally {
      setIsLoading(false);
    }
  }, [exam.id, exam.question_count]);

  useEffect(() => {
    fetchAnswerKey();
  }, [exam.id, exam.question_count]);

  // Keyboard navigation and rapid choice input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing inside an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      const key = e.key.toUpperCase();

      // Navigation: Up / Down arrows
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveQuestion((prev) => {
          const next = Math.min(exam.question_count, prev + 1);
          rowRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return next;
        });
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveQuestion((prev) => {
          const next = Math.max(1, prev - 1);
          rowRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return next;
        });
        return;
      }

      // Rapid answer typing for CHOICE: 'A', 'B', 'C', 'D'
      if (['A', 'B', 'C', 'D'].includes(key)) {
        e.preventDefault();
        setItems((prevItems) => {
          return prevItems.map((item) => {
            if (item.question_number === activeQuestion) {
              return { ...item, correct_answer: key };
            }
            return item;
          });
        });

        // Jump to next question immediately
        if (activeQuestion < exam.question_count) {
          const next = activeQuestion + 1;
          setActiveQuestion(next);
          rowRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
      }

      // Backspace / Delete clears the answer
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        setItems((prevItems) => {
          return prevItems.map((item) => {
            if (item.question_number === activeQuestion) {
              return { ...item, correct_answer: '' };
            }
            return item;
          });
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeQuestion, exam.question_count]);

  const handleChoiceClick = (qNum: number, letter: string) => {
    setActiveQuestion(qNum);
    setItems((prev) =>
      prev.map((item) => {
        if (item.question_number === qNum) {
          // If already selected, clicking it again can keep or toggle
          return { ...item, correct_answer: letter };
        }
        return item;
      })
    );

    // Auto advance to next question
    if (qNum < exam.question_count) {
      const next = qNum + 1;
      setActiveQuestion(next);
      rowRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleMultiToggle = (qNum: number, letter: string) => {
    setActiveQuestion(qNum);
    setItems((prev) =>
      prev.map((item) => {
        if (item.question_number === qNum) {
          let cur = item.correct_answer || '';
          if (cur.includes(letter)) {
            cur = cur.replace(letter, '');
          } else {
            cur = (cur + letter).split('').sort().join('');
          }
          return { ...item, correct_answer: cur };
        }
        return item;
      })
    );
  };

  const updateItem = (qNum: number, patch: Partial<AnswerKeyItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.question_number === qNum ? { ...item, ...patch } : item))
    );
  };

  // Check empty questions
  const emptyQuestions = items.filter((item) => !item.correct_answer.trim());
  const emptyCount = emptyQuestions.length;
  const filledCount = exam.question_count - emptyCount;

  // Save handler
  const handleSave = async () => {
    if (isLocked) {
      // Locked exam: confirm before sending patch
      setShowPatchConfirm(true);
      return;
    }

    // DRAFT exam: PUT whole key
    setIsSaving(true);
    try {
      const saved = await api.replaceAnswerKey(exam.id, items);
      setItems(saved);
      setInitialItems(JSON.parse(JSON.stringify(saved)));
      toast.success(
        "Javoblar kaliti saqlandi",
        `${saved.length} ta savol muvaffaqiyatli saqlandi`
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error("Kalitni saqlashda xatolik", err.detail);
      } else {
        toast.error("Kalitni saqlab bo'lmadi");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecutePatch = async () => {
    setShowPatchConfirm(false);
    setIsSaving(true);
    setRegradedCount(null);
    try {
      const patchPayload = items.map((item) => ({
        question_number: item.question_number,
        correct_answer: item.correct_answer,
        match_mode: item.match_mode,
        tolerance: item.tolerance,
        points: item.points,
      }));

      const res = await api.patchAnswerKey(exam.id, patchPayload);
      setItems(res.items);
      setInitialItems(JSON.parse(JSON.stringify(res.items)));
      setRegradedCount(res.regraded);
      toast.success(
        "Javoblar kaliti yangilandi",
        `${res.regraded} ta ish qayta tekshirildi va yangilandi`
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error("Kalitni to'g'rilashda xatolik", err.detail);
      } else {
        toast.error("Kalitni yangilab bo'lmadi");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Status bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`p-3 rounded-xl ${
                isLocked
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
              }`}
            >
              {isLocked ? <Lock className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {isLocked ? "Kalitni to'g'rilash (PATCH rejimi)" : "Javoblar kalitini kiritish"}
                </h3>
                {isLocked ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    LOCKED
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    DRAFT
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isLocked
                  ? "Imtihon tasdiqlangan. Kalitdagi o'zgarishlar avtomatik tarzda barcha topshirilgan varaqalarni qayta tekshiradi."
                  : "Klaviaturadan A, B, C, D tugmalarini bosish orqali tezkor kiriting. Tugma bosilishi bilan keyingi savolga avtomatik o'tadi."}
              </p>
            </div>
          </div>

          {/* Quick stats & Save button */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right pr-3 border-r border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Holat</div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {filledCount} / {exam.question_count} to'ldirildi
              </div>
            </div>

            <button
              id="save-answer-key-btn"
              onClick={handleSave}
              disabled={isSaving}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm flex items-center gap-2 transition cursor-pointer disabled:opacity-50 ${
                isLocked
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
              }`}
            >
              {isSaving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isLocked ? "O'zgarishlarni saqlash va qayta baholash" : "Kalitni saqlash"}
            </button>
          </div>
        </div>

        {/* Empty count warning badge */}
        {emptyCount > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>{emptyCount} ta savol</strong> hali to'ldirilmagan! Imtihonni qulflash
                uchun barcha {exam.question_count} ta savolga javob kiritilishi shart.
              </span>
            </div>
            <button
              onClick={() => {
                if (emptyQuestions[0]) {
                  setActiveQuestion(emptyQuestions[0].question_number);
                  rowRefs.current[emptyQuestions[0].question_number]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  });
                }
              }}
              className="font-bold underline hover:no-underline text-amber-800 dark:text-amber-300 ml-2 cursor-pointer"
            >
              Birinchi bo'sh savolga o'tish (#{emptyQuestions[0]?.question_number})
            </button>
          </div>
        )}

        {/* Regraded Success Notification */}
        {regradedCount !== null && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5 text-sm text-emerald-900 dark:text-emerald-200 animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Muvaffaqiyatli:</strong> Kalit yangilandi va{' '}
              <span className="font-bold underline">{regradedCount} ta ish qayta tekshirildi</span>.
            </span>
          </div>
        )}

        {/* Keyboard instructions badge */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Tezkor tugmalar:</span>
          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono border border-slate-200 dark:border-slate-700">
            A / B / C / D
          </span>{' '}
          javob belgilash va o'tish
          <span className="mx-1">•</span>
          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono border border-slate-200 dark:border-slate-700">
            ↑ / ↓
          </span>{' '}
          savollar aro harakatlanish
          <span className="mx-1">•</span>
          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono border border-slate-200 dark:border-slate-700">
            Backspace
          </span>{' '}
          tozalash
        </div>
      </div>

      {/* Answer Key Grid */}
      {isLoading ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="inline-block w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Savollar ro'yxati yuklanmoqda...
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => {
              const isActive = activeQuestion === item.question_number;
              const isFilled = !!item.correct_answer.trim();
              const isText = item.qtype === 'TEXT';
              const isExpanded = !!expandedSettings[item.question_number];

              return (
                <div
                  key={item.question_number}
                  ref={(el) => {
                    rowRefs.current[item.question_number] = el;
                  }}
                  id={`key-row-${item.question_number}`}
                  onClick={() => setActiveQuestion(item.question_number)}
                  className={`p-3.5 sm:px-5 transition ${
                    isActive
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-l-4 border-indigo-600 dark:border-indigo-500 pl-3 sm:pl-4'
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Question Number and Type */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm transition ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : isFilled
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {item.question_number}
                      </div>

                      <div className="flex items-center gap-2">
                        {isText ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            Qo'lyozma so'z (TEXT)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Test (CHOICE)
                          </span>
                        )}

                        <span className="text-xs text-slate-400 font-mono">
                          {item.points || 1} ball
                        </span>
                      </div>
                    </div>

                    {/* Middle: Fast Answer Inputs */}
                    <div className="flex-1 max-w-xl flex items-center justify-end sm:justify-center gap-2">
                      {!isText ? (
                        /* CHOICE: 4 big buttons A, B, C, D */
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          {['A', 'B', 'C', 'D'].map((letter) => {
                            const isSelected = item.correct_answer === letter;
                            const isPartOfMulti =
                              item.correct_answer.length > 1 &&
                              item.correct_answer.includes(letter);

                            return (
                              <button
                                key={letter}
                                type="button"
                                id={`choice-${item.question_number}-${letter}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (e.shiftKey) {
                                    handleMultiToggle(item.question_number, letter);
                                  } else {
                                    handleChoiceClick(item.question_number, letter);
                                  }
                                }}
                                className={`w-11 h-10 sm:w-12 sm:h-11 rounded-xl font-bold font-mono text-base transition cursor-pointer flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105'
                                    : isPartOfMulti
                                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border-2 border-indigo-500'
                                    : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                                title={`'${letter}' javobini tanlash (Shift+bosish orqali ko'p variantli)`}
                              >
                                {letter}
                              </button>
                            );
                          })}

                          {/* Multi-answer indicator or custom bubble combination */}
                          {item.correct_answer && item.correct_answer.length > 1 && (
                            <span className="ml-2 px-2 py-1 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-lg border border-indigo-200">
                              {item.correct_answer}
                            </span>
                          )}
                        </div>
                      ) : (
                        /* TEXT Answer Input */
                        <div className="w-full flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="To'g'ri so'z(lar): Toshkent|Tashkent"
                            value={item.correct_answer}
                            onChange={(e) =>
                              updateItem(item.question_number, {
                                correct_answer: e.target.value,
                              })
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-mono"
                          />
                        </div>
                      )}
                    </div>

                    {/* Right: Settings Toggle (kept tucked away so standard choices stay clean) */}
                    <div className="flex items-center justify-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedSettings((prev) => ({
                            ...prev,
                            [item.question_number]: !prev[item.question_number],
                          }));
                        }}
                        className={`p-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                          isExpanded || isText
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title="Savol turini o'zgartirish va ball sozlash"
                      >
                        <Settings2 className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs">
                          {isExpanded ? "Yopish" : "Sozlamalar"}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Settings Panel (Tucked away for non-standard questions) */}
                  {isExpanded && (
                    <div
                      className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div>
                        <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Savol turi:
                        </label>
                        <select
                          value={item.qtype}
                          disabled={isLocked}
                          onChange={(e) =>
                            updateItem(item.question_number, {
                              qtype: e.target.value as QuestionType,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                        >
                          <option value="CHOICE">CHOICE (Variantlar A/B/C/D)</option>
                          <option value="TEXT">TEXT (Qo'lyozma so'z)</option>
                        </select>
                      </div>

                      {item.qtype === 'TEXT' && (
                        <>
                          <div>
                            <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              Moslashish rejimi:
                            </label>
                            <select
                              value={item.match_mode || 'IGNORE_CASE'}
                              onChange={(e) =>
                                updateItem(item.question_number, {
                                  match_mode: e.target.value as MatchMode,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                            >
                              <option value="IGNORE_CASE">Katta-kichik harfga qaramaslik</option>
                              <option value="EXACT">Aniq moslik (EXACT)</option>
                              <option value="FUZZY">Noaniq moslik (FUZZY)</option>
                              <option value="NUMERIC">Raqamli (NUMERIC)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              Ruxsat etilgan farq (Tolerance):
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={10}
                              value={item.tolerance ?? 1}
                              onChange={(e) =>
                                updateItem(item.question_number, {
                                  tolerance: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Ball (Points):
                        </label>
                        <input
                          type="number"
                          min={0.5}
                          step={0.5}
                          value={item.points ?? 1}
                          onChange={(e) =>
                            updateItem(item.question_number, {
                              points: parseFloat(e.target.value) || 1,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Bottom Toolbar on Mobile/Tablet */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xl flex items-center justify-between sm:hidden">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
          #{activeQuestion}-savol: {items.find((i) => i.question_number === activeQuestion)?.correct_answer || '—'}
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
        >
          {isSaving ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </div>

      {/* Locked Exam Key Correction Confirmation Modal */}
      <ConfirmModal
        isOpen={showPatchConfirm}
        title="Qulflangan imtihon kalitini yangilash"
        description="Diqqat: Ushbu imtihon tasdiqlangan (LOCKED) holatda. Javoblar kalitiga kiritilgan har qanday tuzatish barcha topshirilgan varaqalarni avtomatik qayta tekshiradi va e'lon qilingan natijalarni o'zgartiradi. Ushbu amalni tasdiqlaysizmi?"
        confirmLabel="Ha, yangilab qayta baholansin"
        cancelLabel="Bekor qilish"
        variant="warning"
        isLoading={isSaving}
        onConfirm={handleExecutePatch}
        onClose={() => setShowPatchConfirm(false)}
      />
    </div>
  );
};
