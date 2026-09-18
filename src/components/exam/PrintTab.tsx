import React, { useState } from 'react';
import {
  Printer,
  FileDown,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Ruler,
  Maximize2,
  FileWarning,
  Info,
  Search,
} from 'lucide-react';
import { Exam, Registration } from '../../types';
import { api, ApiError } from '../../api';
import { useToast } from '../../context/ToastContext';

interface PrintTabProps {
  exam: Exam;
  registrations: Registration[];
  onLockExamRequested: () => void;
}

export const PrintTab: React.FC<PrintTabProps> = ({
  exam,
  registrations,
  onLockExamRequested,
}) => {
  const toast = useToast();
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadingRegId, setDownloadingRegId] = useState<number | null>(null);
  const [singleSearch, setSingleSearch] = useState('');

  const isDraft = exam.status === 'DRAFT';
  const hasRegistrations = registrations.length > 0;

  const handleDownloadAll = async () => {
    if (isDraft) {
      toast.error(
        "Chop etish cheklangan",
        "Imtihon qoralama holatida. Varaqalarni generatsiya qilishdan oldin imtihonni tasdiqlang (qulflang)."
      );
      return;
    }

    if (!hasRegistrations) {
      toast.warning("Hozircha birorta ham o'quvchi biriktirilmagan");
      return;
    }

    setIsDownloadingAll(true);
    try {
      await api.downloadExamSheetsPdf(
        exam.id,
        `imtihon_${exam.id}_varaqalar_${exam.subject.replace(/\s+/g, '_')}.pdf`
      );
      toast.success(
        "PDF muvaffaqiyatli yuklab olindi",
        `${registrations.length} ta o'quvchi uchun varaqalar yuklandi`
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error("Varaqalarni yuklab olishda xatolik", err.detail);
      } else {
        toast.error("Varaqalar faylini yuklab bo'lmadi");
      }
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const handleDownloadSingle = async (reg: Registration) => {
    setDownloadingRegId(reg.id);
    try {
      await api.downloadRegistrationSheetPdf(
        reg.id,
        `varaq_${reg.student?.full_name?.replace(/\s+/g, '_') || reg.id}.pdf`
      );
      toast.success("Varaqa yuklab olindi", reg.student?.full_name);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error("Varaqani yuklab olishda xatolik", err.detail);
      } else {
        toast.error("Varaqani yuklab bo'lmadi");
      }
    } finally {
      setDownloadingRegId(null);
    }
  };

  const filteredSingleRegs = registrations.filter((r) => {
    const sName = r.student?.full_name || '';
    const sId = r.student?.external_id || '';
    const sGroup = r.student?.group_name || '';
    const sCode = r.sheet_code || '';
    return (
      sName.toLowerCase().includes(singleSearch.toLowerCase()) ||
      sId.toLowerCase().includes(singleSearch.toLowerCase()) ||
      sGroup.toLowerCase().includes(singleSearch.toLowerCase()) ||
      sCode.toLowerCase().includes(singleSearch.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Draft Warning Banner (if still draft) */}
      {isDraft && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                Imtihon qoralama (DRAFT) holatida — Chop etish bloklangan
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                Tizim qoidalari bo'yicha: <strong>DRAFT → LOCKED → CHOP ETISH</strong>. Varaqalarni
                chop etishdan avval javoblar kalitini to'liq kiritib, imtihonni tasdiqlashingiz
                (qulflashingiz) shart. Aks holda varaqalar generatsiya qilinmaydi.
              </p>
            </div>
          </div>
          <button
            onClick={onLockExamRequested}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap cursor-pointer"
          >
            Imtihonni tasdiqlash (Qulflash)
          </button>
        </div>
      )}

      {/* Mandatory Optical Print Rules Box */}
      <div className="bg-rose-50/80 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800/80 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 rounded-xl shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-3 flex-1">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-rose-950 dark:text-rose-100">
                DIQQAT: Chop etishning qat'iy optik talablari!
              </h3>
              <p className="text-xs sm:text-sm text-rose-900 dark:text-rose-200 mt-1 leading-relaxed">
                Varaqalar avtomatlashtirilgan skaner tomonidan to'g'ri tanilishi (OCR) uchun
                quyidagi 3 qoidaga so'zsiz rioya qiling:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-900 flex items-start gap-3">
                <Maximize2 className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    1. 100% masshtab
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Printer sozlamalarida masshtabni aynan <strong>100% (Actual Size)</strong> qilib
                    belgilang.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-900 flex items-start gap-3">
                <FileWarning className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    2. "Fit to page" ni o'chiring
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    <strong>"Fit to page" / "Sahifaga sig'dirish"</strong> opsiyasini albatta
                    O'CHIRING, aks holda burchak markerlari siljiydi.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-900 flex items-start gap-3">
                <Ruler className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    3. 100 mm nazorat chizig'i
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Chop etilgach, varaq pastidagi nazorat chizig'ini lineyka bilan o'lchang —{' '}
                    <strong>aniq 100 mm</strong> chiqishi kerak!
                  </div>
                </div>
              </div>
            </div>

            {/* Visual calibration bar mockup */}
            <div className="mt-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <div className="text-[11px] font-semibold text-slate-500 mb-1">
                Varaq pastidagi nazorat kalibratsiyasi namunasi:
              </div>
              <div className="inline-block border-t-2 border-b-2 border-slate-900 dark:border-slate-100 px-1 py-1 font-mono text-xs font-bold tracking-widest text-slate-800 dark:text-slate-200">
                |&larr; ———————— 100 mm (10 sm) ———————— &rarr;|
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Download Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Printer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Barcha javob varaqalarini to'liq yuklab olish
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Ushbu faylda imtihonga biriktirilgan barcha ({registrations.length} ta) o'quvchilar
              uchun shaxsiy QR/shtrix-kodli javob varaqalari bitta ko'p sahifali PDF formatida
              shakllantiriladi (har bir sahifada 1 nafar o'quvchi).
            </p>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 pt-1">
              Shablon: <strong>{exam.template_name || 'A'}</strong> • Savollar soni:{' '}
              <strong>{exam.question_count} ta</strong> • Nomzodlar soni:{' '}
              <strong>{registrations.length} nafar</strong>
            </div>
          </div>

          <div className="shrink-0">
            <button
              id="download-all-sheets-pdf-btn"
              onClick={handleDownloadAll}
              disabled={isDraft || !hasRegistrations || isDownloadingAll}
              className={`w-full md:w-auto px-6 py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isDraft
                  ? 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
              }`}
            >
              {isDownloadingAll ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FileDown className="w-5 h-5" />
              )}
              Javob varaqalarini yuklab olish (PDF)
            </button>
          </div>
        </div>

        {isDraft && (
          <p className="mt-3 text-xs text-rose-600 dark:text-rose-400 font-medium">
            * Tugma nofaol: Imtihon qoralama holatida bo'lgani sababli varaqalarni yuklab bo'lmaydi.
          </p>
        )}
        {!isDraft && !hasRegistrations && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 font-medium">
            * Hozircha birorta ham o'quvchi biriktirilmagan. Avval "O'quvchilar" bo'limida guruh
            yoki nomzodlarni qo'shing.
          </p>
        )}
      </div>

      {/* Replacement Single Sheet Download (Yakka nusxalar / Qayta chop etish) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Yakka nusxadagi varaqalar (Almashirish uchun)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Agar o'quvchi o'z varaqasini yaroqsiz holga keltirsa yoki yo'qotsa, uning uchun shaxsiy
              almashtirish varaqasini alohida yuklab oling
            </p>
          </div>

          <div className="w-full sm:w-64 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="O'quvchini izlash..."
              value={singleSearch}
              onChange={(e) => setSingleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {registrations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Biriktirilgan o'quvchilar yo'q
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl">
            {filteredSingleRegs.map((reg) => (
              <div
                key={reg.id}
                className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {reg.student?.full_name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span>Guruh: {reg.student?.group_name}</span>
                    <span>•</span>
                    <code className="font-mono text-indigo-600 dark:text-indigo-400">
                      {reg.sheet_code}
                    </code>
                  </div>
                </div>

                <button
                  onClick={() => handleDownloadSingle(reg)}
                  disabled={downloadingRegId === reg.id}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg flex items-center gap-1.5 transition cursor-pointer border border-indigo-200 dark:border-indigo-800/60"
                >
                  {downloadingRegId === reg.id ? (
                    <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  Varaqani yuklab olish
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
