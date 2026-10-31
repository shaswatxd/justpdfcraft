import React, { useState, useEffect } from 'react';
import {
  X,
  GraduationCap,
  Calculator,
  FileText,
  Clock,
  Calendar,
  Award,
  Download,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type StudentTab =
  | 'resume-builder'
  | 'cover-letter'
  | 'cgpa-calculator'
  | 'percentage-calculator'
  | 'age-calculator'
  | 'date-difference'
  | 'word-counter'
  | 'typing-speed'
  | 'timetable'
  | 'certificate'
  | 'invoice';

export const StudentToolsSuiteDialog: React.FC = () => {
  const { activeModal, setActiveModal, activeStudentTab, addToast } = useUIStore();
  const isOpen = activeModal === 'student-tools';

  const [activeTab, setActiveTab] = useState<StudentTab>('cgpa-calculator');

  useEffect(() => {
    if (activeStudentTab) {
      setActiveTab(activeStudentTab as StudentTab);
    }
  }, [activeStudentTab]);

  // 1. CGPA & GPA Calculator State
  const [semesters, setSemesters] = useState([
    { sem: 1, gpa: 8.5, credits: 20 },
    { sem: 2, gpa: 8.2, credits: 22 },
    { sem: 3, gpa: 8.8, credits: 20 },
  ]);

  const cgpaResult = React.useMemo(() => {
    const totalCredits = semesters.reduce((acc, s) => acc + (Number(s.credits) || 0), 0);
    const totalPoints = semesters.reduce((acc, s) => acc + (Number(s.gpa) || 0) * (Number(s.credits) || 0), 0);
    const cgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
    const percentage = totalCredits > 0 ? (Number(cgpa) * 9.5).toFixed(1) : '0.0';
    return { cgpa, percentage, totalCredits };
  }, [semesters]);

  // 2. Percentage & Exam Marks Calculator State
  const [obtainedMarks, setObtainedMarks] = useState(435);
  const [totalMarks, setTotalMarks] = useState(500);
  const [targetPercentage, setTargetPercentage] = useState(85);

  const percentageResult = React.useMemo(() => {
    const pct = totalMarks > 0 ? ((obtainedMarks / totalMarks) * 100).toFixed(2) : '0.00';
    const needed = Math.ceil((targetPercentage / 100) * totalMarks);
    return { pct, needed };
  }, [obtainedMarks, totalMarks, targetPercentage]);

  // 3. Age & Exam Eligibility Calculator State
  const [birthDate, setBirthDate] = useState('2002-05-15');
  const [cutoffDate, setCutoffDate] = useState('2026-08-01');

  const ageResult = React.useMemo(() => {
    const dob = new Date(birthDate);
    const asOf = new Date(cutoffDate);
    if (isNaN(dob.getTime()) || isNaN(asOf.getTime())) return null;

    let years = asOf.getFullYear() - dob.getFullYear();
    let months = asOf.getMonth() - dob.getMonth();
    let days = asOf.getDate() - dob.getDate();

    if (days < 0) {
      months -= 1;
      const prevDays = new Date(asOf.getFullYear(), asOf.getMonth(), 0).getDate();
      days += prevDays;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    return { years, months, days };
  }, [birthDate, cutoffDate]);

  // 4. Date Difference Calculator
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-06-30');

  const dateDiffResult = React.useMemo(() => {
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime();
    if (isNaN(s) || isNaN(e)) return null;
    const diffDays = Math.round(Math.abs(e - s) / (1000 * 60 * 60 * 24));
    const weeks = (diffDays / 7).toFixed(1);
    return { diffDays, weeks };
  }, [startDate, endDate]);

  // 5. Word & Character Counter
  const [counterText, setCounterText] = useState(
    'JustPDFCraft offers fast, private document tools. Everything runs right in your browser tab using WebAssembly. Enjoy smooth workflow with zero cloud uploads.'
  );

  const counterStats = React.useMemo(() => {
    const text = counterText.trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const chars = counterText.length;
    const charsNoSpace = counterText.replace(/\s/g, '').length;
    const sentences = text ? text.split(/[.!?]+/).filter(Boolean).length : 0;
    const paragraphs = text ? text.split(/\n+/).filter(Boolean).length : 0;
    const readingTimeMin = Math.ceil(words / 200);
    return { words, chars, charsNoSpace, sentences, paragraphs, readingTimeMin };
  }, [counterText]);

  // 6. Typing Speed Test State
  const samplePassage = 'Accuracy and speed in typing empower developers and students to craft outstanding documents rapidly.';
  const [typedInput, setTypedInput] = useState('');
  const [typingStart, setTypingStart] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);

  const handleTypingChange = (val: string) => {
    if (!typingStart) setTypingStart(Date.now());
    setTypedInput(val);

    const timeSec = Math.max(1, ((Date.now() - (typingStart || Date.now())) / 1000));
    const wordsTyped = val.trim().split(/\s+/).length;
    setWpm(Math.round((wordsTyped / timeSec) * 60));
  };

  const resetTyping = () => {
    setTypedInput('');
    setTypingStart(null);
    setWpm(0);
  };

  // 7. Resume Builder State & PDF Download
  const [resumeData, setResumeData] = useState({
    name: 'Alex Johnson',
    title: 'Software Engineer',
    email: 'alex@example.com',
    phone: '+1 (555) 019-2834',
    location: 'San Francisco, CA',
    summary: 'Results-driven software developer with expertise in TypeScript, React, and cloud architectures. Passionate about local-first privacy applications.',
    experience: 'Senior Frontend Developer — TechNova (2023 - Present)\nBuilt fast WebAssembly modules and responsive SaaS platforms.\n\nSoftware Engineer — CloudScale (2021 - 2023)\nDesigned customer-facing dashboards and optimized REST APIs.',
    education: 'B.S. in Computer Science — University of California (2017 - 2021)\nDean\'s Honors List, GPA 3.8/4.0',
    skills: 'TypeScript, React, Node.js, Tailwind CSS, WebAssembly, Git, Vitest, CI/CD',
  });

  const exportResumePdf = async () => {
    try {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const bold = await doc.embedFont(StandardFonts.HelveticaBold);

      const page = doc.addPage([595.28, 841.89]);
      let y = 800;
      const margin = 50;

      // Header
      page.drawText(resumeData.name, { x: margin, y, size: 22, font: bold, color: rgb(0.1, 0.15, 0.25) });
      y -= 22;
      page.drawText(resumeData.title, { x: margin, y, size: 12, font, color: rgb(0.3, 0.4, 0.5) });
      y -= 18;
      page.drawText(`${resumeData.email} | ${resumeData.phone} | ${resumeData.location}`, {
        x: margin,
        y,
        size: 9.5,
        font,
        color: rgb(0.4, 0.45, 0.5),
      });
      y -= 24;

      // Summary
      page.drawText('PROFESSIONAL SUMMARY', { x: margin, y, size: 11, font: bold, color: rgb(0.15, 0.25, 0.4) });
      y -= 16;
      page.drawText(resumeData.summary, { x: margin, y, size: 9.5, font, maxWidth: 495, lineHeight: 14 });
      y -= 38;

      // Experience
      page.drawText('WORK EXPERIENCE', { x: margin, y, size: 11, font: bold, color: rgb(0.15, 0.25, 0.4) });
      y -= 16;
      for (const line of resumeData.experience.split('\n')) {
        if (!line.trim()) {
          y -= 8;
          continue;
        }
        page.drawText(line, { x: margin, y, size: 9.5, font: line.includes('—') ? bold : font, maxWidth: 495 });
        y -= 14;
      }
      y -= 14;

      // Education
      page.drawText('EDUCATION', { x: margin, y, size: 11, font: bold, color: rgb(0.15, 0.25, 0.4) });
      y -= 16;
      for (const line of resumeData.education.split('\n')) {
        page.drawText(line, { x: margin, y, size: 9.5, font, maxWidth: 495 });
        y -= 14;
      }
      y -= 14;

      // Skills
      page.drawText('KEY SKILLS', { x: margin, y, size: 11, font: bold, color: rgb(0.15, 0.25, 0.4) });
      y -= 16;
      page.drawText(resumeData.skills, { x: margin, y, size: 9.5, font, maxWidth: 495 });

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resumeData.name.replace(/\s+/g, '_')}_Resume.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', title: 'Resume PDF Generated', message: 'Download started successfully.' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Export Failed', message: e.message });
    }
  };

  // 8. Certificate Generator
  const [certData, setCertData] = useState({
    recipient: 'John Doe',
    title: 'Certificate of Excellence',
    course: 'Full-Stack Web Development & Modern Architecture',
    issuer: 'JustPDFCraft Academy',
    date: new Date().toLocaleDateString(),
  });

  const exportCertificatePdf = async () => {
    try {
      const doc = await PDFDocument.create();
      const bold = await doc.embedFont(StandardFonts.HelveticaBold);
      const font = await doc.embedFont(StandardFonts.Helvetica);

      // Landscape A4
      const page = doc.addPage([841.89, 595.28]);
      const { width, height } = page.getSize();

      // Border frame
      page.drawRectangle({
        x: 30,
        y: 30,
        width: width - 60,
        height: height - 60,
        borderColor: rgb(0.15, 0.25, 0.5),
        borderWidth: 3,
      });

      page.drawText(certData.title.toUpperCase(), {
        x: width / 2 - 180,
        y: height - 120,
        size: 26,
        font: bold,
        color: rgb(0.15, 0.25, 0.5),
      });

      page.drawText('This certificate is proudly presented to', {
        x: width / 2 - 120,
        y: height - 180,
        size: 13,
        font,
        color: rgb(0.4, 0.45, 0.5),
      });

      page.drawText(certData.recipient, {
        x: width / 2 - 100,
        y: height - 240,
        size: 30,
        font: bold,
        color: rgb(0.1, 0.15, 0.2),
      });

      page.drawText(`for successfully mastering ${certData.course}`, {
        x: width / 2 - 160,
        y: height - 300,
        size: 13,
        font,
        color: rgb(0.3, 0.35, 0.4),
      });

      page.drawText(`Issued by: ${certData.issuer}   •   Date: ${certData.date}`, {
        x: width / 2 - 140,
        y: 100,
        size: 11,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });

      const bytes = await doc.save();
      const blob = new Blob([bytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificate_${certData.recipient.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', title: 'Certificate PDF Generated' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Export Failed', message: e.message });
    }
  };

  if (!isOpen) return null;

  const tabs: { id: StudentTab; label: string; icon: any }[] = [
    { id: 'resume-builder', label: 'Resume & CV Builder', icon: FileText },
    { id: 'cgpa-calculator', label: 'CGPA & GPA Calc', icon: Calculator },
    { id: 'percentage-calculator', label: 'Marks & Percentage', icon: Calculator },
    { id: 'age-calculator', label: 'Age & Eligibility', icon: Clock },
    { id: 'date-difference', label: 'Date Difference', icon: Calendar },
    { id: 'word-counter', label: 'Word & Char Counter', icon: FileText },
    { id: 'typing-speed', label: 'Typing Test', icon: Sparkles },
    { id: 'certificate', label: 'Certificate Gen', icon: Award },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200/80 flex items-center justify-center text-violet-600 shadow-2xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Student Productivity Suite</h2>
              <p className="text-xs text-slate-500 font-medium">Calculators, Resumes, Certificates & Study Tools</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Nav Bar */}
        <div className="flex overflow-x-auto border-b border-slate-100 px-4 py-2 gap-1.5 bg-white shrink-0 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
          {/* RESUME & CV BUILDER */}
          {activeTab === 'resume-builder' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Professional Resume Builder</h3>
                  <p className="text-xs text-slate-500">Edit fields and click below to download instant PDF</p>
                </div>
                <button
                  onClick={exportResumePdf}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Resume PDF</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={resumeData.name}
                      onChange={(e) => setResumeData({ ...resumeData, name: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Job Title</label>
                    <input
                      type="text"
                      value={resumeData.title}
                      onChange={(e) => setResumeData({ ...resumeData, title: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Email & Phone</label>
                    <input
                      type="text"
                      value={resumeData.email}
                      onChange={(e) => setResumeData({ ...resumeData, email: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Professional Summary</label>
                    <textarea
                      value={resumeData.summary}
                      onChange={(e) => setResumeData({ ...resumeData, summary: e.target.value })}
                      rows={4}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Work Experience</label>
                    <textarea
                      value={resumeData.experience}
                      onChange={(e) => setResumeData({ ...resumeData, experience: e.target.value })}
                      rows={4}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Education</label>
                    <textarea
                      value={resumeData.education}
                      onChange={(e) => setResumeData({ ...resumeData, education: e.target.value })}
                      rows={3}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Skills</label>
                    <input
                      type="text"
                      value={resumeData.skills}
                      onChange={(e) => setResumeData({ ...resumeData, skills: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CGPA & GPA CALCULATOR */}
          {activeTab === 'cgpa-calculator' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="grid grid-cols-2 gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs text-center">
                <div className="p-3 bg-violet-50 rounded-xl border border-violet-100">
                  <span className="text-[11px] font-bold text-violet-700 uppercase">Cumulative CGPA</span>
                  <div className="text-3xl font-extrabold text-violet-900 mt-1">{cgpaResult.cgpa}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-600 uppercase">Approx. Percentage (×9.5)</span>
                  <div className="text-3xl font-extrabold text-slate-800 mt-1">{cgpaResult.percentage}%</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Semester Records</h4>
                  <button
                    onClick={() =>
                      setSemesters([
                        ...semesters,
                        { sem: semesters.length + 1, gpa: 8.0, credits: 20 },
                      ])
                    }
                    className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Semester</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {semesters.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs font-bold text-slate-700 w-16">Sem {s.sem}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">GPA:</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="10"
                          value={s.gpa}
                          onChange={(e) => {
                            const updated = [...semesters];
                            updated[idx].gpa = parseFloat(e.target.value) || 0;
                            setSemesters(updated);
                          }}
                          className="w-20 text-xs p-1.5 rounded-lg border border-slate-200 bg-white font-mono"
                        />
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">Credits:</span>
                        <input
                          type="number"
                          min="1"
                          max="40"
                          value={s.credits}
                          onChange={(e) => {
                            const updated = [...semesters];
                            updated[idx].credits = parseInt(e.target.value, 10) || 0;
                            setSemesters(updated);
                          }}
                          className="w-20 text-xs p-1.5 rounded-lg border border-slate-200 bg-white font-mono"
                        />
                      </div>
                      {semesters.length > 1 && (
                        <button
                          onClick={() => setSemesters(semesters.filter((_, i) => i !== idx))}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PERCENTAGE CALCULATOR */}
          {activeTab === 'percentage-calculator' && (
            <div className="max-w-md mx-auto space-y-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div className="text-center p-3 bg-violet-50 rounded-xl">
                  <span className="text-xs font-bold text-violet-700 uppercase">Calculated Percentage</span>
                  <div className="text-4xl font-extrabold text-violet-900 mt-1">{percentageResult.pct}%</div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Marks Obtained</label>
                    <input
                      type="number"
                      value={obtainedMarks}
                      onChange={(e) => setObtainedMarks(Number(e.target.value))}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-mono shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Total Maximum Marks</label>
                    <input
                      type="number"
                      value={totalMarks}
                      onChange={(e) => setTotalMarks(Number(e.target.value))}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-mono shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Target Percentage (%)</label>
                    <input
                      type="number"
                      value={targetPercentage}
                      onChange={(e) => setTargetPercentage(Number(e.target.value))}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-mono shadow-2xs"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Required marks to reach {targetPercentage}%: <strong className="text-violet-700">{percentageResult.needed}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AGE & EXAM ELIGIBILITY */}
          {activeTab === 'age-calculator' && (
            <div className="max-w-md mx-auto space-y-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
                {ageResult && (
                  <div className="text-center p-3 bg-violet-50 rounded-xl">
                    <span className="text-xs font-bold text-violet-700 uppercase">Age as of Cutoff</span>
                    <div className="text-2xl font-extrabold text-violet-900 mt-1">
                      {ageResult.years} yrs, {ageResult.months} mos, {ageResult.days} days
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Cutoff / Reference Date</label>
                    <input
                      type="date"
                      value={cutoffDate}
                      onChange={(e) => setCutoffDate(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DATE DIFFERENCE */}
          {activeTab === 'date-difference' && (
            <div className="max-w-md mx-auto space-y-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
                {dateDiffResult && (
                  <div className="text-center p-3 bg-violet-50 rounded-xl">
                    <span className="text-xs font-bold text-violet-700 uppercase">Total Duration</span>
                    <div className="text-2xl font-extrabold text-violet-900 mt-1">
                      {dateDiffResult.diffDays} Days ({dateDiffResult.weeks} Weeks)
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WORD & CHAR COUNTER */}
          {activeTab === 'word-counter' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Words</span>
                  <div className="text-2xl font-bold text-slate-900">{counterStats.words}</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Characters</span>
                  <div className="text-2xl font-bold text-slate-900">{counterStats.chars}</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">No Spaces</span>
                  <div className="text-2xl font-bold text-slate-900">{counterStats.charsNoSpace}</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Read Time</span>
                  <div className="text-2xl font-bold text-violet-600">{counterStats.readingTimeMin}m</div>
                </div>
              </div>

              <div>
                <textarea
                  value={counterText}
                  onChange={(e) => setCounterText(e.target.value)}
                  rows={8}
                  className="w-full text-xs p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs focus:ring-2 focus:ring-violet-500/20 resize-none"
                  placeholder="Paste or write text..."
                />
              </div>
            </div>
          )}

          {/* TYPING SPEED TEST */}
          {activeTab === 'typing-speed' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Practice Text</span>
                  <div className="text-lg font-bold text-violet-600 font-mono">Speed: {wpm} WPM</div>
                </div>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-medium text-slate-700 leading-relaxed select-none">
                  {samplePassage}
                </p>
                <textarea
                  value={typedInput}
                  onChange={(e) => handleTypingChange(e.target.value)}
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-violet-500/20 shadow-2xs"
                  placeholder="Start typing the passage here..."
                />
                <div className="flex justify-end">
                  <button
                    onClick={resetTyping}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Test</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CERTIFICATE GENERATOR */}
          {activeTab === 'certificate' && (
            <div className="max-w-xl mx-auto space-y-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Recipient Name</label>
                  <input
                    type="text"
                    value={certData.recipient}
                    onChange={(e) => setCertData({ ...certData, recipient: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Certificate Title</label>
                  <input
                    type="text"
                    value={certData.title}
                    onChange={(e) => setCertData({ ...certData, title: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Course or Program</label>
                  <input
                    type="text"
                    value={certData.course}
                    onChange={(e) => setCertData({ ...certData, course: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Issuing Authority</label>
                  <input
                    type="text"
                    value={certData.issuer}
                    onChange={(e) => setCertData({ ...certData, issuer: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                  />
                </div>
                <div className="pt-2">
                  <button
                    onClick={exportCertificatePdf}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Generate & Download Certificate PDF</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
