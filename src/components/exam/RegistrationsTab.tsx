import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  FileDown,
  Edit3,
  Search,
  UserCheck,
  UserX,
  AlertCircle,
  FolderPlus,
  ExternalLink,
} from 'lucide-react';
import { Exam, Registration, Student } from '../../types';
import { api, ApiError } from '../../api';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../ConfirmModal';

interface RegistrationsTabProps {
  exam: Exam;
  navigate: (route: string) => void;
}

export const RegistrationsTab: React.FC<RegistrationsTabProps> = ({ exam, navigate }) => {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('ALL');

  // Groups and Students for adding
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  // Add by group modal
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [isAddingGroup, setIsAddingGroup] = useState(false);

  // Add individual student modal
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  // Delete registration confirmation
  const [regToDelete, setRegToDelete] = useState<Registration | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRegistrations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getRegistrations(exam.id);
      setRegistrations(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toastRef.current.error("O'quvchilar ro'yxatini yuklashda xatolik", err.detail);
      } else {
        toastRef.current.error("O'quvchilar ro'yxati yuklanmadi");
      }
    } finally {
      setIsLoading(false);
    }
  }, [exam.id]);

  const fetchAuxData = useCallback(async () => {
    try {
      const [groups, students] = await Promise.all([
        api.getStudentGroups(),
        api.getStudents({ limit: 1000 }),
      ]);
      setAvailableGroups(groups);
      setAllStudents(students);
    } catch {
      // Ignored or handled softly
    }
  }, []);

  useEffect(() => {
    fetchRegistrations();
    fetchAuxData();
  }, [exam.id]);

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) {
      toast.warning("Iltimos, guruhni tanlang");
      return;
    }
    setIsAddingGroup(true);
    try {
      const newRegs = await api.registerStudents(exam.id, {
        group_name: selectedGroup,
      });
      toast.success(
        "Guruh o'quvchilari qo'shildi",
        `${newRegs.length} ta yangi o'quvchi ro'yxatdan o'tkazildi`
      );
      setIsAddGroupOpen(false);
      setSelectedGroup('');
      fetchRegistrations();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error("Guruhni qo'shishda xatolik", err.detail);
      } else {
        toast.error("Guruh o'quvchilarini qo'shib bo'lmadi");
      }
    } finally {
      setIsAddingGroup(false);
    }
  };

  const handleAddIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      toast.warning("Iltimos, o'quvchini tanlang");
      return;
    }
    setIsAddingStudent(true);
    try {
      const newRegs = await api.registerStudents(exam.id, {
        student_ids: [Number(selectedStudentId)],
      });
      toast.success("O'quvchi imtihonga biriktirildi");
      setIsAddStudentOpen(false);
      setSelectedStudentId('');
      fetchRegistrations();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error("O'quvchini qo'shishda xatolik", err.detail);
      } else {
        toast.error("O'quvchini qo'shib bo'lmadi");
      }
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleToggleAbsent = async (reg: Registration) => {
    const newAbsent = !reg.absent;
    try {
      const updated = await api.setAbsent(reg.id, newAbsent);
      setRegistrations((prev) =>
        prev.map((r) => (r.id === reg.id ? { ...r, absent: updated.absent } : r))
      );
      toast.info(
        updated.absent
          ? `${reg.student.full_name} kelmadi (ABSENT) deb belgilandi`
          : `${reg.student.full_name} qatnashgan deb belgilandi`
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error("Holatni yangilashda xatolik", err.detail);
      } else {
        toast.error("Holatni o'zgartirib bo'lmadi");
      }
    }
  };

  const handleDeleteReg = async () => {
    if (!regToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteRegistration(regToDelete.id);
      toast.success(
        "Ro'yxatdan chiqarildi",
        `${regToDelete.student.full_name} imtihondan o'chirildi`
      );
      setRegistrations((prev) => prev.filter((r) => r.id !== regToDelete.id));
      setRegToDelete(null);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error("O'chirishda xatolik", err.detail);
      } else {
        toast.error("O'chirib bo'lmadi (baholangan bo'lishi mumkin)");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadSheet = async (regId: number, studentName: string) => {
    try {
      await api.downloadRegistrationSheetPdf(regId, `varaq_${studentName.replace(/\s+/g, '_')}.pdf`);
      toast.success("Varaqa yuklab olindi");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error("PDF yuklab olishda xatolik", err.detail);
      } else {
        toast.error("Varaqani yuklab bo'lmadi");
      }
    }
  };

  // Filter registrations
  const filteredRegs = registrations.filter((reg) => {
    const sName = reg.student?.full_name || '';
    const sId = reg.student?.external_id || '';
    const sGroup = reg.student?.group_name || '';
    const sheetCode = reg.sheet_code || '';

    const matchesSearch =
      sName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheetCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGroup = groupFilter === 'ALL' || sGroup === groupFilter;
    return matchesSearch && matchesGroup;
  });

  // Groups present in this exam's registrations
  const examGroups = Array.from(
    new Set(registrations.map((r) => r.student?.group_name).filter(Boolean))
  );

  // Unregistered students for individual addition
  const registeredStudentIds = new Set(registrations.map((r) => r.student_id));
  const availableStudents = allStudents.filter(
    (s) =>
      !registeredStudentIds.has(s.id) &&
      (s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.external_id.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.group_name.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header and Add Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Biriktirilgan o'quvchilar ({registrations.length} ta)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Imtihonga o'quvchilarni guruh bo'yicha yoki yakka tartibda qo'shing
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="btn-add-group"
            onClick={() => setIsAddGroupOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Guruh bo'yicha qo'shish
          </button>

          <button
            id="btn-add-student"
            onClick={() => setIsAddStudentOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-600/30 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            O'quvchi qo'shish
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Ism, ID yoki varaq kodi bo'yicha qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
        </div>

        {examGroups.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
              Guruh:
            </span>
            <button
              onClick={() => setGroupFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                groupFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Barchasi
            </button>
            {examGroups.map((g) => (
              <button
                key={g}
                onClick={() => setGroupFilter(g)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  groupFilter === g
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Registrations Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              O'quvchilar yuklanmoqda...
            </p>
          </div>
        ) : filteredRegs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <Users className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {searchQuery || groupFilter !== 'ALL'
                ? "Qidiruv bo'yicha o'quvchi topilmadi"
                : "Ushbu imtihonga hali hech kim biriktirilmagan"}
            </h4>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery || groupFilter !== 'ALL'
                ? "Filtrni tozalab ko'ring"
                : "Varaqalarni chop etishdan avval imtihonga guruh yoki o'quvchilarni biriktiring."}
            </p>
            {!searchQuery && groupFilter === 'ALL' && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsAddGroupOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Guruh qo'shish
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">F.I.SH & ID</th>
                  <th className="px-5 py-3.5">Guruh</th>
                  <th className="px-5 py-3.5">Varaqa kodi</th>
                  <th className="px-5 py-3.5">Joy (Seat)</th>
                  <th className="px-5 py-3.5">Ishtirok</th>
                  <th className="px-5 py-3.5 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRegs.map((reg) => (
                  <tr
                    key={reg.id}
                    id={`reg-row-${reg.id}`}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition ${
                      reg.absent ? 'opacity-60 bg-slate-50/40 dark:bg-slate-900/40' : ''
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {reg.student?.full_name || 'Nomaʼlum o‘quvchi'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        ID: {reg.student?.external_id || '-'}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {reg.student?.group_name || '-'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <code className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-bold border border-indigo-200 dark:border-indigo-800">
                        {reg.sheet_code}
                      </code>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                      {reg.seat || '—'}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleAbsent(reg)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${
                          reg.absent
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                        title="Ishtirok holatini o'zgartirish"
                      >
                        {reg.absent ? (
                          <>
                            <UserX className="w-3.5 h-3.5" />
                            Kelmadi (Absent)
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            Qatnashdi
                          </>
                        )}
                      </button>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Download single sheet */}
                        <button
                          onClick={() =>
                            handleDownloadSheet(reg.id, reg.student?.full_name || 'student')
                          }
                          title="Ushbu o'quvchi uchun yakka varaqani yuklab olish"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>

                        {/* Manual entry fallback */}
                        <button
                          onClick={() => navigate(`/exams/${exam.id}/manual/${reg.id}`)}
                          title="Javoblarni qo'lda kiritish (Manual Entry)"
                          className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete registration */}
                        <button
                          onClick={() => setRegToDelete(reg)}
                          title="Imtihondan chiqarish"
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add by Group */}
      {isAddGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Guruh bo'yicha o'quvchilarni biriktirish
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tanlangan guruhdagi barcha faol o'quvchilar ushbu imtihonga avtomatik qo'shiladi va har biriga shaxsiy varaq kodi ajratiladi.
            </p>

            <form onSubmit={handleAddGroup} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Guruhni tanlang *
                </label>
                <select
                  required
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                >
                  <option value="">-- Guruhni tanlang --</option>
                  {availableGroups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                {availableGroups.length === 0 && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    O'quvchilar bazasida hech qanday guruh mavjud emas. Avval o'quvchilar bazasiga o'quvchilarni import qiling.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddGroupOpen(false)}
                  disabled={isAddingGroup}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isAddingGroup || !selectedGroup}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isAddingGroup && (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  Guruhni biriktirish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Individual Student */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              O'quvchini alohida qo'shish
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Bazada mavjud o'quvchilardan birini tanlab imtihonga qo'shing
            </p>

            <form onSubmit={handleAddIndividual} className="mt-4 space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="O'quvchini ism, ID yoki guruh bo'yicha qidirish..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 mb-2"
                />

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  {availableStudents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      O'quvchi topilmadi yoki barcha o'quvchilar allaqachon biriktirilgan
                    </div>
                  ) : (
                    availableStudents.slice(0, 50).map((s) => (
                      <label
                        key={s.id}
                        className={`p-3 flex items-center justify-between hover:bg-indigo-50/50 dark:hover:bg-slate-800 cursor-pointer ${
                          selectedStudentId === s.id
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                            : ''
                        }`}
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {s.full_name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            ID: {s.external_id} • Guruh: {s.group_name}
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="student_selection"
                          value={s.id}
                          checked={selectedStudentId === s.id}
                          onChange={() => setSelectedStudentId(s.id)}
                          className="w-4 h-4 text-indigo-600"
                        />
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  disabled={isAddingStudent}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isAddingStudent || !selectedStudentId}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isAddingStudent && (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  Imtihonga qo'shish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Registration Confirm Modal */}
      <ConfirmModal
        isOpen={!!regToDelete}
        title="O'quvchini imtihondan chiqarish"
        description={`"${regToDelete?.student?.full_name}" o'quvchisi ushbu imtihondan chiqariladi. Agar uning varaqasi allaqachon baholangan bo'lsa, tizim o'chirishga ruxsat bermaydi.`}
        confirmLabel="Ha, chiqarilsin"
        cancelLabel="Bekor qilish"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteReg}
        onClose={() => setRegToDelete(null)}
      />
    </div>
  );
};
