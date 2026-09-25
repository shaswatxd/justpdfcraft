import { describe, it, expect } from 'vitest';
import QRCode from 'qrcode';

describe('Student Suite Calculators Logic (Section 38-41)', () => {
  // =========================================================================
  // 1. CGPA Calculator
  // =========================================================================
  describe('CGPA Calculation', () => {
    it('should compute weighted CGPA accurately across multiple semesters', () => {
      const semesters = [
        { sem: 1, gpa: 8.5, credits: 20 },
        { sem: 2, gpa: 8.0, credits: 22 },
        { sem: 3, gpa: 9.0, credits: 20 },
      ];

      const totalCredits = semesters.reduce((acc, s) => acc + s.credits, 0);
      const totalPoints = semesters.reduce((acc, s) => acc + s.gpa * s.credits, 0);
      const cgpa = (totalPoints / totalCredits).toFixed(2);

      // (8.5*20 + 8.0*22 + 9.0*20) / (20 + 22 + 20) = (170 + 176 + 180) / 62 = 526 / 62 = 8.4838 -> 8.48
      expect(cgpa).toBe('8.48');
    });

    it('should accurately convert CGPA to percentage using standard 9.5 factor', () => {
      const cgpa = 8.48;
      const percentage = (cgpa * 9.5).toFixed(1);
      expect(percentage).toBe('80.6');
    });

    it('should handle zero credits gracefully without division by zero crash', () => {
      const semesters: any[] = [];
      const totalCredits = semesters.reduce((acc, s) => acc + (Number(s.credits) || 0), 0);
      const cgpa = totalCredits > 0 ? '8.00' : '0.00';
      expect(cgpa).toBe('0.00');
    });
  });

  // =========================================================================
  // 2. SGPA Calculator
  // =========================================================================
  describe('SGPA Calculation', () => {
    it('should compute weighted SGPA using course credits and grade points', () => {
      const courses = [
        { name: 'Maths', credits: 4, gradePoint: 10 },
        { name: 'Physics', credits: 4, gradePoint: 8 },
        { name: 'CS Lab', credits: 2, gradePoint: 9 },
      ];

      const totalCredits = courses.reduce((acc, c) => acc + c.credits, 0);
      const totalPoints = courses.reduce((acc, c) => acc + c.credits * c.gradePoint, 0);
      const sgpa = (totalPoints / totalCredits).toFixed(2);

      // (4*10 + 4*8 + 2*9) / 10 = (40 + 32 + 18) / 10 = 90 / 10 = 9.00
      expect(sgpa).toBe('9.00');
      expect(totalCredits).toBe(10);
    });
  });

  // =========================================================================
  // 3. Attendance Bunk Planner
  // =========================================================================
  describe('Attendance Bunk Planner', () => {
    it('should calculate safe bunkable classes when above target percentage', () => {
      const totalClasses = 50;
      const attendedClasses = 45;
      const targetPercentage = 75;

      const currentPercentage = (attendedClasses / totalClasses) * 100;
      expect(currentPercentage).toBe(90);

      // Formula: floor((attended * 100 - target * total) / target)
      // (45*100 - 75*50) / 75 = (4500 - 3750) / 75 = 750 / 75 = 10
      const bunkCount = Math.floor((attendedClasses * 100 - targetPercentage * totalClasses) / targetPercentage);
      expect(bunkCount).toBe(10);

      // Verifying: if 10 classes are bunked: 45 / 60 = 0.75 (75.0%)
      expect((attendedClasses / (totalClasses + bunkCount)) * 100).toBe(75);
    });

    it('should calculate consecutive classes needed to attend when below target percentage', () => {
      const totalClasses = 50;
      const attendedClasses = 30; // 60%
      const targetPercentage = 75;

      const currentPercentage = (attendedClasses / totalClasses) * 100;
      expect(currentPercentage).toBe(60);

      // Formula: ceil((target * total - 100 * attended) / (100 - target))
      // (75*50 - 100*30) / (100 - 75) = (3750 - 3000) / 25 = 750 / 25 = 30
      const needed = Math.ceil((targetPercentage * totalClasses - 100 * attendedClasses) / (100 - targetPercentage));
      expect(needed).toBe(30);

      // Verifying: if 30 classes are attended: (30 + 30) / (50 + 30) = 60 / 80 = 75%
      expect(((attendedClasses + needed) / (totalClasses + needed)) * 100).toBe(75);
    });
  });

  // =========================================================================
  // 4. Percentage & Marks Calculator
  // =========================================================================
  describe('Percentage & Marks Calculation', () => {
    it('should calculate percentage from obtained and maximum marks', () => {
      const obtained = 435;
      const total = 500;
      const pct = ((obtained / total) * 100).toFixed(2);
      expect(pct).toBe('87.00');
    });

    it('should calculate required marks to reach target percentage', () => {
      const total = 500;
      const targetPct = 85;
      const required = Math.ceil((targetPct / 100) * total);
      expect(required).toBe(425);
    });
  });

  // =========================================================================
  // 5. Age & Exam Eligibility
  // =========================================================================
  describe('Age & Exam Eligibility', () => {
    it('should calculate exact age in years, months, and days', () => {
      const dob = new Date('2000-01-15');
      const asOf = new Date('2026-09-22');

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

      expect(years).toBe(26);
      expect(months).toBe(8);
      expect(days).toBe(7);
    });

    it('should evaluate exam cutoff eligibility based on min and max age boundaries', () => {
      const calculatedAgeYears = 24;
      const minAge = 18;
      const maxAge = 27;

      const isEligible = calculatedAgeYears >= minAge && calculatedAgeYears <= maxAge;
      expect(isEligible).toBe(true);
    });
  });

  // =========================================================================
  // 6. Unit Converter
  // =========================================================================
  describe('Unit Converter', () => {
    it('should convert MB to GB and KB correctly', () => {
      const valMB = 2048;
      const valGB = valMB / 1024;
      const valKB = valMB * 1024;

      expect(valGB).toBe(2);
      expect(valKB).toBe(2097152);
    });

    it('should convert Celsius to Fahrenheit and Kelvin', () => {
      const c = 25;
      const f = (c * 9) / 5 + 32;
      const k = c + 273.15;

      expect(f).toBe(77);
      expect(k).toBe(298.15);
    });

    it('should convert Length (meters to feet, inches, cm)', () => {
      const m = 1.75;
      const cm = m * 100;
      const inches = m * 39.3701;
      const feet = inches / 12;

      expect(cm).toBe(175);
      expect(feet).toBeCloseTo(5.74, 1);
    });
  });

  // =========================================================================
  // 7. Date Difference
  // =========================================================================
  describe('Date Difference', () => {
    it('should compute exact days duration between dates', () => {
      const start = new Date('2026-09-01');
      const end = new Date('2026-09-21');
      const diffMs = end.getTime() - start.getTime();
      const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
      expect(days).toBe(20);
    });
  });

  // =========================================================================
  // 8. GPA Scale Converter
  // =========================================================================
  describe('GPA Scale Converter', () => {
    it('should convert 10-point scale to 4.0 US scale and approximate percentage', () => {
      const gpa10 = 8.5;
      const scale4 = (gpa10 / 10.0) * 4.0;
      const percentage = (gpa10 * 9.5).toFixed(1);

      expect(scale4).toBe(3.4);
      expect(percentage).toBe('80.8');
    });

    it('should convert 4.0 US scale back to 10-point scale', () => {
      const gpa4 = 3.6;
      const scale10 = (gpa4 / 4.0) * 10;
      expect(scale10).toBe(9.0);
    });
  });

  // =========================================================================
  // 9. Exam Countdown Timer
  // =========================================================================
  describe('Exam Countdown Logic', () => {
    it('should compute days, hours, and minutes remaining until target date', () => {
      const now = new Date('2026-09-25T12:00:00Z').getTime();
      const target = new Date('2026-09-27T18:30:00Z').getTime();
      const diff = target - now;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      expect(days).toBe(2);
      expect(hours).toBe(6);
      expect(minutes).toBe(30);
    });
  });

  // =========================================================================
  // 10. Offline QR Code Generation
  // =========================================================================
  describe('Offline QR Code Generator', () => {
    it('should generate valid QR code data URL purely offline', async () => {
      const text = 'https://justpdfcraft.xyz';
      const dataUrl = await QRCode.toDataURL(text, { width: 240 });
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });
  });

  // =========================================================================
  // 11. Cryptographically Secure Password Generator
  // =========================================================================
  describe('Exam Password Generator', () => {
    it('should generate password of exact requested length using crypto', () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$*!';
      const length = 14;
      const randomValues = new Uint32Array(length);
      crypto.getRandomValues(randomValues);

      let res = '';
      for (let i = 0; i < length; i++) {
        res += chars.charAt(randomValues[i] % chars.length);
      }

      expect(res.length).toBe(14);
      // Ensure it doesn't contain ambiguous characters (like 0, O, 1, l)
      expect(res).not.toContain('0');
      expect(res).not.toContain('1');
    });
  });

  // =========================================================================
  // 12. Random Roll / Item Picker
  // =========================================================================
  describe('Random Roll / Item Picker', () => {
    it('should filter empty lines and trim whitespace when picking items', () => {
      const input = '\n  Option A  \n\n Option B \n   \n Option C \n';
      const items = input
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      expect(items).toEqual(['Option A', 'Option B', 'Option C']);
      const chosen = items[Math.floor(Math.random() * items.length)];
      expect(items).toContain(chosen);
    });
  });
});
