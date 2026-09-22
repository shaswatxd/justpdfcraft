import { describe, it, expect } from 'vitest';

describe('Student Suite Calculators Logic', () => {
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
  });

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

  describe('Age & Date Difference', () => {
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

    it('should compute exact days duration between assignment dates', () => {
      const start = new Date('2026-09-01');
      const end = new Date('2026-09-21');
      const diffMs = end.getTime() - start.getTime();
      const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
      expect(days).toBe(20);
    });
  });

  describe('Digital Storage & Unit Converter', () => {
    it('should convert MB to GB and KB correctly', () => {
      const valMB = 2048;
      const valGB = valMB / 1024;
      const valKB = valMB * 1024;

      expect(valGB).toBe(2);
      expect(valKB).toBe(2097152);
    });
  });
});
