import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  GraduationCap,
  Calculator,
  CheckCircle2,
  Percent,
  Calendar,
  Scale,
  Clock,
  LayoutGrid,
  Timer,
  ArrowLeftRight,
  BookOpen,
  QrCode,
  KeyRound,
  Dices,
  Plus,
  Trash2,
  Copy,
  Download,
  RotateCcw,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

type StudentCalculatorTab =
  | 'cgpa'
  | 'sgpa'
  | 'attendance'
  | 'percentage'
  | 'age'
  | 'unit'
  | 'date-diff'
  | 'timetable'
  | 'countdown'
  | 'gpa-convert'
  | 'notes'
  | 'qr'
  | 'password'
  | 'picker';

export const StudentCalculatorsDialog: React.FC = () => {
  const { activeModal, setActiveModal, activeStudentTab, setActiveStudentTab } = useUIStore();
  const isOpen = activeModal === 'student-calculators';

  const [activeTab, setActiveTab] = useState<StudentCalculatorTab>('cgpa');

  useEffect(() => {
    if (activeStudentTab) {
      setActiveTab(activeStudentTab as StudentCalculatorTab);
    }
  }, [activeStudentTab]);

  if (!isOpen) return null;

  const handleClose = () => {
    setActiveModal(null);
    setActiveStudentTab(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in select-none" role="dialog" aria-modal="true" aria-label="Student Calculators Dialog">
      <div className="w-full max-w-4xl h-[90vh] max-h-[820px] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="h-14 px-4 sm:px-6 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Student Productivity Suite
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  14 Tools
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="bg-slate-950/60 border-b border-slate-800 px-3 py-2 overflow-x-auto flex items-center gap-1.5 shrink-0 scrollbar-none">
          {[
            { id: 'cgpa' as const, label: 'CGPA', icon: Calculator },
            { id: 'sgpa' as const, label: 'SGPA', icon: GraduationCap },
            { id: 'attendance' as const, label: 'Attendance Bunk', icon: CheckCircle2 },
            { id: 'percentage' as const, label: 'Percentage & Marks', icon: Percent },
            { id: 'age' as const, label: 'Age & Cut-Off', icon: Calendar },
            { id: 'unit' as const, label: 'Unit Converter', icon: Scale },
            { id: 'date-diff' as const, label: 'Date Difference', icon: Clock },
            { id: 'timetable' as const, label: 'Timetable', icon: LayoutGrid },
            { id: 'countdown' as const, label: 'Exam Countdown', icon: Timer },
            { id: 'gpa-convert' as const, label: 'GPA Scale', icon: ArrowLeftRight },
            { id: 'notes' as const, label: 'Scratchpad', icon: BookOpen },
            { id: 'qr' as const, label: 'QR Generator', icon: QrCode },
            { id: 'password' as const, label: 'Exam Password', icon: KeyRound },
            { id: 'picker' as const, label: 'Random Picker', icon: Dices },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-900/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Tool Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/50">
          {activeTab === 'cgpa' && <CGPACalculatorView />}
          {activeTab === 'sgpa' && <SGPACalculatorView />}
          {activeTab === 'attendance' && <AttendanceCalculatorView />}
          {activeTab === 'percentage' && <PercentageMarksView />}
          {activeTab === 'age' && <AgeCalculatorView />}
          {activeTab === 'unit' && <UnitConverterView />}
          {activeTab === 'date-diff' && <DateDiffView />}
          {activeTab === 'timetable' && <TimetablePlannerView />}
          {activeTab === 'countdown' && <ExamCountdownView />}
          {activeTab === 'gpa-convert' && <GPAScaleConverterView />}
          {activeTab === 'notes' && <StudentNotesView />}
          {activeTab === 'qr' && <QRCodeGeneratorView />}
          {activeTab === 'password' && <ExamPasswordGeneratorView />}
          {activeTab === 'picker' && <RandomPickerView />}
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 1. CGPA CALCULATOR
// =========================================================================
const CGPACalculatorView: React.FC = () => {
  const [semesters, setSemesters] = useState<Array<{ id: string; sem: number; gpa: number; credits: number }>>([
    { id: '1', sem: 1, gpa: 8.5, credits: 20 },
    { id: '2', sem: 2, gpa: 8.2, credits: 22 },
    { id: '3', sem: 3, gpa: 8.7, credits: 21 },
  ]);

  const addSemester = () => {
    const nextSem = semesters.length + 1;
    setSemesters([...semesters, { id: String(Date.now()), sem: nextSem, gpa: 8.0, credits: 20 }]);
  };

  const removeSemester = (id: string) => {
    if (semesters.length <= 1) return;
    setSemesters(semesters.filter((s) => s.id !== id));
  };

  const updateSemester = (id: string, field: 'gpa' | 'credits', val: number) => {
    setSemesters(semesters.map((s) => (s.id === id ? { ...s, [field]: val } : s)));
  };

  // Calculations
  const totalCredits = semesters.reduce((acc, s) => acc + (Number(s.credits) || 0), 0);
  const totalWeightedPoints = semesters.reduce((acc, s) => acc + (Number(s.gpa) || 0) * (Number(s.credits) || 0), 0);
  const cgpa = totalCredits > 0 ? (totalWeightedPoints / totalCredits).toFixed(2) : '0.00';
  const percentage = (parseFloat(cgpa) * 9.5).toFixed(1);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">CGPA Calculator</h3>
          <p className="text-xs text-slate-400">Calculate cumulative GPA with credit weighting and percentage conversion.</p>
        </div>
        <button
          onClick={addSemester}
          className="px-3 py-1.5 bg-swift-600 hover:bg-swift-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Semester
        </button>
      </div>

      {/* Result Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 text-center">
          <span className="text-xs text-slate-400">Cumulative CGPA</span>
          <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">{cgpa}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 text-center">
          <span className="text-xs text-slate-400">Total Credits</span>
          <p className="text-2xl sm:text-3xl font-black text-slate-100 mt-1">{totalCredits}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 text-center">
          <span className="text-xs text-slate-400">Percentage (x 9.5)</span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">{percentage}%</p>
        </div>
      </div>

      {/* Semester Rows */}
      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2">
          <span className="col-span-3">Semester</span>
          <span className="col-span-4">GPA / SGPA (0-10)</span>
          <span className="col-span-4">Credits</span>
          <span className="col-span-1 text-right">Del</span>
        </div>

        {semesters.map((s, idx) => (
          <div key={s.id} className="grid grid-cols-12 gap-2 items-center bg-slate-800/40 p-2 rounded-xl border border-slate-800">
            <span className="col-span-3 text-xs font-semibold text-slate-300 px-2">
              Semester {idx + 1}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              max="10"
              value={s.gpa}
              onChange={(e) => updateSemester(s.id, 'gpa', parseFloat(e.target.value) || 0)}
              className="col-span-4 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-swift-500 font-mono"
            />
            <input
              type="number"
              min="1"
              max="50"
              value={s.credits}
              onChange={(e) => updateSemester(s.id, 'credits', parseFloat(e.target.value) || 0)}
              className="col-span-4 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-swift-500 font-mono"
            />
            <button
              onClick={() => removeSemester(s.id)}
              disabled={semesters.length <= 1}
              className="col-span-1 p-1 text-slate-500 hover:text-rose-400 disabled:opacity-20 flex justify-end"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// =========================================================================
// 2. SGPA CALCULATOR
// =========================================================================
const SGPACalculatorView: React.FC = () => {
  const [courses, setCourses] = useState<Array<{ id: string; name: string; credits: number; gradePoint: number }>>([
    { id: '1', name: 'Mathematics III', credits: 4, gradePoint: 9 },
    { id: '2', name: 'Data Structures', credits: 4, gradePoint: 10 },
    { id: '3', name: 'Operating Systems', credits: 3, gradePoint: 8 },
    { id: '4', name: 'Digital Electronics', credits: 3, gradePoint: 8 },
    { id: '5', name: 'Algorithms Lab', credits: 2, gradePoint: 10 },
  ]);

  const GRADE_OPTIONS = [
    { label: 'O (Outstanding - 10)', point: 10 },
    { label: 'A+ (Excellent - 9)', point: 9 },
    { label: 'A (Very Good - 8)', point: 8 },
    { label: 'B+ (Good - 7)', point: 7 },
    { label: 'B (Above Average - 6)', point: 6 },
    { label: 'C (Average - 5)', point: 5 },
    { label: 'P (Pass - 4)', point: 4 },
    { label: 'F (Fail - 0)', point: 0 },
  ];

  const addCourse = () => {
    setCourses([...courses, { id: String(Date.now()), name: `Course ${courses.length + 1}`, credits: 3, gradePoint: 8 }]);
  };

  const removeCourse = (id: string) => {
    if (courses.length <= 1) return;
    setCourses(courses.filter((c) => c.id !== id));
  };

  const updateCourse = (id: string, field: 'name' | 'credits' | 'gradePoint', val: any) => {
    setCourses(courses.map((c) => (c.id === id ? { ...c, [field]: val } : c)));
  };

  const totalCredits = courses.reduce((acc, c) => acc + (Number(c.credits) || 0), 0);
  const totalPoints = courses.reduce((acc, c) => acc + (Number(c.credits) || 0) * (Number(c.gradePoint) || 0), 0);
  const sgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">SGPA Calculator</h3>
          <p className="text-xs text-slate-400">Calculate current semester grade point average with course credit weight.</p>
        </div>
        <button
          onClick={addCourse}
          className="px-3 py-1.5 bg-swift-600 hover:bg-swift-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Subject
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 text-center">
          <span className="text-xs text-slate-400">Semester SGPA</span>
          <p className="text-3xl font-black text-indigo-400 mt-1">{sgpa}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 text-center">
          <span className="text-xs text-slate-400">Total Semester Credits</span>
          <p className="text-3xl font-black text-slate-100 mt-1">{totalCredits}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2">
          <span className="col-span-5">Subject Title</span>
          <span className="col-span-3">Credits</span>
          <span className="col-span-3">Grade Point</span>
          <span className="col-span-1 text-right">Del</span>
        </div>

        {courses.map((c) => (
          <div key={c.id} className="grid grid-cols-12 gap-2 items-center bg-slate-800/40 p-2 rounded-xl border border-slate-800">
            <input
              type="text"
              value={c.name}
              onChange={(e) => updateCourse(c.id, 'name', e.target.value)}
              className="col-span-5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-swift-500"
            />
            <input
              type="number"
              min="1"
              max="10"
              value={c.credits}
              onChange={(e) => updateCourse(c.id, 'credits', parseFloat(e.target.value) || 0)}
              className="col-span-3 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-swift-500 font-mono"
            />
            <select
              value={c.gradePoint}
              onChange={(e) => updateCourse(c.id, 'gradePoint', parseInt(e.target.value, 10))}
              className="col-span-3 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-swift-500"
            >
              {GRADE_OPTIONS.map((g) => (
                <option key={g.point} value={g.point}>
                  {g.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => removeCourse(c.id)}
              disabled={courses.length <= 1}
              className="col-span-1 p-1 text-slate-500 hover:text-rose-400 disabled:opacity-20 flex justify-end"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// =========================================================================
// 3. ATTENDANCE & BUNK CALCULATOR
// =========================================================================
const AttendanceCalculatorView: React.FC = () => {
  const [totalClasses, setTotalClasses] = useState<number>(48);
  const [attendedClasses, setAttendedClasses] = useState<number>(38);
  const [targetPercentage, setTargetPercentage] = useState<number>(75);

  const currentPercentage = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;
  const isEligible = currentPercentage >= targetPercentage;

  // Calculate bunkable classes or classes needed to attend
  let bunkCount = 0;
  let classesNeeded = 0;

  if (isEligible) {
    // (attended) / (total + x) >= target / 100
    // attended * 100 >= target * total + target * x
    // x <= (attended * 100 - target * total) / target
    bunkCount = Math.floor((attendedClasses * 100 - targetPercentage * totalClasses) / targetPercentage);
  } else {
    // (attended + y) / (total + y) >= target / 100
    // 100 * attended + 100 * y >= target * total + target * y
    // y * (100 - target) >= target * total - 100 * attended
    if (100 - targetPercentage > 0) {
      classesNeeded = Math.ceil(
        (targetPercentage * totalClasses - 100 * attendedClasses) / (100 - targetPercentage)
      );
    }
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h3 className="text-lg font-bold text-white">Attendance & Bunk Planner</h3>
        <p className="text-xs text-slate-400">
          Find out exactly how many classes you can skip or must attend to maintain college criteria (75%/80%).
        </p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Total Classes Conducted</label>
          <input
            type="number"
            min="1"
            value={totalClasses}
            onChange={(e) => setTotalClasses(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-swift-500 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Classes Attended</label>
          <input
            type="number"
            min="0"
            max={totalClasses}
            value={attendedClasses}
            onChange={(e) => setAttendedClasses(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-swift-500 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Target Criteria (%)</label>
          <input
            type="number"
            min="50"
            max="100"
            value={targetPercentage}
            onChange={(e) => setTargetPercentage(Math.min(100, Math.max(1, parseInt(e.target.value) || 75)))}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-swift-500 font-mono"
          />
        </div>
      </div>

      {/* Main Status Card */}
      <div
        className={`p-5 rounded-2xl border text-center space-y-2 ${
          isEligible
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-rose-500/10 border-rose-500/30'
        }`}
      >
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Current Attendance Status
        </span>
        <div className="flex items-center justify-center gap-2">
          <span className={`text-4xl font-black ${isEligible ? 'text-emerald-400' : 'text-rose-400'}`}>
            {currentPercentage.toFixed(1)}%
          </span>
          <span className="text-xs text-slate-400">
            ({attendedClasses} / {totalClasses} classes)
          </span>
        </div>

        <div className="pt-2 border-t border-slate-700/40">
          {isEligible ? (
            <p className="text-sm font-semibold text-emerald-300">
              🎉 You are on track! You can safely bunk{' '}
              <span className="underline font-bold text-white">{bunkCount}</span> more classes while staying above {targetPercentage}%.
            </p>
          ) : (
            <p className="text-sm font-semibold text-rose-300">
              ⚠️ Short attendance! You must attend the next{' '}
              <span className="underline font-bold text-white">{classesNeeded}</span> consecutive classes to reach {targetPercentage}%.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 4. PERCENTAGE & MARKS CALCULATOR
// =========================================================================
const PercentageMarksView: React.FC = () => {
  const [totalMarks, setTotalMarks] = useState<number>(500);
  const [obtainedMarks, setObtainedMarks] = useState<number>(415);

  const percentage = totalMarks > 0 ? ((obtainedMarks / totalMarks) * 100).toFixed(2) : '0';

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h3 className="text-lg font-bold text-white">Percentage & Marks Calculator</h3>
        <p className="text-xs text-slate-400">Calculate exam percentage, grade classification, and mark gap.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Total Marks</label>
          <input
            type="number"
            value={totalMarks}
            onChange={(e) => setTotalMarks(parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-swift-500 font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Obtained Marks</label>
          <input
            type="number"
            value={obtainedMarks}
            onChange={(e) => setObtainedMarks(parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-swift-500 font-mono"
          />
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-center space-y-2">
        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Calculated Percentage</span>
        <p className="text-4xl font-black text-sky-400">{percentage}%</p>
        <p className="text-xs text-slate-400">
          Grade:{' '}
          <span className="font-bold text-white">
            {parseFloat(percentage) >= 75
              ? 'Distinction / First Class with Distinction'
              : parseFloat(percentage) >= 60
              ? 'First Division'
              : parseFloat(percentage) >= 50
              ? 'Second Division'
              : parseFloat(percentage) >= 33
              ? 'Third Division / Pass'
              : 'Fail'}
          </span>
        </p>
      </div>
    </div>
  );
};

// =========================================================================
// 5. AGE & EXAM ELIGIBILITY
// =========================================================================
const AgeCalculatorView: React.FC = () => {
  const [dob, setDob] = useState<string>('2003-05-15');
  const [asOfDate, setAsOfDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const birthDate = new Date(dob);
  const targetDate = new Date(asOfDate);

  let years = targetDate.getFullYear() - birthDate.getFullYear();
  let months = targetDate.getMonth() - birthDate.getMonth();
  let days = targetDate.getDate() - birthDate.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0).getDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const diffTime = targetDate.getTime() - birthDate.getTime();
  const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h3 className="text-lg font-bold text-white">Age & Exam Cut-Off Calculator</h3>
        <p className="text-xs text-slate-400">
          Calculate exact years, months, days and check eligibility for SSC, UPSC, and NDA cut-off dates.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Date of Birth (DOB)</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-swift-500 font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Age as of (Exam Cut-Off)</label>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-swift-500 font-mono"
          />
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-center space-y-3">
        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Your Exact Age</span>
        <p className="text-3xl font-black text-rose-400">
          {years} Years, {months} Months, {days} Days
        </p>
        <p className="text-xs text-slate-400">
          Total lived days: <span className="font-mono text-slate-200 font-bold">{totalDays} days</span>
        </p>
      </div>

      {/* Exam Eligibility Reference */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
        <h4 className="font-bold text-slate-200">Standard Exam Age Criteria (General Category):</h4>
        <ul className="grid grid-cols-2 gap-2 text-slate-400">
          <li>• SSC CGL: 18 – 30/32 Years</li>
          <li>• UPSC CSE: 21 – 32 Years</li>
          <li>• NDA / NA: 16.5 – 19.5 Years</li>
          <li>• NEET (UG): Min 17 Years</li>
        </ul>
      </div>
    </div>
  );
};

// =========================================================================
// 6. UNIT CONVERTER
// =========================================================================
const UnitConverterView: React.FC = () => {
  const [category, setCategory] = useState<'storage' | 'length' | 'weight'>('storage');
  const [val, setVal] = useState<number>(1024);
  const [fromUnit, setFromUnit] = useState<string>('MB');
  const [toUnit, setToUnit] = useState<string>('GB');

  const STORAGE_FACTORS: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  };

  const LENGTH_FACTORS: Record<string, number> = {
    mm: 0.001,
    cm: 0.01,
    m: 1,
    km: 1000,
    inch: 0.0254,
    ft: 0.3048,
  };

  let result = 0;
  if (category === 'storage') {
    const bytes = val * (STORAGE_FACTORS[fromUnit] || 1);
    result = bytes / (STORAGE_FACTORS[toUnit] || 1);
  } else if (category === 'length') {
    const meters = val * (LENGTH_FACTORS[fromUnit] || 1);
    result = meters / (LENGTH_FACTORS[toUnit] || 1);
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h3 className="text-lg font-bold text-white">Student Unit Converter</h3>
        <p className="text-xs text-slate-400">Quickly convert digital storage sizes, length, and dimensions.</p>
      </div>

      <div className="flex gap-2">
        {(['storage', 'length'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setCategory(cat);
              if (cat === 'storage') {
                setFromUnit('MB');
                setToUnit('GB');
              } else {
                setFromUnit('cm');
                setToUnit('m');
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
              category === cat ? 'bg-swift-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2 items-center">
        <div className="col-span-2 space-y-1">
          <input
            type="number"
            value={val}
            onChange={(e) => setVal(parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
          />
          <select
            value={fromUnit}
            onChange={(e) => setFromUnit(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
          >
            {Object.keys(category === 'storage' ? STORAGE_FACTORS : LENGTH_FACTORS).map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-1 text-center font-bold text-slate-400">=</div>

        <div className="col-span-2 space-y-1">
          <input
            type="text"
            readOnly
            value={result.toFixed(4).replace(/\.?0+$/, '')}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-amber-400 font-mono font-bold"
          />
          <select
            value={toUnit}
            onChange={(e) => setToUnit(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
          >
            {Object.keys(category === 'storage' ? STORAGE_FACTORS : LENGTH_FACTORS).map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 7. DATE DIFFERENCE
// =========================================================================
const DateDiffView: React.FC = () => {
  const [start, setStart] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(totalDays / 7);
  const remDays = totalDays % 7;

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h3 className="text-lg font-bold text-white">Date Difference Calculator</h3>
        <p className="text-xs text-slate-400">Calculate total calendar days and weeks between assignment dates.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Start Date</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">End Date</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
          />
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-center space-y-2">
        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Duration</span>
        <p className="text-3xl font-black text-blue-400">{totalDays} Days</p>
        <p className="text-xs text-slate-400">
          Equivalent to <span className="font-bold text-white">{weeks} weeks</span> and {remDays} days
        </p>
      </div>
    </div>
  );
};

// =========================================================================
// 8. STUDY TIMETABLE PLANNER
// =========================================================================
const TimetablePlannerView: React.FC = () => {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const SLOTS = ['Morning (08:00 - 12:00)', 'Afternoon (13:00 - 17:00)', 'Evening (18:00 - 22:00)'];

  const [schedule, setSchedule] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('justpdfcraft_timetable') || localStorage.getItem('swifteditoo_timetable');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      'Mon-0': 'Mathematics Revision',
      'Mon-1': 'Physics Problems',
      'Tue-0': 'Chemistry Lab Prep',
      'Wed-1': 'Programming Practice',
    };
  });

  const updateSlot = (key: string, text: string) => {
    const updated = { ...schedule, [key]: text };
    setSchedule(updated);
    try {
      localStorage.setItem('justpdfcraft_timetable', JSON.stringify(updated));
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Weekly Study Timetable Planner</h3>
          <p className="text-xs text-slate-400">Plan and balance your revision sessions across the week. Auto-saved locally.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60">
              <th className="p-2.5 font-bold text-slate-400">Day</th>
              {SLOTS.map((s) => (
                <th key={s} className="p-2.5 font-bold text-slate-300">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {DAYS.map((d) => (
              <tr key={d} className="hover:bg-slate-800/30">
                <td className="p-2.5 font-bold text-swift-400">{d}</td>
                {SLOTS.map((_, sIdx) => {
                  const key = `${d}-${sIdx}`;
                  return (
                    <td key={key} className="p-1.5">
                      <input
                        type="text"
                        value={schedule[key] || ''}
                        placeholder="Free slot"
                        onChange={(e) => updateSlot(key, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-swift-500"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// =========================================================================
// 9. EXAM COUNTDOWN
// =========================================================================
const ExamCountdownView: React.FC = () => {
  const [exams, setExams] = useState<Array<{ id: string; name: string; date: string }>>(() => {
    try {
      const saved = localStorage.getItem('justpdfcraft_exams') || localStorage.getItem('swifteditoo_exams');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: '1', name: 'Semester Final Examinations', date: '2026-11-20' },
      { id: '2', name: 'Project Submission Deadline', date: '2026-10-15' },
    ];
  });

  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');

  const addExam = () => {
    if (!newName.trim() || !newDate) return;
    const updated = [...exams, { id: String(Date.now()), name: newName, date: newDate }];
    setExams(updated);
    setNewName('');
    setNewDate('');
    try {
      localStorage.setItem('justpdfcraft_exams', JSON.stringify(updated));
    } catch {}
  };

  const removeExam = (id: string) => {
    const updated = exams.filter((e) => e.id !== id);
    setExams(updated);
    try {
      localStorage.setItem('justpdfcraft_exams', JSON.stringify(updated));
    } catch {}
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h3 className="text-lg font-bold text-white">Exam Countdown Tracker</h3>
        <p className="text-xs text-slate-400">Keep target test dates and assignment deadlines on your radar.</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Exam name (e.g. GATE 2027)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
        />
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
        />
        <button
          onClick={addExam}
          className="px-4 py-2 bg-swift-600 hover:bg-swift-500 text-white rounded-xl text-xs font-semibold"
        >
          Add
        </button>
      </div>

      <div className="space-y-3">
        {exams.map((ex) => {
          const diffMs = new Date(ex.date).getTime() - Date.now();
          const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          const isPast = days < 0;

          return (
            <div
              key={ex.id}
              className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between"
            >
              <div>
                <h4 className="text-sm font-bold text-white">{ex.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{ex.date}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className={`text-xl font-black ${isPast ? 'text-slate-500' : 'text-amber-400'}`}>
                    {isPast ? 'Passed' : `${days} Days Left`}
                  </span>
                </div>
                <button
                  onClick={() => removeExam(ex.id)}
                  className="p-1 text-slate-500 hover:text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =========================================================================
// 10. GPA SCALE CONVERTER
// =========================================================================
const GPAScaleConverterView: React.FC = () => {
  const [inputScale, setInputScale] = useState<'10' | '4'>('10');
  const [val, setVal] = useState<number>(8.5);

  const scale10 = inputScale === '10' ? val : (val / 4.0) * 10;
  const scale4 = inputScale === '4' ? val : (val / 10.0) * 4.0;
  const percentage = (scale10 * 9.5).toFixed(1);

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h3 className="text-lg font-bold text-white">GPA Scale Converter</h3>
        <p className="text-xs text-slate-400">Convert between 10-point Indian scale, 4.0 US scale, and percentage.</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setInputScale('10')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            inputScale === '10' ? 'bg-swift-600 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          Input on 10-Point Scale
        </button>
        <button
          onClick={() => setInputScale('4')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            inputScale === '4' ? 'bg-swift-600 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          Input on 4.0 Scale
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300">Enter Value</label>
        <input
          type="number"
          step="0.01"
          value={val}
          onChange={(e) => setVal(parseFloat(e.target.value) || 0)}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
          <span className="text-xs text-slate-400">10-Point Scale</span>
          <p className="text-2xl font-black text-amber-400 mt-1">{scale10.toFixed(2)}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
          <span className="text-xs text-slate-400">4.0 US Scale</span>
          <p className="text-2xl font-black text-indigo-400 mt-1">{scale4.toFixed(2)}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
          <span className="text-xs text-slate-400">Percentage (Approx)</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">{percentage}%</p>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 11. STUDENT SCRATCHPAD / NOTES
// =========================================================================
const StudentNotesView: React.FC = () => {
  const [note, setNote] = useState<string>(() => {
    try {
      return localStorage.getItem('justpdfcraft_scratchpad') || localStorage.getItem('swifteditoo_scratchpad') || '';
    } catch {}
    return '';
  });

  const { addToast } = useUIStore();

  const handleTextChange = (text: string) => {
    setNote(text);
    try {
      localStorage.setItem('justpdfcraft_scratchpad', text);
    } catch {}
  };

  const wordCount = note.trim() ? note.trim().split(/\s+/).length : 0;
  const charCount = note.length;

  const downloadNotes = () => {
    const blob = new Blob([note], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'JustPDFCraft_Study_Notes.txt';
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', title: 'Notes Downloaded' });
  };

  const copyNotes = () => {
    navigator.clipboard.writeText(note);
    addToast({ type: 'success', title: 'Copied to Clipboard' });
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Student Scratchpad & Notes</h3>
          <p className="text-xs text-slate-400">Offline markdown notepad. Auto-saves locally to your browser.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyNotes}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy</span>
          </button>
          <button
            onClick={downloadNotes}
            className="px-3 py-1.5 bg-swift-600 hover:bg-swift-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-swift-900/30"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .txt</span>
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <textarea
          rows={12}
          value={note}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Jot down quick homework questions, formulas, lecture notes, or study checklist..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 focus:outline-none focus:border-swift-500 resize-none font-mono leading-relaxed"
        />
        <div className="flex justify-between items-center text-[11px] text-slate-500 px-1">
          <span>Auto-saved in local storage</span>
          <span>
            {wordCount} words • {charCount} characters
          </span>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 12. QR CODE GENERATOR
// =========================================================================
const QRCodeGeneratorView: React.FC = () => {
  const [text, setText] = useState('https://justpdfcraft.xyz');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { addToast } = useUIStore();

  useEffect(() => {
    // Generate a high-contrast QR visual using client-side canvas API
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw clean background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 240, 240);

    // Using Google Chart QR API or pure client-side image loader
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 0, 0, 240, 240);
    };
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
      text || 'https://justpdfcraft.xyz'
    )}`;
  }, [text]);

  const downloadQR = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'JustPDFCraft_QRCode.png';
    a.click();
    addToast({ type: 'success', title: 'QR Code Downloaded' });
  };

  return (
    <div className="space-y-6 max-w-md mx-auto text-center">
      <div>
        <h3 className="text-lg font-bold text-white">Instant QR Code Generator</h3>
        <p className="text-xs text-slate-400">Create QR codes for assignment links, Google Drive notes, or portfolio.</p>
      </div>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter URL or text..."
        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
      />

      <div className="flex justify-center">
        <div className="p-3 bg-white rounded-2xl shadow-xl">
          <canvas ref={canvasRef} width={240} height={240} className="rounded-lg" />
        </div>
      </div>

      <button
        onClick={downloadQR}
        className="px-5 py-2.5 bg-swift-600 hover:bg-swift-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 mx-auto"
      >
        <Download className="w-4 h-4" />
        Download QR Code (PNG)
      </button>
    </div>
  );
};

// =========================================================================
// 13. EXAM PORTAL PASSWORD GENERATOR
// =========================================================================
const ExamPasswordGeneratorView: React.FC = () => {
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(12);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const { addToast } = useUIStore();

  const generatePassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const nums = '23456789';
    const symbols = '@#$*!';

    let chars = upper + lower + nums;
    if (includeSymbols) chars += symbols;

    let res = '';
    for (let i = 0; i < length; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  useEffect(() => {
    generatePassword();
  }, [length, includeSymbols]);

  const copyPassword = () => {
    navigator.clipboard.writeText(password);
    addToast({ type: 'success', title: 'Password Copied' });
  };

  return (
    <div className="space-y-6 max-w-md mx-auto text-center">
      <div>
        <h3 className="text-lg font-bold text-white">Exam Portal Password Generator</h3>
        <p className="text-xs text-slate-400">
          Generates strong, memorable passwords complying with strict exam portal rules without confusing characters.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-700/80 flex items-center justify-between">
        <span className="font-mono text-lg font-bold text-amber-400 select-all tracking-wider">
          {password}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={generatePassword}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            title="Regenerate"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={copyPassword}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            title="Copy Password"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 text-left">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>Password Length: {length}</span>
          <input
            type="range"
            min="8"
            max="24"
            value={length}
            onChange={(e) => setLength(parseInt(e.target.value, 10))}
            className="w-36 accent-swift-500"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={includeSymbols}
            onChange={(e) => setIncludeSymbols(e.target.checked)}
            className="rounded border-slate-700 accent-swift-500"
          />
          <span>Include special characters (@, #, $, *, !)</span>
        </label>
      </div>
    </div>
  );
};

// =========================================================================
// 14. RANDOM PICKER & ROLL UTILITY
// =========================================================================
const RandomPickerView: React.FC = () => {
  const [minRoll, setMinRoll] = useState(1);
  const [maxRoll, setMaxRoll] = useState(60);
  const [pickedRoll, setPickedRoll] = useState<number | null>(null);

  const pickRandomNumber = () => {
    const num = Math.floor(Math.random() * (maxRoll - minRoll + 1)) + minRoll;
    setPickedRoll(num);
  };

  return (
    <div className="space-y-6 max-w-md mx-auto text-center">
      <div>
        <h3 className="text-lg font-bold text-white">Random Roll & Number Picker</h3>
        <p className="text-xs text-slate-400">Fair randomized roll picker for classroom vivas and project group assignments.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 text-left">
          <label className="text-xs text-slate-400">Min Roll Number</label>
          <input
            type="number"
            value={minRoll}
            onChange={(e) => setMinRoll(parseInt(e.target.value) || 1)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
          />
        </div>
        <div className="space-y-1 text-left">
          <label className="text-xs text-slate-400">Max Roll Number</label>
          <input
            type="number"
            value={maxRoll}
            onChange={(e) => setMaxRoll(parseInt(e.target.value) || 1)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
          />
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-slate-800/60 border border-slate-700 text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Selected Roll Number</span>
        <p className="text-5xl font-black text-amber-400 mt-2">
          {pickedRoll !== null ? pickedRoll : '—'}
        </p>
      </div>

      <button
        onClick={pickRandomNumber}
        className="px-6 py-2.5 bg-swift-600 hover:bg-swift-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-swift-900/40 flex items-center gap-2 mx-auto"
      >
        <Dices className="w-4 h-4" />
        Pick Random Roll
      </button>
    </div>
  );
};
