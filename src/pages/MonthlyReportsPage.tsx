import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Download, Eye, Printer, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  MONTH_NAMES_ID,
  exportToCsv,
  formatDateId,
  formatMonthLabel,
  getCurrentMonthKey,
  getDaysInMonth,
} from '../lib/formatters';
import { LogbookDetailModal } from '../components/logbook/LogbookDetailModal';
import { ShiftBadge, VerificationBadge } from '../components/ui/StatusBadge';
import type { LogbookEntry, StaffDirectoryEntry, UserRole } from '../types';

interface MonthlyReportsPageProps {
  logbooks: LogbookEntry[];
  staffDirectory: StaffDirectoryEntry[];
}

interface MonthlySpoRow {
  id: string;
  category: string;
  description: string;
  standard: string;
}

interface MonthlySpoSection {
  title: string;
  maxMode: 'daily_cap_1' | 'per_patient';
  items: MonthlySpoRow[];
}

const MONTHLY_SPO_SECTIONS: MonthlySpoSection[] = [
  {
    title:
      'BAGIAN I: KESIAPAN FASILITAS RUANGAN HEMODIALISIS & SISTEM WATER TREATMENT (RO) — [NILAI MAKS. 1 / HARI]',
    maxMode: 'daily_cap_1',
    items: [
      {
        id: '1.1',
        category: 'Water Treatment & Mutu Air RO',
        description:
          'Memastikan kesiapan sistem Water Treatment (Reverse Osmosis / RO), uji konduktivitas, tekanan sirkulasi, serta kualitas air dialisis sesuai baku mutu AAMI/PERNEFRI.',
        standard: 'SPO-HD-01: Mutu Air RO & Pre-Treatment Harian',
      },
      {
        id: '1.2',
        category: 'Kesiapan Ruangan & Zonasi Infeksi',
        description:
          'Memastikan kesiapan ruangan hemodialisis, suhu dan kelembaban lingkungan, sanitasi permukaan tempat tidur, serta kepatuhan pemisahan area infeksius (Hepatitis B/C).',
        standard: 'SPO-HD-02: Kesiapan Lingkungan & PPI Unit Dialisis',
      },
      {
        id: '1.3',
        category: 'Emergency Room & Troli Emergensi',
        description:
          'Memastikan kesiapan fasilitas kegawatdaruratan (Emergency Trolley, obat-obatan emergensi, defibrilator, oksigen sentral, dan suction) sebelum pelayanan dimulai.',
        standard: 'SPO-HD-03: Pemeriksaan Troli & Peralatan Emergensi HD',
      },
    ],
  },
  {
    title:
      'BAGIAN II: PERSIAPAN PERAWAT, PERALATAN, MESIN HD & ALAT KESEHATAN (PRE-HD) — [NILAI SESUAI PASIEN KELOLAAN]',
    maxMode: 'per_patient',
    items: [
      {
        id: '2.1',
        category: 'PPI & Keselamatan Petugas',
        description:
          'Melaksanakan kepatuhan kebersihan tangan (5 Moments for Hand Hygiene) dan pemakaian Alat Pelindung Diri (APD) standar dialisis sebelum kontak pasien/mesin.',
        standard: 'SPO-PPI-01: Hand Hygiene & Penggunaan APD Dialisis',
      },
      {
        id: '2.2',
        category: 'Kalibrasi & Uji Fungsi Mesin',
        description:
          'Menjalankan pengujian fungsi otomatis (Automated Self-Test / T1 Test) pada mesin hemodialisis hingga seluruh modul hidrolik dan elektrikal dinyatakan layak pakai.',
        standard: 'SPO-HD-04: Pengoperasian & Self-Test Mesin HD',
      },
      {
        id: '2.3',
        category: 'Keamanan Sirkuit Ekstrakorporeal',
        description:
          'Memverifikasi kepekaan sensor keamanan utama mesin meliputi Blood Leak Detector (BLD), Air Bubble Detector, dan klem pengaman vena otomatis.',
        standard: 'SPO-HD-05: Verifikasi Sistem Alarm Keamanan Mesin',
      },
      {
        id: '2.4',
        category: 'Komposisi & Suhu Dialisat',
        description:
          'Memeriksa ketepatan komposisi cairan konsentrat (Acid & Bicarbonate), kestabilan konduktivitas (13.5–14.5 mS/cm), serta suhu cairan dialisat (36.0–37.0°C).',
        standard: 'SPO-HD-06: Persiapan Konsentrat & Parameter Dialisat',
      },
      {
        id: '2.5',
        category: 'Pemasangan Sirkuit & Priming',
        description:
          'Memasang dialyzer dan blood tubing set secara aseptik serta melakukan priming menggunakan NaCl 0,9% hingga seluruh udara dan partikel residu terbilas bersih.',
        standard: 'SPO-HD-07: Pemasangan Sirkuit & Priming Dialyzer',
      },
      {
        id: '2.6',
        category: 'Antikoagulasi & Kit Kanulasi',
        description:
          'Menyiapkan spuit antikoagulan (Heparin/LMWH atau program Free Heparin) pada syringe pump serta kelengkapan set steril kanulasi AVF atau perawatan kateter CDL.',
        standard: 'SPO-HD-08: Persiapan Antikoagulasi & Alat Akses Vaskular',
      },
    ],
  },
  {
    title:
      'BAGIAN III: IDENTIFIKASI PASIEN, PENGKAJIAN PRE-HD & KESELAMATAN PASIEN (PATIENT SAFETY) — [NILAI SESUAI PASIEN KELOLAAN]',
    maxMode: 'per_patient',
    items: [
      {
        id: '3.1',
        category: 'Sasaran Keselamatan Pasien (SKP 1)',
        description:
          'Melakukan identifikasi aktif pasien menggunakan minimal 2 penanda resmi (Nama Lengkap, Tanggal Lahir, Nomor RM) serta memvalidasi status rawat dan ruang zonasi infeksi.',
        standard: 'SPO-SKP-01: Ketepatan Identifikasi Pasien Pre-Tindakan',
      },
      {
        id: '3.2',
        category: 'Evaluasi Cairan & Berat Badan',
        description:
          'Menimbang Berat Badan Pre-HD, membandingkannya dengan Berat Badan Kering (Dry Weight), menghitung Interdialytic Weight Gain (IDWG), dan mengkaji status hidrasi/edema.',
        standard: 'SPO-HD-09: Pengkajian Status Cairan & Penetapan UF',
      },
      {
        id: '3.3',
        category: 'Pengkajian Hemodinamik Awal',
        description:
          'Melakukan pengukuran lengkap Tanda-Tanda Vital (Tekanan Darah, Nadi, Pernapasan, Suhu, dan SpO₂) serta keluhan subjektif pasien sebelum inisiasi hemodialisis.',
        standard: 'SPO-HD-10: Pengkajian Keperawatan & Hemodinamik Pre-HD',
      },
      {
        id: '3.4',
        category: 'Skrining Risiko Jatuh & Persetujuan Tindakan',
        description:
          'Melaksanakan pengkajian risiko jatuh (SKP 6: penguncian roda bed, pemasangan pengaman sisi tempat tidur) dan memverifikasi kelengkapan Informed Consent tindakan HD.',
        standard: 'SPO-SKP-06: Pencegahan Risiko Jatuh & Informed Consent HD',
      },
      {
        id: '3.5',
        category: 'Verifikasi Preskripsi Dialisis',
        description:
          'Memverifikasi dan memprogram parameter resep hemodialisis dari DPJP ke mesin meliputi durasi tindakan (Time), Target UFG, QB, QD, serta dosis antikoagulan.',
        standard: 'SPO-HD-11: Verifikasi Preskripsi Medis Hemodialisis',
      },
      {
        id: '3.6',
        category: 'Manajemen Akses Vaskular & Inisiasi',
        description:
          'Mengkaji patensi akses vaskular (bruit/thrill AVF atau kepatenan dan exit-site CDL/Femoral) serta melakukan kanulasi atau penyambungan sirkuit dengan teknik aseptik.',
        standard: 'SPO-HD-12: Kanulasi AV Fistula & Perawatan Kateter CDL',
      },
    ],
  },
  {
    title:
      'BAGIAN IV: MONITORING INTRA-HD & PENCEGAHAN INSIDEN KESELAMATAN PASIEN (IKP) — [NILAI SESUAI PASIEN KELOLAAN]',
    maxMode: 'per_patient',
    items: [
      {
        id: '4.1',
        category: 'Observasi Berkala Hemodinamik',
        description:
          'Melakukan pemantauan berkala dan pencatatan pada lembar observasi Intra-HD setiap jam meliputi Tekanan Darah, Nadi, kesadaran, QB, UF Rate, dan volume UF tercapai.',
        standard: 'SPO-HD-13: Monitoring Intra-Hemodialisis Terpadu',
      },
      {
        id: '4.2',
        category: 'Keamanan Sirkuit & Tekanan Ekstrakorporeal',
        description:
          'Memantau indikator tekanan ekstrakorporeal (Arterial Pressure, Venous Pressure, TMP), keamanan fiksasi jarum/kateter dari risiko venous needle dislodgement, dan tanda clotting.',
        standard: 'SPO-HD-14: Pemantauan Sirkuit Ekstrakorporeal & Pencegahan IKP',
      },
      {
        id: '4.3',
        category: 'Deteksi & Tata Laksana Komplikasi Akut',
        description:
          'Mendeteksi secara dini dan melaksanakan intervensi keperawatan cepat terhadap komplikasi akut Intra-HD (hipotensi, kram otot, mual/muntah, menggigil, clotting, perdarahan akses).',
        standard: 'SPO-HD-15: Penanganan Komplikasi Akut Intra-Hemodialisis',
      },
      {
        id: '4.4',
        category: 'Komunikasi Efektif SBAR / TBAK Medis',
        description:
          'Melaksanakan kolaborasi medis serta pelaporan perubahan kondisi klinis pasien kepada Dokter Jaga Ruangan atau DPJP menggunakan komunikasi efektif SBAR dan verifikasi TBAK.',
        standard: 'SPO-SKP-02: Komunikasi Efektif SBAR & TBAK di Unit HD',
      },
    ],
  },
  {
    title:
      'BAGIAN V: EDUKASI TERSTRUKTUR KEPADA PASIEN & KELUARGA (DIET, CAIRAN, KEBERSIHAN DIRI) — [NILAI SESUAI PASIEN KELOLAAN]',
    maxMode: 'per_patient',
    items: [
      {
        id: '5.1',
        category: 'Manajemen Cairan & Pembatasan IDWG',
        description:
          'Memberikan edukasi terstruktur kepada pasien dan keluarga mengenai perhitungan batas asupan cairan harian dan pengendalian kenaikan berat badan interdialitik (IDWG).',
        standard: 'SPO-KIE-01: Edukasi Manajemen Cairan Pasien Hemodialisis',
      },
      {
        id: '5.2',
        category: 'Nutrisi & Diet Ginjal Kronik',
        description:
          'Memberikan penyuluhan gizi dialisis terkait pembatasan kalium, natrium, dan fosfat serta pemenuhan protein bernilai biologis tinggi guna mencegah hiperkalemia dan malnutrisi.',
        standard: 'SPO-KIE-02: Edukasi Nutrisi & Diet Pasien Dialisis',
      },
      {
        id: '5.3',
        category: 'Perawatan Mandiri Akses Vaskular',
        description:
          'Mengedukasi pasien dan keluarga tentang cara menjaga kebersihan dan patensi akses vaskular (AVF/CDL) di rumah serta penanganan darurat bila terjadi perdarahan atau tanda infeksi.',
        standard: 'SPO-KIE-03: Edukasi Perawatan Mandiri Akses Vaskular',
      },
      {
        id: '5.4',
        category: 'Kepatuhan Obat & Jadwal HD',
        description:
          'Mengedukasi ketepatan waktu konsumsi obat-obatan rutin pasien dialisis (antihipertensi, pengikat fosfat, suplementasi zat besi/EPO) dan pentingnya kepatuhan jadwal HD.',
        standard: 'SPO-KIE-04: Edukasi Rekonsiliasi Obat & Kepatuhan Terapi HD',
      },
      {
        id: '5.5',
        category: 'Verifikasi Pemahaman (Teach-Back)',
        description:
          'Memvalidasi tingkat pemahaman pasien dan keluarga terhadap materi edukasi melalui metode Teach-Back serta mendokumentasikannya pada rekam edukasi terintegrasi.',
        standard: 'SPO-KIE-05: Evaluasi Edukasi Pasien Metode Teach-Back',
      },
    ],
  },
  {
    title:
      'BAGIAN VI: TERMINASI AMAN, EVALUASI POST-HD, DISINFEKSI MESIN & PENDOKUMENTASIAN — [NILAI SESUAI PASIEN KELOLAAN]',
    maxMode: 'per_patient',
    items: [
      {
        id: '6.1',
        category: 'Prosedur Terminasi & Re-infusi',
        description: 'Terminasi HD Aman (Washback)',
        standard: 'SPO-HD-16: Prosedur Terminasi & Re-infusi Aman',
      },
      {
        id: '6.2',
        category: 'Hemostasis & Penutupan Akses Vaskular',
        description: 'Hemostasis & Balut Tekan Akses',
        standard: 'SPO-HD-17: Hemostasis Pasca-Kanulasi & Locking CDL',
      },
      {
        id: '6.3',
        category: 'Evaluasi Klinis Pasca-Dialisis',
        description: 'Evaluasi TTV & Berat Badan Post-HD',
        standard: 'SPO-HD-18: Evaluasi Keperawatan Pasca-Hemodialisis & Pemulangan',
      },
      {
        id: '6.4',
        category: 'Dekontaminasi Limbah & Disinfeksi Mesin',
        description: 'Disinfeksi Mesin HD (Heat / Chemical)',
        standard: 'SPO-HD-19: Manajemen Limbah B3 & Disinfeksi Mesin HD',
      },
      {
        id: '6.5',
        category: 'Dokumentasi Rekam Medis & Timbang Terima',
        description: 'Dokumentasi Asuhan & Rekam Medis (CPPT)',
        standard: 'SPO-HD-20: Dokumentasi Keperawatan Dialisis & Handover',
      },
    ],
  },
];

const ALL_SPO_ITEM_IDS = MONTHLY_SPO_SECTIONS.flatMap((s) => s.items.map((i) => i.id));

function isSpoPointDone(entry: LogbookEntry, pointId: string): boolean {
  const checklist = entry.wizardDetails?.spoChecklist;
  if (checklist && Object.prototype.hasOwnProperty.call(checklist, pointId)) {
    return checklist[pointId] === 'DIKERJAKAN';
  }
  const wd = entry.wizardDetails;
  if (!wd) {
    return entry.verificationStatus === 'Approved';
  }
  switch (pointId) {
    case '1.1':
      return Boolean(wd.section1?.roAdequate);
    case '1.2':
      return Boolean(wd.section1?.infectionZoneChecked);
    case '1.3':
      return Boolean(
        wd.section1?.aedReady && wd.section1?.oxygenReady && wd.section1?.emergencyDrugsReady
      );
    case '2.1':
      return Boolean(wd.section2?.apdMask || wd.section2?.apdGloves);
    case '2.2':
      return Boolean(wd.section2?.leakTestPassed);
    case '2.3':
      return Boolean(wd.section2?.bloodlineIntegrity);
    case '2.4':
      return Boolean(wd.section2?.dialysateTemp);
    case '2.5':
      return Boolean(wd.section2?.primingDone);
    case '2.6':
      return Boolean(wd.section2?.anticoagulantType);
    case '3.1':
      return Boolean(entry.patientName && entry.patientRm);
    case '3.2':
      return Boolean(entry.preWeight > 0);
    case '3.3':
      return Boolean(entry.preBp);
    case '3.4':
      return Boolean(wd.section3?.informedConsent);
    case '3.5':
      return Boolean(entry.ufGoal >= 0 && wd.section3?.bfr);
    case '3.6':
      return Boolean(wd.section3?.cannulationDone);
    case '4.1':
      return Boolean((wd.section4?.observations?.length || 0) > 0);
    case '4.2':
      return Boolean(wd.section4?.arterialPressure || wd.section4?.venousPressure);
    case '4.3':
      return Boolean(
        wd.section4?.noComplication ||
          (wd.section4?.complicationIncidents?.length || 0) > 0 ||
          entry.complications
      );
    case '4.4':
      return Boolean(wd.section4?.effectiveCommunicationNotes);
    case '5.1':
      return Boolean(wd.section5?.eduFluidManagement);
    case '5.2':
      return Boolean(wd.section5?.eduNutrition);
    case '5.3':
      return Boolean(wd.section5?.eduVascularCare);
    case '5.4':
      return Boolean(wd.section5?.eduMedicationSchedule);
    case '5.5':
      return wd.section5?.teachBackStatus === 'Baik';
    case '6.1':
      return Boolean(wd.section6?.reinfusionDone);
    case '6.2':
      return Boolean(wd.section6?.hemostasisDone);
    case '6.3':
      return Boolean(entry.postBp && entry.postWeight >= 0);
    case '6.4':
      return Boolean(wd.section6?.wasteDecontaminated);
    case '6.5':
      return Boolean(entry.nursingNotes || wd.section6?.handoverSummary);
    default:
      return false;
  }
}

function getVascularPerformerId(
  entry: LogbookEntry,
  staffByNameMap: Map<string, string>
): string {
  const vascId = entry.wizardDetails?.section3?.vascularNurseId?.trim();
  if (vascId) return vascId;
  const vascName = entry.wizardDetails?.section3?.vascularNurseName?.trim().toLowerCase();
  if (vascName && staffByNameMap.has(vascName)) {
    return staffByNameMap.get(vascName)!;
  }
  return entry.nurseId;
}

function formatRoleTitle(role?: UserRole | string): string {
  switch (role) {
    case 'PJ Shift':
      return 'Penanggung Jawab (PJ) Shift';
    case 'Kepala Ruang':
      return 'Kepala Ruang';
    case 'Perawat Pelaksana':
      return 'Perawat Pelaksana';
    case 'Managerial':
      return 'Managerial';
    case 'Administrator':
      return 'Administrator';
    default:
      return role || 'Perawat Hemodialisis';
  }
}

function formatSignatureRoleTitle(role?: UserRole | string): string {
  switch (role) {
    case 'PJ Shift':
      return 'Penanggung Jawab (PJ) Shift Hemodialisis';
    case 'Kepala Ruang':
      return 'Kepala Ruang Hemodialisis';
    case 'Perawat Pelaksana':
      return 'Perawat Pelaksana Hemodialisis';
    default:
      return `${formatRoleTitle(role)} Hemodialisis`;
  }
}

function formatMonthSlash(monthKey: string): { label: string; upperLabel: string } {
  const [year, month] = monthKey.split('-');
  const idx = Number(month) - 1;
  if (idx >= 0 && idx < 12) {
    const name = MONTH_NAMES_ID[idx];
    return {
      label: `${name} / ${year}`,
      upperLabel: `${name.toUpperCase()} / ${year}`,
    };
  }
  return { label: monthKey, upperLabel: monthKey.toUpperCase() };
}

interface NurseOption {
  uid: string;
  fullName: string;
  nip: string;
  role: UserRole | string;
  verifiedCount: number;
}

export function MonthlyReportsPage({ logbooks, staffDirectory }: MonthlyReportsPageProps) {
  const { userProfile } = useAuth();
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey());
  const [selectedNurseId, setSelectedNurseId] = useState<string>('');
  const [detailEntry, setDetailEntry] = useState<LogbookEntry | null>(null);

  const isNurseOnly = userProfile?.role === 'Perawat Pelaksana';

  // Map known NIPs from userProfile and logbooks
  const nipByUid = useMemo(() => {
    const map = new Map<string, string>();
    if (userProfile?.uid && userProfile.nip) {
      map.set(userProfile.uid, userProfile.nip);
    }
    for (const lb of logbooks) {
      if (lb.nurseId && lb.nurseNip && !map.has(lb.nurseId)) {
        map.set(lb.nurseId, lb.nurseNip);
      }
    }
    for (const st of staffDirectory) {
      if (st.uid && st.nip && !map.has(st.uid)) {
        map.set(st.uid, st.nip);
      }
    }
    return map;
  }, [userProfile, logbooks, staffDirectory]);

  const staffByNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const st of staffDirectory) {
      if (st.uid && st.fullName) {
        map.set(st.fullName.trim().toLowerCase(), st.uid);
      }
    }
    for (const lb of logbooks) {
      if (lb.nurseId && lb.nurseName && !map.has(lb.nurseName.trim().toLowerCase())) {
        map.set(lb.nurseName.trim().toLowerCase(), lb.nurseId);
      }
    }
    if (userProfile?.uid && userProfile.fullName) {
      map.set(userProfile.fullName.trim().toLowerCase(), userProfile.uid);
    }
    return map;
  }, [staffDirectory, logbooks, userProfile]);

  // Build selectable nurse list
  const nurseOptions = useMemo<NurseOption[]>(() => {
    const map = new Map<string, NurseOption>();

    const verifiedCountByNurse = new Map<string, number>();
    for (const lb of logbooks) {
      if (lb.monthKey === monthKey && lb.verificationStatus === 'Approved') {
        verifiedCountByNurse.set(lb.nurseId, (verifiedCountByNurse.get(lb.nurseId) || 0) + 1);
      }
    }

    for (const st of staffDirectory) {
      if (
        st.role === 'Perawat Pelaksana' ||
        st.role === 'PJ Shift' ||
        st.role === 'Kepala Ruang'
      ) {
        map.set(st.uid, {
          uid: st.uid,
          fullName: st.fullName,
          nip: nipByUid.get(st.uid) || '-',
          role: st.role,
          verifiedCount: verifiedCountByNurse.get(st.uid) || 0,
        });
      }
    }

    for (const lb of logbooks) {
      if (!map.has(lb.nurseId)) {
        map.set(lb.nurseId, {
          uid: lb.nurseId,
          fullName: lb.nurseName,
          nip: lb.nurseNip || nipByUid.get(lb.nurseId) || '-',
          role: 'Perawat Pelaksana',
          verifiedCount: verifiedCountByNurse.get(lb.nurseId) || 0,
        });
      }
    }

    if (userProfile && !map.has(userProfile.uid)) {
      map.set(userProfile.uid, {
        uid: userProfile.uid,
        fullName: userProfile.fullName,
        nip: userProfile.nip || '-',
        role: userProfile.role,
        verifiedCount: verifiedCountByNurse.get(userProfile.uid) || 0,
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.verifiedCount !== a.verifiedCount) return b.verifiedCount - a.verifiedCount;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [staffDirectory, logbooks, monthKey, nipByUid, userProfile]);

  const effectiveNurseId = useMemo(() => {
    if (!userProfile) return '';
    if (isNurseOnly) return userProfile.uid;
    if (selectedNurseId && nurseOptions.some((n) => n.uid === selectedNurseId)) {
      return selectedNurseId;
    }
    const selfOption = nurseOptions.find((n) => n.uid === userProfile.uid);
    if (selfOption && selfOption.verifiedCount > 0) return selfOption.uid;
    const firstWithLogs = nurseOptions.find((n) => n.verifiedCount > 0);
    if (firstWithLogs) return firstWithLogs.uid;
    return selfOption?.uid || nurseOptions[0]?.uid || userProfile.uid;
  }, [userProfile, isNurseOnly, selectedNurseId, nurseOptions]);

  const selectedNurse = useMemo<NurseOption>(() => {
    const found = nurseOptions.find((n) => n.uid === effectiveNurseId);
    if (found) return found;
    return {
      uid: userProfile?.uid || '',
      fullName: userProfile?.fullName || 'Perawat HD',
      nip: userProfile?.nip || '-',
      role: userProfile?.role || 'Perawat Pelaksana',
      verifiedCount: 0,
    };
  }, [nurseOptions, effectiveNurseId, userProfile]);

  // All logs for selected nurse & month (to show unverified notice if applicable)
  const nurseMonthAllLogs = useMemo(
    () =>
      logbooks.filter((l) => l.monthKey === monthKey && l.nurseId === effectiveNurseId),
    [logbooks, monthKey, effectiveNurseId]
  );

  // Verified logs ONLY (Approved by PJ Shift / Kepala Ruang)
  const verifiedLogs = useMemo(
    () =>
      nurseMonthAllLogs
        .filter((l) => l.verificationStatus === 'Approved')
        .sort((a, b) => {
          const dCmp = a.date.localeCompare(b.date);
          if (dCmp !== 0) return dCmp;
          return a.startTime.localeCompare(b.startTime);
        }),
    [nurseMonthAllLogs]
  );

  const pendingOrRevisionCount = nurseMonthAllLogs.length - verifiedLogs.length;

  // All Approved logbooks across unit for the selected month (used for Poin 3.6 vascular access attribution)
  const allApprovedMonthLogs = useMemo(
    () =>
      logbooks.filter(
        (l) => l.monthKey === monthKey && l.verificationStatus === 'Approved'
      ),
    [logbooks, monthKey]
  );

  const daysInMonth = useMemo(() => getDaysInMonth(monthKey), [monthKey]);

  const logsByDate = useMemo(() => {
    const map = new Map<string, LogbookEntry[]>();
    for (const d of daysInMonth) map.set(d, []);
    for (const lb of verifiedLogs) {
      const list = map.get(lb.date);
      if (list) list.push(lb);
    }
    return map;
  }, [daysInMonth, verifiedLogs]);

  // Approved logbooks where the selected nurse actually performed vascular access (Bagian 3 Poin 3.6)
  const vascularLogsByDate = useMemo(() => {
    const map = new Map<string, LogbookEntry[]>();
    for (const d of daysInMonth) map.set(d, []);
    for (const lb of allApprovedMonthLogs) {
      if (!isSpoPointDone(lb, '3.6')) continue;
      if (getVascularPerformerId(lb, staffByNameMap) !== effectiveNurseId) continue;
      const list = map.get(lb.date);
      if (list) list.push(lb);
    }
    return map;
  }, [daysInMonth, allApprovedMonthLogs, staffByNameMap, effectiveNurseId]);

  const crossNurseVascularLogs = useMemo(
    () =>
      allApprovedMonthLogs
        .filter(
          (lb) =>
            isSpoPointDone(lb, '3.6') &&
            getVascularPerformerId(lb, staffByNameMap) === effectiveNurseId &&
            lb.nurseId !== effectiveNurseId
        )
        .sort((a, b) => {
          const dCmp = a.date.localeCompare(b.date);
          if (dCmp !== 0) return dCmp;
          return a.startTime.localeCompare(b.startTime);
        }),
    [allApprovedMonthLogs, staffByNameMap, effectiveNurseId]
  );

  const activeWorkDays = useMemo(() => {
    let count = 0;
    for (const d of daysInMonth) {
      if ((logsByDate.get(d)?.length || 0) > 0) count += 1;
    }
    return count;
  }, [daysInMonth, logsByDate]);

  const shiftCounts = useMemo(() => {
    const seen = new Set<string>();
    let pagi = 0;
    let siang = 0;
    let malam = 0;
    for (const lb of verifiedLogs) {
      const key = `${lb.date}__${lb.shift}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (lb.shift === 'Pagi') pagi += 1;
      else if (lb.shift === 'Siang') siang += 1;
      else if (lb.shift === 'Malam') malam += 1;
    }
    return { pagi, siang, malam };
  }, [verifiedLogs]);

  // Compute full 29-row x N-day matrix
  const matrixData = useMemo(() => {
    const rowResults = new Map<
      string,
      {
        dailyValues: number[];
        total: number;
        pct: number;
        keterangan: string;
      }
    >();

    const dailyGrandTotals = new Array<number>(daysInMonth.length).fill(0);
    let vascularTotalCount = 0;

    for (const section of MONTHLY_SPO_SECTIONS) {
      for (const item of section.items) {
        const dailyValues = daysInMonth.map((dateStr, dayIdx) => {
          let val = 0;
          if (item.id === '3.6') {
            // Poin 3.6 counts unique patients per day whose vascular access was performed by selected nurse (Approved)
            const vascDayLogs = vascularLogsByDate.get(dateStr) || [];
            val = new Set(vascDayLogs.map((entry) => entry.patientId || entry.id)).size;
          } else {
            const dayLogs = logsByDate.get(dateStr) || [];
            if (dayLogs.length === 0) return 0;

            if (section.maxMode === 'daily_cap_1') {
              val = dayLogs.some((entry) => isSpoPointDone(entry, item.id)) ? 1 : 0;
            } else {
              val = dayLogs.filter((entry) => isSpoPointDone(entry, item.id)).length;
            }
          }
          dailyGrandTotals[dayIdx] += val;
          return val;
        });

        const total = dailyValues.reduce((acc, v) => acc + v, 0);
        let pct = 0;
        let keterangan = '-';

        if (item.id === '3.6') {
          vascularTotalCount = total;
          if (total === 0) {
            pct = 0;
            keterangan = '-';
          } else if (verifiedLogs.length === 0) {
            pct = 100;
            keterangan = `${total} Pasien`;
          } else if (total >= verifiedLogs.length) {
            pct = 100;
            keterangan = total > verifiedLogs.length ? `${total} Pasien` : 'Lengkap';
          } else {
            pct = Math.round((total / verifiedLogs.length) * 100);
            keterangan = `${total}/${verifiedLogs.length}`;
          }
        } else {
          const denom =
            section.maxMode === 'daily_cap_1' ? activeWorkDays : verifiedLogs.length;
          pct = denom > 0 ? Math.min(100, Math.round((total / denom) * 100)) : 0;
          keterangan =
            total === 0 ? '-' : pct >= 100 ? 'Lengkap' : `${total}/${denom}`;
        }

        rowResults.set(item.id, { dailyValues, total, pct, keterangan });
      }
    }

    const grandTotal = dailyGrandTotals.reduce((acc, v) => acc + v, 0);
    const maxGrandTotal =
      activeWorkDays * 3 + verifiedLogs.length * 25 + Math.max(verifiedLogs.length, vascularTotalCount);
    const grandPct =
      maxGrandTotal > 0 ? Math.min(100, Math.round((grandTotal / maxGrandTotal) * 100)) : 0;

    return {
      rowResults,
      dailyGrandTotals,
      grandTotal,
      maxGrandTotal,
      grandPct,
    };
  }, [daysInMonth, logsByDate, vascularLogsByDate, activeWorkDays, verifiedLogs.length]);

  // Determine Verifier (PJ Shift / Kepala Ruang) for signature block
  const verifierInfo = useMemo(() => {
    const counts = new Map<string, { id: string; name: string; count: number }>();
    for (const lb of verifiedLogs) {
      if (lb.verifiedByName) {
        const key = lb.verifiedBy || lb.verifiedByName;
        const existing = counts.get(key);
        if (existing) existing.count += 1;
        else counts.set(key, { id: lb.verifiedBy || '', name: lb.verifiedByName, count: 1 });
      }
    }

    if (counts.size > 0) {
      const top = Array.from(counts.values()).sort((a, b) => b.count - a.count)[0];
      return {
        name: top.name,
        nip: (top.id && nipByUid.get(top.id)) || '-',
      };
    }

    const kepalaRuang = staffDirectory.find((s) => s.isActive && s.role === 'Kepala Ruang');
    const pjShift = staffDirectory.find((s) => s.isActive && s.role === 'PJ Shift');
    const fallback = kepalaRuang || pjShift;
    return {
      name: fallback?.fullName || 'PJ Shift / Kepala Ruang',
      nip: (fallback?.uid && nipByUid.get(fallback.uid)) || '-',
    };
  }, [verifiedLogs, staffDirectory, nipByUid]);

  if (!userProfile) return null;

  const { label: monthSlashLabel, upperLabel: monthUpperLabel } = formatMonthSlash(monthKey);

  const handleExportCsv = () => {
    const dayNumbers = daysInMonth.map((_, idx) => String(idx + 1));
    const headers = [
      'NO',
      'KATEGORI FASE ASUHAN',
      'URAIAN KEGIATAN SPESIFIK PERAWAT HEMODIALISIS',
      'STANDAR SPO / INDIKATOR MUTU',
      ...dayNumbers,
      'TOTAL',
      '% CAPAIAN',
      'KETERANGAN',
    ];

    const rows: (string | number)[][] = [];

    // Summary Row 1: Patient count per day
    rows.push([
      '',
      '',
      'JUMLAH PASIEN KELOLAAN TERVERIFIKASI PER HARI',
      '',
      ...daysInMonth.map((d) => logsByDate.get(d)?.length || 0),
      verifiedLogs.length,
      '',
      'Pasien Disahkan',
    ]);

    for (const section of MONTHLY_SPO_SECTIONS) {
      rows.push([section.title, ...new Array(headers.length - 1).fill('')]);
      for (const item of section.items) {
        const res = matrixData.rowResults.get(item.id);
        rows.push([
          item.id,
          item.category,
          item.description,
          item.standard,
          ...(res ? res.dailyValues : daysInMonth.map(() => 0)),
          res?.total ?? 0,
          `${res?.pct ?? 0}%`,
          res?.keterangan ?? '-',
        ]);
      }
    }

    // Footer Total Row
    rows.push([
      '',
      '',
      'TOTAL NILAI KEGIATAN TERVERIFIKASI PER HARI',
      '',
      ...matrixData.dailyGrandTotals,
      matrixData.grandTotal,
      `${matrixData.grandPct}%`,
      `Maks: ${matrixData.maxGrandTotal}`,
    ]);

    // Footer Patient Names Row
    rows.push([
      '',
      '',
      'PASIEN KELOLAAN (NAMA PASIEN)',
      '',
      ...daysInMonth.map((d) => {
        const names = Array.from(
          new Set((logsByDate.get(d) || []).map((l) => l.patientName))
        );
        return names.join('; ');
      }),
      verifiedLogs.length,
      '',
      `${verifiedLogs.length} Pasien Terverifikasi`,
    ]);

    const safeName = selectedNurse.fullName.replace(/[^a-zA-Z0-9]+/g, '_');
    exportToCsv(`Logbook_Bulanan_${safeName}_${monthKey}.csv`, headers, rows);
  };

  const totalColumns = 4 + daysInMonth.length + 3;

  return (
    <div className="space-y-5">
      {/* Page Header & Controls (Hidden in Print) */}
      <div className="no-print flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Laporan Bulanan Logbook Pasien Kelolaan Perawat
          </h2>
          <p className="text-xs text-slate-500">
            Periode {formatMonthLabel(monthKey)} · Dihitung hanya dari logbook pasien yang{' '}
            <span className="font-semibold text-teal-700">sudah diverifikasi (Approved)</span> oleh
            PJ Shift atau Kepala Ruang.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!isNurseOnly && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="monthly-nurse-select"
                className="text-xs font-semibold text-slate-700 whitespace-nowrap"
              >
                Perawat:
              </label>
              <select
                id="monthly-nurse-select"
                value={effectiveNurseId}
                onChange={(e) => setSelectedNurseId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#0B5A8E] focus:outline-none min-w-[230px]"
              >
                {nurseOptions.map((n) => (
                  <option key={n.uid} value={n.uid}>
                    {n.fullName} ({n.role}) — {n.verifiedCount} terverifikasi
                  </option>
                ))}
              </select>
            </div>
          )}

          <input
            type="month"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-700 focus:border-[#0B5A8E] focus:outline-none"
          />

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Ekspor CSV
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B5A8E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#094a75]"
          >
            <Printer className="h-4 w-4" />
            Cetak / PDF
          </button>
        </div>
      </div>

      {/* Verification Status Notice (Hidden in Print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-semibold text-teal-700">
            <CheckCircle2 className="h-4 w-4" />
            {verifiedLogs.length} Pasien Kelolaan Terverifikasi ({activeWorkDays} Hari Kerja)
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <UserCheck className="h-4 w-4 text-[#0B5A8E]" />
            Perawat: <strong className="text-slate-900">{selectedNurse.fullName}</strong> (
            {selectedNurse.role})
          </span>
          {pendingOrRevisionCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-amber-700">
              <Clock className="h-4 w-4" />
              {pendingOrRevisionCount} entri bulan ini belum masuk rekap karena masih berstatus
              Draft/Pending/Revisi.
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] font-semibold text-slate-700 tabular-nums">
          Capaian SPO: {matrixData.grandTotal} / {matrixData.maxGrandTotal} ({matrixData.grandPct}%)
        </span>
      </div>

      {/* Printable Official Monthly Matrix Sheet (Exact Match to Attached PDF) */}
      <div className="rounded-xl border border-slate-300 bg-white p-4 sm:p-6 shadow-sm print:border-none print:p-0 print:shadow-none print:rounded-none">
        {/* Document Header */}
        <div className="text-center border-b-2 border-[#1e3a5f] pb-3 mb-3">
          <h1 className="font-display text-sm sm:text-base font-extrabold tracking-wide text-slate-900 uppercase">
            LAPORAN BULANAN REKAPITULASI LOGBOOK ASUHAN KEPERAWATAN HEMODIALISIS
          </h1>
          <p className="mt-0.5 text-[11px] sm:text-xs font-bold tracking-wide text-slate-700 uppercase">
            UNIT PELAYANAN HEMODIALISIS (DIALYSIS CENTER) - RS HAPPY LAND MEDICAL CENTRE
          </p>
        </div>

        {/* Two-Column Staff & Period Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-[11px] text-slate-800 mb-3">
          <div className="space-y-0.5">
            <div className="grid grid-cols-[120px_10px_1fr]">
              <span className="font-bold">Nama Staff</span>
              <span>:</span>
              <span className="font-bold uppercase">{selectedNurse.fullName}</span>
            </div>
            <div className="grid grid-cols-[120px_10px_1fr]">
              <span className="font-bold">NIP / NIRA</span>
              <span>:</span>
              <span className="font-mono">{selectedNurse.nip || '-'}</span>
            </div>
            <div className="grid grid-cols-[120px_10px_1fr]">
              <span className="font-bold">Jabatan / Akses</span>
              <span>:</span>
              <span>
                {formatRoleTitle(selectedNurse.role)} - Instalasi Hemodialisa RS Happy Land Medical
                Centre
              </span>
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="grid grid-cols-[130px_10px_1fr]">
              <span className="font-bold">Bulan / Tahun</span>
              <span>:</span>
              <span className="font-semibold">{monthSlashLabel}</span>
            </div>
            <div className="grid grid-cols-[130px_10px_1fr]">
              <span className="font-bold">Rekap Terverifikasi</span>
              <span>:</span>
              <span className="font-semibold tabular-nums">
                {activeWorkDays} Hari Kerja · {verifiedLogs.length} Pasien Kelolaan Disahkan
              </span>
            </div>
            <div className="grid grid-cols-[130px_10px_1fr]">
              <span className="font-bold">Jumlah Shift</span>
              <span>:</span>
              <span className="tabular-nums">
                {shiftCounts.pagi} Shift Pagi · {shiftCounts.siang} Shift Siang
                {shiftCounts.malam > 0 ? ` · ${shiftCounts.malam} Shift Malam` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Main Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-400 text-[10px] leading-tight text-slate-900">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th
                  rowSpan={2}
                  className="border border-slate-500 px-1.5 py-2 text-center font-bold w-9"
                >
                  NO
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-500 px-2 py-2 text-left font-bold min-w-[130px] max-w-[160px]"
                >
                  KATEGORI FASE ASUHAN
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-500 px-2 py-2 text-left font-bold min-w-[230px]"
                >
                  URAIAN KEGIATAN SPESIFIK PERAWAT HEMODIALISIS
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-500 px-2 py-2 text-left font-bold min-w-[155px] max-w-[190px]"
                >
                  STANDAR SPO / INDIKATOR MUTU
                </th>
                <th
                  colSpan={daysInMonth.length}
                  className="border border-slate-500 px-1 py-1 text-center font-bold uppercase tracking-wide"
                >
                  TANGGAL PELAKSANAAN TERVERIFIKASI ({monthUpperLabel})
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-500 px-1.5 py-2 text-center font-bold w-11"
                >
                  TOTAL
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-500 px-1.5 py-2 text-center font-bold w-14"
                >
                  % CAPAIAN
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-500 px-2 py-2 text-center font-bold min-w-[78px]"
                >
                  KETERANGAN
                </th>
              </tr>
              <tr className="bg-[#274b7a] text-white">
                {daysInMonth.map((dateStr, idx) => {
                  const hasVerified =
                    (logsByDate.get(dateStr)?.length || 0) > 0 ||
                    (vascularLogsByDate.get(dateStr)?.length || 0) > 0;
                  return (
                    <th
                      key={dateStr}
                      className={`border border-slate-500 px-0.5 py-1 text-center font-mono font-semibold w-[22px] min-w-[20px] ${
                        hasVerified ? 'bg-[#0f6b76]' : ''
                      }`}
                    >
                      {idx + 1}
                    </th>
                  );
                })}
              </tr>

              {/* Summary Sub-header Row: Verified Patients Per Day */}
              <tr className="bg-[#eef4fb] text-[#1e3a5f] font-bold">
                <td
                  colSpan={4}
                  className="border border-slate-400 px-2 py-1.5 text-right uppercase tracking-wide"
                >
                  JUMLAH PASIEN KELOLAAN TERVERIFIKASI PER HARI
                </td>
                {daysInMonth.map((dateStr) => {
                  const count = logsByDate.get(dateStr)?.length || 0;
                  return (
                    <td
                      key={`pat-count-${dateStr}`}
                      className={`border border-slate-400 px-0.5 py-1.5 text-center font-mono tabular-nums ${
                        count > 0 ? 'bg-teal-50 text-teal-800 font-bold' : ''
                      }`}
                    >
                      {count > 0 ? count : ''}
                    </td>
                  );
                })}
                <td className="border border-slate-400 px-1 py-1.5 text-center font-mono tabular-nums">
                  {verifiedLogs.length}
                </td>
                <td className="border border-slate-400 px-1 py-1.5 text-center font-mono">-</td>
                <td className="border border-slate-400 px-1.5 py-1.5 text-center font-semibold">
                  Pasien Disahkan
                </td>
              </tr>
            </thead>

            <tbody>
              {MONTHLY_SPO_SECTIONS.map((section) => (
                <FragmentSection
                  key={section.title}
                  section={section}
                  totalColumns={totalColumns}
                  daysInMonth={daysInMonth}
                  rowResults={matrixData.rowResults}
                />
              ))}
            </tbody>

            <tfoot>
              {/* Total Nilai Kegiatan Per Hari */}
              <tr className="bg-[#eef4fb] font-bold text-[#0f2942]">
                <td
                  colSpan={4}
                  className="border border-slate-400 px-2 py-1.5 text-right uppercase tracking-wide"
                >
                  TOTAL NILAI KEGIATAN TERVERIFIKASI PER HARI
                </td>
                {daysInMonth.map((dateStr, idx) => {
                  const dayVal = matrixData.dailyGrandTotals[idx] || 0;
                  return (
                    <td
                      key={`tot-${dateStr}`}
                      className={`border border-slate-400 px-0.5 py-1.5 text-center font-mono tabular-nums ${
                        dayVal > 0 ? 'bg-sky-100/70 text-[#0B5A8E]' : ''
                      }`}
                    >
                      {dayVal > 0 ? dayVal : ''}
                    </td>
                  );
                })}
                <td className="border border-slate-400 px-1 py-1.5 text-center font-mono tabular-nums">
                  {matrixData.grandTotal}
                </td>
                <td className="border border-slate-400 px-1 py-1.5 text-center font-mono tabular-nums">
                  {matrixData.grandPct}%
                </td>
                <td className="border border-slate-400 px-1.5 py-1.5 text-center font-mono">
                  Maks: {matrixData.maxGrandTotal}
                </td>
              </tr>

              {/* Pasien Kelolaan (Nama Pasien) */}
              <tr className="bg-[#fffaf0] text-slate-900">
                <td
                  colSpan={4}
                  className="border border-slate-400 px-2 py-2 text-right font-bold uppercase tracking-wide text-[#1e3a5f]"
                >
                  PASIEN KELOLAAN (NAMA PASIEN)
                </td>
                {daysInMonth.map((dateStr) => {
                  const dayLogs = logsByDate.get(dateStr) || [];
                  const names = Array.from(new Set(dayLogs.map((l) => l.patientName)));
                  return (
                    <td
                      key={`pat-names-${dateStr}`}
                      title={names.join(', ')}
                      className={`border border-slate-400 align-middle text-center ${
                        names.length > 0 ? 'px-1.5 py-1' : 'px-0.5 py-1'
                      }`}
                    >
                      {names.length > 0 && (
                        <div className="flex flex-col items-stretch justify-center divide-y divide-amber-200/80">
                          {names.map((name) => (
                            <span
                              key={name}
                              className="block py-0.5 text-[9px] font-medium leading-snug text-slate-800 whitespace-nowrap"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td
                  colSpan={3}
                  className="border border-slate-400 px-2 py-2 text-center font-bold text-[#1e3a5f]"
                >
                  {verifiedLogs.length} Pasien Terverifikasi
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Signature Block */}
        <div className="mt-8 grid grid-cols-2 gap-8 text-[11px] text-slate-900 break-inside-avoid">
          <div className="text-center">
            <p>Mengetahui &amp; Menyatakan,</p>
            <p className="font-bold">{formatSignatureRoleTitle(selectedNurse.role)}</p>
            <div className="h-14" />
            <p className="font-bold uppercase">( {selectedNurse.fullName} )</p>
            <p className="font-mono text-[10px] text-slate-600">
              NIP/NIRA: {selectedNurse.nip || '-'}
            </p>
          </div>

          <div className="text-center">
            <p>Diverifikasi &amp; Disahkan oleh,</p>
            <p className="font-bold">PJ Shift / Kepala Ruang Hemodialisis</p>
            <div className="h-14" />
            <p className="font-bold uppercase">( {verifierInfo.name} )</p>
            <p className="font-mono text-[10px] text-slate-600">
              NIP: {verifierInfo.nip || '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Supporting Interactive Breakdown of Verified Patient Entries (Hidden in Print) */}
      <div className="no-print rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Rincian Logbook Pasien Terverifikasi — {selectedNurse.fullName} (
              {formatMonthLabel(monthKey)})
            </h3>
            <p className="text-[11px] text-slate-500">
              Hanya tindakan dengan status Approved oleh PJ Shift atau Kepala Ruang yang dihitung
              ke dalam tabel laporan bulanan di atas.
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-teal-700 tabular-nums">
            {verifiedLogs.length} Tindakan Disahkan
          </span>
        </div>

        {verifiedLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Belum ada logbook pasien berstatus <strong className="text-slate-700">Approved</strong>{' '}
            untuk {selectedNurse.fullName} pada bulan {formatMonthLabel(monthKey)}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Tanggal</th>
                  <th className="px-4 py-2.5 font-semibold">Shift</th>
                  <th className="px-4 py-2.5 font-semibold">Pasien (No. RM)</th>
                  <th className="px-4 py-2.5 font-semibold">Mesin &amp; Kategori</th>
                  <th className="px-4 py-2.5 font-semibold text-center">Capaian SPO</th>
                  <th className="px-4 py-2.5 font-semibold">Diverifikasi Oleh</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {verifiedLogs.map((entry) => {
                  const doneCount = ALL_SPO_ITEM_IDS.filter((id) =>
                    isSpoPointDone(entry, id)
                  ).length;
                  const vascPerformerId = getVascularPerformerId(entry, staffByNameMap);
                  const vascPerformerName =
                    entry.wizardDetails?.section3?.vascularNurseName || entry.nurseName;
                  const accessedByOther =
                    isSpoPointDone(entry, '3.6') && vascPerformerId !== entry.nurseId;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono tabular-nums text-slate-800 whitespace-nowrap">
                        {formatDateId(entry.date)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <ShiftBadge shift={entry.shift} />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-900">{entry.patientName}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {entry.patientRm}
                        </div>
                        {accessedByOther && (
                          <div className="mt-0.5 text-[11px] font-medium text-amber-700">
                            Akses vaskular (3.6) dilakukan oleh: {vascPerformerName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        <div>{entry.actionCategory}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {entry.machineNumber} · {entry.startTime}–{entry.endTime}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono font-semibold text-[#0B5A8E] tabular-nums">
                        {doneCount} / {ALL_SPO_ITEM_IDS.length}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900">
                          {entry.verifiedByName || 'PJ Shift / Kepala Ruang'}
                        </div>
                        {entry.verificationNote && (
                          <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                            {entry.verificationNote}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <VerificationBadge status={entry.verificationStatus} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setDetailEntry(entry)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {crossNurseVascularLogs.length > 0 && (
          <div className="border-t border-slate-200 bg-teal-50/50 px-5 py-3.5 text-xs">
            <p className="font-semibold text-teal-900">
              Tambahan Akses Vaskular (Poin 3.6) pada Pasien Kelolaan Perawat Lain (
              {crossNurseVascularLogs.length} tindakan terverifikasi):
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {crossNurseVascularLogs.map((entry) => (
                <button
                  key={`cross-vasc-${entry.id}`}
                  type="button"
                  onClick={() => setDetailEntry(entry)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-teal-200 bg-white px-2.5 py-1 text-[11px] text-slate-700 hover:border-teal-400 hover:bg-teal-50"
                >
                  <span className="font-mono font-semibold text-teal-800">
                    {formatDateId(entry.date)}
                  </span>
                  <span>·</span>
                  <span className="font-semibold text-slate-900">{entry.patientName}</span>
                  <span className="text-slate-500">(Kelolaan: {entry.nurseName})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {detailEntry && (
        <LogbookDetailModal entry={detailEntry} onClose={() => setDetailEntry(null)} />
      )}
    </div>
  );
}

function FragmentSection({
  section,
  totalColumns,
  daysInMonth,
  rowResults,
}: {
  section: MonthlySpoSection;
  totalColumns: number;
  daysInMonth: string[];
  rowResults: Map<
    string,
    {
      dailyValues: number[];
      total: number;
      pct: number;
      keterangan: string;
    }
  >;
}) {
  return (
    <>
      <tr className="bg-[#e3edf7] text-[#153152]">
        <td
          colSpan={totalColumns}
          className="border border-slate-400 px-2 py-1.5 font-bold tracking-wide uppercase"
        >
          {section.title}
        </td>
      </tr>
      {section.items.map((item) => {
        const res = rowResults.get(item.id);
        return (
          <tr key={item.id} className="hover:bg-slate-50/70">
            <td className="border border-slate-300 px-1.5 py-1.5 text-center font-mono font-bold text-slate-800 align-top">
              {item.id}
            </td>
            <td className="border border-slate-300 px-2 py-1.5 font-semibold text-slate-900 align-top">
              {item.category}
            </td>
            <td className="border border-slate-300 px-2 py-1.5 text-slate-700 align-top">
              {item.description}
            </td>
            <td className="border border-slate-300 px-2 py-1.5 italic text-slate-500 align-top">
              {item.standard}
            </td>
            {daysInMonth.map((dateStr, idx) => {
              const val = res?.dailyValues[idx] || 0;
              return (
                <td
                  key={`${item.id}-${dateStr}`}
                  className={`border border-slate-300 px-0.5 py-1.5 text-center font-mono tabular-nums align-middle ${
                    val > 0 ? 'bg-teal-50/80 font-bold text-teal-800' : 'text-slate-300'
                  }`}
                >
                  {val > 0 ? val : ''}
                </td>
              );
            })}
            <td className="border border-slate-300 px-1 py-1.5 text-center font-mono font-bold tabular-nums text-slate-900 align-middle">
              {res?.total ?? 0}
            </td>
            <td className="border border-slate-300 px-1 py-1.5 text-center font-mono font-semibold tabular-nums text-slate-800 align-middle">
              {res?.pct ?? 0}%
            </td>
            <td className="border border-slate-300 px-1.5 py-1.5 text-center text-slate-700 align-middle">
              {res?.keterangan ?? '-'}
            </td>
          </tr>
        );
      })}
    </>
  );
}
