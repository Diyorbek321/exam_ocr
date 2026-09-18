import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Calendar,
  BookOpen,
  HelpCircle,
  Clock,
  Lock,
  LockOpen,
  Trash2,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Users,
} from 'lucide-react';
import { Exam, ExamStatus } from '../types';
import { api, ApiError } from '../api';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';

interface ExamsListProps {
  navigate: (route: string) => void;
}

export const ExamsList: React.FC<ExamsListProps> = ({ navigate }) => {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [exams, setExams] = useState<Exam[]>([]);
  const [registrationsCount, setRegistrationsCount] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ExamStatus>('ALL');

  // Create Exam Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    exam_date: new Date().toISOString().split('T')[0],
    template_name: 'A',
    question_count: 30,
    pass_percent: 60,
  });

  // Delete Exam modal state
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchExams = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getExams();
      setExams(data);

      // Fetch registration counts for each exam in parallel
      const counts: Record<number, number> = {};
      await Promise.all(
        data.map(async (exam) => {
          try {
            const regs = await api.getRegistrations(exam.id);
            counts[exam.id] = regs.length;
          } catch {
            counts[exam.id] = 0;
          }
        })
      );
      setRegistrationsCount(counts);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toastRef.current.error("Imtihonlar ro'yxatini yuklashda xatolik", err.detail);
      } else {
        toastRef.current.error("Imtihonlar ro'yxatini yuklashda xatolik yuz berdi");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
    const handleApiChanged = () => fetchExams();
    window.addEventListener('exam_ocr_api_changed', handleApiChanged);
    return () => window.removeEventListener('exam_ocr_api_changed', handleApiChanged);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.subject.trim()) {
      toast.warning("Iltimos, imtihon nomi va fanni to'ldiring");
      return;
    }
    setIsSubmitting(true);
    try {
      const newExam = await api.createExam({
        title: formData.title.trim(),
        subject: formData.subject.trim(),
        exam_date: formData.exam_date,
        template_name: formData.template_name || 'A',
        question_count: Number(formData.question_count) || 30,
        pass_percent: Number(formData.pass_percent) || 60,
      });
      toast.success("Imtihon muvaffaqiyatli yaratildi", `ID: ${newExam.id} — ${newExam.title}`);
      setIsCreateOpen(false);
      setFormData({
        title: '',
        subject: '',
        exam_date: new Date().toISOString().split('T')[0],
        template_name: 'A',
        question_count: 30,
        pass_percent: 60,
      });
      navigate(`/exams/${newExam.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error("Imtihon yaratishda xatolik yuz berdi", err.detail);
      } else {
        toast.error("Imtihon yaratishda xatolik");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!examToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteExam(examToDelete.id);
      toast.success("Imtihon o'chirildi", `"${examToDelete.title}" muvaffaqiyatli o'chirildi`);
      setExams((prev) => prev.filter((e) => e.id !== examToDelete.id));
      setExamToDelete(null);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error("Imtihonni o'chirishda xatolik", err.detail);
      } else {
        toast.error("Imtihonni o'chirib bo'lmadi");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredExams = exams.filter((exam) => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || exam.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ExamStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" />
            Qoralama (DRAFT)
          </span>
        );
      case 'LOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Lock className="w-3.5 h-3.5" />
            Tasdiqlangan (LOCKED)
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Yakunlangan (CLOSED)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Imtihonlar
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Mavjud imtihonlarni boshqarish, javoblar kalitini kiritish va natijalarni hisoblash
          </p>
        </div>

        <button
          id="btn-new-exam"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm shadow-indigo-600/30 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Yangi imtihon
        </button>
      </div>

      {/* Filter and Search toolbar */}
      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Imtihon nomi yoki fan bo'yicha izlash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Barchasi ({exams.length})
          </button>
          <button
            onClick={() => setStatusFilter('DRAFT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              statusFilter === 'DRAFT'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Qoralamalar ({exams.filter((e) => e.status === 'DRAFT').length})
          </button>
          <button
            onClick={() => setStatusFilter('LOCKED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              statusFilter === 'LOCKED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Tasdiqlangan ({exams.filter((e) => e.status === 'LOCKED').length})
          </button>
        </div>
      </div>

      {/* Exams list table */}
      <div className="mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Imtihonlar yuklanmoqda...
            </p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {searchQuery || statusFilter !== 'ALL'
                ? "Hech qanday imtihon topilmadi"
                : "Hozircha birorta ham imtihon yaratilmagan"}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? "Qidiruv parametrlarini o'zgartirib ko'ring yoki filterni tozalang"
                : "Birinchi imtihoningizni yaratish uchun quyidagi tugmani bosing va javoblar kalitini kiriting."}
            </p>
            {!searchQuery && statusFilter === 'ALL' && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Yangi imtihon yaratish
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Imtihon nomi & Fan</th>
                  <th className="px-5 py-3.5">Sana</th>
                  <th className="px-5 py-3.5">Savollar soni</th>
                  <th className="px-5 py-3.5">O'tish foizi</th>
                  <th className="px-5 py-3.5">Ro'yxatdan o'tganlar</th>
                  <th className="px-5 py-3.5">Holat</th>
                  <th className="px-5 py-3.5 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredExams.map((exam) => {
                  const regCount = registrationsCount[exam.id] ?? 0;
                  return (
                    <tr
                      key={exam.id}
                      id={`exam-row-${exam.id}`}
                      onClick={() => navigate(`/exams/${exam.id}`)}
                      className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition flex items-center gap-2">
                          {exam.title}
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            #{exam.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{exam.subject}</span>
                          <span>•</span>
                          <span>Shablon: {exam.template_name || 'A'}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{exam.exam_date || '-'}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {exam.question_count} ta
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-block font-mono font-medium text-slate-700 dark:text-slate-300">
                          {exam.pass_percent}%
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{regCount} ta nomzod</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {getStatusBadge(exam.status)}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {exam.status === 'DRAFT' && (
                            <button
                              id={`delete-exam-${exam.id}`}
                              onClick={() => setExamToDelete(exam)}
                              title="Qoralamani o'chirish"
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/exams/${exam.id}`)}
                            className="p-1.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 rounded-lg transition"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Exam Dialog */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            id="create-exam-modal"
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Yangi imtihon yaratish
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Imtihon ma'lumotlarini kiriting va qoralama holatida saqlang
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Imtihon sarlavhasi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: 1-oraliq nazorat (Matematika)"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Fan nomi *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Oliy matematika"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Imtihon sanasi
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.exam_date}
                    onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Savollar soni
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    required
                    value={formData.question_count}
                    onChange={(e) =>
                      setFormData({ ...formData, question_count: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    O'tish foizi (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={formData.pass_percent}
                    onChange={(e) =>
                      setFormData({ ...formData, pass_percent: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Varaqa shabloni
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.template_name}
                    onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  id="submit-create-exam"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  Yaratish va kalitga o'tish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!examToDelete}
        title="Imtihon qoralamasini o'chirish"
        description={`"${examToDelete?.title}" imtihoni va unga tegishli barcha ma'lumotlar butunlay o'chiriladi. Ushbu amalni qaytarib bo'lmaydi.`}
        confirmLabel="Ha, o'chirilsin"
        cancelLabel="Bekor qilish"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setExamToDelete(null)}
      />
    </div>
  );
};
