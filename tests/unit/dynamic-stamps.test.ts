import { describe, it, expect } from 'vitest';
import {
  formatStampDate,
  formatStampTime,
  generateStampContent,
  DEFAULT_DYNAMIC_STAMP,
  STAMP_PRESETS,
} from '@/types/dynamicStamp';
import { useToolStore } from '@/stores/toolStore';

describe('Dynamic Date/Time Rubber Stamps & Sign-Here Flags', () => {
  const fixedDate = new Date(2026, 8, 21, 14, 35, 0); // 21 Sep 2026, 14:35

  it('should format stamp dates accurately across all formats', () => {
    expect(formatStampDate(fixedDate, 'DD-MMM-YYYY')).toBe('21-SEP-2026');
    expect(formatStampDate(fixedDate, 'YYYY-MM-DD')).toBe('2026-09-21');
    expect(formatStampDate(fixedDate, 'MM/DD/YYYY')).toBe('09/21/2026');
  });

  it('should format stamp time with zero padding', () => {
    expect(formatStampTime(fixedDate)).toBe('14:35');
    const earlyMorning = new Date(2026, 8, 21, 4, 5);
    expect(formatStampTime(earlyMorning)).toBe('04:05');
  });

  it('should generate dynamic stamp content with real-time date and time', () => {
    const content = generateStampContent(
      {
        ...DEFAULT_DYNAMIC_STAMP,
        preset: 'RECEIVED',
        includeDate: true,
        includeTime: true,
        dateFormat: 'DD-MMM-YYYY',
      },
      fixedDate
    );

    expect(content.title).toBe('RECEIVED');
    expect(content.subtitle1).toBe('21-SEP-2026 14:35');
    expect(content.subtitle2).toBeNull();
    expect(content.isFlag).toBe(false);
    expect(content.fullStampText).toBe('RECEIVED | 21-SEP-2026 14:35');
  });

  it('should generate dynamic stamp with signer name subtitle', () => {
    const content = generateStampContent(
      {
        ...DEFAULT_DYNAMIC_STAMP,
        preset: 'APPROVED',
        includeDate: true,
        includeTime: false,
        signerName: 'Legal Dept',
      },
      fixedDate
    );

    expect(content.title).toBe('APPROVED');
    expect(content.subtitle1).toBe('21-SEP-2026');
    expect(content.subtitle2).toBe('BY: LEGAL DEPT');
    expect(content.fullStampText).toBe('APPROVED | 21-SEP-2026 | BY: LEGAL DEPT');
  });

  it('should generate SIGN HERE and INITIAL HERE chevron flag stamps', () => {
    const signFlag = generateStampContent(
      {
        ...DEFAULT_DYNAMIC_STAMP,
        preset: 'SIGN_HERE',
        includeDate: false,
      },
      fixedDate
    );

    expect(signFlag.title).toBe('SIGN HERE');
    expect(signFlag.isFlag).toBe(true);
    expect(signFlag.width).toBeGreaterThanOrEqual(130);

    const initialFlag = generateStampContent(
      {
        ...DEFAULT_DYNAMIC_STAMP,
        preset: 'INITIAL_HERE',
        includeDate: false,
      },
      fixedDate
    );

    expect(initialFlag.title).toBe('INITIAL HERE');
    expect(initialFlag.isFlag).toBe(true);
  });

  it('should update dynamicStampConfig in toolStore properly', () => {
    useToolStore.getState().setDynamicStampConfig({
      preset: 'PAID',
      color: '#0C8DE9',
      signerName: 'Accounting',
    });

    const state = useToolStore.getState().dynamicStampConfig;
    expect(state.preset).toBe('PAID');
    expect(state.color).toBe('#0C8DE9');
    expect(state.signerName).toBe('Accounting');
  });

  it('should contain comprehensive presets in gallery', () => {
    const ids = STAMP_PRESETS.map((p) => p.id);
    expect(ids).toContain('RECEIVED');
    expect(ids).toContain('APPROVED');
    expect(ids).toContain('PAID');
    expect(ids).toContain('VERIFIED');
    expect(ids).toContain('CONFIDENTIAL');
    expect(ids).toContain('SIGN_HERE');
    expect(ids).toContain('INITIAL_HERE');
  });
});
