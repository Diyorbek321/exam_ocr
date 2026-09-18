import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  UserPlus,
  Search,
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  FileText,
  Filter,
} from 'lucide-react';
import { Student, ImportResult } from '../types';
import { api, ApiError } from '../api';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';

export const StudentsList: React.FC = () => {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');

  // Add individual student modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    external_id: '',
    group_name: '',
  });

  // Import panel state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete student confirmation
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const [studentData, groupData] = await Promise.all([
        api.getStudents({
          search: searchQuery.trim() || undefined,
          group_name: selectedGroup !== 'ALL' ? selectedGroup : undefined,
          limit: 2000,
        }),
        api.getStudentGroups(),
      ]);
      setStudents(studentData);
      setGroups(groupData);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toastRef.current.error("O'quvchilar ro'yxatini yuklashda xatolik", err.detail);
      } else {
        toastRef.current.error("O'quvchilar ro'yxati yuklanmadi");
      }
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedGroup]);

  useEffect(() => {
    fetchStudents();
  }, [searchQuery, selectedGroup]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.external_id.trim() || !formData.group_name.trim()) {
      toast.warning("Iltimos, barcha maydonlarni to'ldiring");
      return;
    }
    setIsAdding(true);
    try {
      const created = await api.createStudent({
        full_name: formData.full_name.trim(),
        external_id: formData.external_id.trim(),
        group_name: formData.group_name.trim(),
      });
      toast.success("O'quvchi muvaffaqiyatli qo'shildi", created.full_name);
      setIsAddOpen(false);
      setFormData({ full_name: '', external_id: '', group_name: '' });
      fetchStudents();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error("O'quvchini qo'shishda xatolik", err.detail);
      } else {
        toast.error("O'quvchini qo'shib bo'lmadi");
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteStudent(studentToDelete.id);
      toast.success("O'quvchi o'chirildi", studentToDelete.full_name);
      setStudents((prev) => prev.filter((s) => s.id !== studentToDelete.id));
      setStudentToDelete(null);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          toast.error(
            "O'chirib bo'lmaydi (409)",
            "Ushbu o'quvchi bir yoki bir nechta imtihonga biriktirilgan. Avval imtihonlardan o'quvchini chiqaring."
          );
        } else {
          toast.error("O'chirishda xatolik", err.detail);
        }
      } else {
        toast.error("O'quvchini o'chirib bo'lmadi");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.warning("Iltimos, import qilish uchun CSV yoki XLSX faylni tanlang");
      return;
    }
    setIsImporting(true);
    setImportResult(null);
    try {
      const res = await api.importStudents(selectedFile);
      setImportResult(res);
      toast.success(
        "Import jarayoni yakunlandi",
        `${res.created} ta o'quvchi qo'shildi, ${res.skipped} ta o'tkazildi`
      );
      fetchStudents();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error("Faylni import qilishda xatolik", err.detail);
      } else {
        toast.error("Faylni yuklab bo'lmadi");
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            O'quvchilar bazasi
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Barcha nomzodlar ro'yxati, guruhlar boshqaruvi va CSV / XLSX import
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-open-import"
            onClick={() => {
              setImportResult(null);
              setSelectedFile(null);
              setIsImportOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold transition cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            CSV / Excel import
          </button>

          <button
            id="btn-open-create-student"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm shadow-indigo-600/30 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            O'quvchi qo'shish
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="O'quvchi ismi yoki ID bo'yicha izlash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Group Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
          >
            <option value="ALL">Barcha guruhlar ({groups.length} ta)</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              O'quvchilar yuklanmoqda...
            </p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {searchQuery || selectedGroup !== 'ALL'
                ? "Qidiruv natijasida o'quvchi topilmadi"
                : "Hozircha birorta ham o'quvchi mavjud emas"}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              O'quvchilarni alohida qo'shing yoki CSV / Excel fayli orqali butun guruhlarni bir zumda
              yuklang.
            </p>
            {!searchQuery && selectedGroup === 'ALL' && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsImportOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Fayldan import qilish
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">F.I.SH (Full Name)</th>
                  <th className="px-5 py-3.5">Tashqi ID (External ID)</th>
                  <th className="px-5 py-3.5">Guruh (Group)</th>
                  <th className="px-5 py-3.5">Tizimdagi ID</th>
                  <th className="px-5 py-3.5 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((student) => (
                  <tr
                    key={student.id}
                    id={`student-row-${student.id}`}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {student.full_name}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <code className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                        {student.external_id}
                      </code>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {student.group_name}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-400 font-mono">
                      #{student.id}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <button
                        onClick={() => setStudentToDelete(student)}
                        title="O'quvchini o'chirish"
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Student by hand */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Yangi o'quvchi qo'shish
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  To'liq ism-familiyasi (F.I.SH) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Aliyev Vali Karimovich"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tashqi ID (Talaba / Maktab ID) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: ST-2024-001 yoki 349120"
                  value={formData.external_id}
                  onChange={(e) => setFormData({ ...formData, external_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Guruh nomi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: 10-A yoki 210-guruh"
                  value={formData.group_name}
                  onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  disabled={isAdding}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isAdding && (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: CSV / XLSX Import Panel */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  O'quvchilarni fayldan import qilish
                </h3>
              </div>
              <button
                onClick={() => setIsImportOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="mt-4 space-y-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-xl text-xs text-indigo-950 dark:text-indigo-200">
                <div className="font-bold">Fayl formati talabi (CSV yoki Excel XLSX):</div>
                <div className="mt-1">
                  Ustunlar quyidagi tartibda bo'lishi kerak: <br />
                  <code className="font-mono font-semibold bg-white/70 dark:bg-slate-900/80 px-1 py-0.5 rounded">
                    full_name, external_id, group_name
                  </code>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
                  dragActive
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40'
                    : selectedFile
                    ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/30'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                {selectedFile ? (
                  <div>
                    <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB — Boshqa fayl tanlash uchun bosing
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      CSV yoki XLSX faylni bu yerga tashlang
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      yoki kompyuteringizdan tanlash uchun bosing
                    </div>
                  </div>
                )}
              </div>

              {/* Import Results Box (created, skipped, errors) */}
              {importResult && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span>Import natijalari:</span>
                    <span className="text-xs font-mono font-normal">
                      Yaratildi: <strong>{importResult.created}</strong> | O'tkazildi:{' '}
                      <strong>{importResult.skipped}</strong>
                    </span>
                  </div>

                  {importResult.errors && importResult.errors.length > 0 ? (
                    <div className="mt-2 text-rose-600 dark:text-rose-400 space-y-1 max-h-32 overflow-y-auto">
                      <div className="font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Xatoliklar ({importResult.errors.length} ta):
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                        {importResult.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Hech qanday xatolik yuz bermadi, barcha qatorlar muvaffaqiyatli saqlandi.
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  disabled={isImporting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Yopish
                </button>
                <button
                  type="submit"
                  disabled={isImporting || !selectedFile}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isImporting && (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  Yuklash va import qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!studentToDelete}
        title="O'quvchini bazadan o'chirish"
        description={`"${studentToDelete?.full_name}" o'quvchisi bazadan o'chiriladi. Agar o'quvchi biror imtihonda ro'yxatdan o'tgan bo'lsa, tizim 409 xatolik qaytaradi.`}
        confirmLabel="Ha, o'chirilsin"
        cancelLabel="Bekor qilish"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteStudent}
        onClose={() => setStudentToDelete(null)}
      />
    </div>
  );
};
