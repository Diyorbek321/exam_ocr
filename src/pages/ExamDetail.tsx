import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Calendar,
  BookOpen,
  Lock,
  LockOpen,
  Clock,
  CheckCircle2,
  KeyRound,
  Users,
  Printer,
  Award,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Exam, ExamStatus, Registration } from '../types';
import { api, ApiError } from '../api';
import { useToast } from '../context/ToastContext';
import { AnswerKeyTab } from '../components/exam/AnswerKeyTab';
import { RegistrationsTab } from '../components/exam/RegistrationsTab';
import { PrintTab } from '../components/exam/PrintTab';
import { ResultsTab } from '../components/exam/ResultsTab';
import { ConfirmModal } from '../components/ConfirmModal';

interface ExamDetailProps {
  examId: number;
  activeTab?: string;
  navigate: (route: string) => void;
}

export const ExamDetail: React.FC<ExamDetailProps> = ({
  examId,
  activeTab = 'key',
  navigate,
}) => {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [exam, setExam] = useState<Exam | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocking, setIsLocking] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Lock confirmation / action state
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

  const fetchExamData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [examData, regsData] = await Promise.all([
        api.getExam(examId),
        api.getRegistrations(examId),
      ]);
      setExam(examData);
      setRegistrations(regsData);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toastRef.current.error("Imtihon ma'lumotlarini yuklashda xatolik", err.detail);
      } else {
        toastRef.current.error("Imtihon ma'lumotlari yuklanmadi");
      }
    } finally {
      setIsLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    fetchExamData();
  }, [examId]);

  // Tab switching
  const currentTab = ['key', 'registrations', 'print', 'results'].includes(activeTab)
    ? activeTab
    : 'key';

  const setTab = (tab: string) => {
    navigate(`/exams/${examId}?tab=${tab}`);
  };

  const handleLockExam = async () => {
    setShowLockConfirm(false);
    setIsLocking(true);
    try {
      const updated = await api.lockExam(examId);
      setExam(updated);
      toast.success(
        "Imtihon muvaffaqiyatli tasdiqlandi (qulflandi)",
        "Endi varaqalarni chop etishingiz va o'quvchilarga tarqatishingiz mumkin"
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 422) {
          toast.error(
            "Kalit to'liq emas (422)",
            `Barcha savollar to'ldirilishi shart: ${err.detail}`
          );
        } else {
          toast.error("Imtihonni qulflashda xatolik", err.detail);
        }
      } else {
        toast.error("Imtihonni qulflab bo'lmadi");
      }
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlockExam = async () => {
    setShowUnlockConfirm(false);
    setIsUnlocking(true);
    try {
      const updated = await api.unlockExam(examId);
      setExam(updated);
      toast.success("Imtihon qulfdan chiqarildi (Qoralama holatiga qaytarildi)");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          toast.error(
            "Qulfdan chiqarib bo'lmaydi (409)",
            "Ushbu imtihon bo'yicha baholangan ishlar mavjud! Kalitdagi xatolikni tuzatish uchun 'Javoblar kaliti' bo'limidagi tuzatish (PATCH) rejimidan foydalaning, u barcha ishlarni avtomatik qayta baholaydi."
          );
        } else {
          toast.error("Qulfdan chiqarishda xatolik", err.detail);
        }
      } else {
        toast.error("Imtihonni qulfdan chiqarib bo'lmadi");
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="inline-block w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Imtihon ma'lumotlari yuklanmoqda...
        </p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center mb-3">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Imtihon topilmadi
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Ko'rsatilgan ID bo'yicha imtihon mavjud emas yoki o'chirilgan
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
        >
          Imtihonlar ro'yxatiga qaytish
        </button>
      </div>
    );
  }

  // Next-step banner computation
  // (key → lock → register → print → grade)
  const isDraft = exam.status === 'DRAFT';
  const isLocked = exam.status === 'LOCKED';
  const hasRegs = registrations.length > 0;

  let nextStepTitle = '';
  let nextStepDesc = '';
  let nextStepTargetTab = '';

  if (isDraft) {
    nextStepTitle = "1-qadam: Javoblar kalitini kiriting va imtihonni tasdiqlang (qulflang)";
    nextStepDesc = `Hozir imtihon Qoralama (DRAFT) holatida. Barcha ${exam.question_count} ta savolga to'g'ri javoblarni kiriting va yuqoridagi "Tasdiqlash (Qulflash)" tugmasini bosing.`;
    nextStepTargetTab = 'key';
  } else if (isLocked && !hasRegs) {
    nextStepTitle = "2-qadam: Imtihonga o'quvchilarni biriktiring";
    nextStepDesc = "Imtihon muvaffaqiyatli qulflandi. Endi o'quvchilar ro'yxatini shakllantirish uchun guruh yoki alohida o'quvchilarni biriktiring.";
    nextStepTargetTab = 'registrations';
  } else if (isLocked && hasRegs) {
    nextStepTitle = "3-qadam: Javob varaqalarini (PDF) chop eting va imtihonni o'tkazing";
    nextStepDesc = `${registrations.length} nafar o'quvchi biriktirilgan. "Chop etish" bo'limiga o'tib 100% masshtab qoidalariga binoan varaqalarni chop eting.`;
    nextStepTargetTab = 'print';
  } else {
    nextStepTitle = "4-qadam: Natijalarni ko'ring yoki qo'lda kiriting";
    nextStepDesc = "Imtihon yakunlangan yoki baholash jarayonida. Natijalarni monitoring qiling yoki skaner qilinmagan varaqalarni qo'lda kiriting.";
    nextStepTargetTab = 'results';
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Breadcrumb and Header */}
      <div className="space-y-4">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Imtihonlar ro'yxatiga qaytish
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {exam.title}
              </h1>
              {/* Status badge */}
              {exam.status === 'DRAFT' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <Clock className="w-3.5 h-3.5" />
                  QORALAMA (DRAFT)
                </span>
              )}
              {exam.status === 'LOCKED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Lock className="w-3.5 h-3.5" />
                  TASDIQLANGAN (LOCKED)
                </span>
              )}
              {exam.status === 'CLOSED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  YAKUNLANGAN (CLOSED)
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {exam.subject}
                </span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{exam.exam_date || 'Sana belgilanmagan'}</span>
              </div>
              <span>•</span>
              <div>
                Savollar: <strong>{exam.question_count} ta</strong>
              </div>
              <span>•</span>
              <div>
                O'tish foizi: <strong>{exam.pass_percent}%</strong>
              </div>
              <span>•</span>
              <div>
                Shablon: <strong>{exam.template_name || 'A'}</strong>
              </div>
            </div>
          </div>

          {/* Status Actions (Lock / Unlock) */}
          <div className="flex items-center gap-2 shrink-0">
            {isDraft ? (
              <button
                id="btn-lock-exam"
                onClick={() => setShowLockConfirm(true)}
                disabled={isLocking}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50"
                title="Javoblar kalitini tasdiqlash va imtihonni qulflash"
              >
                {isLocking ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                Tasdiqlash (Qulflash)
              </button>
            ) : (
              <button
                id="btn-unlock-exam"
                onClick={() => setShowUnlockConfirm(true)}
                disabled={isUnlocking}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                title="Qoralamaga qaytarish (agar ishlar baholanmagan bo'lsa)"
              >
                {isUnlocking ? (
                  <span className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LockOpen className="w-3.5 h-3.5" />
                )}
                Qulfdan chiqarish
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Prominent Next-Step Banner */}
      <div
        id="next-step-banner"
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
          isDraft
            ? 'bg-amber-50/80 border-amber-200 text-amber-950 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-100'
            : !hasRegs
            ? 'bg-blue-50/80 border-blue-200 text-blue-950 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-100'
            : 'bg-indigo-50/80 border-indigo-200 text-indigo-950 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-100'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              isDraft
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
            }`}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider opacity-75">
              Keyingi qadam (Next Step)
            </div>
            <h3 className="text-sm sm:text-base font-bold mt-0.5">{nextStepTitle}</h3>
            <p className="text-xs opacity-90 mt-1 leading-relaxed max-w-2xl">{nextStepDesc}</p>
          </div>
        </div>

        {currentTab !== nextStepTargetTab && (
          <button
            onClick={() => setTab(nextStepTargetTab)}
            className="self-start sm:self-center inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 shadow-sm text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer shrink-0 border border-slate-200 dark:border-slate-800"
          >
            <span>Ushbu bosqichga o'tish</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs Header Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex items-center gap-2 overflow-x-auto" aria-label="Tabs">
          <button
            id="tab-answer-key"
            onClick={() => setTab('key')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm whitespace-nowrap transition cursor-pointer ${
              currentTab === 'key'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Javoblar kaliti
            {isDraft && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          <button
            id="tab-registrations"
            onClick={() => setTab('registrations')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm whitespace-nowrap transition cursor-pointer ${
              currentTab === 'registrations'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            O'quvchilar ({registrations.length})
          </button>

          <button
            id="tab-print"
            onClick={() => setTab('print')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm whitespace-nowrap transition cursor-pointer ${
              currentTab === 'print'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Printer className="w-4 h-4" />
            Chop etish
            {isDraft && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                qulflanmagan
              </span>
            )}
          </button>

          <button
            id="tab-results"
            onClick={() => setTab('results')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm whitespace-nowrap transition cursor-pointer ${
              currentTab === 'results'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            Natijalar
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      <div>
        {currentTab === 'key' && (
          <AnswerKeyTab
            exam={exam}
            onExamUpdated={(upd) => setExam(upd)}
          />
        )}

        {currentTab === 'registrations' && (
          <RegistrationsTab
            exam={exam}
            navigate={navigate}
          />
        )}

        {currentTab === 'print' && (
          <PrintTab
            exam={exam}
            registrations={registrations}
            onLockExamRequested={() => setShowLockConfirm(true)}
          />
        )}

        {currentTab === 'results' && (
          <ResultsTab
            exam={exam}
            navigate={navigate}
          />
        )}
      </div>

      {/* Lock Confirmation Modal */}
      <ConfirmModal
        isOpen={showLockConfirm}
        title="Imtihonni tasdiqlash va qulflash"
        description={`Imtihonni qulflaganingizdan so'ng uning strukturasi (savollar soni, turi) o'zgarmas bo'ladi va javob varaqalarini chop etish imkoniyati ochiladi. Barcha ${exam.question_count} ta savol kaliti to'liq kiritilgan bo'lishi shart.`}
        confirmLabel="Ha, tasdiqlansin (Qulflansin)"
        cancelLabel="Bekor qilish"
        variant="primary"
        isLoading={isLocking}
        onConfirm={handleLockExam}
        onClose={() => setShowLockConfirm(false)}
      />

      {/* Unlock Confirmation Modal */}
      <ConfirmModal
        isOpen={showUnlockConfirm}
        title="Imtihonni qulfdan chiqarish"
        description="Diqqat: Imtihonni qulfdan chiqarish uni qayta Qoralama holatiga o'tkazadi. Eslatma: Agar birorta ham ish baholangan bo'lsa, tizim 409 xatoligi bilan qulfdan chiqarishni rad etadi (bunday holatda kalitni to'g'rilash (PATCH) bo'limidan foydalaning)."
        confirmLabel="Qulfdan chiqarish"
        cancelLabel="Bekor qilish"
        variant="warning"
        isLoading={isUnlocking}
        onConfirm={handleUnlockExam}
        onClose={() => setShowUnlockConfirm(false)}
      />
    </div>
  );
};
