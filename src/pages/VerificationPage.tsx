import { useMemo, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { CheckCircle2, AlertTriangle, Search, Eye, Pencil, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { clampString, formatDateId, formatFullDayDateId, getTodayDateStr } from '../lib/formatters';
import { useAuth } from '../context/AuthContext';
import { ShiftBadge, VerificationBadge } from '../components/ui/StatusBadge';
import { LogbookWizardModal } from '../components/logbook/LogbookWizardModal';
import type {
  ActionCategory,
  Doctor,
  LogbookEntry,
  LogbookLock,
  Machine,
  MachineLock,
  Patient,
  StaffDirectoryEntry,
  VerificationStatus,
} from '../types';

interface VerificationPageProps {
  logbooks: LogbookEntry[];
  logbookLocks: LogbookLock[];
  machineLocks: MachineLock[];
  patients: Patient[];
  doctors: Doctor[];
  machines: Machine[];
  actionCategories: ActionCategory[];
  staffDirectory: StaffDirectoryEntry[];
}

export function VerificationPage({
  logbooks,
  logbookLocks,
  machineLocks,
  patients,
  doctors,
  machines,
  actionCategories,
  staffDirectory,
}: VerificationPageProps) {
  const { firebaseUser, userProfile } = useAuth();
  const [dateFilter, setDateFilter] = useState(getTodayDateStr());
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'Pending' | 'Revision' | 'Approved' | 'ALL'>('Pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [editingWizardEntry, setEditingWizardEntry] = useState<LogbookEntry | null>(null);
  const [reopenReviewEntryId, setReopenReviewEntryId] = useState<string | null>(null);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);
  const [verificationNote, setVerificationNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const selectedEntry = useMemo(
    () => (selectedEntryId ? logbooks.find((item) => item.id === selectedEntryId) || null : null),
    [logbooks, selectedEntryId]
  );

  const canEditBeforeVerify =
    userProfile?.role === 'PJ Shift' ||
    userProfile?.role === 'Kepala Ruang' ||
    userProfile?.role === 'Administrator';

  const queueItems = useMemo(() => {
    return logbooks.filter((item) => {
      if (dateFilter && item.date !== dateFilter) return false;
      if (statusFilter === 'ALL') {
        if (item.verificationStatus === 'Approved') return false;
      } else if (item.verificationStatus !== statusFilter) {
        return false;
      }
      if (shiftFilter !== 'ALL' && item.shift !== shiftFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const hit =
          item.nurseName.toLowerCase().includes(q) ||
          item.patientName.toLowerCase().includes(q) ||
          item.machineNumber.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [logbooks, dateFilter, statusFilter, shiftFilter, searchTerm]);

  const handleOpenEditWizard = (entry: LogbookEntry, fromReviewModal: boolean) => {
    setEditSuccessMsg(null);
    if (fromReviewModal) {
      setReopenReviewEntryId(entry.id);
      setSelectedEntryId(null);
    } else {
      setReopenReviewEntryId(null);
    }
    setEditingWizardEntry(entry);
  };

  const handleVerify = async (entry: LogbookEntry, nextStatus: VerificationStatus, note?: string) => {
    if (!firebaseUser || !userProfile || !entry.id) return;
    const targetStatus: VerificationStatus = nextStatus === 'Approved' ? 'Approved' : 'Revision';
    const verifierName =
      clampString(
        userProfile.fullName || firebaseUser.displayName || firebaseUser.email || 'Verifikator',
        120
      ) || 'Verifikator';
    setProcessingId(entry.id);
    try {
      await updateDoc(doc(db, 'logbook', entry.id), {
        verificationStatus: targetStatus,
        verifiedBy: firebaseUser.uid,
        verifiedByName: verifierName,
        verificationNote: clampString(note || '', 500),
        verifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSelectedEntryId(null);
      setVerificationNote('');
      setEditSuccessMsg(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `logbook/${entry.id}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold text-slate-900">
          Verifikasi Logbook Tindakan Hemodialisa
        </h2>
        <p className="text-xs text-slate-500">
          Periksa atau ubah kesesuaian tindakan Pre/Post HD perawat pelaksana sebelum masuk ke rekapitulasi terverifikasi unit.
        </p>
      </div>

      {editSuccessMsg && !selectedEntry && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            {editSuccessMsg}
          </span>
          <button
            type="button"
            onClick={() => setEditSuccessMsg(null)}
            className="rounded p-1 text-emerald-600 hover:bg-emerald-100"
            aria-label="Tutup pemberitahuan"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama perawat, pasien, mesin..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              aria-label="Filter Tanggal Verifikasi"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
            />
            {dateFilter ? (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="rounded-lg border border-slate-300 px-2.5 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 shrink-0"
                title="Tampilkan semua tanggal"
              >
                Semua
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setDateFilter(getTodayDateStr())}
                className="rounded-lg border border-slate-300 px-2.5 py-2 text-[11px] font-semibold text-teal-700 hover:bg-teal-50 shrink-0"
                title="Kembali ke hari aktif"
              >
                Hari Ini
              </button>
            )}
          </div>
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
          >
            <option value="ALL">Semua Shift</option>
            <option value="Pagi">Shift Pagi</option>
            <option value="Siang">Shift Siang</option>
            <option value="Malam">Shift Malam</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'Pending' | 'Revision' | 'Approved' | 'ALL')
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
          >
            <option value="Pending">Menunggu Verifikasi (Pending)</option>
            <option value="Revision">Dalam Revisi</option>
            <option value="Approved">Terverifikasi (Sudah Diverifikasi)</option>
            <option value="ALL">Semua Belum Approved</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>
            Periode tampil:{' '}
            <strong className="text-slate-700">
              {dateFilter ? formatFullDayDateId(dateFilter) : 'Semua Tanggal'}
            </strong>
          </span>
          {dateFilter && dateFilter !== getTodayDateStr() && (
            <button
              type="button"
              onClick={() => setDateFilter(getTodayDateStr())}
              className="font-semibold text-teal-700 hover:underline"
            >
              Kembali ke Hari Ini ({formatDateId(getTodayDateStr())})
            </button>
          )}
        </div>
      </div>

      {/* Queue Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {queueItems.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-teal-600" />
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {statusFilter === 'Approved'
                ? 'Belum ada logbook terverifikasi pada filter ini'
                : 'Tidak ada antrian logbook untuk diverifikasi'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {statusFilter === 'Approved'
                ? 'Coba ubah tanggal atau shift untuk melihat logbook yang sudah diverifikasi.'
                : 'Seluruh logbook pada filter ini telah divalidasi.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Perawat</th>
                  <th className="px-4 py-3 font-semibold">Pasien &amp; Tindakan</th>
                  <th className="px-4 py-3 font-semibold">Parameter HD</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queueItems.map((item) => {
                  const canEditItem =
                    canEditBeforeVerify &&
                    (item.verificationStatus === 'Pending' || item.verificationStatus === 'Revision');
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-mono font-semibold text-slate-900 tabular-nums">
                          {formatDateId(item.date)}
                        </div>
                        <div className="mt-1">
                          <ShiftBadge shift={item.shift} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{item.nurseName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{item.nurseNip}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{item.patientName}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.actionCategory} · {item.machineNumber}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          DPJP: {item.doctorName}
                          {item.dutyDoctorName ? ` · Jaga: ${item.dutyDoctorName}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-slate-700">
                        <div>
                          BB: {item.preWeight} &rarr; {item.postWeight} kg
                        </div>
                        <div>
                          TD: {item.preBp} &rarr; {item.postBp} · UF: {item.ufAchieved} ml
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <VerificationBadge status={item.verificationStatus} />
                        {item.verificationStatus === 'Approved' && item.verifiedByName && (
                          <p className="mt-1 text-[10px] text-emerald-700 font-medium">
                            Diverifikasi: {item.verifiedByName}
                          </p>
                        )}
                        {item.targetVerifierName && (
                          <p className="mt-1 text-[10px] text-slate-500">
                            Tujuan: {item.targetVerifierName}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEntryId(item.id);
                              setVerificationNote(item.verificationNote || '');
                              setEditSuccessMsg(null);
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Periksa
                          </button>
                          {canEditItem && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditWizard(item, false)}
                              className="inline-flex items-center gap-1 rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Ubah
                            </button>
                          )}
                          {item.verificationStatus !== 'Approved' && (
                            <button
                              type="button"
                              disabled={processingId === item.id}
                              onClick={() => handleVerify(item, 'Approved', 'Sesuai standar asuhan HD')}
                              className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Setujui
                            </button>
                          )}
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

      {/* Review & Verify Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Review Logbook Sebelum Validasi
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedEntry.nurseName} · {formatDateId(selectedEntry.date)} ({selectedEntry.shift})
                  {selectedEntry.targetVerifierName && ` · Diajukan ke: ${selectedEntry.targetVerifierName}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedEntryId(null);
                  setEditSuccessMsg(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto">
              {editSuccessMsg && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{editSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div>
                  <span className="text-slate-500">Pasien:</span>
                  <p className="font-semibold text-slate-900">
                    {selectedEntry.patientName} ({selectedEntry.patientRm})
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Mesin, DPJP &amp; Dokter Jaga:</span>
                  <p className="font-semibold text-slate-900">
                    {selectedEntry.machineNumber} · {selectedEntry.doctorName}
                  </p>
                  {selectedEntry.dutyDoctorName && (
                    <p className="text-[11px] text-slate-600">
                      Dokter Jaga: {selectedEntry.dutyDoctorName}
                    </p>
                  )}
                </div>
                <div>
                  <span className="text-slate-500">BB Pre / Post &amp; UF:</span>
                  <p className="font-mono font-semibold text-slate-900 tabular-nums">
                    {selectedEntry.preWeight} &rarr; {selectedEntry.postWeight} kg · UF {selectedEntry.ufAchieved}/{selectedEntry.ufGoal} ml
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">TD Pre / Post &amp; Akses:</span>
                  <p className="font-mono font-semibold text-slate-900 tabular-nums">
                    {selectedEntry.preBp} &rarr; {selectedEntry.postBp} · {selectedEntry.vascularAccess}
                  </p>
                </div>
              </div>

              {selectedEntry.wizardDetails && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-slate-200 p-3.5 bg-white">
                  <div>
                    <p className="font-semibold text-slate-900">Ruang, RO &amp; PPI</p>
                    <p className="text-slate-600">
                      RO: {selectedEntry.wizardDetails.section1.roStatus} (TDS {selectedEntry.wizardDetails.section1.roTds}) · Zonasi: {selectedEntry.wizardDetails.section1.infectionZoneStatus}
                    </p>
                    <p className="text-slate-600">
                      Dialisat: {selectedEntry.wizardDetails.section2.dialysateType} {selectedEntry.wizardDetails.section2.dialysateTemp}°C · Antikoagulan: {selectedEntry.wizardDetails.section2.anticoagulantType}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Pre, Edukasi &amp; Post HD</p>
                    <p className="text-slate-600">
                      IDWG: {selectedEntry.wizardDetails.section3.idwg} kg · BFR {selectedEntry.wizardDetails.section3.bfr} ml/mnt · Teach-Back: {selectedEntry.wizardDetails.section5.teachBackStatus}
                    </p>
                    <p className="text-slate-600">
                      Hemostasis: {selectedEntry.wizardDetails.section6.bleedingStopMinutes} mnt · Disinfeksi: {selectedEntry.wizardDetails.section6.machineDisinfectionType}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <span className="font-semibold text-slate-700">Komplikasi:</span>
                <p className="mt-0.5 text-slate-600">{selectedEntry.complications}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Catatan Asuhan Keperawatan:</span>
                <p className="mt-0.5 whitespace-pre-line text-slate-600">{selectedEntry.nursingNotes}</p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Catatan Verifikator (Wajib jika meminta Revisi)
                </label>
                <textarea
                  rows={2}
                  value={verificationNote}
                  onChange={(e) => setVerificationNote(e.target.value)}
                  placeholder="Tuliskan catatan validasi atau poin yang perlu direvisi perawat..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
                {canEditBeforeVerify &&
                (selectedEntry.verificationStatus === 'Pending' ||
                  selectedEntry.verificationStatus === 'Revision') ? (
                  <button
                    type="button"
                    disabled={processingId === selectedEntry.id}
                    onClick={() => handleOpenEditWizard(selectedEntry, true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Ubah Data Logbook
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={processingId === selectedEntry.id}
                    onClick={() =>
                      handleVerify(
                        selectedEntry,
                        'Revision',
                        verificationNote.trim() || 'Mohon lengkapi catatan tindakan.'
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Minta Revisi
                  </button>
                  {selectedEntry.verificationStatus !== 'Approved' && (
                    <button
                      type="button"
                      disabled={processingId === selectedEntry.id}
                      onClick={() =>
                        handleVerify(
                          selectedEntry,
                          'Approved',
                          verificationNote.trim() || 'Terverifikasi sesuai standar HD'
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Setujui &amp; Validasi
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verifier Logbook Edit Wizard Modal */}
      {editingWizardEntry && (
        <LogbookWizardModal
          editingEntry={editingWizardEntry}
          verifierEditMode={true}
          initialPatientId={editingWizardEntry.patientId}
          initialMachineId={editingWizardEntry.machineId}
          initialDate={editingWizardEntry.date}
          initialShift={editingWizardEntry.shift}
          initialDoctorId={editingWizardEntry.doctorId}
          initialDutyDoctorId={editingWizardEntry.dutyDoctorId}
          initialDutyDoctorName={editingWizardEntry.dutyDoctorName}
          logbooks={logbooks}
          logbookLocks={logbookLocks}
          machineLocks={machineLocks}
          patients={patients}
          doctors={doctors}
          machines={machines}
          actionCategories={actionCategories}
          staffDirectory={staffDirectory}
          onSaved={() => {
            setEditSuccessMsg(
              `Perubahan logbook pasien ${editingWizardEntry.patientName} berhasil disimpan. Silakan lanjutkan proses verifikasi.`
            );
          }}
          onClose={() => {
            const toReopen = reopenReviewEntryId;
            setEditingWizardEntry(null);
            setReopenReviewEntryId(null);
            if (toReopen) {
              setSelectedEntryId(toReopen);
            }
          }}
        />
      )}
    </div>
  );
}

