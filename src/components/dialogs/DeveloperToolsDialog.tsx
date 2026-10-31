import React, { useState, useEffect } from 'react';
import {
  X,
  Code2,
  Copy,
  Check,
  Download,
  RefreshCw,
  QrCode,
  Key,
  Shield,
  FileCode,
  Hash,
  Binary,
  Layers,
  Sparkles,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import QRCode from 'qrcode';

type DevTab =
  | 'json-formatter'
  | 'json-validator'
  | 'base64'
  | 'url-encoder'
  | 'uuid-generator'
  | 'password-generator'
  | 'hash-generator'
  | 'jwt-decoder'
  | 'code-beautifier'
  | 'regex-tester'
  | 'timestamp-converter'
  | 'qr-generator'
  | 'subnet-calculator'
  | 'text-diff'
  | 'xml-yaml'
  | 'color-converter'
  | 'markdown-preview';

export const DeveloperToolsDialog: React.FC = () => {
  const { activeModal, setActiveModal, activeDeveloperTab, addToast } = useUIStore();
  const isOpen = activeModal === 'developer-tools';

  const [activeTab, setActiveTab] = useState<DevTab>('json-formatter');
  const [copied, setCopied] = useState<string | null>(null);

  // Sync with store trigger
  useEffect(() => {
    if (activeDeveloperTab) {
      setActiveTab(activeDeveloperTab as DevTab);
    }
  }, [activeDeveloperTab]);

  const copyToClipboard = (text: string, id: string = 'default') => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    addToast({ type: 'success', title: 'Copied to Clipboard', durationMs: 2000 });
    setTimeout(() => setCopied(null), 2000);
  };

  // 1. JSON Formatter & Validator State
  const [jsonInput, setJsonInput] = useState('{"name":"JustPDFCraft","version":"2.0.0","features":["pdf","image","student","developer"],"privacy":{"localFirst":true}}');
  const [jsonOutput, setJsonOutput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleFormatJson = (indent: number = 2) => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonOutput(JSON.stringify(parsed, null, indent));
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message);
    }
  };

  const handleMinifyJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonOutput(JSON.stringify(parsed));
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message);
    }
  };

  // 2. Base64 State
  const [b64Input, setB64Input] = useState('Hello JustPDFCraft! 100% Client-Side Privacy.');
  const [b64Output, setB64Output] = useState('');
  const [b64Mode, setB64Mode] = useState<'encode' | 'decode'>('encode');

  const processBase64 = (val: string, mode: 'encode' | 'decode') => {
    try {
      if (mode === 'encode') {
        const encoded = btoa(unescape(encodeURIComponent(val)));
        setB64Output(encoded);
      } else {
        const decoded = decodeURIComponent(escape(atob(val)));
        setB64Output(decoded);
      }
    } catch (err: any) {
      setB64Output('Error: ' + err.message);
    }
  };

  useEffect(() => {
    processBase64(b64Input, b64Mode);
  }, [b64Input, b64Mode]);

  // 3. URL State
  const [urlInput, setUrlInput] = useState('https://justpdfcraft.xyz/search?q=client side pdf editor&privacy=100%');
  const [urlOutput, setUrlOutput] = useState('');
  const [urlMode, setUrlMode] = useState<'encode' | 'decode'>('encode');

  useEffect(() => {
    try {
      if (urlMode === 'encode') {
        setUrlOutput(encodeURIComponent(urlInput));
      } else {
        setUrlOutput(decodeURIComponent(urlInput));
      }
    } catch (e: any) {
      setUrlOutput('Error: ' + e.message);
    }
  }, [urlInput, urlMode]);

  // 4. UUID Generator
  const [uuidCount, setUuidCount] = useState(5);
  const [uuidList, setUuidList] = useState<string[]>([]);

  const generateUUIDs = () => {
    const list: string[] = [];
    for (let i = 0; i < uuidCount; i++) {
      list.push(crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }));
    }
    setUuidList(list);
  };

  useEffect(() => {
    generateUUIDs();
  }, [uuidCount]);

  // 5. Password Generator
  const [pwLength, setPwLength] = useState(16);
  const [pwUpper, setPwUpper] = useState(true);
  const [pwLower, setPwLower] = useState(true);
  const [pwNumbers, setPwNumbers] = useState(true);
  const [pwSymbols, setPwSymbols] = useState(true);
  const [generatedPw, setGeneratedPw] = useState('');

  const generatePassword = () => {
    let chars = '';
    if (pwUpper) chars += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    if (pwLower) chars += 'abcdefghijkmnopqrstuvwxyz';
    if (pwNumbers) chars += '23456789';
    if (pwSymbols) chars += '!@#$%^&*()_-+=[]{}|';
    if (!chars) chars = 'abcdefghijkmnopqrstuvwxyz23456789';

    const arr = new Uint32Array(pwLength);
    crypto.getRandomValues(arr);
    let pw = '';
    for (let i = 0; i < pwLength; i++) {
      pw += chars.charAt(arr[i] % chars.length);
    }
    setGeneratedPw(pw);
  };

  useEffect(() => {
    generatePassword();
  }, [pwLength, pwUpper, pwLower, pwNumbers, pwSymbols]);

  // 6. Hash Generator
  const [hashInput, setHashInput] = useState('JustPDFCraft Secure Document');
  const [hashes, setHashes] = useState<{ sha256: string; sha512: string; sha1: string }>({ sha256: '', sha512: '', sha1: '' });

  useEffect(() => {
    const computeHashes = async () => {
      const enc = new TextEncoder();
      const data = enc.encode(hashInput);

      const toHex = (buf: ArrayBuffer) =>
        Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

      try {
        const [h256, h512, h1] = await Promise.all([
          crypto.subtle.digest('SHA-256', data),
          crypto.subtle.digest('SHA-512', data),
          crypto.subtle.digest('SHA-1', data),
        ]);
        setHashes({
          sha256: toHex(h256),
          sha512: toHex(h512),
          sha1: toHex(h1),
        });
      } catch (err) {}
    };
    computeHashes();
  }, [hashInput]);

  // 7. JWT Decoder
  const [jwtInput, setJwtInput] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJyb2xlIjoiYWRtaW4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
  const [jwtHeader, setJwtHeader] = useState('');
  const [jwtPayload, setJwtPayload] = useState('');
  const [jwtError, setJwtError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const parts = jwtInput.trim().split('.');
      if (parts.length < 2) {
        setJwtError('Invalid JWT structure (must contain dot separated header & payload)');
        setJwtHeader('');
        setJwtPayload('');
        return;
      }
      const decodePart = (str: string) => {
        let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        return JSON.stringify(JSON.parse(decodeURIComponent(escape(atob(b64)))), null, 2);
      };
      setJwtHeader(decodePart(parts[0]));
      setJwtPayload(decodePart(parts[1]));
      setJwtError(null);
    } catch (e: any) {
      setJwtError('Failed to decode JWT: ' + e.message);
    }
  }, [jwtInput]);

  // 8. QR Code Generator
  const [qrText, setQrText] = useState('https://justpdfcraft.xyz');
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (!qrText.trim()) return;
    QRCode.toDataURL(qrText.trim(), { width: 320, margin: 2, errorCorrectionLevel: 'M' })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [qrText]);

  // 9. Regex Tester
  const [regexPattern, setRegexPattern] = useState('\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b');
  const [regexFlags, setRegexFlags] = useState('g');
  const [regexTestText, setRegexTestText] = useState('Contact team at support@justpdfcraft.xyz or dev@linear.app.');
  const [regexMatches, setRegexMatches] = useState<string[]>([]);
  const [regexError, setRegexError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (!regexPattern) {
        setRegexMatches([]);
        setRegexError(null);
        return;
      }
      const re = new RegExp(regexPattern, regexFlags);
      const matches = regexTestText.match(re) || [];
      setRegexMatches(matches);
      setRegexError(null);
    } catch (e: any) {
      setRegexError(e.message);
      setRegexMatches([]);
    }
  }, [regexPattern, regexFlags, regexTestText]);

  // 10. Timestamp Converter
  const [epochInput, setEpochInput] = useState(String(Math.floor(Date.now() / 1000)));
  const [humanDate, setHumanDate] = useState('');

  useEffect(() => {
    const num = Number(epochInput);
    if (!isNaN(num) && num > 0) {
      const ms = num < 10000000000 ? num * 1000 : num;
      const d = new Date(ms);
      setHumanDate(d.toUTCString() + ' (' + d.toLocaleString() + ')');
    } else {
      setHumanDate('Invalid epoch timestamp');
    }
  }, [epochInput]);

  // 11. IP Subnet Calculator
  const [ipAddress, setIpAddress] = useState('192.168.1.1');
  const [cidrMask, setCidrMask] = useState(24);

  const subnetDetails = React.useMemo(() => {
    try {
      const parts = ipAddress.split('.').map(Number);
      if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
        return null;
      }
      const maskNum = -1 << (32 - cidrMask);
      const netMaskParts = [
        (maskNum >>> 24) & 255,
        (maskNum >>> 16) & 255,
        (maskNum >>> 8) & 255,
        maskNum & 255,
      ];
      const ipNum = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
      const netNum = ipNum & maskNum;
      const bcastNum = netNum | ~maskNum;
      const totalHosts = Math.pow(2, 32 - cidrMask);
      const usableHosts = Math.max(0, totalHosts - 2);

      const numToIp = (n: number) =>
        `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;

      return {
        subnetMask: netMaskParts.join('.'),
        networkId: numToIp(netNum),
        broadcast: numToIp(bcastNum),
        firstHost: numToIp(netNum + 1),
        lastHost: numToIp(bcastNum - 1),
        usableHosts,
      };
    } catch {
      return null;
    }
  }, [ipAddress, cidrMask]);

  // 12. Text Diff
  const [diffLeft, setDiffLeft] = useState('Version 1.0\nSecure client-side PDF utility\nFree and fast');
  const [diffRight, setDiffRight] = useState('Version 2.0\nSecure client-side PDF utility\n100% Free, Private and Ultra-Fast\nModern SaaS UI');

  const diffResult = React.useMemo(() => {
    const lLines = diffLeft.split('\n');
    const rLines = diffRight.split('\n');
    const max = Math.max(lLines.length, rLines.length);
    const rows = [];
    for (let i = 0; i < max; i++) {
      const l = lLines[i] ?? '';
      const r = rLines[i] ?? '';
      const isSame = l === r;
      rows.push({ l, r, isSame });
    }
    return rows;
  }, [diffLeft, diffRight]);

  // 13. Color Converter
  const [hexColor, setHexColor] = useState('#2563EB');
  const colorConversions = React.useMemo(() => {
    let clean = hexColor.replace('#', '').trim();
    if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('');
    if (clean.length !== 6) return null;
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

    // HSL
    const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
    const max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
        case gNorm: h = (bNorm - rNorm) / d + 2; break;
        case bNorm: h = (rNorm - gNorm) / d + 4; break;
      }
      h /= 6;
    }
    return {
      hex: '#' + clean.toUpperCase(),
      rgb: `rgb(${r}, ${g}, ${b})`,
      rgba: `rgba(${r}, ${g}, ${b}, 1)`,
      hsl: `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`,
    };
  }, [hexColor]);

  // 14. Code Beautifier / Minifier (HTML, CSS, JS)
  const [codeLang, setCodeLang] = useState<'html' | 'css' | 'javascript'>('html');
  const [codeInput, setCodeInput] = useState('<div class="card"><h1>JustPDFCraft</h1><p>Client-side documents</p></div>');
  const [codeOutput, setCodeOutput] = useState('');

  const formatCode = () => {
    try {
      if (codeLang === 'html') {
        let formatted = '';
        let pad = 0;
        const tokens = codeInput.replace(/>\s*</g, '><').split(/(<[^>]+>)/g).filter(Boolean);
        for (const token of tokens) {
          if (token.startsWith('</')) {
            pad = Math.max(0, pad - 1);
            formatted += '  '.repeat(pad) + token + '\n';
          } else if (token.startsWith('<') && !token.endsWith('/>') && !token.startsWith('<!') && !['<input', '<img', '<br', '<hr', '<meta', '<link'].some((t) => token.startsWith(t))) {
            formatted += '  '.repeat(pad) + token + '\n';
            pad++;
          } else {
            formatted += '  '.repeat(pad) + token + '\n';
          }
        }
        setCodeOutput(formatted.trim());
      } else if (codeLang === 'css') {
        const formatted = codeInput
          .replace(/\s*{\s*/g, ' {\n  ')
          .replace(/;\s*/g, ';\n  ')
          .replace(/\s*}\s*/g, '\n}\n')
          .trim();
        setCodeOutput(formatted);
      } else {
        // Javascript basic clean indent
        const formatted = codeInput
          .replace(/{\s*/g, ' {\n  ')
          .replace(/;\s*/g, ';\n')
          .replace(/}\s*/g, '\n}\n')
          .trim();
        setCodeOutput(formatted);
      }
    } catch {
      setCodeOutput(codeInput);
    }
  };

  const minifyCode = () => {
    const minified = codeInput
      .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*([\{\}\:\;\,])\s*/g, '$1')
      .trim();
    setCodeOutput(minified);
  };

  // 15. Markdown Previewer
  const [mdInput, setMdInput] = useState('# JustPDFCraft v2.0\n\n- **100% Client-Side**: No document ever leaves your browser.\n- **Zero Uploads**: Instant WebAssembly processing.\n- **Modern SaaS**: Clean, elegant, reliable.\n\n```json\n{"privacy": "guaranteed"}\n```');

  if (!isOpen) return null;

  const tabs: { id: DevTab; label: string; icon: any }[] = [
    { id: 'json-formatter', label: 'JSON Formatter', icon: Code2 },
    { id: 'json-validator', label: 'JSON Validator', icon: CheckCircle2 },
    { id: 'base64', label: 'Base64', icon: Binary },
    { id: 'url-encoder', label: 'URL Encode/Decode', icon: ArrowRightLeft },
    { id: 'uuid-generator', label: 'UUID Gen', icon: Hash },
    { id: 'password-generator', label: 'Password Gen', icon: Key },
    { id: 'hash-generator', label: 'Hash Gen', icon: Shield },
    { id: 'jwt-decoder', label: 'JWT Decoder', icon: Layers },
    { id: 'code-beautifier', label: 'HTML/CSS/JS Beautifier', icon: FileCode },
    { id: 'regex-tester', label: 'Regex Tester', icon: Sparkles },
    { id: 'timestamp-converter', label: 'Timestamp', icon: RefreshCw },
    { id: 'qr-generator', label: 'QR Code', icon: QrCode },
    { id: 'subnet-calculator', label: 'IP Subnet', icon: Binary },
    { id: 'text-diff', label: 'Text Diff', icon: ArrowRightLeft },
    { id: 'color-converter', label: 'Color Converter', icon: Eye },
    { id: 'markdown-preview', label: 'Markdown Preview', icon: FileCode },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shadow-2xs">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Developer Utilities</h2>
              <p className="text-xs text-slate-500 font-medium">100% In-Browser • Zero Server Calls • Instant & Safe</p>
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
                    ? 'bg-blue-600 text-white shadow-xs'
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
          {/* JSON FORMATTER & VALIDATOR */}
          {(activeTab === 'json-formatter' || activeTab === 'json-validator') && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Input JSON</label>
                    <button
                      onClick={() => setJsonInput('{"example":"value","valid":true}')}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Load Sample
                    </button>
                  </div>
                  <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    rows={14}
                    className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs resize-none"
                    placeholder="Paste JSON here..."
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleFormatJson(2)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Format (2 Spaces)
                    </button>
                    <button
                      onClick={() => handleFormatJson(4)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      4 Spaces
                    </button>
                    <button
                      onClick={handleMinifyJson}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Minify
                    </button>
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {jsonError ? 'Validation Error' : 'Output JSON'}
                    </label>
                    {jsonOutput && (
                      <button
                        onClick={() => copyToClipboard(jsonOutput, 'json')}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        {copied === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied === 'json' ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                  {jsonError ? (
                    <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-mono">
                      <div className="flex items-center gap-2 font-bold mb-1">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>Invalid JSON Syntax</span>
                      </div>
                      <p>{jsonError}</p>
                    </div>
                  ) : (
                    <textarea
                      readOnly
                      value={jsonOutput || 'Formatted output will appear here.'}
                      rows={14}
                      className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 focus:outline-none shadow-2xs resize-none"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BASE64 ENCODER / DECODER */}
          {activeTab === 'base64' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-center justify-center gap-2 p-1 bg-slate-100 rounded-xl w-fit mx-auto">
                <button
                  onClick={() => setB64Mode('encode')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    b64Mode === 'encode' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Encode to Base64
                </button>
                <button
                  onClick={() => setB64Mode('decode')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    b64Mode === 'decode' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Decode from Base64
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Input Text</label>
                <textarea
                  value={b64Input}
                  onChange={(e) => setB64Input(e.target.value)}
                  rows={4}
                  className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Output</label>
                  <button
                    onClick={() => copyToClipboard(b64Output, 'b64')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {copied === 'b64' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  value={b64Output}
                  rows={4}
                  className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* URL ENCODER / DECODER */}
          {activeTab === 'url-encoder' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-center justify-center gap-2 p-1 bg-slate-100 rounded-xl w-fit mx-auto">
                <button
                  onClick={() => setUrlMode('encode')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    urlMode === 'encode' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Encode URL
                </button>
                <button
                  onClick={() => setUrlMode('decode')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    urlMode === 'decode' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Decode URL
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">URL Input</label>
                <textarea
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  rows={4}
                  className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Result</label>
                  <button
                    onClick={() => copyToClipboard(urlOutput, 'url')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {copied === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  value={urlOutput}
                  rows={4}
                  className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* UUID GENERATOR */}
          {activeTab === 'uuid-generator' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">RFC4122 Version 4 UUIDs</h4>
                  <p className="text-xs text-slate-500">Cryptographically secure random identifiers</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={uuidCount}
                    onChange={(e) => setUuidCount(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                  >
                    <option value={1}>1 UUID</option>
                    <option value={5}>5 UUIDs</option>
                    <option value={10}>10 UUIDs</option>
                    <option value={25}>25 UUIDs</option>
                  </select>
                  <button
                    onClick={generateUUIDs}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {uuidList.map((id, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 font-mono text-xs shadow-2xs"
                  >
                    <span className="text-slate-800 select-all">{id}</span>
                    <button
                      onClick={() => copyToClipboard(id, `uuid_${idx}`)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Copy UUID"
                    >
                      {copied === `uuid_${idx}` ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PASSWORD GENERATOR */}
          {activeTab === 'password-generator' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    Generated Password
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={generatedPw}
                      className="flex-1 font-mono text-base font-bold text-slate-900 bg-slate-50 border border-slate-200 p-3 rounded-xl tracking-wider select-all"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedPw, 'pw')}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      {copied === 'pw' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={generatePassword}
                      className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                      title="Generate new"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Length: {pwLength} characters</span>
                    <input
                      type="range"
                      min={8}
                      max={48}
                      value={pwLength}
                      onChange={(e) => setPwLength(Number(e.target.value))}
                      className="w-48"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pwUpper}
                        onChange={(e) => setPwUpper(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Uppercase (A-Z)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pwLower}
                        onChange={(e) => setPwLower(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Lowercase (a-z)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pwNumbers}
                        onChange={(e) => setPwNumbers(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Numbers (0-9)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pwSymbols}
                        onChange={(e) => setPwSymbols(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Symbols (!@#$%)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HASH GENERATOR */}
          {activeTab === 'hash-generator' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Input Text</label>
                <input
                  type="text"
                  value={hashInput}
                  onChange={(e) => setHashInput(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                  placeholder="Enter string to hash..."
                />
              </div>

              <div className="space-y-3">
                {[
                  { label: 'SHA-256', val: hashes.sha256 },
                  { label: 'SHA-512', val: hashes.sha512 },
                  { label: 'SHA-1', val: hashes.sha1 },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{item.label}</span>
                      <button
                        onClick={() => copyToClipboard(item.val, item.label)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                      >
                        {copied === item.label ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <p className="font-mono text-xs text-slate-600 break-all select-all">{item.val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* JWT DECODER */}
          {activeTab === 'jwt-decoder' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Encoded JWT</label>
                <textarea
                  value={jwtInput}
                  onChange={(e) => setJwtInput(e.target.value)}
                  rows={3}
                  className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                  placeholder="Paste encoded token..."
                />
              </div>

              {jwtError ? (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
                  {jwtError}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Header</label>
                    <textarea
                      readOnly
                      value={jwtHeader}
                      rows={8}
                      className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 shadow-2xs resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Payload (Claims)</label>
                    <textarea
                      readOnly
                      value={jwtPayload}
                      rows={8}
                      className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 shadow-2xs resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* QR CODE GENERATOR */}
          {activeTab === 'qr-generator' && (
            <div className="max-w-md mx-auto space-y-4 text-center">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Text or URL</label>
                <input
                  type="text"
                  value={qrText}
                  onChange={(e) => setQrText(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs text-center"
                />
              </div>

              {qrDataUrl && (
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col items-center gap-3">
                  <img src={qrDataUrl} alt="QR Code" className="w-56 h-56 rounded-lg" />
                  <a
                    href={qrDataUrl}
                    download="justpdfcraft-qrcode.png"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* REGEX TESTER */}
          {activeTab === 'regex-tester' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Regular Expression</label>
                  <input
                    type="text"
                    value={regexPattern}
                    onChange={(e) => setRegexPattern(e.target.value)}
                    className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                    placeholder="Enter regex pattern..."
                  />
                </div>
                <div className="w-24">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Flags</label>
                  <input
                    type="text"
                    value={regexFlags}
                    onChange={(e) => setRegexFlags(e.target.value)}
                    className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs text-center"
                    placeholder="gim"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Test Text</label>
                <textarea
                  value={regexTestText}
                  onChange={(e) => setRegexTestText(e.target.value)}
                  rows={4}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Matches ({regexMatches.length})
                </label>
                {regexError ? (
                  <p className="text-xs text-rose-600 font-mono">{regexError}</p>
                ) : (
                  <div className="flex flex-wrap gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs min-h-[60px]">
                    {regexMatches.length > 0 ? (
                      regexMatches.map((m, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs font-bold">
                          {m}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">No match found.</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TIMESTAMP CONVERTER */}
          {activeTab === 'timestamp-converter' && (
            <div className="max-w-xl mx-auto space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Unix Epoch Timestamp</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={epochInput}
                    onChange={(e) => setEpochInput(e.target.value)}
                    className="flex-1 font-mono text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                  />
                  <button
                    onClick={() => setEpochInput(String(Math.floor(Date.now() / 1000)))}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Now
                  </button>
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Human Readable Date</span>
                <p className="text-sm font-semibold text-slate-900">{humanDate}</p>
              </div>
            </div>
          )}

          {/* IP SUBNET CALCULATOR */}
          {activeTab === 'subnet-calculator' && (
            <div className="max-w-xl mx-auto space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">IPv4 Address</label>
                  <input
                    type="text"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                  />
                </div>
                <div className="w-28">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">CIDR (/{cidrMask})</label>
                  <input
                    type="number"
                    min={1}
                    max={32}
                    value={cidrMask}
                    onChange={(e) => setCidrMask(Number(e.target.value))}
                    className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs text-center"
                  />
                </div>
              </div>

              {subnetDetails && (
                <div className="grid grid-cols-2 gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs font-mono text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Subnet Mask</span>
                    <span className="font-bold text-slate-800">{subnetDetails.subnetMask}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Network ID</span>
                    <span className="font-bold text-slate-800">{subnetDetails.networkId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Usable Hosts</span>
                    <span className="font-bold text-blue-600">{subnetDetails.usableHosts.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Broadcast</span>
                    <span className="font-bold text-slate-800">{subnetDetails.broadcast}</span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase">Host Address Range</span>
                    <span className="font-bold text-slate-800">
                      {subnetDetails.firstHost} — {subnetDetails.lastHost}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TEXT DIFF */}
          {activeTab === 'text-diff' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Original Text</label>
                  <textarea
                    value={diffLeft}
                    onChange={(e) => setDiffLeft(e.target.value)}
                    rows={6}
                    className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-white shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Modified Text</label>
                  <textarea
                    value={diffRight}
                    onChange={(e) => setDiffRight(e.target.value)}
                    rows={6}
                    className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-white shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Visual Diff</label>
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs font-mono text-xs space-y-1 overflow-x-auto">
                  {diffResult.map((row, i) => (
                    <div
                      key={i}
                      className={`flex gap-4 px-2 py-0.5 rounded ${
                        row.isSame ? 'text-slate-600' : 'bg-amber-50 text-amber-900 font-semibold'
                      }`}
                    >
                      <span className="w-1/2 break-all">{row.l || ' '}</span>
                      <span className="w-1/2 break-all border-l border-slate-200 pl-4">{row.r || ' '}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* COLOR CONVERTER */}
          {activeTab === 'color-converter' && (
            <div className="max-w-md mx-auto space-y-4 text-center">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">HEX Color</label>
                <div className="flex items-center justify-center gap-3">
                  <input
                    type="color"
                    value={hexColor}
                    onChange={(e) => setHexColor(e.target.value)}
                    className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={hexColor}
                    onChange={(e) => setHexColor(e.target.value)}
                    className="font-mono text-sm font-bold text-slate-800 p-2.5 rounded-xl border border-slate-200 bg-white text-center w-32 shadow-2xs uppercase"
                  />
                </div>
              </div>

              {colorConversions && (
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 font-mono text-xs text-left">
                  {[
                    { label: 'HEX', val: colorConversions.hex },
                    { label: 'RGB', val: colorConversions.rgb },
                    { label: 'RGBA', val: colorConversions.rgba },
                    { label: 'HSL', val: colorConversions.hsl },
                  ].map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">{c.label}</span>
                        <span className="font-semibold text-slate-800">{c.val}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(c.val, c.label)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                      >
                        {copied === c.label ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CODE BEAUTIFIER & MINIFIER */}
          {activeTab === 'code-beautifier' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(['html', 'css', 'javascript'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setCodeLang(lang)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                        codeLang === lang ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={formatCode}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Beautify
                  </button>
                  <button
                    onClick={minifyCode}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Minify
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <textarea
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  rows={14}
                  className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-white shadow-2xs"
                  placeholder="Input code here..."
                />
                <textarea
                  readOnly
                  value={codeOutput || 'Formatted or minified code will appear here...'}
                  rows={14}
                  className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 shadow-2xs resize-none"
                />
              </div>
            </div>
          )}

          {/* MARKDOWN PREVIEW */}
          {activeTab === 'markdown-preview' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Markdown</label>
                  <textarea
                    value={mdInput}
                    onChange={(e) => setMdInput(e.target.value)}
                    rows={16}
                    className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-white shadow-2xs resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Rendered HTML Preview</label>
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs text-xs space-y-2 h-[340px] overflow-y-auto prose prose-slate">
                    {mdInput.split('\n').map((line, idx) => {
                      if (line.startsWith('# ')) return <h1 key={idx} className="text-lg font-bold text-slate-900 border-b pb-1">{line.slice(2)}</h1>;
                      if (line.startsWith('## ')) return <h2 key={idx} className="text-base font-bold text-slate-900">{line.slice(3)}</h2>;
                      if (line.startsWith('- ')) return <li key={idx} className="ml-4 text-slate-700">{line.slice(2)}</li>;
                      if (line.trim()) return <p key={idx} className="text-slate-700">{line}</p>;
                      return null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
