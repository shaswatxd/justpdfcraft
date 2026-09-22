export type StampPresetId =
  | 'APPROVED'
  | 'REJECTED'
  | 'RECEIVED'
  | 'PAID'
  | 'VERIFIED'
  | 'CONFIDENTIAL'
  | 'DRAFT'
  | 'FINAL'
  | 'VOID'
  | 'SIGN_HERE'
  | 'INITIAL_HERE'
  | 'CUSTOM';

export type StampStyle = 'bordered' | 'badge' | 'flag';

export interface DynamicStampConfig {
  preset: StampPresetId;
  customTitle?: string;
  includeDate: boolean;
  includeTime: boolean;
  dateFormat: 'DD-MMM-YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY';
  signerName: string;
  color: string;
  style: StampStyle;
}

export const DEFAULT_DYNAMIC_STAMP: DynamicStampConfig = {
  preset: 'RECEIVED',
  customTitle: '',
  includeDate: true,
  includeTime: true,
  dateFormat: 'DD-MMM-YYYY',
  signerName: '',
  color: '#EF4444', // Classic Stamp Red
  style: 'bordered',
};

export const STAMP_PRESETS: Array<{
  id: StampPresetId;
  label: string;
  color: string;
  style: StampStyle;
  defaultIncludeDate?: boolean;
}> = [
  { id: 'RECEIVED', label: 'RECEIVED', color: '#EF4444', style: 'bordered', defaultIncludeDate: true },
  { id: 'APPROVED', label: 'APPROVED', color: '#10B981', style: 'bordered', defaultIncludeDate: true },
  { id: 'PAID', label: 'PAID', color: '#0C8DE9', style: 'bordered', defaultIncludeDate: true },
  { id: 'VERIFIED', label: 'VERIFIED', color: '#8B5CF6', style: 'bordered', defaultIncludeDate: true },
  { id: 'CONFIDENTIAL', label: 'CONFIDENTIAL', color: '#F59E0B', style: 'bordered', defaultIncludeDate: false },
  { id: 'REJECTED', label: 'REJECTED', color: '#E11D48', style: 'bordered', defaultIncludeDate: true },
  { id: 'DRAFT', label: 'DRAFT', color: '#64748B', style: 'bordered', defaultIncludeDate: false },
  { id: 'VOID', label: 'VOID', color: '#475569', style: 'bordered', defaultIncludeDate: false },
  { id: 'SIGN_HERE', label: 'SIGN HERE', color: '#F59E0B', style: 'flag', defaultIncludeDate: false },
  { id: 'INITIAL_HERE', label: 'INITIAL HERE', color: '#3B82F6', style: 'flag', defaultIncludeDate: false },
];

export function formatStampDate(date: Date, format: 'DD-MMM-YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY'): string {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const monthNum = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  if (format === 'YYYY-MM-DD') {
    return `${year}-${monthNum}-${day}`;
  }
  if (format === 'MM/DD/YYYY') {
    return `${monthNum}/${day}/${year}`;
  }
  return `${day}-${month}-${year}`;
}

export function formatStampTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function generateStampContent(
  config: DynamicStampConfig,
  now: Date = new Date()
): {
  title: string;
  subtitle1: string | null;
  subtitle2: string | null;
  fullStampText: string;
  isFlag: boolean;
  width: number;
  height: number;
} {
  const isFlag = config.style === 'flag' || config.preset === 'SIGN_HERE' || config.preset === 'INITIAL_HERE';
  const title = config.preset === 'CUSTOM'
    ? (config.customTitle?.trim() || 'STAMP').toUpperCase()
    : (STAMP_PRESETS.find((p) => p.id === config.preset)?.label || config.preset).toUpperCase();

  let subtitle1: string | null = null;
  if (config.includeDate) {
    const dStr = formatStampDate(now, config.dateFormat);
    subtitle1 = config.includeTime ? `${dStr} ${formatStampTime(now)}` : dStr;
  }

  let subtitle2: string | null = null;
  if (config.signerName.trim()) {
    subtitle2 = `BY: ${config.signerName.trim().toUpperCase()}`;
  }

  const lines = [title];
  if (subtitle1) lines.push(subtitle1);
  if (subtitle2) lines.push(subtitle2);

  const fullStampText = lines.join(' | ');

  // Dynamic stamp dimensions
  let width = 140;
  let height = 42;

  if (isFlag) {
    width = 150;
    height = 36;
  } else {
    if (subtitle1 && subtitle2) {
      width = 160;
      height = 56;
    } else if (subtitle1 || subtitle2) {
      width = 150;
      height = 48;
    } else {
      width = 130;
      height = 38;
    }
  }

  return {
    title,
    subtitle1,
    subtitle2,
    fullStampText,
    isFlag,
    width,
    height,
  };
}
