// ══════════════════════════════════════════════════════
// SETUP
// ══════════════════════════════════════════════════════
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
}

const state = {
  mergeFiles: [],
  splitFile: null, splitPages: 0, splitMethod: 'all', splitSelected: [],
  compressFile: null, compressLevel: 'medium',
  rotateFile: null, rotateAngle: 90,
  img2pdfFiles: [],
  pdf2imgFile: null, pdf2imgCanvases: [],
  wmFile: null, wmType: 'text', wmImage: null,
  wmPreviewDoc: null, wmCustomPos: { x: 0.5, y: 0.5 },
  wmPreviewPage: null, wmPreviewPageNum: 1, wmPreviewTotal: 0, wmDragging: false, wmDragFrame: 0,
  marksRows: 0,
  protectFile: null,
  unlockFile: null,
  signFile: null, signType: 'draw', signDrawing: false, signLastX: 0, signLastY: 0,
  previewDoc: null, previewPage: 1, previewTotal: 0,
  resultBlobs: {},
  handwriting: {
    text: '',
    font: 'Caveat',
    ink: '#1d3557',
    paper: 'ruled',
    size: 26,
    lineHeight: 40,
    scannerEffect: 50,
    currentPage: 1
  },
  pdf2txt: {
    file: null,
    text: '',
    mode: 'flow',
    clean: true
  }
};

// ══════════════════════════════════════════════════════
// UTILITIES (Core Helpers)
// ══════════════════════════════════════════════════════
function readAB(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsArrayBuffer(file);
  });
}

function readURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function dlBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function fmtSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ══════════════════════════════════════════════════════
// IMAGE TO PDF HANDLERS
// ══════════════════════════════════════════════════════
function handleImageFiles(files) {
  if (!files || files.length === 0) return;
  for (const f of files) {
    if (f.type.startsWith('image/')) {
      state.img2pdfFiles.push(f);
    }
  }
  const opts = document.getElementById('img2pdf-options');
  if (opts) opts.style.display = 'block';
  renderImageFilesList();
}

function renderImageFilesList() {
  const list = document.getElementById('img2pdf-list');
  if (!list) return;
  list.innerHTML = '';
  if (state.img2pdfFiles.length === 0) {
    list.innerHTML = '<div style="opacity:0.5;padding:1rem;text-align:center">No images added yet.</div>';
    return;
  }
  state.img2pdfFiles.forEach((f, i) => {
    const item = document.createElement('div');
    item.className = 'file-list-item';
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    item.style.padding = '0.75rem';
    item.style.background = 'rgba(255,255,255,0.05)';
    item.style.borderRadius = '8px';
    item.style.marginBottom = '0.5rem';

    item.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.75rem">
        <span style="font-size:1.25rem">🖼️</span>
        <div>
          <div style="font-weight:600;font-size:0.9rem">${f.name}</div>
          <div style="font-size:0.75rem;opacity:0.6">${fmtSize(f.size)}</div>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="state.img2pdfFiles.splice(${i}, 1); renderImageFilesList()" style="padding:0.25rem 0.5rem">✕</button>
    `;
    list.appendChild(item);
  });
}


let signCtx = null;
let signListenersBound = false;
let signPreviewBound = false;


const TOOL_CONFIG = {
  watermark: { optionsId: 'wm-options' }
};

// Tools that require login
const PREMIUM_TOOLS = [];

// ══════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════
function showPanel(id, addToHistory = true) {

  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.mobile-tool-btn').forEach(b => b.classList.remove('active'));
  
  const p = document.getElementById('panel-' + id);
  if (p) p.classList.add('active');
  
  if (id === 'sign') initSignCanvas();
  if (id === 'handwriting') renderHandwritingPreview();
  if (id === 'resume') {
    // Small timeout to let the panel become visible first
    setTimeout(() => {
      if (!window.sectionTitles) window.sectionTitles = { summary: '', skills: '', projects: '', education: '', achievements: '' };
      if (!window.customResumeSections) window.customResumeSections = [];
      if (typeof window.syncResumeTemplatePreview === 'function') {
        window.syncResumeTemplatePreview(document.getElementById('resume-template')?.value || 'ats-minimal');
      }
      if (typeof window.initResumeEnhancements === 'function' && !window._resumeEnhancementsInited) {
        window.initResumeEnhancements();
        window._resumeEnhancementsInited = true;
      }
    }, 50);
  }

  const b = document.getElementById('btn-' + id);
  if (b) b.classList.add('active');
  
  const mb = document.getElementById('mbtn-' + id);
  if (mb) mb.classList.add('active');

  const target = b || mb;
  if (target) {
    if (window.innerWidth > 768) {
      target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  const mainEl = document.querySelector('.main');
  const appLayout = document.querySelector('.app-layout');
  if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'auto' });
  if (appLayout) appLayout.scrollTo({ top: 0, behavior: 'auto' });

  window.scrollTo({ top: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  if (addToHistory) {
    const stateObj = { panelId: id };
    const url = id === 'home' ? window.location.pathname : `?tool=${id}`;
    history.pushState(stateObj, '', url);
  }
}

  // Handle browser back/forward buttons
  window.addEventListener('popstate', (event) => {
    if (event.state && event.state.panelId) {
      showPanel(event.state.panelId, false);
    } else {
      // If no state, default to home or check URL
      const urlParams = new URLSearchParams(window.location.search);
      const tool = urlParams.get('tool');
      showPanel(tool || 'home', false);
    }
  });

  function showLoading(msg = 'Processing...') {
    const el = document.getElementById('global-processing');
    const txt = document.getElementById('global-processing-text');
    if (txt) txt.textContent = msg;
    if (el) el.classList.add('show');
  }
  function hideLoading() {
    const el = document.getElementById('global-processing');
    if (el) el.classList.remove('show');
  }

  // Set initial state on load
  window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tool = urlParams.get('tool') || 'home';
    history.replaceState({ panelId: tool }, '', window.location.search || window.location.pathname);
    showPanel(tool, false);

    // Render local activity on startup
    renderActivity();

    // Inject back buttons into panels
    document.querySelectorAll('.panel:not(#panel-home)').forEach(panel => {
      if (!panel.querySelector('.panel-back-btn')) {
        const backBtn = document.createElement('div');
        backBtn.className = 'panel-back-btn';
        backBtn.innerHTML = '← Back to Home';
        backBtn.onclick = () => showPanel('home');
        panel.prepend(backBtn);
      }
    });
  });



  let filterTimeout;
  function filterTools(q) {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => {
      q = q.toLowerCase();
      const cards = document.querySelectorAll('.tool-card');
      cards.forEach(c => {
        const t = (c.querySelector('.tc-name')?.textContent + ' ' + c.querySelector('.tc-desc')?.textContent).toLowerCase();
        c.style.display = (!q || t.includes(q)) ? '' : 'none';
      });
    }, 150);
  }

  function toggleTheme() {
    document.body.classList.toggle('light');
  }

  function initMobileSidebarSections() {
    const sections = [...document.querySelectorAll('.sidebar .sidebar-section')];
    if (!sections.length) return;

    const applyMobileCollapseState = () => {
      const isMobile = window.innerWidth <= 768;
      sections.forEach((section, idx) => {
        const heading = section.querySelector('.sidebar-heading');
        if (!heading) return;
        heading.classList.toggle('is-collapsible', isMobile);
        if (!isMobile) {
          section.classList.remove('collapsed');
          return;
        }
        if (!section.dataset.mobileInit) {
          if (idx > 1) section.classList.add('collapsed');
          section.dataset.mobileInit = '1';
        }
      });
    };

    sections.forEach(section => {
      const heading = section.querySelector('.sidebar-heading');
      if (!heading || heading.dataset.boundToggle) return;
      heading.dataset.boundToggle = '1';
      heading.addEventListener('click', () => {
        if (window.innerWidth > 768) return;
        section.classList.toggle('collapsed');
      });
    });

    applyMobileCollapseState();
    window.addEventListener('resize', applyMobileCollapseState);
  }


  function calculatePercentage(showToast = true) {
    const obtained = parseFloat(document.getElementById('percentage-obtained')?.value || '');
    const total = parseFloat(document.getElementById('percentage-total')?.value || '');
    const resultEl = document.getElementById('percentage-result');
    const remainingEl = document.getElementById('percentage-remaining');
    if (!Number.isFinite(obtained) || !Number.isFinite(total) || total <= 0) {
      if (showToast) toast('Valid obtained aur total marks enter karo', 'â„¹ï¸');
      if (resultEl) resultEl.textContent = '0.00%';
      if (remainingEl) remainingEl.textContent = '0';
      return;
    }
    const percentage = (obtained / total) * 100;
    const remaining = Math.max(0, total - obtained);
    if (resultEl) resultEl.textContent = `${percentage.toFixed(2)}%`;
    if (remainingEl) remainingEl.textContent = remaining.toFixed(remaining % 1 ? 2 : 0);
    if (showToast) toast(`Percentage ${percentage.toFixed(2)}%`, 'ðŸ“‹');
  }

  function resetPercentageCalculator() {
    const obtained = document.getElementById('percentage-obtained');
    const total = document.getElementById('percentage-total');
    if (obtained) obtained.value = '';
    if (total) total.value = '';
    const resultEl = document.getElementById('percentage-result');
    const remainingEl = document.getElementById('percentage-remaining');
    if (resultEl) resultEl.textContent = '0.00%';
    if (remainingEl) remainingEl.textContent = '0';
  }

  function convertGpaToPercentage(showToast = true) {
    const gpa = parseFloat(document.getElementById('gpa-input')?.value || '');
    const resultEl = document.getElementById('gpa-to-percentage-result');
    if (!Number.isFinite(gpa) || gpa < 0) {
      if (showToast) toast('Valid GPA enter karo', 'â„¹ï¸');
      if (resultEl) resultEl.textContent = '0.00%';
      return;
    }
    const percentage = gpa * 9.5;
    if (resultEl) resultEl.textContent = `${percentage.toFixed(2)}%`;
    if (showToast) toast(`Percentage ${percentage.toFixed(2)}%`, 'ðŸ“‹');
  }

  function convertPercentageToGpa(showToast = true) {
    const percentage = parseFloat(document.getElementById('percentage-input')?.value || '');
    const resultEl = document.getElementById('percentage-to-gpa-result');
    if (!Number.isFinite(percentage) || percentage < 0) {
      if (showToast) toast('Valid percentage enter karo', 'â„¹ï¸');
      if (resultEl) resultEl.textContent = '0.00';
      return;
    }
    const gpa = percentage / 9.5;
    if (resultEl) resultEl.textContent = gpa.toFixed(2);
    if (showToast) toast(`Estimated GPA ${gpa.toFixed(2)}`, 'ðŸ“‹');
  }

  function resetGpaConverter() {
    const gpa = document.getElementById('gpa-input');
    const percentage = document.getElementById('percentage-input');
    if (gpa) gpa.value = '';
    if (percentage) percentage.value = '';
    const g2p = document.getElementById('gpa-to-percentage-result');
    const p2g = document.getElementById('percentage-to-gpa-result');
    if (g2p) g2p.textContent = '0.00%';
    if (p2g) p2g.textContent = '0.00';
  }

  function addMarksRow(subject = '', obtained = '', total = '') {
    const wrap = document.getElementById('marks-rows');
    if (!wrap) return;
    state.marksRows = (state.marksRows || 0) + 1;
    const row = document.createElement('div');
    row.className = 'two-col marks-row';
    row.style.alignItems = 'end';
    row.innerHTML = `
    <div class="form-group">
      <label class="form-label">Subject</label>
      <input type="text" class="marks-subject" placeholder="Subject ${state.marksRows}" value="${escapeHtml(subject)}">
    </div>
    <div class="form-group">
      <label class="form-label">Obtained Marks</label>
      <input type="number" class="marks-obtained" min="0" step="0.01" placeholder="78" value="${obtained}">
    </div>
    <div class="form-group">
      <label class="form-label">Total Marks</label>
      <input type="number" class="marks-total" min="0" step="0.01" placeholder="100" value="${total}">
    </div>
    <div class="form-group">
      <button class="btn btn-secondary" type="button" onclick="removeMarksRow(this)">Remove</button>
    </div>`;
    wrap.appendChild(row);
  }

  function removeMarksRow(btn) {
    const rows = document.querySelectorAll('#marks-rows .marks-row');
    if (rows.length <= 1) {
      toast('At least one subject row rehni chahiye', 'â„¹ï¸');
      return;
    }
    btn.closest('.marks-row')?.remove();
    calculateMarks(false);
  }

  function calculateMarks(showToast = true) {
    const rows = [...document.querySelectorAll('#marks-rows .marks-row')];
    const values = [];
    let totalObtained = 0;
    let totalMax = 0;
    for (const row of rows) {
      const obtained = parseFloat(row.querySelector('.marks-obtained')?.value || '');
      const total = parseFloat(row.querySelector('.marks-total')?.value || '');
      if (Number.isFinite(obtained) && Number.isFinite(total) && total > 0) {
        values.push(obtained);
        totalObtained += obtained;
        totalMax += total;
      }
    }
    const average = values.length ? totalObtained / values.length : 0;
    const highest = values.length ? Math.max(...values) : 0;
    const lowest = values.length ? Math.min(...values) : 0;
    const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('marks-total-result', totalObtained.toFixed(totalObtained % 1 ? 2 : 0));
    set('marks-average-result', average.toFixed(2));
    set('marks-highest-result', highest.toFixed(highest % 1 ? 2 : 0));
    set('marks-lowest-result', lowest.toFixed(lowest % 1 ? 2 : 0));
    set('marks-percentage-result', `${percentage.toFixed(2)}%`);
    if (showToast) toast(values.length ? `Marks percentage ${percentage.toFixed(2)}%` : 'Marks enter karo', 'ðŸ“‹');
  }

  function resetMarksCalculator() {
    const wrap = document.getElementById('marks-rows');
    if (!wrap) return;
    wrap.innerHTML = '';
    state.marksRows = 0;
    addMarksRow('Subject 1', '', '');
    addMarksRow('Subject 2', '', '');
    addMarksRow('Subject 3', '', '');
    calculateMarks(false);
  }

  function copyOutput(id) {
    const el = document.getElementById(id);
    if (!el || !el.value) return toast('Pehle content generate karo', 'â„¹ï¸');
    navigator.clipboard.writeText(el.value).then(() => toast('Copied to clipboard', 'ðŸ“‹')).catch(() => toast('Copy nahi ho paya', 'âŒ'));
  }

  const RESUME_TEMPLATE_META = {
    'ats-minimal': {
      title: 'ATS Minimal',
      tag: 'Standard recruiters-safe format',
      badge: 'ATS Friendly',
      layout: 'Header + Summary + Skills + Experience + Education',
      note: 'Best for engineering, finance, tech, and corporate applications.'
    },
    'modern-slate': {
      title: 'Modern Slate',
      tag: 'Clean left-aligned slate design',
      badge: 'Popular',
      layout: 'Left Header + Summary + Toolkit + Experience + Education',
      note: 'Refined modern design with clean lines and teal/slate accents.'
    },
    'executive-split': {
      title: 'Executive Split',
      tag: 'Elegant two-column design',
      badge: 'Premium',
      layout: 'Two-Column Layout (Sidebar + Experience)',
      note: 'Perfect for split content presentation with high information density.'
    }
  };

  function updateActiveResumeTemplateCard(value) {
    document.querySelectorAll('.resume-template-grid .template-card').forEach(card => {
      const onclickValue = card.getAttribute('onclick') || '';
      card.classList.toggle('active', onclickValue.includes(`'${value}'`));
    });
  }

  function syncResumeTemplatePreview(value) {
    const select = document.getElementById('resume-template');
    const template = value || select?.value || 'ats-minimal';
    if (select && value) select.value = value;
    updateActiveResumeTemplateCard(template);
    renderResumeTemplatePreview();
  }

  function setResumeTemplate(value, card) {
    const select = document.getElementById('resume-template');
    if (select) select.value = value;
    if (card) {
      document.querySelectorAll('.resume-template-grid .template-card').forEach(btn => btn.classList.remove('active'));
      card.classList.add('active');
    }
    syncResumeTemplatePreview(value);
  }

  function formatResumeSectionText(text, fieldId) {
    if (!text) return '';
    const lines = text.split('\n');
    let html = '';
    let inList = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += '<div style="height: 6px;"></div>';
        continue;
      }

      // Check if it is a list item
      if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
        if (!inList) {
          html += '<ul style="margin: 0.25rem 0 0.5rem 1.2rem; padding: 0; list-style-type: disc;">';
          inList = true;
        }
        const itemText = trimmed.substring(1).trim();
        html += `<li contenteditable="true" data-field="${fieldId}" data-type="list" style="margin-bottom: 0.25rem; line-height: 1.45; font-size: 0.85rem; color: #374151;">${escapeHtml(itemText)}</li>`;
        continue;
      }

      if (inList) {
        html += '</ul>';
        inList = false;
      }

      // Split lines containing pipe character for right-aligned subheaders/dates
      if (trimmed.includes('|')) {
        const parts = trimmed.split('|').map(p => p.trim());
        html += `
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 0.4rem; margin-bottom: 0.15rem; font-size: 0.88rem;">
            <span contenteditable="true" data-field="${fieldId}" data-type="split-left" style="font-weight: 700; color: #111827;">${escapeHtml(parts[0])}</span>
            <span contenteditable="true" data-field="${fieldId}" data-type="split-right" style="font-size: 0.82rem; font-weight: 600; color: #6b7280; font-style: italic;">${escapeHtml(parts[1])}</span>
          </div>
        `;
        continue;
      }

      // Standard text line
      html += `<p contenteditable="true" data-field="${fieldId}" data-type="p" style="margin: 0 0 0.35rem 0; line-height: 1.5; font-size: 0.85rem; color: #374151;">${escapeHtml(trimmed)}</p>`;
    }

    if (inList) {
      html += '</ul>';
    }

    return `<div class="live-section-container" data-field="${fieldId}">${html}</div>`;
  }

  // Accent Color Mapping
  window.currentResumeAccentColor = 'default';
  const ACCENT_COLORS = {
    default: {
      'ats-minimal': '#1f4f8f',
      'modern-slate': '#0f766e',
      'executive-split': '#0f766e',
      'creative-bold': '#d97706',
      'minimal-clean': '#374151',
      'corporate-pro': '#1f4f8f',
      'vibrant-two-col': '#7c3aed',
      'elegant-dark': '#6366f1'
    },
    blue: {
      'ats-minimal': '#1d4ed8',
      'modern-slate': '#1d4ed8',
      'executive-split': '#1d4ed8',
      'creative-bold': '#1d4ed8',
      'minimal-clean': '#1d4ed8',
      'corporate-pro': '#1d4ed8',
      'vibrant-two-col': '#1d4ed8',
      'elegant-dark': '#60a5fa'
    },
    green: {
      'ats-minimal': '#047857',
      'modern-slate': '#047857',
      'executive-split': '#047857',
      'creative-bold': '#047857',
      'minimal-clean': '#047857',
      'corporate-pro': '#047857',
      'vibrant-two-col': '#047857',
      'elegant-dark': '#10b981'
    },
    purple: {
      'ats-minimal': '#6d28d9',
      'modern-slate': '#6d28d9',
      'executive-split': '#6d28d9',
      'creative-bold': '#6d28d9',
      'minimal-clean': '#6d28d9',
      'corporate-pro': '#6d28d9',
      'vibrant-two-col': '#6d28d9',
      'elegant-dark': '#8b5cf6'
    },
    grey: {
      'ats-minimal': '#374151',
      'modern-slate': '#374151',
      'executive-split': '#374151',
      'creative-bold': '#374151',
      'minimal-clean': '#374151',
      'corporate-pro': '#374151',
      'vibrant-two-col': '#374151',
      'elegant-dark': '#94a3b8'
    },
    red: {
      'ats-minimal': '#b91c1c',
      'modern-slate': '#b91c1c',
      'executive-split': '#b91c1c',
      'creative-bold': '#b91c1c',
      'minimal-clean': '#b91c1c',
      'corporate-pro': '#b91c1c',
      'vibrant-two-col': '#b91c1c',
      'elegant-dark': '#ef4444'
    }
  };

  function renderResumeTemplatePreview() {
    const get = (id, fallback = '') => document.getElementById(id)?.value?.trim() || fallback;
    const template = get('resume-template', 'ats-minimal');
    const level = get('resume-level', 'student');
    const name = get('resume-name', 'Your Name');
    const email = get('resume-email', 'your@email.com');
    const phone = get('resume-phone', '+91 XXXXX XXXXX');
    const location = get('resume-location', 'Your City');
    const role = get('resume-role', 'Designation');
    const summaryInput = get('resume-summary', '');
    const educationInput = get('resume-education', 'BCA - XYZ College');
    const skillsInput = get('resume-skills', 'HTML, CSS, JavaScript');
    const projectsInput = get('resume-projects', 'Project details preview yahan aayega.');
    const achievementsInput = get('resume-achievements', 'Achievements preview yahan aayega.');
    
    const defaultSummaries = {
      student: 'Motivated student with strong learning ability, project exposure, and a practical approach to solving real-world problems.',
      intern: 'Enthusiastic internship applicant with hands-on academic work, collaboration skills, and readiness to contribute quickly.',
      experienced: 'Results-oriented professional with execution strength, ownership mindset, and a track record of delivering strong outcomes.'
    };
    const summary = summaryInput || defaultSummaries[level] || defaultSummaries.student;

    const paper = document.getElementById('resume-paper');
    if (!paper) return;
    
    // Ensure global state is initialized
    if (!window.sectionTitles) window.sectionTitles = { summary: '', skills: '', projects: '', education: '', achievements: '' };
    if (!window.customResumeSections) window.customResumeSections = [];
    
    // Sync template class
    paper.className = `resume-paper ${template}`;
    
    // Reset paper base styles per template
    if (template === 'elegant-dark') {
      paper.style.cssText = `border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); min-height: 800px; box-sizing: border-box; overflow: hidden; background: #0f172a; padding: 0;`;
    } else if (template === 'vibrant-two-col' || template === 'creative-bold') {
      paper.style.cssText = `border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); min-height: 800px; box-sizing: border-box; overflow: hidden; background: white; padding: 0;`;
    } else if (template === 'corporate-pro') {
      paper.style.cssText = `border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); min-height: 800px; box-sizing: border-box; overflow: hidden; background: white; padding: 0;`;
    } else {
      paper.style.cssText = `border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); min-height: 800px; box-sizing: border-box; overflow: hidden; background: white; padding: 0;`;
    }

    // Get active accent color for template
    const activeAccentColor = (ACCENT_COLORS[window.currentResumeAccentColor] || ACCENT_COLORS.default)[template];

    // Parse formatting into HTML
    const summaryHtml = formatResumeSectionText(summary, 'resume-summary');
    const skillsHtml = formatResumeSectionText(skillsInput, 'resume-skills');
    const educationHtml = formatResumeSectionText(educationInput, 'resume-education');
    const projectsHtml = formatResumeSectionText(projectsInput, 'resume-projects');
    const achievementsHtml = formatResumeSectionText(achievementsInput, 'resume-achievements');

    let html = '';

    if (template === 'ats-minimal') {
      html = `
        <div style="font-family: 'DM Sans', Arial, sans-serif; color: #111827; line-height: 1.45; font-size: 0.88rem; width: 100%; box-sizing: border-box;">
          <!-- Center Aligned Header -->
          <div style="text-align: center; margin-bottom: 1.2rem; border-bottom: 2px solid #111827; padding-bottom: 0.6rem;">
            <h1 contenteditable="true" data-field="resume-name" style="font-size: 1.75rem; font-weight: 800; text-transform: uppercase; margin: 0 0 0.15rem 0; letter-spacing: 0.5px; color: #111827; display: inline-block; min-width: 100px;">${escapeHtml(name)}</h1>
            <div contenteditable="true" data-field="resume-role" style="font-size: 0.95rem; color: #4b5563; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.4rem; display: block; min-width: 80px;">${escapeHtml(role)}</div>
            <div style="font-size: 0.8rem; color: #4b5563; font-weight: 500;">
              <span contenteditable="true" data-field="resume-email" style="display:inline-block; min-width: 50px;">${escapeHtml(email)}</span> &bull; 
              <span contenteditable="true" data-field="resume-phone" style="display:inline-block; min-width: 50px;">${escapeHtml(phone)}</span> &bull; 
              <span contenteditable="true" data-field="resume-location" style="display:inline-block; min-width: 50px;">${escapeHtml(location)}</span>
            </div>
          </div>

          <!-- Summary -->
          ${summary ? `
          <div style="margin-bottom: 0.95rem;">
            <h3 contenteditable="true" data-section-title="summary" style="font-size: 0.88rem; font-weight: 800; color: ${activeAccentColor}; margin: 0 0 0.35rem 0; text-transform: uppercase; letter-spacing: 0.5px; outline: none;">${escapeHtml(window.sectionTitles.summary || 'Professional Summary')}</h3>
            <div style="line-height: 1.5;">${summaryHtml}</div>
          </div>` : ''}

          <!-- Skills -->
          ${skillsInput ? `
          <div style="margin-bottom: 0.95rem;">
            <h3 contenteditable="true" data-section-title="skills" style="font-size: 0.88rem; font-weight: 800; color: ${activeAccentColor}; margin: 0 0 0.35rem 0; text-transform: uppercase; letter-spacing: 0.5px; outline: none;">${escapeHtml(window.sectionTitles.skills || 'Skills')}</h3>
            <div>${skillsHtml}</div>
          </div>` : ''}

          <!-- Experience & Projects -->
          ${projectsInput ? `
          <div style="margin-bottom: 0.95rem;">
            <h3 contenteditable="true" data-section-title="projects" style="font-size: 0.88rem; font-weight: 800; color: ${activeAccentColor}; margin: 0 0 0.35rem 0; text-transform: uppercase; letter-spacing: 0.5px; outline: none;">${escapeHtml(window.sectionTitles.projects || 'Experience & Projects')}</h3>
            <div>${projectsHtml}</div>
          </div>` : ''}

          <!-- Education -->
          ${educationInput ? `
          <div style="margin-bottom: 0.95rem;">
            <h3 contenteditable="true" data-section-title="education" style="font-size: 0.88rem; font-weight: 800; color: ${activeAccentColor}; margin: 0 0 0.35rem 0; text-transform: uppercase; letter-spacing: 0.5px; outline: none;">${escapeHtml(window.sectionTitles.education || 'Education')}</h3>
            <div>${educationHtml}</div>
          </div>` : ''}

          <!-- Achievements -->
          ${achievementsInput ? `
          <div style="margin-bottom: 0.95rem;">
            <h3 contenteditable="true" data-section-title="achievements" style="font-size: 0.88rem; font-weight: 800; color: ${activeAccentColor}; margin: 0 0 0.35rem 0; text-transform: uppercase; letter-spacing: 0.5px; outline: none;">${escapeHtml(window.sectionTitles.achievements || 'Certifications & Achievements')}</h3>
            <div>${achievementsHtml}</div>
          </div>` : ''}

          <!-- Custom Sections -->
          ${(window.customResumeSections || []).map(sec => {
            const secValue = sec.value || `${sec.title} preview yahan aayega.`;
            return `
            <div style="margin-bottom: 0.95rem;">
              <h3 contenteditable="true" data-custom-section-title="${sec.id}" style="font-size: 0.88rem; font-weight: 800; color: ${activeAccentColor}; margin: 0 0 0.35rem 0; text-transform: uppercase; letter-spacing: 0.5px; outline: none;">${escapeHtml(sec.title)}</h3>
              <div>${formatResumeSectionText(secValue, sec.id)}</div>
            </div>`;
          }).join('')}
        </div>
      `;
    } else if (template === 'modern-slate') {
      html = `
        <div style="font-family: 'DM Sans', Arial, sans-serif; color: #0f172a; line-height: 1.5; font-size: 0.88rem; width: 100%; box-sizing: border-box;">
          <!-- Left Aligned Header with Side Border -->
          <div style="border-left: 6px solid ${activeAccentColor}; padding-left: 1.25rem; margin-bottom: 1.5rem; padding-top: 0.2rem; padding-bottom: 0.2rem;">
            <h1 contenteditable="true" data-field="resume-name" style="font-size: 2rem; font-weight: 800; margin: 0 0 0.15rem 0; color: #0f172a; letter-spacing: -0.5px; display: inline-block; min-width: 100px;">${escapeHtml(name)}</h1>
            <div contenteditable="true" data-field="resume-role" style="font-size: 0.95rem; color: ${activeAccentColor}; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; display: block; min-width: 80px;">${escapeHtml(role)}</div>
            <div style="font-size: 0.82rem; color: #64748b; margin-top: 0.5rem; font-weight: 500;">
              📧 <span contenteditable="true" data-field="resume-email" style="display:inline-block; min-width: 50px;">${escapeHtml(email)}</span> &nbsp;&bull;&nbsp; 
              📞 <span contenteditable="true" data-field="resume-phone" style="display:inline-block; min-width: 50px;">${escapeHtml(phone)}</span> &nbsp;&bull;&nbsp; 
              📍 <span contenteditable="true" data-field="resume-location" style="display:inline-block; min-width: 50px;">${escapeHtml(location)}</span>
            </div>
          </div>

          <!-- Summary -->
          ${summary ? `
          <div style="margin-bottom: 1.2rem;">
            <h3 contenteditable="true" data-section-title="summary" style="font-size: 0.92rem; font-weight: 800; color: ${activeAccentColor}; margin: 0 0 0.45rem 0; text-transform: uppercase; letter-spacing: 0.75px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 0.2rem; outline: none;">${escapeHtml(window.sectionTitles.summary || 'About Me')}</h3>
            <div>${summaryHtml}</div>
          </div>` : ''}

          <!-- Skills -->
          ${skillsInput ? `
          <div style="margin-bottom: 1.2rem;">
            <h3 contenteditable="true" data-section-title="skills" style="font-size: 0.92rem; font-weight: 800; color: ${activeAccentColor}; margin: 0 0 0.45rem 0; text-transform: uppercase; letter-spacing: 0.75px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 0.2rem; outline: none;">${escapeHtml(window.sectionTitles.skills || 'Technical Toolkit')}</h3>
            <div>${skillsHtml}</div>
          </div>` : ''}

          <!-- Experience & Projects -->
          ${projectsInput ? `
          <div style="margin-bottom: 1.2rem;">
            <h3 contenteditable="true" data-section-title="projects" style="font-size: 0.92rem; font-weight: 800; color: ${activeAccentColor}; margin: 0 0 0.45rem 0; text-transform: uppercase; letter-spacing: 0.75px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 0.2rem; outline: none;">${escapeHtml(window.sectionTitles.projects || 'Work & Projects')}</h3>
            <div>${projectsHtml}</div>
          </div>` : ''}

          <!-- Education -->
          ${educationInput ? `
          <div style="margin-bottom: 1.2rem;">
            <h3 contenteditable="true" data-section-title="education" style="font-size: 0.92rem; font-weight: 800; color: ${activeAccentColor}; margin: 0 0 0.45rem 0; text-transform: uppercase; letter-spacing: 0.75px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 0.2rem; outline: none;">${escapeHtml(window.sectionTitles.education || 'Education')}</h3>
            <div>${educationHtml}</div>
          </div>` : ''}

          <!-- Achievements -->
          ${achievementsInput ? `
          <div style="margin-bottom: 1.2rem;">
            <h3 contenteditable="true" data-section-title="achievements" style="font-size: 0.92rem; font-weight: 800; color: ${activeAccentColor}; margin: 0 0 0.45rem 0; text-transform: uppercase; letter-spacing: 0.75px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 0.2rem; outline: none;">${escapeHtml(window.sectionTitles.achievements || 'Achievements')}</h3>
            <div>${achievementsHtml}</div>
          </div>` : ''}

          <!-- Custom Sections -->
          ${(window.customResumeSections || []).map(sec => {
            const secValue = sec.value || `${sec.title} preview yahan aayega.`;
            return `
            <div style="margin-bottom: 1.2rem;">
              <h3 contenteditable="true" data-custom-section-title="${sec.id}" style="font-size: 0.92rem; font-weight: 800; color: ${activeAccentColor}; margin: 0 0 0.45rem 0; text-transform: uppercase; letter-spacing: 0.75px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 0.2rem; outline: none;">${escapeHtml(sec.title)}</h3>
              <div>${formatResumeSectionText(secValue, sec.id)}</div>
            </div>`;
          }).join('')}
        </div>
      `;
    } else if (template === 'executive-split') {
      html = `
        <div style="font-family: 'DM Sans', Arial, sans-serif; color: #1e293b; display: flex; gap: 1.5rem; min-height: 800px; width: 100%; box-sizing: border-box; margin: 0; padding: 0;">
          <!-- Left Narrow Sidebar Column -->
          <div style="width: 33%; background: #f8fafc; padding: 1.5rem; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 1.4rem; box-sizing: border-box;">
            <div>
              <h1 contenteditable="true" data-field="resume-name" style="font-size: 1.45rem; font-weight: 800; margin: 0 0 0.2rem 0; color: #0f172a; line-height: 1.15; letter-spacing: -0.5px; display: inline-block; min-width: 100px;">${escapeHtml(name)}</h1>
              <div contenteditable="true" data-field="resume-role" style="font-size: 0.8rem; color: ${activeAccentColor}; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; display: block; min-width: 80px;">${escapeHtml(role)}</div>
            </div>

            <!-- Contact Section -->
            <div style="border-top: 1.5px solid #e2e8f0; padding-top: 0.8rem;">
              <h4 style="font-size: 0.75rem; text-transform: uppercase; color: #475569; letter-spacing: 1px; margin: 0 0 0.5rem 0; font-weight: 800;">Contact</h4>
              <div style="font-size: 0.78rem; line-height: 1.5; color: #475569; display: flex; flex-direction: column; gap: 0.35rem;">
                <div style="display:flex; align-items:center; gap: 0.3rem;">📍 <span contenteditable="true" data-field="resume-location" style="word-break:break-all; display:inline-block; min-width: 50px;">${escapeHtml(location)}</span></div>
                <div style="display:flex; align-items:center; gap: 0.3rem;">📧 <span contenteditable="true" data-field="resume-email" style="word-break:break-all; display:inline-block; min-width: 50px;">${escapeHtml(email)}</span></div>
                <div style="display:flex; align-items:center; gap: 0.3rem;">📞 <span contenteditable="true" data-field="resume-phone" style="word-break:break-all; display:inline-block; min-width: 50px;">${escapeHtml(phone)}</span></div>
              </div>
            </div>

            <!-- Skills Section -->
            ${skillsInput ? `
            <div style="border-top: 1.5px solid #e2e8f0; padding-top: 0.8rem;">
              <h4 contenteditable="true" data-section-title="skills" style="font-size: 0.75rem; text-transform: uppercase; color: #475569; letter-spacing: 1px; margin: 0 0 0.5rem 0; font-weight: 800; outline: none;">${escapeHtml(window.sectionTitles.skills || 'Expertise')}</h4>
              <div style="font-size: 0.78rem; color: #475569; line-height: 1.45;">${skillsHtml}</div>
            </div>` : ''}

            <!-- Education Section -->
            ${educationInput ? `
            <div style="border-top: 1.5px solid #e2e8f0; padding-top: 0.8rem;">
              <h4 contenteditable="true" data-section-title="education" style="font-size: 0.75rem; text-transform: uppercase; color: #475569; letter-spacing: 1px; margin: 0 0 0.5rem 0; font-weight: 800; outline: none;">${escapeHtml(window.sectionTitles.education || 'Education')}</h4>
              <div style="font-size: 0.78rem; color: #475569; line-height: 1.45;">${educationHtml}</div>
            </div>` : ''}
          </div>
          
          <!-- Right Main Column -->
          <div style="width: 67%; display: flex; flex-direction: column; gap: 1.3rem; padding-top: 1.5rem; padding-bottom: 1.5rem; padding-right: 1.5rem; box-sizing: border-box;">
            <!-- Summary -->
            ${summary ? `
            <div>
              <h3 contenteditable="true" data-section-title="summary" style="font-size: 0.88rem; font-weight: 800; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3rem; margin: 0 0 0.5rem 0; letter-spacing: 0.5px; outline: none;">${escapeHtml(window.sectionTitles.summary || 'Executive Summary')}</h3>
              <div style="font-size: 0.85rem; color: #334155; line-height: 1.5;">${summaryHtml}</div>
            </div>` : ''}

            <!-- Experience & Projects -->
            ${projectsInput ? `
            <div>
              <h3 contenteditable="true" data-section-title="projects" style="font-size: 0.88rem; font-weight: 800; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3rem; margin: 0 0 0.5rem 0; letter-spacing: 0.5px; outline: none;">${escapeHtml(window.sectionTitles.projects || 'Professional History')}</h3>
              <div style="font-size: 0.85rem; color: #334155; line-height: 1.45;">${projectsHtml}</div>
            </div>` : ''}

            <!-- Achievements -->
            ${achievementsInput ? `
            <div>
              <h3 contenteditable="true" data-section-title="achievements" style="font-size: 0.88rem; font-weight: 800; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3rem; margin: 0 0 0.5rem 0; letter-spacing: 0.5px; outline: none;">${escapeHtml(window.sectionTitles.achievements || 'Key Honors')}</h3>
              <div style="font-size: 0.85rem; color: #334155; line-height: 1.45;">${achievementsHtml}</div>
            </div>` : ''}

            <!-- Custom Sections -->
            ${(window.customResumeSections || []).map(sec => {
              const secValue = sec.value || `${sec.title} preview yahan aayega.`;
              return `
              <div>
                <h3 contenteditable="true" data-custom-section-title="${sec.id}" style="font-size: 0.88rem; font-weight: 800; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3rem; margin: 0 0 0.5rem 0; letter-spacing: 0.5px; outline: none;">${escapeHtml(sec.title)}</h3>
                <div style="font-size: 0.85rem; color: #334155; line-height: 1.45;">${formatResumeSectionText(secValue, sec.id)}</div>
              </div>`;
            }).join('')}
          </div>
        </div>
      `;
    } else if (template === 'creative-bold') {
      // 🎨 Creative Bold — left color strip + bold typography
      html = `
        <div style="font-family: 'DM Sans', Arial, sans-serif; color: #1e293b; display: flex; min-height: 800px; width: 100%; box-sizing: border-box;">
          <!-- Colored Left Strip -->
          <div style="width: 8px; background: linear-gradient(180deg, ${activeAccentColor}, ${activeAccentColor}88); flex-shrink: 0; border-radius: 0;"></div>
          <!-- Main Content -->
          <div style="flex: 1; padding: 2.5rem 2rem; box-sizing: border-box;">
            <!-- Header -->
            <div style="margin-bottom: 1.8rem; padding-bottom: 1rem; border-bottom: 3px solid ${activeAccentColor};">
              <h1 contenteditable="true" data-field="resume-name" style="font-size: 2.2rem; font-weight: 900; margin: 0 0 0.2rem 0; color: #0f172a; letter-spacing: -1px; line-height: 1.1; display: block;">${escapeHtml(name)}</h1>
              <div contenteditable="true" data-field="resume-role" style="font-size: 1rem; color: ${activeAccentColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 0.6rem; display: block;">${escapeHtml(role)}</div>
              <div style="font-size: 0.8rem; color: #64748b; display: flex; flex-wrap: wrap; gap: 1rem;">
                <span>📧 <span contenteditable="true" data-field="resume-email" style="display:inline-block;">${escapeHtml(email)}</span></span>
                <span>📞 <span contenteditable="true" data-field="resume-phone" style="display:inline-block;">${escapeHtml(phone)}</span></span>
                <span>📍 <span contenteditable="true" data-field="resume-location" style="display:inline-block;">${escapeHtml(location)}</span></span>
              </div>
            </div>
            <!-- Summary -->
            ${summary ? `<div style="margin-bottom: 1.4rem;">
              <h3 contenteditable="true" data-section-title="summary" style="font-size: 0.78rem; font-weight: 900; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 0.5rem 0; outline: none;">${escapeHtml(window.sectionTitles.summary || 'About Me')}</h3>
              <div style="font-size: 0.86rem; line-height: 1.6; color: #334155;">${summaryHtml}</div>
            </div>` : ''}
            <!-- Skills -->
            ${skillsInput ? `<div style="margin-bottom: 1.4rem;">
              <h3 contenteditable="true" data-section-title="skills" style="font-size: 0.78rem; font-weight: 900; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 0.5rem 0; outline: none;">${escapeHtml(window.sectionTitles.skills || 'Skills')}</h3>
              <div style="font-size: 0.86rem;">${skillsHtml}</div>
            </div>` : ''}
            <!-- Projects -->
            ${projectsInput ? `<div style="margin-bottom: 1.4rem;">
              <h3 contenteditable="true" data-section-title="projects" style="font-size: 0.78rem; font-weight: 900; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 0.5rem 0; outline: none;">${escapeHtml(window.sectionTitles.projects || 'Experience & Projects')}</h3>
              <div style="font-size: 0.86rem;">${projectsHtml}</div>
            </div>` : ''}
            <!-- Education -->
            ${educationInput ? `<div style="margin-bottom: 1.4rem;">
              <h3 contenteditable="true" data-section-title="education" style="font-size: 0.78rem; font-weight: 900; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 0.5rem 0; outline: none;">${escapeHtml(window.sectionTitles.education || 'Education')}</h3>
              <div style="font-size: 0.86rem;">${educationHtml}</div>
            </div>` : ''}
            <!-- Achievements -->
            ${achievementsInput ? `<div style="margin-bottom: 1.4rem;">
              <h3 contenteditable="true" data-section-title="achievements" style="font-size: 0.78rem; font-weight: 900; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 0.5rem 0; outline: none;">${escapeHtml(window.sectionTitles.achievements || 'Achievements')}</h3>
              <div style="font-size: 0.86rem;">${achievementsHtml}</div>
            </div>` : ''}
            <!-- Custom Sections -->
            ${(window.customResumeSections || []).map(sec => {
              const sv = sec.value || `${sec.title} preview yahan aayega.`;
              return `<div style="margin-bottom: 1.4rem;">
                <h3 contenteditable="true" data-custom-section-title="${sec.id}" style="font-size: 0.78rem; font-weight: 900; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 0.5rem 0; outline: none;">${escapeHtml(sec.title)}</h3>
                <div style="font-size: 0.86rem;">${formatResumeSectionText(sv, sec.id)}</div>
              </div>`;
            }).join('')}
          </div>
        </div>
      `;
    } else if (template === 'minimal-clean') {
      // ✨ Minimal Clean — ultra-minimalist, lots of whitespace, serif-inspired
      html = `
        <div style="font-family: 'Georgia', 'DM Sans', serif; color: #1a1a1a; padding: 3rem 3.5rem; box-sizing: border-box; min-height: 800px; background: white;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid #d1d5db;">
            <h1 contenteditable="true" data-field="resume-name" style="font-size: 2.4rem; font-weight: 400; margin: 0 0 0.3rem 0; color: #1a1a1a; letter-spacing: 3px; text-transform: uppercase; font-family: 'DM Sans', sans-serif; display: block;">${escapeHtml(name)}</h1>
            <div contenteditable="true" data-field="resume-role" style="font-size: 0.85rem; color: #6b7280; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 0.8rem; font-family: 'DM Sans', sans-serif; display: block;">${escapeHtml(role)}</div>
            <div style="font-size: 0.78rem; color: #9ca3af; display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap;">
              <span contenteditable="true" data-field="resume-email" style="display:inline-block;">${escapeHtml(email)}</span>
              <span style="color:#d1d5db;">|</span>
              <span contenteditable="true" data-field="resume-phone" style="display:inline-block;">${escapeHtml(phone)}</span>
              <span style="color:#d1d5db;">|</span>
              <span contenteditable="true" data-field="resume-location" style="display:inline-block;">${escapeHtml(location)}</span>
            </div>
          </div>
          <!-- Summary -->
          ${summary ? `<div style="margin-bottom: 1.6rem;">
            <h3 contenteditable="true" data-section-title="summary" style="font-size: 0.7rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 0.7rem 0; font-family: 'DM Sans', sans-serif; outline: none;">${escapeHtml(window.sectionTitles.summary || 'Profile')}</h3>
            <div style="font-size: 0.88rem; line-height: 1.7; color: #374151;">${summaryHtml}</div>
          </div>` : ''}
          <!-- Skills -->
          ${skillsInput ? `<div style="margin-bottom: 1.6rem;">
            <h3 contenteditable="true" data-section-title="skills" style="font-size: 0.7rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 0.7rem 0; font-family: 'DM Sans', sans-serif; outline: none;">${escapeHtml(window.sectionTitles.skills || 'Skills')}</h3>
            <div style="font-size: 0.88rem; color: #374151;">${skillsHtml}</div>
          </div>` : ''}
          <!-- Projects -->
          ${projectsInput ? `<div style="margin-bottom: 1.6rem;">
            <h3 contenteditable="true" data-section-title="projects" style="font-size: 0.7rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 0.7rem 0; font-family: 'DM Sans', sans-serif; outline: none;">${escapeHtml(window.sectionTitles.projects || 'Experience')}</h3>
            <div style="font-size: 0.88rem; color: #374151;">${projectsHtml}</div>
          </div>` : ''}
          <!-- Education -->
          ${educationInput ? `<div style="margin-bottom: 1.6rem;">
            <h3 contenteditable="true" data-section-title="education" style="font-size: 0.7rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 0.7rem 0; font-family: 'DM Sans', sans-serif; outline: none;">${escapeHtml(window.sectionTitles.education || 'Education')}</h3>
            <div style="font-size: 0.88rem; color: #374151;">${educationHtml}</div>
          </div>` : ''}
          <!-- Achievements -->
          ${achievementsInput ? `<div style="margin-bottom: 1.6rem;">
            <h3 contenteditable="true" data-section-title="achievements" style="font-size: 0.7rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 0.7rem 0; font-family: 'DM Sans', sans-serif; outline: none;">${escapeHtml(window.sectionTitles.achievements || 'Achievements')}</h3>
            <div style="font-size: 0.88rem; color: #374151;">${achievementsHtml}</div>
          </div>` : ''}
          <!-- Custom Sections -->
          ${(window.customResumeSections || []).map(sec => {
            const sv = sec.value || `${sec.title} preview yahan aayega.`;
            return `<div style="margin-bottom: 1.6rem;">
              <h3 contenteditable="true" data-custom-section-title="${sec.id}" style="font-size: 0.7rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 0.7rem 0; font-family: 'DM Sans', sans-serif; outline: none;">${escapeHtml(sec.title)}</h3>
              <div style="font-size: 0.88rem; color: #374151;">${formatResumeSectionText(sv, sec.id)}</div>
            </div>`;
          }).join('')}
        </div>
      `;
    } else if (template === 'corporate-pro') {
      // 🏢 Corporate Pro — traditional structured with header bar
      html = `
        <div style="font-family: 'DM Sans', Arial, sans-serif; color: #1e293b; min-height: 800px; box-sizing: border-box;">
          <!-- Top Color Bar Header -->
          <div style="background: ${activeAccentColor}; padding: 1.8rem 2.5rem; color: white;">
            <h1 contenteditable="true" data-field="resume-name" style="font-size: 2rem; font-weight: 800; margin: 0 0 0.25rem 0; letter-spacing: -0.5px; display: block;">${escapeHtml(name)}</h1>
            <div contenteditable="true" data-field="resume-role" style="font-size: 0.95rem; font-weight: 500; opacity: 0.9; letter-spacing: 1px; text-transform: uppercase; display: block;">${escapeHtml(role)}</div>
          </div>
          <!-- Contact Sub-bar -->
          <div style="background: ${activeAccentColor}22; padding: 0.6rem 2.5rem; display: flex; flex-wrap: wrap; gap: 1.5rem; font-size: 0.78rem; color: #475569; border-bottom: 2px solid ${activeAccentColor};">
            <span>📧 <span contenteditable="true" data-field="resume-email" style="display:inline-block;">${escapeHtml(email)}</span></span>
            <span>📞 <span contenteditable="true" data-field="resume-phone" style="display:inline-block;">${escapeHtml(phone)}</span></span>
            <span>📍 <span contenteditable="true" data-field="resume-location" style="display:inline-block;">${escapeHtml(location)}</span></span>
          </div>
          <!-- Body -->
          <div style="padding: 1.8rem 2.5rem; box-sizing: border-box;">
            ${summary ? `<div style="margin-bottom: 1.3rem;">
              <h3 contenteditable="true" data-section-title="summary" style="font-size: 0.82rem; font-weight: 800; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 0.5rem 0; padding-bottom: 0.25rem; border-bottom: 2px solid ${activeAccentColor}44; outline: none;">${escapeHtml(window.sectionTitles.summary || 'Executive Profile')}</h3>
              <div style="font-size: 0.86rem; line-height: 1.6; color: #374151;">${summaryHtml}</div>
            </div>` : ''}
            ${skillsInput ? `<div style="margin-bottom: 1.3rem;">
              <h3 contenteditable="true" data-section-title="skills" style="font-size: 0.82rem; font-weight: 800; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 0.5rem 0; padding-bottom: 0.25rem; border-bottom: 2px solid ${activeAccentColor}44; outline: none;">${escapeHtml(window.sectionTitles.skills || 'Core Competencies')}</h3>
              <div style="font-size: 0.86rem;">${skillsHtml}</div>
            </div>` : ''}
            ${projectsInput ? `<div style="margin-bottom: 1.3rem;">
              <h3 contenteditable="true" data-section-title="projects" style="font-size: 0.82rem; font-weight: 800; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 0.5rem 0; padding-bottom: 0.25rem; border-bottom: 2px solid ${activeAccentColor}44; outline: none;">${escapeHtml(window.sectionTitles.projects || 'Professional Experience')}</h3>
              <div style="font-size: 0.86rem;">${projectsHtml}</div>
            </div>` : ''}
            ${educationInput ? `<div style="margin-bottom: 1.3rem;">
              <h3 contenteditable="true" data-section-title="education" style="font-size: 0.82rem; font-weight: 800; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 0.5rem 0; padding-bottom: 0.25rem; border-bottom: 2px solid ${activeAccentColor}44; outline: none;">${escapeHtml(window.sectionTitles.education || 'Education')}</h3>
              <div style="font-size: 0.86rem;">${educationHtml}</div>
            </div>` : ''}
            ${achievementsInput ? `<div style="margin-bottom: 1.3rem;">
              <h3 contenteditable="true" data-section-title="achievements" style="font-size: 0.82rem; font-weight: 800; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 0.5rem 0; padding-bottom: 0.25rem; border-bottom: 2px solid ${activeAccentColor}44; outline: none;">${escapeHtml(window.sectionTitles.achievements || 'Achievements & Certifications')}</h3>
              <div style="font-size: 0.86rem;">${achievementsHtml}</div>
            </div>` : ''}
            ${(window.customResumeSections || []).map(sec => {
              const sv = sec.value || `${sec.title} preview yahan aayega.`;
              return `<div style="margin-bottom: 1.3rem;">
                <h3 contenteditable="true" data-custom-section-title="${sec.id}" style="font-size: 0.82rem; font-weight: 800; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 0.5rem 0; padding-bottom: 0.25rem; border-bottom: 2px solid ${activeAccentColor}44; outline: none;">${escapeHtml(sec.title)}</h3>
                <div style="font-size: 0.86rem;">${formatResumeSectionText(sv, sec.id)}</div>
              </div>`;
            }).join('')}
          </div>
        </div>
      `;
    } else if (template === 'vibrant-two-col') {
      // 🌈 Vibrant Two-Column — colored sidebar with main content on right
      html = `
        <div style="font-family: 'DM Sans', Arial, sans-serif; display: flex; min-height: 800px; width: 100%; box-sizing: border-box; color: #1e293b;">
          <!-- Left Sidebar -->
          <div style="width: 38%; background: ${activeAccentColor}; color: white; padding: 2rem 1.5rem; box-sizing: border-box; display: flex; flex-direction: column; gap: 1.4rem;">
            <!-- Name Block -->
            <div>
              <h1 contenteditable="true" data-field="resume-name" style="font-size: 1.6rem; font-weight: 800; margin: 0 0 0.2rem 0; line-height: 1.2; color: white; display: block;">${escapeHtml(name)}</h1>
              <div contenteditable="true" data-field="resume-role" style="font-size: 0.82rem; font-weight: 600; opacity: 0.85; text-transform: uppercase; letter-spacing: 1.2px; display: block;">${escapeHtml(role)}</div>
            </div>
            <!-- Contact -->
            <div style="border-top: 1px solid rgba(255,255,255,0.25); padding-top: 1rem;">
              <h4 style="font-size: 0.68rem; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 0.6rem 0; opacity: 0.7; font-weight: 700;">Contact</h4>
              <div style="font-size: 0.78rem; opacity: 0.9; display: flex; flex-direction: column; gap: 0.35rem; line-height: 1.4;">
                <div>📧 <span contenteditable="true" data-field="resume-email" style="display:inline-block; word-break: break-all;">${escapeHtml(email)}</span></div>
                <div>📞 <span contenteditable="true" data-field="resume-phone" style="display:inline-block;">${escapeHtml(phone)}</span></div>
                <div>📍 <span contenteditable="true" data-field="resume-location" style="display:inline-block;">${escapeHtml(location)}</span></div>
              </div>
            </div>
            <!-- Skills -->
            ${skillsInput ? `<div style="border-top: 1px solid rgba(255,255,255,0.25); padding-top: 1rem;">
              <h4 contenteditable="true" data-section-title="skills" style="font-size: 0.68rem; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 0.6rem 0; opacity: 0.7; font-weight: 700; outline: none;">${escapeHtml(window.sectionTitles.skills || 'Skills')}</h4>
              <div style="font-size: 0.78rem; opacity: 0.9; line-height: 1.6;">${skillsHtml}</div>
            </div>` : ''}
            <!-- Education -->
            ${educationInput ? `<div style="border-top: 1px solid rgba(255,255,255,0.25); padding-top: 1rem;">
              <h4 contenteditable="true" data-section-title="education" style="font-size: 0.68rem; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 0.6rem 0; opacity: 0.7; font-weight: 700; outline: none;">${escapeHtml(window.sectionTitles.education || 'Education')}</h4>
              <div style="font-size: 0.78rem; opacity: 0.9; line-height: 1.5;">${educationHtml}</div>
            </div>` : ''}
            <!-- Custom Sections in sidebar -->
            ${(window.customResumeSections || []).filter((_, i) => i % 2 === 0).map(sec => {
              const sv = sec.value || `${sec.title} preview yahan aayega.`;
              return `<div style="border-top: 1px solid rgba(255,255,255,0.25); padding-top: 1rem;">
                <h4 contenteditable="true" data-custom-section-title="${sec.id}" style="font-size: 0.68rem; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 0.6rem 0; opacity: 0.7; font-weight: 700; outline: none;">${escapeHtml(sec.title)}</h4>
                <div style="font-size: 0.78rem; opacity: 0.9;">${formatResumeSectionText(sv, sec.id)}</div>
              </div>`;
            }).join('')}
          </div>
          <!-- Right Main -->
          <div style="width: 62%; padding: 2rem; box-sizing: border-box; display: flex; flex-direction: column; gap: 1.3rem;">
            ${summary ? `<div>
              <h3 contenteditable="true" data-section-title="summary" style="font-size: 0.82rem; font-weight: 800; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 0.5rem 0; outline: none; border-bottom: 2px solid ${activeAccentColor}33; padding-bottom: 0.25rem;">${escapeHtml(window.sectionTitles.summary || 'Profile')}</h3>
              <div style="font-size: 0.86rem; line-height: 1.6; color: #374151;">${summaryHtml}</div>
            </div>` : ''}
            ${projectsInput ? `<div>
              <h3 contenteditable="true" data-section-title="projects" style="font-size: 0.82rem; font-weight: 800; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 0.5rem 0; outline: none; border-bottom: 2px solid ${activeAccentColor}33; padding-bottom: 0.25rem;">${escapeHtml(window.sectionTitles.projects || 'Experience & Projects')}</h3>
              <div style="font-size: 0.86rem; line-height: 1.5; color: #374151;">${projectsHtml}</div>
            </div>` : ''}
            ${achievementsInput ? `<div>
              <h3 contenteditable="true" data-section-title="achievements" style="font-size: 0.82rem; font-weight: 800; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 0.5rem 0; outline: none; border-bottom: 2px solid ${activeAccentColor}33; padding-bottom: 0.25rem;">${escapeHtml(window.sectionTitles.achievements || 'Achievements')}</h3>
              <div style="font-size: 0.86rem; line-height: 1.5; color: #374151;">${achievementsHtml}</div>
            </div>` : ''}
            ${(window.customResumeSections || []).filter((_, i) => i % 2 !== 0).map(sec => {
              const sv = sec.value || `${sec.title} preview yahan aayega.`;
              return `<div>
                <h3 contenteditable="true" data-custom-section-title="${sec.id}" style="font-size: 0.82rem; font-weight: 800; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 0.5rem 0; outline: none; border-bottom: 2px solid ${activeAccentColor}33; padding-bottom: 0.25rem;">${escapeHtml(sec.title)}</h3>
                <div style="font-size: 0.86rem; line-height: 1.5; color: #374151;">${formatResumeSectionText(sv, sec.id)}</div>
              </div>`;
            }).join('')}
          </div>
        </div>
      `;
    } else if (template === 'elegant-dark') {
      // 🌙 Elegant Dark — premium dark background resume
      html = `
        <div style="font-family: 'DM Sans', Arial, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 800px; padding: 2.5rem; box-sizing: border-box;">
          <!-- Header -->
          <div style="margin-bottom: 2rem; padding-bottom: 1.2rem; border-bottom: 1px solid rgba(255,255,255,0.12);">
            <h1 contenteditable="true" data-field="resume-name" style="font-size: 2.2rem; font-weight: 800; margin: 0 0 0.2rem 0; color: white; letter-spacing: -0.5px; display: block;">${escapeHtml(name)}</h1>
            <div contenteditable="true" data-field="resume-role" style="font-size: 0.9rem; color: ${activeAccentColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 0.7rem; display: block;">${escapeHtml(role)}</div>
            <div style="font-size: 0.78rem; color: #94a3b8; display: flex; flex-wrap: wrap; gap: 1.2rem;">
              <span>📧 <span contenteditable="true" data-field="resume-email" style="display:inline-block;">${escapeHtml(email)}</span></span>
              <span>📞 <span contenteditable="true" data-field="resume-phone" style="display:inline-block;">${escapeHtml(phone)}</span></span>
              <span>📍 <span contenteditable="true" data-field="resume-location" style="display:inline-block;">${escapeHtml(location)}</span></span>
            </div>
          </div>
          ${summary ? `<div style="margin-bottom: 1.5rem;">
            <h3 contenteditable="true" data-section-title="summary" style="font-size: 0.72rem; font-weight: 700; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 2.5px; margin: 0 0 0.6rem 0; outline: none;">${escapeHtml(window.sectionTitles.summary || 'About')}</h3>
            <div style="font-size: 0.86rem; line-height: 1.7; color: #cbd5e1;">${summaryHtml}</div>
          </div>` : ''}
          ${skillsInput ? `<div style="margin-bottom: 1.5rem;">
            <h3 contenteditable="true" data-section-title="skills" style="font-size: 0.72rem; font-weight: 700; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 2.5px; margin: 0 0 0.6rem 0; outline: none;">${escapeHtml(window.sectionTitles.skills || 'Skills')}</h3>
            <div style="font-size: 0.86rem; color: #cbd5e1;">${skillsHtml}</div>
          </div>` : ''}
          ${projectsInput ? `<div style="margin-bottom: 1.5rem;">
            <h3 contenteditable="true" data-section-title="projects" style="font-size: 0.72rem; font-weight: 700; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 2.5px; margin: 0 0 0.6rem 0; outline: none;">${escapeHtml(window.sectionTitles.projects || 'Experience & Projects')}</h3>
            <div style="font-size: 0.86rem; color: #cbd5e1;">${projectsHtml}</div>
          </div>` : ''}
          ${educationInput ? `<div style="margin-bottom: 1.5rem;">
            <h3 contenteditable="true" data-section-title="education" style="font-size: 0.72rem; font-weight: 700; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 2.5px; margin: 0 0 0.6rem 0; outline: none;">${escapeHtml(window.sectionTitles.education || 'Education')}</h3>
            <div style="font-size: 0.86rem; color: #cbd5e1;">${educationHtml}</div>
          </div>` : ''}
          ${achievementsInput ? `<div style="margin-bottom: 1.5rem;">
            <h3 contenteditable="true" data-section-title="achievements" style="font-size: 0.72rem; font-weight: 700; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 2.5px; margin: 0 0 0.6rem 0; outline: none;">${escapeHtml(window.sectionTitles.achievements || 'Achievements')}</h3>
            <div style="font-size: 0.86rem; color: #cbd5e1;">${achievementsHtml}</div>
          </div>` : ''}
          ${(window.customResumeSections || []).map(sec => {
            const sv = sec.value || `${sec.title} preview yahan aayega.`;
            return `<div style="margin-bottom: 1.5rem;">
              <h3 contenteditable="true" data-custom-section-title="${sec.id}" style="font-size: 0.72rem; font-weight: 700; color: ${activeAccentColor}; text-transform: uppercase; letter-spacing: 2.5px; margin: 0 0 0.6rem 0; outline: none;">${escapeHtml(sec.title)}</h3>
              <div style="font-size: 0.86rem; color: #cbd5e1;">${formatResumeSectionText(sv, sec.id)}</div>
            </div>`;
          }).join('')}
        </div>
      `;
    }

    paper.innerHTML = html;

    // Trigger ATS score update whenever the preview re-renders (meaning content changed)
    if (typeof updateAtsScore === 'function') {
      updateAtsScore();
    }
  }

  function generateResume() {
    const template = document.getElementById('resume-template')?.value || 'ats-minimal';
    const level = document.getElementById('resume-level')?.value || 'student';
    const name = document.getElementById('resume-name')?.value?.trim() || 'Your Name';
    const email = document.getElementById('resume-email')?.value?.trim() || 'your@email.com';
    const phone = document.getElementById('resume-phone')?.value?.trim() || '+91 XXXXX XXXXX';
    const location = document.getElementById('resume-location')?.value?.trim() || 'Your City';
    const role = document.getElementById('resume-role')?.value?.trim() || 'Designation';
    const summaryInput = document.getElementById('resume-summary')?.value?.trim();
    const education = document.getElementById('resume-education')?.value?.trim() || 'Add education details';
    const skills = document.getElementById('resume-skills')?.value?.trim() || 'Add skills';
    const projects = document.getElementById('resume-projects')?.value?.trim() || 'Add projects / experience';
    const achievements = document.getElementById('resume-achievements')?.value?.trim() || 'Add achievements / certifications';
    
    const defaultSummaries = {
      student: 'Motivated student with strong learning ability, practical problem-solving skills, and interest in building real-world projects.',
      intern: 'Enthusiastic internship applicant with hands-on academic project experience, teamwork mindset, and eagerness to contribute quickly.',
      experienced: 'Results-oriented professional with practical execution experience, ownership mindset, and the ability to deliver strong outcomes.'
    };
    const summary = summaryInput || defaultSummaries[level] || defaultSummaries.student;

    let out = `${name.toUpperCase()}
${role}
${email} | ${phone} | ${location}

=========================================
PROFESSIONAL SUMMARY
=========================================
${summary}

=========================================
EXPERIENCE & PROJECTS
=========================================
${projects}

=========================================
CORE SKILLS
=========================================
${skills}

=========================================
EDUCATION
=========================================
${education}

=========================================
CERTIFICATIONS & ACHIEVEMENTS
=========================================
${achievements}`;

    if (window.customResumeSections && window.customResumeSections.length > 0) {
      window.customResumeSections.forEach(sec => {
        if (sec.value) {
          out += `\n\n=========================================\n${sec.title.toUpperCase()}\n=========================================\n${sec.value}`;
        }
      });
    }

    const box = document.getElementById('resume-output');
    if (box) box.value = out;
    
    renderResumeTemplatePreview();
    toast('Resume draft ready', '📋');
  }

  function downloadResumeText() {
    const content = document.getElementById('resume-output')?.value || '';
    if (!content.trim()) return toast('Pehle resume generate karo', '📋');
    dlBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), 'resume.txt');
  }

  function downloadResumePDF() {
    const name = document.getElementById('resume-name')?.value?.trim() || 'resume';
    const originalTitle = document.title;
    
    // Set system print filename via document title
    document.title = `${name.replace(/\s+/g, '_')}_resume`;
    
    window.print();
    
    // Restore original document title
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  }

  // ══════════════════════════════════════════════════════
  // TOAST
  // ══════════════════════════════════════════════════════
  function toast(msg, icon = 'ℹ️', duration = 3500) {
    const t = document.createElement('div');
    const cls = icon === '✅' || icon === '📋' ? 'success' : icon === '❌' ? 'error' : '';
    t.className = 'toast ' + cls;
    t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; setTimeout(() => t.remove(), 300); }, duration);
  }

  // ══════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════
  function showResult(id, text) { const el = document.getElementById(id + '-result'); if (el) el.classList.add('show'); const t = document.getElementById(id + '-result-text'); if (t && text) t.textContent = text; }
  function setProgress(id, pct, label) { const w = document.getElementById(id + '-progress'); const f = document.getElementById(id + '-fill'); if (w) w.classList.add('show'); if (f) f.style.width = pct + '%'; if (label) { const l = document.getElementById(id + '-plab'); if (l) l.textContent = label; } }
  function selectOpt(el, scope) { document.querySelectorAll(scope).forEach(c => c.classList.remove('selected')); el.classList.add('selected'); }

  function parseRangeToIndices(str, total) {
    const out = [];
    str.split(',').forEach(part => {
      part = part.trim();
      if (part.includes('-')) { const [a, b] = part.split('-').map(n => parseInt(n.trim())); for (let i = a; i <= Math.min(b, total); i++)if (i >= 1) out.push(i - 1); }
      else { const n = parseInt(part); if (n >= 1 && n <= total) out.push(n - 1); }
    });
    return [...new Set(out)].sort((a, b) => a - b);
  }

  function hexToRgb(hex) { const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255; return { r, g, b }; }
  function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }
  function blobToDataURL(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsDataURL(blob); }); }
  function escapeHtml(str = '') { return String(str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }


  function getPageAnchor(width, height, pos, textWidth, fontSize = 12, margin = 20) {
    let x = width / 2 - textWidth / 2;
    let y = margin;
    if (pos.includes('top')) y = height - fontSize - margin;
    if (pos.includes('right')) x = width - textWidth - margin;
    else if (pos.includes('left')) x = margin;
    return { x, y };
  }
  function getStandardFontKey(name = 'Helvetica') {
    const map = {
      Helvetica: PDFLib.StandardFonts.Helvetica,
      'Helvetica-Bold': PDFLib.StandardFonts.HelveticaBold,
      TimesRoman: PDFLib.StandardFonts.TimesRoman,
      CourierBold: PDFLib.StandardFonts.CourierBold
    };
    return map[name] || PDFLib.StandardFonts.Helvetica;
  }

  function getPreviewRenderScale(baseScale = 1, mode = 'default') {
    const dpr = window.devicePixelRatio || 1;
    const isMobile = window.innerWidth <= 768;
    const caps = {
      default: isMobile ? 2 : 2.4,
      text: isMobile ? 2.2 : 3
    };
    const boosts = {
      default: 1,
      text: isMobile ? 1.15 : 1.35
    };
    const quality = Math.max(1, Math.min(dpr * (boosts[mode] || boosts.default), caps[mode] || caps.default));
    return baseScale * quality;
  }

  function getPanelIdForTool(tool) {
    return tool;
  }

  function ensureToolPreviewContainer(tool, label = 'Preview') {
    const panelId = getPanelIdForTool(tool);
    const panel = document.getElementById(`panel-${panelId}`);
    if (!panel) return {};
    let wrap = document.getElementById(`${tool}-preview-wrap`);
    let box = document.getElementById(`${tool}-preview-box`);
    if (!wrap || !box) {
      const dropzone = panel.querySelector('.dropzone');
      if (!dropzone) return {};
      wrap = document.createElement('div');
      wrap.id = `${tool}-preview-wrap`;
      wrap.style.display = 'none';
      wrap.style.marginTop = '1.5rem';
      wrap.innerHTML = `<label class="form-label">${label}</label><div class="pdf-preview-box preview-extended" id="${tool}-preview-box"></div>`;
      dropzone.insertAdjacentElement('afterend', wrap);
      box = document.getElementById(`${tool}-preview-box`);
    }
    return { wrap, box };
  }

  function openInDevice(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
  }

  async function renderToolPdfPreview(tool, file) {
    const { wrap, box } = ensureToolPreviewContainer(tool);
    if (!wrap || !box) return;
    wrap.style.display = 'block';

    const sizeStr = (file.size / 1024 / 1024).toFixed(2) + ' MB';
    box.innerHTML = `
    <div class="file-card-minimal">
      <div class="fcm-icon">📄</div>
      <div class="fcm-info">
        <div class="fcm-name">${file.name}</div>
        <div class="fcm-size">${sizeStr} • PDF Document</div>
      </div>
      <div class="fcm-actions">
        <button class="btn btn-secondary btn-sm" onclick="openInDevice(state['${tool}File'] || state['${tool}InputFile'])">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
          Open in Device
        </button>
      </div>
    </div>
  `;
  }

  async function renderPdfPreviewIntoBox(box, file, maxPages = 10, scale = 0.9, qualityMode = 'text') {
    if (!box) return;
    box.innerHTML = '<div style="padding:2rem;text-align:center;opacity:0.6">Loading preview...</div>';
    const url = URL.createObjectURL(file);
    try {
      const pdf = await pdfjsLib.getDocument(url).promise;
      const pages = Math.min(pdf.numPages, maxPages);
      for (let i = 1; i <= pages; i++) {
        const page = await pdf.getPage(i);
        const renderScale = getPreviewRenderScale(scale, qualityMode);
        const viewport = page.getViewport({ scale: renderScale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = 'min(100%, 760px)';
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        box.appendChild(canvas);
      }
      if (box.firstChild && box.firstChild.textContent === 'Loading preview...') box.firstChild.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      box.innerHTML = `<div style="padding:1rem;color:var(--red)">Preview load failed: ${e.message}</div>`;
    }
  }

  async function renderToolPdfPreview(tool, file, maxPages = 10) {
    const { wrap, box } = ensureToolPreviewContainer(tool);
    if (!wrap || !box) return;
    wrap.style.display = 'block';
    await renderPdfPreviewIntoBox(box, file, maxPages, 0.9, 'text');
  }

  // ══════════════════════════════════════════════════════
  // DRAG & DROP INIT
  // ══════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    initMobileSidebarSections();
    document.querySelectorAll('.dropzone').forEach(zone => {
      zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
      zone.addEventListener('drop', e => {
        e.preventDefault(); zone.classList.remove('drag-over');
        const input = zone.querySelector('input[type=file]');
        if (input && e.dataTransfer.files.length) {
          const dt = new DataTransfer();
          for (const f of e.dataTransfer.files) dt.items.add(f);
          input.files = dt.files;
          input.dispatchEvent(new Event('change'));
        }
      });
    });
    initSignCanvas();
    showPanel('home');
    toast('JustPDFCraft ready hai! 🎉', '🚀', 2500);
  });

  // ══════════════════════════════════════════════════════
  // SINGLE FILE HANDLER
  // ══════════════════════════════════════════════════════
  async function handleSingleFile(input, tool) {
    const file = input.files[0]; if (!file) return;
    state[tool + 'File'] = file;
    const fileAliases = {
      watermarkFile: 'watermarkFile',
      pdf2imgFile: 'pdf2imgFile'
    };
    if (tool === 'watermark') {
      state.wmFile = file;
      state.watermarkFile = file;
    }
    const opts = document.getElementById(TOOL_CONFIG[tool]?.optionsId || tool + '-options');
    if (opts) opts.style.display = 'block';
    if (tool !== 'watermark' && tool !== 'sign') {
      await renderToolPdfPreview(tool, file);
    }
    if (tool === 'sign') {
      await initSignPreview(file);
    }
    if (tool === 'split') {
      const ab = await readAB(file);
      const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
      renderPageGrid('split-page-grid', pdf.numPages, toggleSplitPage);
    }
    // show result banners hide
    const results = document.querySelectorAll('#panel-' + tool + ' .result-banner');
    results.forEach(r => r.classList.remove('show'));

    const needsCount = ['split', 'rotate', 'watermark', 'duplicate', 'protect', 'unlock', 'sign', 'pdf2img'];
    if (needsCount.includes(tool)) {
      try {
        const ab = await readAB(file);
        const pdf = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
        const count = pdf.getPageCount();
        if (tool === 'split') { state.splitPages = count; renderSplitPageGrid(count); document.getElementById('split-range-val').placeholder = '1-' + Math.ceil(count / 2) + ',' + (Math.ceil(count / 2) + 1) + '-' + count; }
        if (tool === 'pdf2img') state.pdf2imgTotal = count;
        if (tool === 'watermark') {
          await initWatermarkPreview(file);
        }
        if (tool === 'duplicate') {
          const pageField = document.getElementById('duplicate-page');
          if (pageField) {
            pageField.max = count;
            pageField.value = Math.min(parseInt(pageField.value) || 1, count);
          }
          const insertField = document.getElementById('duplicate-after');
          if (insertField) {
            insertField.max = count;
            insertField.value = Math.min(parseInt(insertField.value) || count, count);
          }
        }
        if (tool === 'sign') {
          const pageField = document.getElementById('sign-page');
          if (pageField) {
            pageField.max = count;
            pageField.value = Math.min(parseInt(pageField.value) || 1, count);
          }
        }
        toast(`Loaded: ${count} pages`, `📄`);
      } catch (e) { toast('PDF load error: ' + e.message, '❌'); }
    }
    if (tool === 'compress') {
      document.getElementById('compress-stats').innerHTML = `
      <div class="stat-card"><div class="st-val">${fmtSize(file.size)}</div><div class="st-label">Original Size</div></div>
      <div class="stat-card"><div class="st-val">—</div><div class="st-label">After Compression</div></div>
      <div class="stat-card"><div class="st-val">—</div><div class="st-label">Space Saved</div></div>`;
    }
    if (tool === 'metaedit') {
      await loadMetadataEditor(file);
    }
  }

  // ══════════════════════════════════════════════════════
  // PAGE GRID HELPERS
  // ══════════════════════════════════════════════════════
  function renderPageGrid(gridId, count, clickFn) {
    const g = document.getElementById(gridId); if (!g) return;
    g.innerHTML = '';
    for (let i = 1; i <= count; i++) {
      const d = document.createElement('div');
      d.className = 'page-thumb';
      d.id = gridId + '-p' + i;
      d.innerHTML = `<span>📄</span><span class="pg-num">${i}</span>`;
      d.onclick = () => clickFn(i, d);
      g.appendChild(d);
    }
  }

  // ══════════════════════════════════════════════════════
  // MERGE
  // ══════════════════════════════════════════════════════
  function handleMergeFiles(files) {
    if (!files || files.length === 0) return;
    for (const f of files) {
      if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
        state.mergeFiles.push(f);
      }
    }
    // Clear input so same file can be selected again
    const input = document.getElementById('merge-input');
    if (input) input.value = '';

    renderMergeList();
    if (state.mergeFiles.length > 0) {
      setTimeout(() => {
        renderToolPdfPreview('merge', state.mergeFiles[state.mergeFiles.length - 1], 5);
      }, 50);
    }
  }
  function renderMergeList() {
    const list = document.getElementById('merge-list');
    list.innerHTML = '';
    state.mergeFiles.forEach((f, i) => {
      const item = document.createElement('div');
      item.className = 'file-item draggable-file';
      item.draggable = true;
      item.innerHTML = `
      <div class="file-icon" style="cursor:grab;font-size:0.9rem;opacity:0.6">☰</div>
      <div class="file-info"><div class="file-name">${f.name}</div><div class="file-size">${fmtSize(f.size)}</div></div>
      <div class="file-actions">
        <button class="btn btn-secondary btn-sm" onclick="moveMerge(${i},-1)" ${i === 0 ? 'disabled' : ''}>▲</button>
        <button class="btn btn-secondary btn-sm" onclick="moveMerge(${i},1)" ${i === state.mergeFiles.length - 1 ? 'disabled' : ''}>▼</button>
        <button class="btn btn-danger btn-sm" onclick="state.mergeFiles.splice(${i}, 1);renderMergeList()">✕</button>
      </div>`;

      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', i);
        item.classList.add('dragging');
      });
      item.addEventListener('dragend', () => item.classList.remove('dragging'));
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        item.classList.add('drag-target');
      });
      item.addEventListener('dragleave', () => item.classList.remove('drag-target'));
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-target');
        const from = parseInt(e.dataTransfer.getData('text/plain'));
        if (from !== i) {
          const temp = state.mergeFiles[from];
          state.mergeFiles.splice(from, 1);
          state.mergeFiles.splice(i, 0, temp);
          renderMergeList();
        }
      });
      list.appendChild(item);
    });
  }
  function moveMerge(i, dir) {
    const j = i + dir; if (j < 0 || j >= state.mergeFiles.length) return;
    [state.mergeFiles[i], state.mergeFiles[j]] = [state.mergeFiles[j], state.mergeFiles[i]];
    renderMergeList();
  }
  async function mergePDFs() {
    if (state.mergeFiles.length < 2) { toast('Kam se kam 2 PDF files chahiye!', '⚠️'); return; }
    showLoading('Merging PDFs...');
    setProgress('merge', 10, 'Loading files...');
    try {
      const merged = await PDFLib.PDFDocument.create();

      // Parallelize file reading and loading
      const pdfDocs = await Promise.all(state.mergeFiles.map(async (file, i) => {
        const ab = await readAB(file);
        const pdf = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
        setProgress('merge', 10 + (40 * (i + 1) / state.mergeFiles.length), `Loaded ${i + 1}/${state.mergeFiles.length}...`);
        return pdf;
      }));

      // Sequential copying (required by PDF-Lib for stability)
      for (let i = 0; i < pdfDocs.length; i++) {
        const pdf = pdfDocs[i];
        const pages = await merged.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(p => merged.addPage(p));
        setProgress('merge', 50 + (40 * (i + 1) / pdfDocs.length), `Merging ${i + 1}/${pdfDocs.length}...`);
      }

      setProgress('merge', 95, 'Saving...');
      const bytes = await merged.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      state.resultBlobs.merge = blob;
      document.getElementById('merge-download').onclick = () => dlBlob(blob, 'merged.pdf');
      showResult('merge', `${state.mergeFiles.length} files merged • ${fmtSize(blob.size)}`);
      setProgress('merge', 100);
      toast('Merge complete!', '✅');
      saveActivity('merge', `${state.mergeFiles.length} files combined`);
    } catch (e) { toast('Error: ' + e.message, '❌'); }
    finally { hideLoading(); }
  }

  // ══════════════════════════════════════════════════════
  // SPLIT
  // ══════════════════════════════════════════════════════
  function selectSplitMethod(m) {
    state.splitMethod = m;
    document.querySelectorAll('#panel-split .option-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('split-' + m).classList.add('selected');
    document.getElementById('split-range-input').style.display = m === 'range' ? 'block' : 'none';
    document.getElementById('split-page-select').style.display = m === 'select' ? 'block' : 'none';
  }
  function renderSplitPageGrid(count) {
    renderPageGrid('split-page-grid', count, (n, el) => {
      el.classList.toggle('selected');
      const idx = state.splitSelected.indexOf(n);
      if (idx >= 0) state.splitSelected.splice(idx, 1); else state.splitSelected.push(n);
    });
  }
  async function splitPDF() {
    if (!state.splitFile) { toast('Pehle PDF upload karo!', '⚠️'); return; }
    showLoading('Splitting PDF...');
    try {
      const ab = await readAB(state.splitFile);
      const pdf = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
      const total = pdf.getPageCount();
      const zip = new JSZip(); let pages = [];
      if (state.splitMethod === 'all') { pages = Array.from({ length: total }, (_, i) => [i]); }
      else if (state.splitMethod === 'range') {
        const rangeStr = document.getElementById('split-range-val').value;
        const ranges = rangeStr.split(',').map(r => r.trim());
        for (const r of ranges) {
          if (r.includes('-')) { const [a, b] = r.split('-').map(n => parseInt(n.trim()) - 1); const pg = []; for (let i = a; i <= Math.min(b, total - 1); i++)pg.push(i); if (pg.length) pages.push(pg); }
          else { const n = parseInt(r) - 1; if (n >= 0 && n < total) pages.push([n]); }
        }
      } else { pages = state.splitSelected.sort((a, b) => a - b).map(n => [n - 1]); }

      for (let i = 0; i < pages.length; i++) {
        const nd = await PDFLib.PDFDocument.create();
        const cp = await nd.copyPages(pdf, pages[i]);
        cp.forEach(p => nd.addPage(p));
        const b = await nd.save();
        zip.file(`page_${pages[i].map(p => p + 1).join('-')}.pdf`, b);
        if (i % 5 === 0) setProgress('split', (i / pages.length) * 100);
      }
      const zblob = await zip.generateAsync({ type: 'blob' });
      document.getElementById('split-download').onclick = () => dlBlob(zblob, 'split_pages.zip');
      document.getElementById('split-result-text').textContent = `${pages.length} PDF files created`;
      showResult('split');
      toast('Split complete!', '✅');
      saveActivity('split', `Split into ${pages.length} files`);
    } catch (e) { toast('Error: ' + e.message, '❌'); }
    finally { hideLoading(); }
  }

  // ══════════════════════════════════════════════════════
  // COMPRESS
  // ══════════════════════════════════════════════════════
  async function compressPDF() {
    if (!state.compressFile) { toast('Pehle PDF upload karo!', '⚠️'); return; }
    showLoading('Compressing PDF...');
    setProgress('compress', 20);
    try {
      const ab = await readAB(state.compressFile);
      setProgress('compress', 50);
      const pdf = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
      const removeMeta = document.getElementById('compress-meta').checked;
      if (removeMeta) { pdf.setTitle(''); pdf.setAuthor(''); pdf.setSubject(''); pdf.setKeywords([]); pdf.setProducer('JustPDFCraft'); pdf.setCreator('JustPDFCraft'); }
      setProgress('compress', 80);
      const comp = await pdf.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 50 });
      const blob = new Blob([comp], { type: 'application/pdf' });
      const orig = state.compressFile.size, nw = blob.size;
      const savings = Math.round((1 - nw / orig) * 100);
      document.getElementById('compress-stats').innerHTML = `
      <div class="stat-card"><div class="st-val">${fmtSize(orig)}</div><div class="st-label">Original Size</div></div>
      <div class="stat-card"><div class="st-val">${fmtSize(nw)}</div><div class="st-label">Compressed Size</div></div>
      <div class="stat-card"><div class="st-val" style="color:var(--accent3)">${savings > 0 ? savings + '% saved' : 'Similar size'}</div><div class="st-label">Space Saved</div></div>`;
      document.getElementById('compress-download').onclick = () => dlBlob(blob, 'compressed.pdf');
      showResult('compress', `${fmtSize(orig)} → ${fmtSize(nw)} (${savings}% smaller)`);
      setProgress('compress', 100);
      toast('Compression complete!', '✅');
      saveActivity('compress', `${fmtSize(orig)} → ${fmtSize(nw)}`);
    } catch (e) { toast('Error: ' + e.message, '❌'); }
    finally { hideLoading(); }
}

// ══════════════════════════════════════════════════════
// ROTATE
// ══════════════════════════════════════════════════════
document.addEventListener('change', e => { if (e.target.id === 'rotate-pages') { document.getElementById('rotate-custom').style.display = e.target.value === 'custom' ? 'block' : 'none'; } });
async function rotatePDF() {
  if (!state.rotateFile) { toast('Pehle PDF upload karo!', '⚠️'); return; }
  showLoading('Rotating pages...');
  try {
    const ab = await readAB(state.rotateFile);
    const pdf = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
    const total = pdf.getPageCount();
    const pages = pdf.getPages();
    const applyTo = document.getElementById('rotate-pages').value;
    const angle = state.rotateAngle;
    let indices = [];
    if (applyTo === 'all') indices = Array.from({ length: total }, (_, i) => i);
    else if (applyTo === 'odd') indices = Array.from({ length: total }, (_, i) => i).filter(i => i % 2 === 0);
    else if (applyTo === 'even') indices = Array.from({ length: total }, (_, i) => i).filter(i => i % 2 === 1);
    else if (applyTo === 'first') indices = [0];
    else if (applyTo === 'last') indices = [total - 1];
    else { const rangeStr = document.getElementById('rotate-custom').value; indices = parseRangeToIndices(rangeStr, total); }
    indices.forEach(i => {
      const cur = pages[i].getRotation().angle;
      pages[i].setRotation(PDFLib.degrees((cur + angle) % 360));
    });
    const bytes = await pdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    document.getElementById('rotate-download').onclick = () => dlBlob(blob, 'rotated.pdf');
    showResult('rotate');
    toast(`${ indices.length } pages rotated ${ angle }°!`, '✅');
    saveActivity('rotate', `${ indices.length } pages rotated`);
  } catch (e) { toast('Error: ' + e.message, '❌'); }
  finally { hideLoading(); }
}

// ══════════════════════════════════════════════════════
// WATERMARK
// ══════════════════════════════════════════════════════
async function initWatermarkPreview(file) {
  try {
    const ab = await readAB(file);
    state.wmPreviewDoc = await pdfjsLib.getDocument({ data: ab }).promise;
    state.wmPreviewTotal = state.wmPreviewDoc.numPages;
    state.wmPreviewPageNum = 1;
    state.wmPreviewPage = await state.wmPreviewDoc.getPage(1);
    document.getElementById('wm-preview-total').textContent = state.wmPreviewTotal;
    document.getElementById('wm-preview-cur').textContent = state.wmPreviewPageNum;
    document.getElementById('wm-preview-wrap').style.display = 'block';
    bindWatermarkPreviewControls();
    await renderWatermarkPreviewBase();
    renderWatermarkOverlay();
  } catch (e) {
    toast('Preview load error: ' + e.message, 'âŒ');
  }
}

let wmPreviewBound = false;
function bindWatermarkPreviewControls() {
  if (wmPreviewBound) return;
  wmPreviewBound = true;
  ['wm-text', 'wm-size', 'wm-opacity', 'wm-rot', 'wm-color', 'wm-position'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => renderWatermarkOverlay());
    el.addEventListener('change', () => renderWatermarkOverlay());
  });
  const stage = document.getElementById('wm-stage');
  const updatePos = e => {
    const canvas = document.getElementById('wm-preview-canvas');
    if (!canvas.width || !canvas.height) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    state.wmCustomPos = { x: clamp(x, 0, 1), y: clamp(y, 0, 1) };
    const posField = document.getElementById('wm-position');
    if (posField) posField.value = 'custom';
    if (state.wmDragFrame) cancelAnimationFrame(state.wmDragFrame);
    state.wmDragFrame = requestAnimationFrame(() => {
      renderWatermarkOverlay();
      state.wmDragFrame = 0;
    });
  };
  stage.addEventListener('mousedown', e => {
    state.wmDragging = true;
    updatePos(e);
  });
  window.addEventListener('mousemove', e => {
    if (!state.wmDragging) return;
    updatePos(e);
  });
  window.addEventListener('mouseup', () => {
    state.wmDragging = false;
  });
  stage.addEventListener('click', updatePos);
}

function getWatermarkPreviewPlacement(position, width, height, textWidth) {
  if (position === 'top') return { x: width / 2, y: 70 };
  if (position === 'bottom') return { x: width / 2, y: height - 55 };
  if (position === 'topleft') return { x: Math.max(40, textWidth / 2 + 20), y: 60 };
  if (position === 'topright') return { x: width - Math.max(40, textWidth / 2 + 20), y: 60 };
  if (position === 'custom') return { x: width * state.wmCustomPos.x, y: height * state.wmCustomPos.y };
  return { x: width / 2, y: height / 2 };
}

async function setWatermarkPreviewPage(pageNum) {
  if (!state.wmPreviewDoc) return;
  state.wmPreviewPageNum = clamp(pageNum, 1, state.wmPreviewTotal);
  state.wmPreviewPage = await state.wmPreviewDoc.getPage(state.wmPreviewPageNum);
  document.getElementById('wm-preview-cur').textContent = state.wmPreviewPageNum;
  await renderWatermarkPreviewBase();
  renderWatermarkOverlay();
}

function prevWatermarkPreviewPage() {
  if (state.wmPreviewPageNum > 1) setWatermarkPreviewPage(state.wmPreviewPageNum - 1);
}

function nextWatermarkPreviewPage() {
  if (state.wmPreviewPageNum < state.wmPreviewTotal) setWatermarkPreviewPage(state.wmPreviewPageNum + 1);
}

async function renderWatermarkPreviewBase() {
  if (!state.wmPreviewPage) return;
  const viewport = state.wmPreviewPage.getViewport({ scale: getPreviewRenderScale(1.15, 'text') });
  const canvas = document.getElementById('wm-preview-canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await state.wmPreviewPage.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
}

function setWatermarkType(type) {
  state.wmType = type;
  document.getElementById('wm-type-text').classList.toggle('active', type === 'text');
  document.getElementById('wm-type-image').classList.toggle('active', type === 'image');
  document.getElementById('wm-text-group').style.display = type === 'text' ? 'block' : 'none';
  document.getElementById('wm-image-group').style.display = type === 'image' ? 'block' : 'none';
  renderWatermarkOverlay();
}

async function handleWatermarkImage(input) {
  const file = input.files[0];
  if (!file) return;
  state.wmImage = await loadImageFromFile(file);
  renderWatermarkOverlay();
}

function renderWatermarkOverlay() {
  const canvas = document.getElementById('wm-preview-canvas');
  const overlayText = document.getElementById('wm-overlay-text');
  const overlayImg = document.getElementById('wm-overlay-image');
  if (!canvas || !canvas.width || !canvas.height) return;

  const size = parseInt(document.getElementById('wm-size').value) || 60;
  const opacity = (parseInt(document.getElementById('wm-opacity').value) || 30) / 100;
  const rot = parseInt(document.getElementById('wm-rot').value) || 45;
  const position = document.getElementById('wm-position').value;

  if (state.wmType === 'text') {
    overlayImg.style.display = 'none';
    overlayText.style.display = 'block';
    const text = document.getElementById('wm-text').value || 'WATERMARK';
    const color = document.getElementById('wm-color').value;
    const previewSize = Math.max(18, size * 0.42);
    overlayText.textContent = text;
    overlayText.style.fontSize = `${ previewSize } px`;
    overlayText.style.color = color;
    overlayText.style.opacity = String(opacity);
    const estimatedWidth = Math.max(text.length * previewSize * 0.58, 60);
    const point = getWatermarkPreviewPlacement(position, canvas.width, canvas.height, estimatedWidth);
    overlayText.style.left = `${ point.x } px`;
    overlayText.style.top = `${ point.y } px`;
    overlayText.style.transform = `translate(-50 %, -50 %) rotate(${ rot }deg)`;
  } else {
    overlayText.style.display = 'none';
    if (state.wmImage) {
      overlayImg.style.display = 'block';
      overlayImg.src = state.wmImage.src;
      overlayImg.style.opacity = String(opacity);
      const previewW = (state.wmImage.width * size / 100) * 0.42;
      overlayImg.style.width = `${ previewW } px`;
      const point = getWatermarkPreviewPlacement(position, canvas.width, canvas.height, previewW);
      overlayImg.style.left = `${ point.x } px`;
      overlayImg.style.top = `${ point.y } px`;
      overlayImg.style.transform = `translate(-50 %, -50 %) rotate(${ rot }deg)`;
    } else {
      overlayImg.style.display = 'none';
    }
  }

  const note = document.getElementById('wm-preview-note');
  if (note) {
    note.textContent = position === 'custom'
      ? `Custom placement set: ${ Math.round(state.wmCustomPos.x * 100) }% x, ${ Math.round(state.wmCustomPos.y * 100) }% y`
      : 'Preview first page dikhata hai. Click location se watermark ka placement set hoga.';
  }
}

async function watermarkPDF() {
  if (!state.watermarkFile) { toast('Pehle PDF upload karo!', '⚠️'); return; }
  showLoading('Adding Watermark...');
  try {
    const ab = await readAB(state.watermarkFile);
    const pdf = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
    
    const size = parseInt(document.getElementById('wm-size').value) || 60;
    const opacity = parseInt(document.getElementById('wm-opacity').value) / 100;
    const rotDeg = parseInt(document.getElementById('wm-rot').value) || 45;
    const position = document.getElementById('wm-position').value;
    const applyTo = document.getElementById('wm-pages').value;
    const pages = pdf.getPages();
    const total = pages.length;

    let wmImageEmbed = null;
    if (state.wmType === 'image') {
      if (!state.wmImage) { toast('Pehle watermark image upload karo!', '⚠️'); return; }
      const imgAb = await fetch(state.wmImage.src).then(r => r.arrayBuffer());
      wmImageEmbed = state.wmImage.src.includes('png') ? await pdf.embedPng(imgAb) : await pdf.embedJpg(imgAb);
    }

    const font = await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
    const wmText = document.getElementById('wm-text').value || 'WATERMARK';
    const colorHex = document.getElementById('wm-color').value;
    const { r, g, b } = hexToRgb(colorHex);

    let indices = Array.from({ length: total }, (_, i) => i);
    if (applyTo === 'first') indices = [0];
    else if (applyTo === 'odd') indices = indices.filter(i => i % 2 === 0);
    else if (applyTo === 'even') indices = indices.filter(i => i % 2 === 1);

    for (const i of indices) {
      const pg = pages[i];
      const { width, height } = pg.getSize();
      
      let x, y, tw, th;
      if (state.wmType === 'text') {
        tw = font.widthOfTextAtSize(wmText, size);
        th = size;
      } else {
        const scale = size / 100;
        tw = wmImageEmbed.width * scale;
        th = wmImageEmbed.height * scale;
      }

      if (position === 'center') { x = width / 2 - tw / 2; y = height / 2 - th / 2; }
      else if (position === 'top') { x = width / 2 - tw / 2; y = height - th - 60; }
      else if (position === 'bottom') { x = width / 2 - tw / 2; y = 60; }
      else if (position === 'topleft') { x = 30; y = height - th - 30; }
      else if (position === 'topright') { x = width - tw - 30; y = height - th - 30; }
      else if (position === 'custom') { x = width * state.wmCustomPos.x - tw / 2; y = height * (1 - state.wmCustomPos.y) - th / 2; }

      if (state.wmType === 'text') {
        pg.drawText(wmText, { x, y, size, font, color: PDFLib.rgb(r, g, b), opacity, rotate: PDFLib.degrees(rotDeg) });
      } else {
        pg.drawImage(wmImageEmbed, { x, y, width: tw, height: th, opacity, rotate: PDFLib.degrees(rotDeg) });
      }
    }

    const bytes = await pdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    document.getElementById('watermark-download').onclick = () => dlBlob(blob, 'watermarked.pdf');
    showResult('watermark');
    toast('Watermark added!', '✅');
  } catch (e) { toast('Error: ' + e.message, '❌'); }
  finally { hideLoading(); }
}

async function imageToPDF() {
  if (state.img2pdfFiles.length === 0) { toast('Pehle images upload karo!', '⚠️'); return; }
  showLoading('Creating PDF from images...');
  try {
    const pdf = await PDFLib.PDFDocument.create();
    const sizeDefs = { A4: [595, 842], Letter: [612, 792], A3: [842, 1191], A5: [420, 595] };
    const sizeKey = document.getElementById('img2pdf-size').value;
    const orient = document.getElementById('img2pdf-orient').value;
    const margin = parseInt(document.getElementById('img2pdf-margin').value) || 20;
    const fit = document.getElementById('img2pdf-fit').value;
    
    const embedTasks = state.img2pdfFiles.map(async (f, i) => {
      const dataURL = await readURL(f);
      const img = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = dataURL; });
      let pdfImg;
      if (f.type === 'image/jpeg') pdfImg = await pdf.embedJpg(await readAB(f));
      else {
        const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        const pngData = await fetch(canvas.toDataURL('image/png')).then(r => r.arrayBuffer());
        pdfImg = await pdf.embedPng(pngData);
      }
      setProgress('img2pdf', (i / state.img2pdfFiles.length) * 50);
      return { pdfImg, img };
    });

    const embeddedImages = await Promise.all(embedTasks);

    for (let i = 0; i < embeddedImages.length; i++) {
      const { pdfImg, img } = embeddedImages[i];
      let pw, ph;
      if (sizeKey === 'auto') { pw = img.width; ph = img.height; }
      else { [pw, ph] = sizeDefs[sizeKey] || [595, 842]; if (orient === 'landscape') [pw, ph] = [ph, pw]; }
      const page = pdf.addPage([pw, ph]);
      const avW = pw - 2 * margin, avH = ph - 2 * margin;
      let dw = pdfImg.width, dh = pdfImg.height;
      if (fit === 'fit') { const sc = Math.min(avW / dw, avH / dh); dw *= sc; dh *= sc; }
      else if (fit === 'stretch') { dw = avW; dh = avH; }
      const x = margin + (avW - dw) / 2, y = margin + (avH - dh) / 2;
      page.drawImage(pdfImg, { x, y, width: dw, height: dh });
      setProgress('img2pdf', 50 + (i / embeddedImages.length) * 50);
    }
    const bytes = await pdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    document.getElementById('img2pdf-download').onclick = () => dlBlob(blob, 'images.pdf');
    showResult('img2pdf', `${ state.img2pdfFiles.length } image(s) → ${ fmtSize(blob.size) } PDF`);
    toast('PDF created!', '✅');
    saveActivity('img2pdf', `${ state.img2pdfFiles.length } images converted`);
  } catch (e) { toast('Error: ' + e.message, '❌'); }
  finally { hideLoading(); }
}

// ══════════════════════════════════════════════════════
// PDF TO IMAGE
// ══════════════════════════════════════════════════════
async function pdfToImages() {
  if (!state.pdf2imgFile) { toast('Pehle PDF upload karo!', '⚠️'); return; }
  showLoading('Converting PDF to Images...');
  const prog = document.getElementById('pdf2img-progress'); prog.style.display = 'block';
  const fill = document.getElementById('pdf2img-fill');
  const fmt = document.getElementById('pdf2img-format').value;
  const scale = parseFloat(document.getElementById('pdf2img-scale').value) || 2;
  const pagesOpt = document.getElementById('pdf2img-pages').value;
  try {
    const ab = await readAB(state.pdf2imgFile);
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    const total = pdf.numPages;
    state.pdf2imgCanvases = [];
    let pageNums = [];
    if (pagesOpt === 'first') pageNums = [1];
    else if (pagesOpt === 'last') pageNums = [total];
    else pageNums = Array.from({ length: total }, (_, i) => i + 1);
    const area = document.getElementById('pdf2img-canvas-area'); area.innerHTML = '';
    const batchSize = 3;
    for (let i = 0; i < pageNums.length; i += batchSize) {
      const batch = pageNums.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(async (pageNum) => {
        const page = await pdf.getPage(pageNum);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width; canvas.height = vp.height;
        canvas.style.maxWidth = '300px'; canvas.style.height = 'auto';
        canvas.style.borderRadius = '6px'; canvas.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        return { canvas, page: pageNum, fmt };
      }));

      batchResults.forEach(res => {
        area.appendChild(res.canvas);
        state.pdf2imgCanvases.push(res);
      });
      fill.style.width = (Math.min(i + batchSize, pageNums.length) / pageNums.length * 100) + '%';
    }
    prog.style.display = 'none';
    document.getElementById('pdf2img-preview').style.display = 'block';
    toast(`${ pageNums.length } pages converted!`, '✅');
    saveActivity('pdf2img', `${ pageNums.length } pages converted`);
  } catch (e) { prog.style.display = 'none'; toast('Error: ' + e.message, '❌'); }
  finally { hideLoading(); }
}
async function downloadAllImages() {
  if (state.pdf2imgCanvases.length === 0) { toast('Pehle convert karo!', '⚠️'); return; }
  const zip = new JSZip();
  toast('Creating ZIP...', '⏳');
  
  await Promise.all(state.pdf2imgCanvases.map(async ({ canvas, page, fmt }) => {
    const blob = await new Promise(res => canvas.toBlob(res, fmt === 'jpeg' ? 'image/jpeg' : 'image/png', 0.92));
    zip.file(`page_${ page }.${ fmt } `, blob);
  }));

  const zblob = await zip.generateAsync({ type: 'blob' });
  dlBlob(zblob, 'pdf_images.zip');
  toast('ZIP downloaded!', '✅');
}







function decodeXmlEntities(str = '') {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripXmlTags(xml = '') {
  return decodeXmlEntities(xml.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

async function readZipEntries(file) {
  const ab = await readAB(file);
  return JSZip.loadAsync(ab);
}


async function buildPdfFromSections(title, sections, filenameBase, resultId) {
  const sizes = { A4: [595, 842], Letter: [612, 792] };
  const [pw, ph] = sizes.A4;
  const margin = 42;
  const bodySize = 11;
  const headingSize = 16;
  const lineHeight = 16;
  const pdf = await PDFLib.PDFDocument.create();
  const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
  const bold = await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
  pdf.setTitle(title);
  let page = pdf.addPage([pw, ph]);
  let y = ph - margin;
  const usableW = pw - margin * 2;
  const pushLine = (text, size = bodySize, useBold = false) => {
    const activeFont = useBold ? bold : font;
    const words = (text || '').split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      y -= lineHeight;
      return;
    }
    let cur = '';
    for (const word of words) {
      const test = cur ? `${cur} ${word}` : word;
      if (activeFont.widthOfTextAtSize(test, size) > usableW && cur) {
        if (y < margin + size + 10) { page = pdf.addPage([pw, ph]); y = ph - margin; }
        page.drawText(cur, { x: margin, y, size, font: activeFont, color: PDFLib.rgb(0.1, 0.1, 0.12) });
        y -= lineHeight;
        cur = word;
      } else cur = test;
    }
    if (cur) {
      if (y < margin + size + 10) { page = pdf.addPage([pw, ph]); y = ph - margin; }
      page.drawText(cur, { x: margin, y, size, font: activeFont, color: PDFLib.rgb(0.1, 0.1, 0.12) });
      y -= lineHeight;
    }
  };
  pushLine(title, 18, true);
  y -= 4;
  sections.forEach(section => {
    if (y < margin + 40) { page = pdf.addPage([pw, ph]); y = ph - margin; }
    pushLine(section.title || 'Section', headingSize, true);
    (section.lines?.length ? section.lines : ['(No readable text found)']).forEach(line => pushLine(line, bodySize, false));
    y -= 8;
  });
  const bytes = await pdf.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  document.getElementById(`${resultId}-download`).onclick = () => dlBlob(blob, `${filenameBase}.pdf`);
  showResult(resultId, `${sections.length} section(s) • ${pdf.getPageCount()} page(s) • ${fmtSize(blob.size)}`);
  return blob;
}

async function extractDocxText(file) {
  const zip = await readZipEntries(file);
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) throw new Error('DOCX document.xml nahi mila');
  return docXml
    .split(/<\/w:p>/)
    .map(p => stripXmlTags(p.replace(/<w:tab\/>/g, '    ').replace(/<w:br\/>/g, '\n')))
    .filter(Boolean);
}

async function extractPptxSlides(file) {
  const zip = await readZipEntries(file);
  const slideFiles = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!slideFiles.length) throw new Error('PPTX slides nahi mile');
  const slides = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.file(slideFiles[i]).async('string');
    const lines = xml.split(/<\/a:p>/).map(part => stripXmlTags(part)).filter(Boolean);
    slides.push({ title: `Slide ${i + 1}`, lines });
  }
  return slides;
}

async function extractXlsxSheets(file) {
  if (file.name.toLowerCase().endsWith('.csv')) {
    const text = await file.text();
    const rows = text.split(/\r?\n/).filter(Boolean).map(line => line.split(',').map(cell => cell.trim()));
    return [{ name: 'Sheet1', rows }];
  }
  const zip = await readZipEntries(file);
  const sharedXml = await zip.file('xl/sharedStrings.xml')?.async('string');
  const sharedStrings = sharedXml ? [...sharedXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => decodeXmlEntities(m[1])) : [];
  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
  if (!workbookXml || !relsXml) throw new Error('XLSX workbook data nahi mila');
  const relMap = {};
  [...relsXml.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g)].forEach(m => { relMap[m[1]] = m[2]; });
  const sheets = [...workbookXml.matchAll(/<sheet[^>]+name="([^"]+)"[^>]+r:id="([^"]+)"/g)].map(m => ({ name: m[1], target: relMap[m[2]] }));
  const out = [];
  for (const sheet of sheets) {
    const path = `xl/${sheet.target.replace(/^\.\//, '')}`;
    const xml = await zip.file(path)?.async('string');
    if (!xml) continue;
    const rows = [];
    const rowMatches = [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)];
    rowMatches.forEach(rowMatch => {
      const rowCells = [];
      [...rowMatch[1].matchAll(/<c[^>]*?(?:t="([^"]+)")?[^>]*>([\s\S]*?)<\/c>/g)].forEach(cellMatch => {
        const type = cellMatch[1] || '';
        const cellXml = cellMatch[2];
        let value = '';
        if (type === 's') {
          const idx = parseInt((cellXml.match(/<v>(.*?)<\/v>/)?.[1] || '0'), 10);
          value = sharedStrings[idx] || '';
        } else if (type === 'inlineStr') {
          value = decodeXmlEntities((cellXml.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] || ''));
        } else {
          value = decodeXmlEntities((cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1] || ''));
        }
        rowCells.push(value);
      });
      if (rowCells.length) rows.push(rowCells);
    });
    out.push({ name: sheet.name, rows });
  }
  if (!out.length) throw new Error('Readable sheets nahi mili');
  return out;
}

// ── NEW: Document Conversion Callers ──────────────────

async function convertWordToPDF(input) {
  const file = input.files[0];
  if (!file) return;
  showLoading('Converting Word to PDF...');
  try {
    const lines = await extractDocxText(file);
    const sections = [{ title: 'Document Content', lines }];
    await buildPdfFromSections(file.name.replace('.docx', ''), sections, 'word_converted', 'word2pdf');
    toast('Word conversion successful!', '✅');
    saveActivity('convert', 'Word to PDF');
  } catch (e) {
    toast('Error: ' + e.message, '❌');
  } finally {
    hideLoading();
  }
}












async function initSignPreview(file) {
  try {
    const ab = await readAB(file);
    state.signPreviewDoc = await pdfjsLib.getDocument({ data: ab }).promise;
    state.signPreviewTotal = state.signPreviewDoc.numPages;
    state.signPreviewPageNum = Math.min(parseInt(document.getElementById('sign-page')?.value) || 1, state.signPreviewTotal);
    document.getElementById('sign-preview-total').textContent = state.signPreviewTotal;
    document.getElementById('sign-preview-wrap').style.display = 'block';
    bindSignPreviewControls();
    await setSignPreviewPage(state.signPreviewPageNum);
  } catch (e) {
    toast('Sign preview load error: ' + e.message, '❌');
  }
}


// ══════════════════════════════════════════════════════
// BLANK PDF
// ══════════════════════════════════════════════════════
async function generateBlank() {
  const count = Math.min(parseInt(document.getElementById('blank-pages').value) || 1, 500);
  const sizeKey = document.getElementById('blank-size').value;
  const orient = document.getElementById('blank-orient').value;
  const bgHex = document.getElementById('blank-color').value;
  const { r: br, g: bg, b: bb } = hexToRgb(bgHex);
  const lineType = document.getElementById('blank-lines').value;
  const sizes = { A4: [595, 842], Letter: [612, 792], A3: [842, 1191], A5: [420, 595], Legal: [612, 1008] };
  let [pw, ph] = sizes[sizeKey] || [595, 842];
  if (orient === 'landscape') [pw, ph] = [ph, pw];
  try {
    const pdf = await PDFLib.PDFDocument.create();
    for (let i = 0; i < count; i++) {
      const page = pdf.addPage([pw, ph]);
      if (bgHex !== '#ffffff') page.drawRectangle({ x: 0, y: 0, width: pw, height: ph, color: PDFLib.rgb(br, bg, bb) });
      if (lineType === 'ruled') {
        const lineGap = 28; const lColor = PDFLib.rgb(0.75, 0.8, 0.95);
        for (let y = ph - 72; y > 50; y -= lineGap)page.drawLine({ start: { x: 50, y }, end: { x: pw - 50, y }, thickness: 0.5, color: lColor });
      } else if (lineType === 'grid') {
        const gap = 28; const gc = PDFLib.rgb(0.8, 0.85, 0.95);
        for (let y = ph - 50; y > 50; y -= gap)page.drawLine({ start: { x: 30, y }, end: { x: pw - 30, y }, thickness: 0.4, color: gc });
        for (let x = 30; x < pw - 30; x += gap)page.drawLine({ start: { x, y: ph - 30 }, end: { x, y: 30 }, thickness: 0.4, color: gc });
      } else if (lineType === 'dotted') {
        const gap = 28; const dc = PDFLib.rgb(0.7, 0.7, 0.85);
        for (let y = ph - 50; y > 50; y -= gap)for (let x = 30; x < pw - 30; x += gap)page.drawCircle({ x, y, size: 1.2, color: dc });
      }
    }
    const bytes = await pdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    document.getElementById('blank-download').onclick = () => dlBlob(blob, `blank_${sizeKey}_${count}pages.pdf`);
    showResult('blank', `${count} page ${sizeKey} PDF (${lineType}) — ${fmtSize(blob.size)}`);
    toast('Blank PDF ready!', '✅');
  } catch (e) { toast('Error: ' + e.message, '❌'); }
}

// ══════════════════════════════════════════════════════
// PROTECT PDF
// ══════════════════════════════════════════════════════
async function protectPDF() {
  if (!state.protectFile) { toast('Pehle PDF upload karo!', '⚠️'); return; }
  const p1 = document.getElementById('protect-pass').value;
  const p2 = document.getElementById('protect-pass2').value;
  if (!p1) { toast('Password enter karo!', '⚠️'); return; }
  if (p1 !== p2) { toast('Passwords match nahi karte!', '⚠️'); return; }
  try {
    const ab = await readAB(state.protectFile);
    const pdf = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
    pdf.setTitle(`Protected Document`);
    pdf.setKeywords([p1]);
    const bytes = await pdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    document.getElementById('protect-download').onclick = () => dlBlob(blob, 'protected.pdf');
    showResult('protect');
    toast('PDF protected (metadata-level)!', '✅');
  } catch (e) { toast('Error: ' + e.message, '❌'); }
}

// ══════════════════════════════════════════════════════
// UNLOCK PDF
// ══════════════════════════════════════════════════════
async function unlockPDF() {
  if (!state.unlockFile) { toast('Pehle PDF upload karo!', '⚠️'); return; }
  const pass = document.getElementById('unlock-pass').value;
  try {
    const ab = await readAB(state.unlockFile);
    const pdf = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true, password: pass || undefined });
    const bytes = await pdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    document.getElementById('unlock-download').onclick = () => dlBlob(blob, 'unlocked.pdf');
    showResult('unlock');
    toast('PDF unlocked!', '✅');
  } catch (e) {
    if (e.message.includes('password') || e.message.includes('encrypt')) toast('Wrong password ya PDF nahi khul raha', '❌');
    else toast('Error: ' + e.message, '❌');
  }
}

// ══════════════════════════════════════════════════════
// SIGN PDF
// ══════════════════════════════════════════════════════
// signCtx is already declared at the top of the file

function initSignCanvas() {
  const canvas = document.getElementById('sign-canvas');
  if (!canvas) return;

  if (!signCtx) {
    signCtx = canvas.getContext('2d');
    if (!signCtx) return;
    signCtx.strokeStyle = '#1a1a2e';
    signCtx.fillStyle = '#1a1a2e';
    signCtx.lineWidth = 2.5;
    signCtx.lineCap = 'round';
    signCtx.lineJoin = 'round';
  }

  if (signListenersBound) return;
  signListenersBound = true;

  const getPos = (e, c) => {
    const rect = c.getBoundingClientRect();
    const cl = e.touches ? e.touches[0] : e;
    const rw = rect.width || c.width || 1;
    const rh = rect.height || c.height || 1;
    return {
      x: (cl.clientX - rect.left) * (c.width / rw),
      y: (cl.clientY - rect.top) * (c.height / rh)
    };
  };

  const start = (e) => {
    if (!signCtx) return;
    state.signDrawing = true;
    const p = getPos(e, canvas);
    state.signLastX = p.x;
    state.signLastY = p.y;
    // Draw a dot on click
    signCtx.beginPath();
    signCtx.arc(p.x, p.y, signCtx.lineWidth / 2, 0, Math.PI * 2);
    signCtx.fill();
  };

  const move = (e) => {
    if (!state.signDrawing || !signCtx) return;
    const p = getPos(e, canvas);
    signCtx.beginPath();
    signCtx.moveTo(state.signLastX, state.signLastY);
    signCtx.lineTo(p.x, p.y);
    signCtx.stroke();
    state.signLastX = p.x;
    state.signLastY = p.y;
  };

  const stop = () => { state.signDrawing = false; };

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', stop);
  canvas.addEventListener('mouseleave', stop);

  canvas.addEventListener('touchstart', e => {
    if (e.cancelable) e.preventDefault();
    start(e);
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    if (e.cancelable) e.preventDefault();
    move(e);
  }, { passive: false });
  canvas.addEventListener('touchend', stop);
}
function clearSignature() { if (signCtx) { const c = document.getElementById('sign-canvas'); signCtx.clearRect(0, 0, c.width, c.height); } }
function selectSignType(type, btn) {
  state.signType = type;
  document.querySelectorAll('#sign-options .tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('#sign-options .tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('sign-' + type + '-area').classList.add('active');
}
async function initSignPreview(file) {
  try {
    const ab = await readAB(file);
    state.signPreviewDoc = await pdfjsLib.getDocument({ data: ab }).promise;
    state.signPreviewTotal = state.signPreviewDoc.numPages;
    state.signPreviewPageNum = Math.min(parseInt(document.getElementById('sign-page')?.value) || 1, state.signPreviewTotal);
    document.getElementById('sign-preview-total').textContent = state.signPreviewTotal;
    document.getElementById('sign-preview-wrap').style.display = 'block';
    bindSignPreviewControls();
    await setSignPreviewPage(state.signPreviewPageNum);
  } catch (e) {
    toast('Sign preview load error: ' + e.message, 'âŒ');
  }
}


function bindSignPreviewControls() {
  if (signPreviewBound) return;
  signPreviewBound = true;
  const pageField = document.getElementById('sign-page');
  if (pageField) {
    pageField.addEventListener('change', () => setSignPreviewPage(parseInt(pageField.value) || 1));
    pageField.addEventListener('input', () => setSignPreviewPage(parseInt(pageField.value) || 1));
  }
}

async function setSignPreviewPage(pageNum) {
  if (!state.signPreviewDoc) return;
  state.signPreviewPageNum = clamp(pageNum, 1, state.signPreviewTotal);
  const pageField = document.getElementById('sign-page');
  if (pageField) pageField.value = state.signPreviewPageNum;
  document.getElementById('sign-preview-cur').textContent = state.signPreviewPageNum;
  state.signPreviewPage = await state.signPreviewDoc.getPage(state.signPreviewPageNum);
  const viewport = state.signPreviewPage.getViewport({ scale: getPreviewRenderScale(1.15, 'text') });
  const canvas = document.getElementById('sign-preview-canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await state.signPreviewPage.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
}


function prevSignPreviewPage() {
  if (state.signPreviewPageNum > 1) setSignPreviewPage(state.signPreviewPageNum - 1);
}

function nextSignPreviewPage() {
  if (state.signPreviewPageNum < state.signPreviewTotal) setSignPreviewPage(state.signPreviewPageNum + 1);
}

        async function signPDF() {
          if (!state.signFile) { toast('Pehle PDF upload karo!', '⚠️'); return; }
          showLoading('Adding Signature...');
          try {
            const ab = await readAB(state.signFile);
            const pdf = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
            const pages = pdf.getPages();
            const pageNum = Math.min(Math.max(parseInt(document.getElementById('sign-page').value) || 1, 1), pages.length);
            const page = pages[pageNum - 1];
            const { width, height } = page.getSize();
            const sigSize = parseInt(document.getElementById('sign-size').value) || 120;
            const posOpt = document.getElementById('sign-pos').value;
            let sx, sy, targetWidth = sigSize;
            if (posOpt === 'bottom-right') { sx = width - sigSize - 30; sy = 25; }
            else if (posOpt === 'bottom-left') { sx = 30; sy = 25; }
            else if (posOpt === 'bottom-center') { sx = width / 2 - sigSize / 2; sy = 25; }
            else { sx = width - sigSize - 30; sy = height - sigSize - 40; }

            if (state.signType === 'draw') {
              const canvas = document.getElementById('sign-canvas');
              const dataURL = canvas.toDataURL('image/png');
              const pngData = await fetch(dataURL).then(r => r.arrayBuffer());
              const img = await pdf.embedPng(pngData);
              const dim = img.scale(targetWidth / img.width);
              page.drawImage(img, { x: sx, y: sy, width: dim.width, height: dim.height });
            } else if (state.signType === 'type') {
              const name = document.getElementById('sign-name').value || 'Signature';
              const font = await pdf.embedFont(PDFLib.StandardFonts.TimesRomanItalic);
              const fontSize = sigSize / 5;
              page.drawText(name, { x: sx, y: sy + 10, size: fontSize, font, color: PDFLib.rgb(0.1, 0.1, 0.5) });
            } else {
              const imgFile = document.getElementById('sign-img-file').files[0];
              if (!imgFile) { toast('Signature image upload karo!', '⚠️'); return; }
              const imgAB = await readAB(imgFile);
              let pdfImg;
              if (imgFile.type === 'image/jpeg') pdfImg = await pdf.embedJpg(imgAB);
              else pdfImg = await pdf.embedPng(imgAB);
              const dim = pdfImg.scale(targetWidth / pdfImg.width);
              page.drawImage(pdfImg, { x: sx, y: sy, width: dim.width, height: dim.height });
            }
            const bytes = await pdf.save();
            const blob = new Blob([bytes], { type: 'application/pdf' });
            document.getElementById('sign-download').onclick = () => dlBlob(blob, 'signed.pdf');
            showResult('sign');
            toast('PDF signed!', '✅');
            saveActivity('sign', `Signed on page ${pageNum}`);
          } catch (e) { toast('Error: ' + e.message, '❌'); }
          finally { hideLoading(); }
        }

        // ══════════════════════════════════════════════════════
        // PDF PREVIEW
        // ══════════════════════════════════════════════════════
        async function previewPDF(input) {
          const file = input.files[0]; if (!file) return;
          showLoading('Preparing Preview...');
          try {
            await renderToolPdfPreview('preview', file, 30);
            const ab = await readAB(file);
            state.previewDoc = await pdfjsLib.getDocument({ data: ab }).promise;
            state.previewTotal = state.previewDoc.numPages;
            state.previewPage = 1;
            document.getElementById('preview-total').textContent = state.previewTotal;
            document.getElementById('preview-controls').style.display = 'block';
            await renderPreviewPage();
            toast(`Preview ready — ${state.previewTotal} pages`, '👀');
          } catch (e) { toast('Error: ' + e.message, '❌'); }
          finally { hideLoading(); }
        }
        async function renderPreviewPage() {
          if (!state.previewDoc) return;
          document.getElementById('preview-cur').textContent = state.previewPage;
          const page = await state.previewDoc.getPage(state.previewPage);
          const vp = page.getViewport({ scale: getPreviewRenderScale(1.5, 'text') });
          const canvas = document.getElementById('preview-canvas');
          canvas.width = vp.width; canvas.height = vp.height;
          canvas.style.maxWidth = '100%';
          await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        }
        function prevPage() { if (state.previewPage > 1) { state.previewPage--; renderPreviewPage(); } }
        function nextPage() { if (state.previewPage < state.previewTotal) { state.previewPage++; renderPreviewPage(); } }







        window.addEventListener('resize', () => {
          document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        });

        document.addEventListener('DOMContentLoaded', () => {
          document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);

          if (document.getElementById('resume-template')) {
            syncResumeTemplatePreview(document.getElementById('resume-template').value || 'ats-minimal');
            ['resume-template', 'resume-level', 'resume-name', 'resume-email', 'resume-phone', 'resume-location', 'resume-role', 'resume-summary', 'resume-education', 'resume-skills', 'resume-projects', 'resume-achievements'].forEach(id => {
              const el = document.getElementById(id);
              if (el) el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', renderResumeTemplatePreview);
            });
            renderResumeTemplatePreview();
            
            if (typeof initResumeEnhancements === 'function') {
              initResumeEnhancements();
              window._resumeEnhancementsInited = true;
            }
          }

          // ── Animation Enhancements ──────────────────────
          // Add stagger animation to file items
          document.querySelectorAll('.file-item').forEach((item, idx) => {
            item.style.animationDelay = `${idx * 0.05}s`;
          });

          // Add stagger animation to option cards
          document.querySelectorAll('.option-card').forEach((card, idx) => {
            card.style.animationDelay = `${idx * 0.08}s`;
          });

          // Add stagger animation to stat cards
          document.querySelectorAll('.stat-card').forEach((card, idx) => {
            card.style.animationDelay = `${idx * 0.1}s`;
          });

          // Add stagger animation to tool cards
          document.querySelectorAll('.tool-card').forEach((card, idx) => {
            card.style.animationDelay = `${idx * 0.08}s`;
          });

          // Add stagger animation to form groups
          document.querySelectorAll('.form-group').forEach((group, idx) => {
            group.style.animationDelay = `${idx * 0.08}s`;
          });

          // Smooth scroll enhancement for anchor links
          document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
              const href = this.getAttribute('href');
              if (href && href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                  target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              }
            });
          });

          // Add ripple effect on button clicks
          document.querySelectorAll('.btn, .tool-btn, .option-card').forEach(elem => {
            elem.addEventListener('click', function (e) {
              if (!this.classList.contains('ripple-container')) {
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;

                ripple.style.cssText = `
          position:absolute;
          width:${size}px;
          height:${size}px;
          border-radius:50%;
          background:rgba(255,255,255,0.5);
          left:${x}px;
          top:${y}px;
          animation:ripple 0.6s ease-out;
          pointer-events:none;
        `;
                this.style.position = 'relative';
                this.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
              }
            });
          });

          // Page visibility animation
          document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
              document.body.style.filter = 'brightness(0.8)';
            } else {
              document.body.style.filter = 'brightness(1)';
            }
          });
        });

        // ══════════════════════════════════════════════════════
        // PWA INSTALLATION HANDLER
        // ══════════════════════════════════════════════════════
        let installPrompt = null;
        let isInstalled = false;

        // Register Service Worker with auto-update
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/service-worker.js?v=9', { updateViaCache: 'none' })
            .then((reg) => {
              console.log('✅ Service Worker registered:', reg);
              reg.update();
              setInterval(() => reg.update(), 60000);
              if (reg.waiting) {
                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
              }
              reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (newWorker) {
                  newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                    }
                  });
                }
              });
            })
            .catch((err) => {
              console.log('⚠️ Service Worker registration failed:', err);
            });

          // Auto-reload when new SW takes control (ensures users get latest version)
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
          });
        }

        // Check if app is already installed
        window.addEventListener('beforeinstallprompt', (e) => {
          console.log('✅ beforeinstallprompt event fired');
          e.preventDefault();
          installPrompt = e;
          showInstallButton();
        });

        // Handle successful installation
        window.addEventListener('appinstalled', () => {
          console.log('✅ App installed successfully!');
          isInstalled = true;
          hideInstallButton();
          toast('🎉 App installed! Home screen mein check karo!', '✅');
        });

        // Show install button when prompt is available
        function showInstallButton() {
          const btn = document.getElementById('install-btn');
          if (btn) {
            btn.style.display = 'block';
            btn.style.animation = 'slideInRight 0.5s ease';
            console.log('🔘 Install button visible');
          }
        }

        // Hide install button
        function hideInstallButton() {
          const btn = document.getElementById('install-btn');
          if (btn) {
            btn.style.display = 'none';
          }
        }

        // Install the app
        async function installApp() {
          if (!installPrompt) {
            toast('Installation option abhi available nahi hai. HTTPS par deploy karo ya Chrome browser use karo.', '⚠️');
            return;
          }

          try {
            installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            console.log(`User response to install prompt: ${outcome}`);

            if (outcome === 'accepted') {
              toast('🎉 Installing... Home screen mein check karo! ⬇️', '✅');
              hideInstallButton();
            } else {
              toast('Installation cancel ho gaya', '❌');
            }

            installPrompt = null;
          } catch (err) {
            console.error('Installation error:', err);
            toast('Installation failed: ' + err.message, '❌');
          }
        }

        // Add ripple animation keyframes if not exists
        if (!document.querySelector('style[data-ripple]')) {
          const style = document.createElement('style');
          style.setAttribute('data-ripple', 'true');
          style.textContent = `
    @keyframes ripple {
      to {
        transform:scale(4);
        opacity:0;
      }
    }
  `;
          document.head.appendChild(style);
        }

        // ── Mobile Menu Functions ─────────────────────
        function toggleMobileMenu() {
          const sidebar = document.getElementById('mobile-sidebar');
          const overlay = document.getElementById('mobile-menu-overlay');

          if (sidebar) {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            document.body.classList.toggle('mobile-menu-open');
          }
        }

        function closeMobileMenu() {
          const sidebar = document.getElementById('mobile-sidebar');
          const overlay = document.getElementById('mobile-menu-overlay');

          if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.classList.remove('mobile-menu-open');
          }
        }

        // Close mobile menu when pressing escape
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            closeMobileMenu();
          }
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
          const sidebar = document.getElementById('mobile-sidebar');
          const hamburger = document.getElementById('hamburger-btn');

          if (sidebar && sidebar.classList.contains('active')) {
            if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
              closeMobileMenu();
            }
          }
        });




        function saveActivity(tool, detail) {
          const key = 'justpdfcraft_local_activity';
          const history = JSON.parse(localStorage.getItem(key) || '[]');

          const iconMap = {
            merge: '🔗', split: '✂️', compress: '📉',
            sign: '🖋️', watermark: '💧', protect: '🔐'
          };

          const item = {
            tool: tool.charAt(0).toUpperCase() + tool.slice(1),
            detail: detail,
            icon: iconMap[tool] || '📄',
            time: new Date().toLocaleString()
          };

          history.unshift(item);
          localStorage.setItem(key, JSON.stringify(history.slice(0, 10))); // Keep last 10
          if (document.getElementById('panel-profile').classList.contains('active')) renderActivity();
        }

        function renderActivity() {
          const list = document.getElementById('activity-list');
          if (!list) return;

          const key = 'justpdfcraft_local_activity';
          const history = JSON.parse(localStorage.getItem(key) || '[]');

          if (history.length === 0) {
            list.innerHTML = '<div class="activity-item empty">No recent activity yet. Start editing PDFs!</div>';
            return;
          }

          list.innerHTML = history.map(item => `
            <div class="activity-item">
              <div class="ai-icon">${item.icon}</div>
              <div class="ai-details">
                <div class="ai-name">${item.tool}</div>
                <div class="ai-time">${item.detail} • ${item.time}</div>
              </div>
            </div>
          `).join('');
        }

        function acceptCookies() {
          localStorage.setItem('cookieConsent', 'true');
          const banner = document.getElementById('cookie-banner');
          if (banner) banner.classList.remove('show');
        }

        // Show cookie banner on load if not accepted
        window.addEventListener('DOMContentLoaded', () => {
          if (!localStorage.getItem('cookieConsent')) {
            setTimeout(() => {
              const banner = document.getElementById('cookie-banner');
              if (banner) banner.classList.add('show');
            }, 3000);
          }
        });
        function filterSidebarTools() {
          const q = document.getElementById('sidebar-search-input').value.toLowerCase();
          document.querySelectorAll('.sidebar .tool-btn').forEach(btn => {
            const text = btn.textContent.toLowerCase();
            const isHome = btn.id === 'btn-home';
            if (isHome && !q) btn.style.display = 'flex';
            else if (isHome && q) btn.style.display = 'none';
            else btn.style.display = text.includes(q) ? 'flex' : 'none';
          });

          // Also filter sidebar headings
          document.querySelectorAll('.sidebar-heading').forEach(h => {
            h.style.display = q ? 'none' : 'block';
          });
        }

        // ══════════════════════════════════════════════════════
        // PDF TO WORD (DOCX)
        // ══════════════════════════════════════════════════════
        function handlePdf2Word(input) {
          const file = input.files[0];
          if (!file) return;
          state.pdf2wordFile = file;
          state.pdf2wordMode = 'paragraphs';
          document.getElementById('pdf2word-options').style.display = 'block';
          toast(`"${file.name}" loaded!`, '📝');
        }

        async function convertPdf2Word() {
          if (!state.pdf2wordFile) { toast('Pehle PDF upload karo!', '⚠️'); return; }
          showLoading('Extracting text from PDF...');
          const progressWrap = document.getElementById('pdf2word-progress');
          const fill = document.getElementById('pdf2word-fill');
          const plab = document.getElementById('pdf2word-plab');
          progressWrap.style.display = 'block';
          try {
            const ab = await readAB(state.pdf2wordFile);
            const pdfDoc = await pdfjsLib.getDocument({ data: ab }).promise;
            const totalPages = pdfDoc.numPages;
            const allParagraphs = [];

            for (let i = 1; i <= totalPages; i++) {
              plab.textContent = `Page ${i} of ${totalPages} processing...`;
              fill.style.width = `${(i / totalPages) * 100}%`;
              const page = await pdfDoc.getPage(i);
              const content = await page.getTextContent();
              let pageText = '';
              let lastY = null;
              for (const item of content.items) {
                const y = item.transform ? item.transform[5] : 0;
                if (lastY !== null && Math.abs(y - lastY) > 5) pageText += '\n';
                pageText += item.str;
                lastY = y;
              }
              const lines = pageText.split('\n').filter(l => l.trim().length > 0);
              allParagraphs.push(...lines, '');
            }

            const { Document, Paragraph, TextRun, HeadingLevel, Packer } = window.docx;
            const docChildren = [];
            docChildren.push(new Paragraph({
              children: [new TextRun({ text: state.pdf2wordFile.name.replace('.pdf',''), bold: true, size: 32 })],
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 }
            }));
            for (const line of allParagraphs) {
              docChildren.push(new Paragraph({
                children: [new TextRun({ text: line, size: 24 })],
                spacing: { after: 80 }
              }));
            }
            const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });
            const blob = await Packer.toBlob(doc);
            const outName = state.pdf2wordFile.name.replace('.pdf','.docx');
            document.getElementById('pdf2word-download').onclick = () => dlBlob(blob, outName);
            document.getElementById('pdf2word-result-text').textContent = `${totalPages} pages → ${allParagraphs.length} paragraphs extracted`;
            showResult('pdf2word');
            toast('DOCX ready!', '✅');
            saveActivity('pdf2word', `${totalPages} pages converted`);
          } catch(e) { toast('Error: ' + e.message, '❌'); }
          finally { hideLoading(); progressWrap.style.display = 'none'; }
        }


// ══════════════════════════════════════════════════════
// HANDWRITING GENERATOR ENGINE
// ══════════════════════════════════════════════════════
let hwRenderTimeout;

async function ensureFontLoaded(fontFamily, size = 26) {
  try {
    if (document.fonts && document.fonts.load) {
      await document.fonts.load(`${size}px ${fontFamily}`);
    }
  } catch (e) {
    console.warn("Font loading fallback to system:", e);
  }
}

function updateHandwritingState(field, val) {
  state.handwriting[field] = val;
  
  if (field === 'size') {
    const lbl = document.getElementById('hw-size-lbl');
    if (lbl) lbl.textContent = val;
  } else if (field === 'lineHeight') {
    const lbl = document.getElementById('hw-spacing-lbl');
    if (lbl) lbl.textContent = val;
  } else if (field === 'scannerEffect') {
    const lbl = document.getElementById('hw-scanner-lbl');
    if (lbl) lbl.textContent = val;
  }

  clearTimeout(hwRenderTimeout);
  hwRenderTimeout = setTimeout(() => {
    renderHandwritingPreview();
  }, 100);
}

function selectInkSwatch(color, el) {
  state.handwriting.ink = color;
  
  const swatches = document.querySelectorAll('#panel-handwriting .color-swatch');
  swatches.forEach(s => s.classList.remove('active'));
  el.classList.add('active');

  const inputColor = document.getElementById('hw-color');
  if (inputColor) inputColor.value = color;

  renderHandwritingPreview();
}

function calculateHwPages(text, font, size, lineHeight) {
  const canvas = document.getElementById('hw-preview-canvas') || document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const pw = 1240;
  const ph = 1754;
  const topMargin = 160;
  const bottomMargin = 100;
  const leftMargin = 150;
  const rightMargin = 100;
  const printableWidth = pw - leftMargin - rightMargin;

  ctx.font = `${size}px ${font}`;
  
  const paragraphs = text.split('\n');
  const pageLines = [];
  let currentPage = [];
  const maxLines = Math.floor((ph - topMargin - bottomMargin) / lineHeight);

  for (const para of paragraphs) {
    if (para.trim() === '') {
      currentPage.push('');
      if (currentPage.length >= maxLines) {
        pageLines.push(currentPage);
        currentPage = [];
      }
      continue;
    }

    const words = para.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > printableWidth && currentLine) {
        currentPage.push(currentLine);
        if (currentPage.length >= maxLines) {
          pageLines.push(currentPage);
          currentPage = [];
        }
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      currentPage.push(currentLine);
      if (currentPage.length >= maxLines) {
        pageLines.push(currentPage);
        currentPage = [];
      }
    }
    
    if (currentPage.length > 0 && currentPage.length < maxLines) {
      currentPage.push('');
    }
  }
  
  if (currentPage.length > 0) {
    pageLines.push(currentPage);
  }
  
  if (pageLines.length === 0) {
    pageLines.push(['']);
  }
  
  return pageLines;
}

async function drawHwPageCanvas(canvas, pageLines) {
  const ctx = canvas.getContext('2d');
  const pw = canvas.width;
  const ph = canvas.height;
  
  ctx.fillStyle = '#faf9f5';
  ctx.fillRect(0, 0, pw, ph);

  const topMargin = 160;
  const bottomMargin = 100;
  const leftMargin = 150;
  const lineHeight = state.handwriting.lineHeight;
  const fontSize = state.handwriting.size;
  const fontName = state.handwriting.font;
  const inkColor = state.handwriting.ink;
  const paperType = state.handwriting.paper;
  const scannerEffect = state.handwriting.scannerEffect;

  if (paperType === 'ruled') {
    ctx.beginPath();
    ctx.moveTo(140, 0);
    ctx.lineTo(140, ph);
    ctx.strokeStyle = 'rgba(255, 90, 120, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, topMargin - lineHeight);
    ctx.lineTo(pw, topMargin - lineHeight);
    ctx.strokeStyle = 'rgba(255, 90, 120, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(80, 140, 240, 0.28)';
    ctx.lineWidth = 1.0;
    for (let y = topMargin; y < ph - bottomMargin; y += lineHeight) {
      ctx.moveTo(0, y);
      ctx.lineTo(pw, y);
    }
    ctx.stroke();
  } else if (paperType === 'grid') {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(80, 140, 240, 0.15)';
    ctx.lineWidth = 1.0;
    const gridGap = 30;
    for (let y = gridGap; y < ph; y += gridGap) {
      ctx.moveTo(0, y);
      ctx.lineTo(pw, y);
    }
    for (let x = gridGap; x < pw; x += gridGap) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ph);
    }
    ctx.stroke();
  }

  ctx.fillStyle = inkColor;
  ctx.font = `${fontSize}px ${fontName}`;
  ctx.textBaseline = 'alphabetic';

  ctx.save();
  const pageSkewAngle = (Math.random() - 0.5) * 0.002;
  ctx.rotate(pageSkewAngle);

  for (let i = 0; i < pageLines.length; i++) {
    const line = pageLines[i];
    if (!line) continue;

    const y = topMargin + (i + 1) * lineHeight - 6;
    const lineYJitter = (Math.random() - 0.5) * 2.0;
    const targetY = y + lineYJitter;

    let currentX = leftMargin + (Math.random() - 0.5) * 3;

    const words = line.split(' ');
    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      ctx.save();
      
      const wordRotation = (Math.random() - 0.5) * 0.016;
      const wordYOffset = (Math.random() - 0.5) * 1.5;

      ctx.translate(currentX, targetY + wordYOffset);
      ctx.rotate(wordRotation);
      
      ctx.fillText(word, 0, 0);
      ctx.restore();

      const wordWidth = ctx.measureText(word).width;
      const spaceWidth = ctx.measureText(' ').width;
      const spaceJitter = (Math.random() - 0.5) * 1.5;
      currentX += wordWidth + spaceWidth + spaceJitter;
    }
  }
  ctx.restore();

  if (scannerEffect > 0) {
    const shadowIntensity = scannerEffect / 100;

    ctx.save();
    const shadowGrad = ctx.createLinearGradient(0, 0, pw, ph);
    shadowGrad.addColorStop(0, `rgba(10, 8, 5, ${shadowIntensity * 0.20})`);
    shadowGrad.addColorStop(0.4, `rgba(10, 8, 5, ${shadowIntensity * 0.08})`);
    shadowGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, 0, pw, ph);
    ctx.restore();

    ctx.save();
    const radialGrad = ctx.createRadialGradient(pw / 2, 0, pw * 0.3, pw / 2, ph / 2, ph * 0.8);
    radialGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    radialGrad.addColorStop(1, `rgba(0, 5, 10, ${shadowIntensity * 0.14})`);
    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, pw, ph);
    ctx.restore();

    ctx.save();
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 250;
    noiseCanvas.height = 250;
    const nCtx = noiseCanvas.getContext('2d');
    const nData = nCtx.createImageData(250, 250);
    const noiseLimit = Math.floor(shadowIntensity * 22);
    for (let i = 0; i < nData.data.length; i += 4) {
      const val = Math.floor(Math.random() * noiseLimit);
      nData.data[i] = val;
      nData.data[i+1] = val;
      nData.data[i+2] = val;
      nData.data[i+3] = 16;
    }
    nCtx.putImageData(nData, 0, 0);
    const pattern = ctx.createPattern(noiseCanvas, 'repeat');
    ctx.fillStyle = pattern;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(0, 0, pw, ph);
    ctx.restore();
  }
}

async function renderHandwritingPreview() {
  const font = state.handwriting.font;
  const size = state.handwriting.size;
  const lineHeight = state.handwriting.lineHeight;
  const text = state.handwriting.text || "Apna assignment text yahan paste karein. Adjust variables automatically to update page guidelines, ink flow, and realistic camera scan effects.";
  
  await ensureFontLoaded(font, size);

  const pages = calculateHwPages(text, font, size, lineHeight);
  const total = pages.length;
  
  if (state.handwriting.currentPage > total) state.handwriting.currentPage = total;
  if (state.handwriting.currentPage < 1) state.handwriting.currentPage = 1;
  
  const curPageIdx = state.handwriting.currentPage - 1;
  const pageLines = pages[curPageIdx];

  const canvas = document.getElementById('hw-preview-canvas');
  if (canvas) {
    await drawHwPageCanvas(canvas, pageLines);
  }

  const curSpan = document.getElementById('hw-preview-cur');
  const totSpan = document.getElementById('hw-preview-total');
  if (curSpan) curSpan.textContent = state.handwriting.currentPage;
  if (totSpan) totSpan.textContent = total;
}

async function generateHandwritingPDF() {
  const text = state.handwriting.text;
  if (!text || text.trim() === '') {
    toast("Pehle text field me notes ya assignment content enter karo!", "⚠️");
    return;
  }

  const font = state.handwriting.font;
  const size = state.handwriting.size;
  const lineHeight = state.handwriting.lineHeight;

  showLoading('Generating Assignment PDF...');
  const progressWrap = document.getElementById('handwriting-progress');
  const fill = document.getElementById('handwriting-fill');
  const plab = document.getElementById('handwriting-plab');
  if (progressWrap) progressWrap.style.display = 'block';

  try {
    await ensureFontLoaded(font, size);
    const pages = calculateHwPages(text, font, size, lineHeight);
    const totalPages = pages.length;

    const pdfDoc = await PDFLib.PDFDocument.create();

    for (let i = 0; i < totalPages; i++) {
      if (plab) plab.textContent = `Rendering page ${i + 1} of ${totalPages}...`;
      if (fill) fill.style.width = `${((i + 1) / totalPages) * 100}%`;

      const canvas = document.createElement('canvas');
      canvas.width = 1240;
      canvas.height = 1754;

      await drawHwPageCanvas(canvas, pages[i]);

      const imgDataUrl = canvas.toDataURL('image/jpeg', 0.90);
      const imgBytes = await fetch(imgDataUrl).then(res => res.arrayBuffer());
      const embeddedImg = await pdfDoc.embedJpg(imgBytes);

      const pdfPage = pdfDoc.addPage([595, 842]);
      pdfPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: 595,
        height: 842
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    const resultBanner = document.getElementById('handwriting-result');
    const resultText = document.getElementById('handwriting-result-text');
    const downloadBtn = document.getElementById('handwriting-download');

    if (resultText) resultText.textContent = `${totalPages} pages generated • ${fmtSize(blob.size)}`;
    if (downloadBtn) {
      downloadBtn.onclick = () => dlBlob(blob, `handwritten_assignment_${Date.now()}.pdf`);
    }
    if (resultBanner) resultBanner.classList.add('show');
    
    toast('Assignment Generated Successfully!', '✅');
    saveActivity('handwriting', `${totalPages} pages assignment generated`);
  } catch (e) {
    toast('Error: ' + e.message, '❌');
    console.error(e);
  } finally {
    hideLoading();
    if (progressWrap) progressWrap.style.display = 'none';
  }
}

function prevHwPage() {
  if (state.handwriting.currentPage > 1) {
    state.handwriting.currentPage--;
    renderHandwritingPreview();
  }
}

function nextHwPage() {
  const text = state.handwriting.text || "Apna assignment text yahan paste karein. Adjust variables automatically to update page guidelines, ink flow, and realistic camera scan effects.";
  const pages = calculateHwPages(text, state.handwriting.font, state.handwriting.size, state.handwriting.lineHeight);
  if (state.handwriting.currentPage < pages.length) {
    state.handwriting.currentPage++;
    renderHandwritingPreview();
  }
}

function resetHandwriting() {
  state.handwriting.text = '';
  state.handwriting.currentPage = 1;
  const txtArea = document.getElementById('hw-text');
  if (txtArea) txtArea.value = '';
  
  const res = document.getElementById('handwriting-result');
  if (res) res.classList.remove('show');
  
  renderHandwritingPreview();
  toast('Workspace cleared', '🗑️');
}

// ══════════════════════════════════════════════════════
// PDF TO TEXT EXTRACTOR LOGIC
// ══════════════════════════════════════════════════════
function handlePdf2TxtFile(file) {
  if (!file) return;
  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
    toast('Please upload a valid PDF file!', '⚠️');
    return;
  }
  
  state.pdf2txt.file = file;
  
  const dz = document.getElementById('pdf2txt-dz');
  if (dz) {
    dz.innerHTML = `
      <div class="dz-icon">📄</div>
      <h3>${escapeHtml(file.name)}</h3>
      <p>File loaded successfully • Size: ${fmtSize(file.size)}</p>
    `;
  }
  
  const opts = document.getElementById('pdf2txt-options');
  if (opts) opts.style.display = 'block';
  
  // Hide previous result if any
  const res = document.getElementById('pdf2txt-result');
  if (res) res.style.display = 'none';
  
  toast('PDF loaded, choose settings!', 'ℹ️');
}

function selectPdf2TxtMode(mode) {
  state.pdf2txt.mode = mode;
  
  const flowCard = document.getElementById('p2t-mode-flow');
  const rawCard = document.getElementById('p2t-mode-raw');
  
  if (flowCard && rawCard) {
    if (mode === 'flow') {
      flowCard.classList.add('selected');
      rawCard.classList.remove('selected');
    } else {
      rawCard.classList.add('selected');
      flowCard.classList.remove('selected');
    }
  }
}

function togglePdf2TxtClean() {
  const cb = document.getElementById('p2t-clean-lines');
  if (cb) {
    state.pdf2txt.clean = cb.checked;
  }
}

async function convertPdf2Txt() {
  if (!state.pdf2txt.file) {
    toast('Pehle PDF upload karo!', '⚠️');
    return;
  }
  
  const progressWrap = document.getElementById('pdf2txt-progress');
  const fill = document.getElementById('pdf2txt-fill');
  const plab = document.getElementById('pdf2txt-plab');
  
  if (progressWrap) progressWrap.style.display = 'block';
  if (fill) fill.style.width = '0%';
  
  try {
    const file = state.pdf2txt.file;
    const ab = await readAB(file);
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    const totalPages = pdf.numPages;
    
    let extractedPages = [];
    const mode = state.pdf2txt.mode;
    
    for (let i = 1; i <= totalPages; i++) {
      if (plab) plab.textContent = `Extracting page ${i} of ${totalPages}...`;
      if (fill) fill.style.width = `${(i / totalPages) * 100}%`;
      
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      let pageText = '';
      let lastY = null;
      
      for (const item of content.items) {
        const y = item.transform ? item.transform[5] : 0;
        if (lastY !== null && Math.abs(y - lastY) > 5) {
          pageText += '\n';
        }
        pageText += item.str;
        lastY = y;
      }
      
      if (mode === 'flow') {
        let paragraphs = pageText.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        let pageFlowText = '';
        for (let p = 0; p < paragraphs.length; p++) {
          const line = paragraphs[p];
          pageFlowText += line;
          if (p < paragraphs.length - 1) {
            if (/[.\-!?:]$/.test(line)) {
              pageFlowText += '\n\n';
            } else {
              pageFlowText += ' ';
            }
          }
        }
        extractedPages.push(pageFlowText);
      } else {
        extractedPages.push(pageText);
      }
    }
    
    let fullText = extractedPages.join('\n\n--- Page Break ---\n\n');
    
    if (state.pdf2txt.clean) {
      fullText = fullText.replace(/\n{3,}/g, '\n\n');
    }
    
    state.pdf2txt.text = fullText;
    
    const outputArea = document.getElementById('pdf2txt-output');
    if (outputArea) outputArea.value = fullText;
    
    const resultPanel = document.getElementById('pdf2txt-result');
    if (resultPanel) resultPanel.style.display = 'block';
    
    updatePdf2TxtStats(fullText);
    
    toast('Text Extracted successfully!', '✅');
    saveActivity('pdf2txt', `${totalPages} pages extracted to text`);
  } catch (e) {
    toast('Error: ' + e.message, '❌');
    console.error(e);
  } finally {
    if (progressWrap) progressWrap.style.display = 'none';
  }
}

function updatePdf2TxtStats(text) {
  const charCount = text.length;
  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const readTime = Math.max(1, Math.round(wordCount / 200));
  
  const wordsEl = document.getElementById('p2t-stat-words');
  const charsEl = document.getElementById('p2t-stat-chars');
  const timeEl = document.getElementById('p2t-stat-time');
  
  if (wordsEl) wordsEl.textContent = wordCount.toLocaleString();
  if (charsEl) charsEl.textContent = charCount.toLocaleString();
  if (timeEl) timeEl.textContent = `${readTime} min`;
}

function copyTxtOutput() {
  const output = document.getElementById('pdf2txt-output');
  if (!output || !output.value) return;
  
  output.select();
  output.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(output.value)
    .then(() => toast('Text copied to clipboard!', '📋'))
    .catch(err => toast('Copy failed: ' + err.message, '❌'));
}

function downloadTxtOutput() {
  const output = document.getElementById('pdf2txt-output');
  if (!output || !output.value) return;
  
  const blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' });
  const baseName = state.pdf2txt.file ? state.pdf2txt.file.name.replace('.pdf', '') : 'extracted_text';
  dlBlob(blob, `${baseName}_extracted.txt`);
}

function resetPdf2Txt() {
  state.pdf2txt.file = null;
  state.pdf2txt.text = '';
  
  const input = document.getElementById('pdf2txt-input');
  if (input) input.value = '';
  
  const dz = document.getElementById('pdf2txt-dz');
  if (dz) {
    dz.innerHTML = `
      <input type="file" id="pdf2txt-input" accept=".pdf" onchange="handlePdf2TxtFile(this.files[0])">
      <div class="dz-icon">📄</div>
      <h3>PDF yahan drop karo</h3>
      <p>Click karke ya drag & drop se PDF file choose karo</p>
    `;
  }
  
  const opts = document.getElementById('pdf2txt-options');
  if (opts) opts.style.display = 'none';
  
  const res = document.getElementById('pdf2txt-result');
  if (res) res.style.display = 'none';
  
  toast('Workspace cleared', '🗑️');
}

// ══════════════════════════════════════════════════════
// EXPOSE NEW TOOL FUNCTIONS TO GLOBAL SCOPE
// ══════════════════════════════════════════════════════
window.handlePdf2Word = handlePdf2Word;
window.convertPdf2Word = convertPdf2Word;
window.updateHandwritingState = updateHandwritingState;
window.selectInkSwatch = selectInkSwatch;
window.generateHandwritingPDF = generateHandwritingPDF;
window.resetHandwriting = resetHandwriting;
window.prevHwPage = prevHwPage;
window.nextHwPage = nextHwPage;
window.renderHandwritingPreview = renderHandwritingPreview;

window.handlePdf2TxtFile = handlePdf2TxtFile;
window.selectPdf2TxtMode = selectPdf2TxtMode;
window.togglePdf2TxtClean = togglePdf2TxtClean;
window.convertPdf2Txt = convertPdf2Txt;
window.copyTxtOutput = copyTxtOutput;
window.downloadTxtOutput = downloadTxtOutput;
window.resetPdf2Txt = resetPdf2Txt;

window.syncResumeTemplatePreview = syncResumeTemplatePreview;
window.renderResumeTemplatePreview = renderResumeTemplatePreview;
window.setResumeTemplate = setResumeTemplate;
window.generateResume = generateResume;
window.downloadResumeText = downloadResumeText;
window.downloadResumePDF = downloadResumePDF;

// Resume Builder Enhancements Expose
window.setResumeAccentColor = setResumeAccentColor;
window.addCustomSectionPrompt = addCustomSectionPrompt;
window.removeCustomSection = removeCustomSection;
window.closeCustomSectionModal = closeCustomSectionModal;
window.submitCustomSectionModal = submitCustomSectionModal;
window.closeConfirmDeleteModal = closeConfirmDeleteModal;
window.saveSectionTitles = saveSectionTitles;
window.loadSectionTitles = loadSectionTitles;
window.initResumeEnhancements = initResumeEnhancements;
window.updateAtsScore = updateAtsScore;

// ── Helper Functions for Resume Builder Enhancements ──
function reconstructTextarea(fieldId) {
  const container = document.querySelector(`.live-section-container[data-field="${fieldId}"]`);
  if (!container) return;

  let lines = [];

  function traverse(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const type = node.getAttribute('data-type');
      if (type === 'p') {
        lines.push(node.innerText);
      } else if (type === 'list') {
        lines.push(`- ${node.innerText}`);
      } else if (node.style.height === '6px') {
        lines.push('');
      } else if (node.style.display === 'flex' || node.style.display === 'inline-flex') {
        const left = node.querySelector('[data-type="split-left"]');
        const right = node.querySelector('[data-type="split-right"]');
        const leftText = left ? left.innerText.trim() : '';
        const rightText = right ? right.innerText.trim() : '';
        if (leftText || rightText) {
          lines.push(`${leftText} | ${rightText}`);
        }
      } else {
        node.childNodes.forEach(child => traverse(child));
      }
    }
  }

  container.childNodes.forEach(child => traverse(child));

  const textarea = document.getElementById(fieldId);
  if (textarea) {
    textarea.value = lines.join('\n');
    
    // Sync to state if it is a custom section
    if (fieldId.startsWith('resume-custom-') && window.customResumeSections) {
      const sec = window.customResumeSections.find(s => s.id === fieldId);
      if (sec) {
        sec.value = textarea.value;
        saveCustomSections();
      }
    }
  }
}

function setResumeAccentColor(color, swatch) {
  window.currentResumeAccentColor = color;
  
  document.querySelectorAll('.color-swatch').forEach(btn => btn.classList.remove('active'));
  if (swatch) {
    swatch.classList.add('active');
  } else {
    const activeSwatch = document.querySelector(`.color-swatch[data-color="${color}"]`);
    if (activeSwatch) activeSwatch.classList.add('active');
  }
  
  renderResumeTemplatePreview();
  toast(`Accent color set to ${color}`, '🎨');
}

function updateAtsScore() {
  const getVal = (id) => document.getElementById(id)?.value?.trim() || '';
  const name = getVal('resume-name');
  const email = getVal('resume-email');
  const phone = getVal('resume-phone');
  const location = getVal('resume-location');
  const role = getVal('resume-role');
  const summary = getVal('resume-summary');
  const skills = getVal('resume-skills');
  const projects = getVal('resume-projects');
  const education = getVal('resume-education');

  let score = 0;
  let tips = [];

  // Name check
  if (name && name !== 'Your Name') {
    score += 15;
  } else {
    tips.push('Add your full name.');
  }

  // Email check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && emailRegex.test(email) && email !== 'your@email.com') {
    score += 15;
  } else {
    tips.push('Provide a valid email address.');
  }

  // Phone check
  if (phone && phone.length >= 8 && !phone.includes('XXXXX')) {
    score += 10;
  } else {
    tips.push('Add a valid phone number.');
  }

  // Location check
  if (location && location !== 'Your City') {
    score += 10;
  } else {
    tips.push('Add your location (City, Country).');
  }

  // Designation check
  if (role && role !== 'Designation') {
    score += 10;
  } else {
    tips.push('Specify a Designation.');
  }

  // Summary check
  if (summary.length >= 100) {
    score += 15;
  } else if (summary.length > 0) {
    score += 5;
    tips.push('Make summary stronger (aim for 100+ chars).');
  } else {
    tips.push('Write a professional summary.');
  }

  // Skills check
  const skillsList = skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
  if (skillsList.length >= 5) {
    score += 10;
  } else {
    tips.push('List at least 5 skills (separated by commas).');
  }

  // Projects check
  if (projects && projects.length > 30 && !projects.includes('preview yahan aayega')) {
    score += 10;
  } else {
    tips.push('Add detailed project/experience descriptions.');
  }

  // Education check
  if (education && education.length > 10) {
    score += 5;
  } else {
    tips.push('List your educational background.');
  }

  const scoreValEl = document.getElementById('ats-score-val');
  const scoreFillEl = document.getElementById('ats-score-fill');
  const tipsListEl = document.getElementById('ats-tips-list');

  if (scoreValEl) scoreValEl.textContent = `${score}%`;
  if (scoreFillEl) scoreFillEl.style.width = `${score}%`;

  if (tipsListEl) {
    if (tips.length === 0) {
      tipsListEl.innerHTML = '<div style="color: #10b981; font-size: 0.8rem; font-weight: 600;">✨ Perfect! Your resume is fully optimized.</div>';
    } else {
      tipsListEl.innerHTML = tips.slice(0, 3).map(tip => `
        <div class="ats-tip-item">
          <span class="ats-tip-icon">💡</span>
          <span>${tip}</span>
        </div>
      `).join('');
    }
  }
}

// Section Titles Customization State
window.sectionTitles = {
  summary: '',
  skills: '',
  projects: '',
  education: '',
  achievements: ''
};

function saveSectionTitles() {
  localStorage.setItem('justpdfcraft_resume_section_titles', JSON.stringify(window.sectionTitles));
}

function loadSectionTitles() {
  const stored = localStorage.getItem('justpdfcraft_resume_section_titles');
  if (stored) {
    try {
      window.sectionTitles = { ...window.sectionTitles, ...JSON.parse(stored) };
    } catch (e) {}
  }
  
  // Sync the form labels in the sidebar
  const syncLabel = (inputId, title) => {
    if (!title) return;
    const input = document.getElementById(inputId);
    if (input && input.previousElementSibling) {
      input.previousElementSibling.textContent = title;
    }
  };
  
  syncLabel('resume-summary', window.sectionTitles.summary);
  syncLabel('resume-skills', window.sectionTitles.skills);
  syncLabel('resume-projects', window.sectionTitles.projects);
  syncLabel('resume-education', window.sectionTitles.education);
  syncLabel('resume-achievements', window.sectionTitles.achievements);
}

// Dynamic Custom Resume Sections State
window.customResumeSections = [];

function saveCustomSections() {
  localStorage.setItem('justpdfcraft_resume_custom_sections', JSON.stringify(window.customResumeSections));
}

function loadCustomSections() {
  const stored = localStorage.getItem('justpdfcraft_resume_custom_sections');
  if (stored) {
    try {
      window.customResumeSections = JSON.parse(stored);
    } catch (e) {
      window.customResumeSections = [];
    }
  } else {
    window.customResumeSections = [];
  }
  
  // Clear and rebuild custom fields inside the container
  const container = document.getElementById('custom-sections-container');
  if (container) {
    container.innerHTML = '';
    window.customResumeSections.forEach(sec => {
      createCustomSectionFormElement(sec);
    });
  }
  renderResumeTemplatePreview();
}

function createCustomSectionFormElement(section) {
  const container = document.getElementById('custom-sections-container');
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'form-group';
  div.id = `group-${section.id}`;
  div.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
      <label class="form-label" style="margin-bottom: 0;">${escapeHtml(section.title)}</label>
      <button type="button" class="btn-delete-section" onclick="removeCustomSection('${section.id}')">✕ Delete</button>
    </div>
    <textarea id="${section.id}" rows="4" placeholder="Enter details for ${escapeHtml(section.title)}...">${escapeHtml(section.value || '')}</textarea>
  `;

  container.appendChild(div);

  // Bind input event to update state and trigger preview
  const textarea = div.querySelector('textarea');
  if (textarea) {
    textarea.addEventListener('input', () => {
      section.value = textarea.value;
      renderResumeTemplatePreview();
      saveCustomSections();
    });
  }
}

function addCustomSectionPrompt() {
  const modal = document.getElementById('custom-section-modal');
  const input = document.getElementById('custom-section-title-input');
  if (modal && input) {
    input.value = '';
    modal.style.display = 'flex';
    // Trigger transition reflow
    modal.offsetHeight; 
    modal.classList.add('active');
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    input.focus();
  }
}

function closeCustomSectionModal() {
  const modal = document.getElementById('custom-section-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
    setTimeout(() => {
      modal.style.display = 'none';
    }, 250);
  }
}

function submitCustomSectionModal() {
  const input = document.getElementById('custom-section-title-input');
  if (!input || !input.value.trim()) return;

  const title = input.value.trim();
  const id = `resume-custom-${Date.now()}`;
  const section = { id, title, value: '' };

  window.customResumeSections.push(section);
  createCustomSectionFormElement(section);
  saveCustomSections();
  renderResumeTemplatePreview();
  closeCustomSectionModal();
  toast(`Section "${title}" added!`, '➕');
}

let sectionIdToDelete = null;

function removeCustomSection(id) {
  const section = window.customResumeSections.find(s => s.id === id);
  const title = section ? section.title : 'Section';
  
  sectionIdToDelete = id;
  
  const modal = document.getElementById('confirm-delete-modal');
  const message = document.getElementById('confirm-delete-message');
  const confirmBtn = document.getElementById('confirm-delete-btn');
  
  if (modal && message && confirmBtn) {
    message.textContent = `Are you sure you want to delete the "${title}" section? This will remove all its content.`;
    
    // Bind click event once
    confirmBtn.onclick = () => {
      executeDeleteSection();
    };
    
    modal.style.display = 'flex';
    modal.offsetHeight;
    modal.classList.add('active');
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
  }
}

function closeConfirmDeleteModal() {
  const modal = document.getElementById('confirm-delete-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
    setTimeout(() => {
      modal.style.display = 'none';
    }, 250);
  }
  sectionIdToDelete = null;
}

function executeDeleteSection() {
  if (!sectionIdToDelete) return;
  const id = sectionIdToDelete;
  const section = window.customResumeSections.find(s => s.id === id);
  const title = section ? section.title : 'Section';

  window.customResumeSections = window.customResumeSections.filter(s => s.id !== id);
  const element = document.getElementById(`group-${id}`);
  if (element) element.remove();
  
  saveCustomSections();
  renderResumeTemplatePreview();
  closeConfirmDeleteModal();
  toast(`Section "${title}" removed`, '🗑️');
}

function initResumeEnhancements() {
  loadSectionTitles();
  loadCustomSections();
  updateAtsScore();
  
  const formIds = [
    'resume-name', 'resume-email', 'resume-phone', 'resume-location', 
    'resume-role', 'resume-summary', 'resume-education', 'resume-skills', 
    'resume-projects', 'resume-achievements'
  ];
  formIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateAtsScore);
    }
  });

  const paper = document.getElementById('resume-paper');
  if (paper) {
    paper.addEventListener('input', (e) => {
      const target = e.target;
      
      // 1. Handle standard section title edit
      const sectionTitleKey = target.getAttribute('data-section-title');
      if (sectionTitleKey) {
        const newTitle = target.innerText.trim();
        window.sectionTitles[sectionTitleKey] = newTitle;
        saveSectionTitles();
        
        // Sync to form label
        const inputId = {
          summary: 'resume-summary',
          skills: 'resume-skills',
          projects: 'resume-projects',
          education: 'resume-education',
          achievements: 'resume-achievements'
        }[sectionTitleKey];
        
        if (inputId) {
          const input = document.getElementById(inputId);
          if (input && input.previousElementSibling) {
            input.previousElementSibling.textContent = newTitle;
          }
        }
        return;
      }

      // 2. Handle custom section title edit
      const customSectionId = target.getAttribute('data-custom-section-title');
      if (customSectionId) {
        const newTitle = target.innerText.trim();
        const sec = window.customResumeSections.find(s => s.id === customSectionId);
        if (sec) {
          sec.title = newTitle;
          saveCustomSections();
          
          // Sync to form label
          const label = document.querySelector(`#group-${customSectionId} label`);
          if (label) {
            label.textContent = newTitle;
          }
        }
        return;
      }

      const fieldId = target.getAttribute('data-field');
      if (!fieldId) return;

      const isSection = target.hasAttribute('data-type');
      if (isSection) {
        reconstructTextarea(fieldId);
      } else {
        const input = document.getElementById(fieldId);
        if (input) {
          input.value = target.innerText.trim();
        }
      }
      
      updateAtsScore();
    });

    paper.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const target = e.target;
        if (target.hasAttribute('data-field') || target.hasAttribute('data-section-title') || target.hasAttribute('data-custom-section-title')) {
          e.preventDefault();
          target.blur();
        }
      }
    });
  }

  // Handle Enter key inside the custom section title modal input
  const modalInput = document.getElementById('custom-section-title-input');
  if (modalInput) {
    modalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitCustomSectionModal();
      }
    });
  }
}
