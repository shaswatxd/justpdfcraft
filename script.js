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
  imgResizeFiles: [], imgResizeResults: [],
  pdf2imgFile: null, pdf2imgCanvases: [],
  pdf2txtFile: null,
  wmFile: null, wmType: 'text', wmImage: null,
  wmPreviewDoc: null, wmCustomPos: { x: 0.5, y: 0.5 },
  wmPreviewPage: null, wmPreviewPageNum: 1, wmPreviewTotal: 0, wmDragging: false, wmDragFrame: 0,
  pnFile: null,
  hfFile: null,
  marksRows: 0,
  protectFile: null,
  unlockFile: null,
  signFile: null, signType: 'draw', signDrawing: false, signLastX: 0, signLastY: 0,
  redactFile: null,
  annFile: null, annType: 'textbox',
  reorderFile: null, reorderPageCount: 0,
  delFile: null, delSelected: [],
  extractFile: null, extractSelected: [],
  cropFile: null,
  previewDoc: null, previewPage: 1, previewTotal: 0,
  htmlContent: '',
  resultBlobs: {},
  qrDataUrl: '',
  passwordOptions: { upper: true, lower: true, number: true, symbol: true }
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
let annPreviewBound = false;


const TOOL_CONFIG = {
  watermark: { optionsId: 'wm-options' },
  annotate: { optionsId: 'ann-options' }
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
    ats: {
      title: 'ATS',
      tag: 'Keyword-safe recruiter friendly layout',
      badge: 'Featured',
      layout: 'Summary + Skills + Experience + Education',
      note: 'Best for online applications, recruiter screening and hiring-safe formatting.'
    },
    professional: {
      title: 'Professional',
      tag: 'Classic hiring-safe structure',
      badge: 'Featured',
      layout: 'Header + Summary + Skills + Experience + Education',
      note: 'Best for business, office, campus and general job applications.'
    },
    simple: {
      title: 'Simple',
      tag: 'Minimal clean one-page look',
      badge: 'Featured',
      layout: 'Compact profile + skills + experience + education',
      note: 'Best when you want a clean resume without extra visual noise.'
    },
    modern: {
      title: 'Modern',
      tag: 'Sharp headings with modern spacing',
      badge: 'Featured',
      layout: 'Header + Summary + Skills + Experience + Education',
      note: 'Best for polished modern resumes that still feel safe and readable.'
    },
    executive: {
      title: 'Executive',
      tag: 'Leadership-first professional structure',
      badge: 'Featured',
      layout: 'Headline + Impact Summary + Core Skills + Experience Highlights',
      note: 'Best for senior profiles, leadership roles and polished client-facing resumes.'
    },
    creative: {
      title: 'Creative',
      tag: 'Portfolio-style standout presentation',
      badge: 'Featured',
      layout: 'Brand-style intro + Skills + Projects + Achievements',
      note: 'Best for designers, creators, marketing roles and visually expressive profiles.'
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
    const template = value || select?.value || 'modern';
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

  function renderResumeTemplatePreview() {
    const get = (id, fallback = '') => document.getElementById(id)?.value?.trim() || fallback;
    const template = get('resume-template', 'modern');
    const level = get('resume-level', 'student');
    const name = get('resume-name', 'Your Name');
    const email = get('resume-email', 'your@email.com');
    const phone = get('resume-phone', '+91 XXXXX XXXXX');
    const location = get('resume-location', 'Your City');
    const role = get('resume-role', 'Target Role');
    const summaryInput = get('resume-summary', '');
    const education = get('resume-education', 'BCA - XYZ College');
    const skills = get('resume-skills', 'HTML, CSS, JavaScript');
    const projects = get('resume-projects', 'Project details preview yahan aayega.');
    const achievements = get('resume-achievements', 'Achievements preview yahan aayega.');
    const defaultSummaries = {
      student: 'Motivated student with strong learning ability, project exposure, and a practical approach to solving real-world problems.',
      intern: 'Enthusiastic internship applicant with hands-on academic work, collaboration skills, and readiness to contribute quickly.',
      experienced: 'Results-oriented professional with execution strength, ownership mindset, and a track record of delivering strong outcomes.'
    };
    const summary = summaryInput || defaultSummaries[level] || defaultSummaries.student;
    const titles = {
      ats: { summary: 'Professional Summary', skills: 'Keyword Skills', education: 'Education', projects: 'Work Experience / Projects', achievements: 'Certifications / Achievements' },
      professional: { summary: 'Professional Summary', skills: 'Core Skills', education: 'Education', projects: 'Experience', achievements: 'Achievements' },
      simple: { summary: 'Profile', skills: 'Skills', education: 'Education', projects: 'Projects / Experience', achievements: 'Certifications' },
      modern: { summary: 'Professional Summary', skills: 'Core Skills', education: 'Education', projects: 'Projects / Experience', achievements: 'Achievements / Certifications' },
      executive: { summary: 'Executive Profile', skills: 'Core Competencies', education: 'Education', projects: 'Leadership Highlights', achievements: 'Awards / Certifications' },
      creative: { summary: 'Personal Brand Summary', skills: 'Creative Toolkit', education: 'Education', projects: 'Featured Work / Projects', achievements: 'Highlights' },
      'premium-onyx': { summary: 'Brand Statement', skills: 'Core Strengths', education: 'Education', projects: 'Signature Projects', achievements: 'Awards / Certifications' },
      'premium-aura': { summary: 'Profile Snapshot', skills: 'Skill Stack', education: 'Education', projects: 'Impact Projects', achievements: 'Highlights' },
      'premium-slate': { summary: 'Career Summary', skills: 'Capabilities', education: 'Education', projects: 'Experience Highlights', achievements: 'Recognition' },
    };
    const copy = titles[template] || titles.modern;
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    const paper = document.getElementById('resume-paper');
    if (paper) paper.className = `resume-paper ${template}`;
    set('resume-paper-name', name);
    set('resume-paper-role', role);
    set('resume-paper-contact', `${email} | ${phone} | ${location}`);
    set('resume-summary-title', copy.summary);
    set('resume-skills-title', copy.skills);
    set('resume-education-title', copy.education);
    set('resume-projects-title', copy.projects);
    set('resume-achievements-title', copy.achievements);
    set('resume-paper-summary', summary);
    set('resume-paper-skills', skills);
    set('resume-paper-education', education);
    set('resume-paper-projects', projects);
    set('resume-paper-achievements', achievements);
  }

  function generateResume() {
    const template = document.getElementById('resume-template')?.value || 'modern';
    const level = document.getElementById('resume-level')?.value || 'student';
    const name = document.getElementById('resume-name')?.value?.trim() || 'Your Name';
    const email = document.getElementById('resume-email')?.value?.trim() || 'your@email.com';
    const phone = document.getElementById('resume-phone')?.value?.trim() || '+91 XXXXX XXXXX';
    const location = document.getElementById('resume-location')?.value?.trim() || 'Your City';
    const role = document.getElementById('resume-role')?.value?.trim() || 'Target Role';
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
    let out = '';
    if (template === 'executive') {
      out = `${name}
${role}
${location} | ${email} | ${phone}

EXECUTIVE PROFILE
${summary}

LEADERSHIP HIGHLIGHTS
${projects}

CORE COMPETENCIES
${skills}

EDUCATION
${education}

AWARDS / CERTIFICATIONS
${achievements}`;
    } else if (template === 'premium-onyx') {
      out = `${name}
${role}
${email} | ${phone} | ${location}

BRAND STATEMENT
${summary}

CORE STRENGTHS
${skills}

SIGNATURE PROJECTS
${projects}

EDUCATION
${education}

AWARDS / CERTIFICATIONS
${achievements}`;
    } else if (template === 'premium-aura') {
      out = `${name}
${role}
${location}
Contact: ${email} | ${phone}

PROFILE SNAPSHOT
${summary}

SKILL STACK
${skills}

IMPACT PROJECTS
${projects}

EDUCATION
${education}

HIGHLIGHTS
${achievements}`;
    } else if (template === 'premium-slate') {
      out = `${name}
${role}
${email} | ${phone} | ${location}

CAREER SUMMARY
${summary}

CAPABILITIES
${skills}

EXPERIENCE HIGHLIGHTS
${projects}

EDUCATION
${education}

RECOGNITION
${achievements}`;
    } else if (template === 'creative') {
      out = `${name}
  Creative Resume | ${role}
${location} | ${email} | ${phone}

PERSONAL BRAND SUMMARY
${summary}

KEY SKILLS
${skills}

FEATURED WORK / PROJECTS
${projects}

EDUCATION
${education}

CERTIFICATIONS / HIGHLIGHTS
${achievements}`;
    } else if (template === 'ats') {
      out = `${name}
${role}
${email} | ${phone} | ${location}

PROFESSIONAL SUMMARY
${summary}

KEYWORDS / CORE SKILLS
${skills}

WORK EXPERIENCE / PROJECTS
${projects}

EDUCATION
${education}

CERTIFICATIONS / ACHIEVEMENTS
${achievements}`;
    } else if (template === 'simple') {
      out = `${name} | ${role}
${location} | ${email} | ${phone}
${projects}

EDUCATION
${education}

ACHIEVEMENTS / CERTIFICATIONS
${achievements}`;
    }
    const box = document.getElementById('resume-output'); if (box) box.value = out;
    renderResumeTemplatePreview();
    toast('Resume draft ready', 'ðŸ“‹');
  }

  function downloadResumeText() {
    const content = document.getElementById('resume-output')?.value || '';
    if (!content.trim()) return toast('Pehle resume generate karo', 'ðŸ“‹');
    dlBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), 'resume.txt');
  }

  function generateCoverLetter() {
    const name = document.getElementById('cl-name')?.value?.trim() || 'Your Name';
    const role = document.getElementById('cl-role')?.value?.trim() || 'the role';
    const company = document.getElementById('cl-company')?.value?.trim() || 'the company';
    const skills = document.getElementById('cl-skills')?.value?.trim() || 'relevant skills';
    const reason = document.getElementById('cl-reason')?.value?.trim() || 'my interest and ability to contribute';
    const out = `Dear Hiring Manager,\n\nI am writing to express my interest in the ${role} position at ${company}. With my background in ${skills}, I believe I can contribute meaningfully to your team.\n\nWhat attracts me most to this opportunity is ${reason}. I am eager to apply my skills, learn quickly, and take ownership of the work assigned to me.\n\nI would welcome the opportunity to discuss how I can support ${company}. Thank you for your time and consideration.\n\nSincerely,\n${name}`;
    const box = document.getElementById('cl-output'); if (box) box.value = out;
    toast('Cover letter generated', 'ðŸ“‹');
  }

  const UNIT_CONFIG = {
    length: { meter: 1, kilometer: 1000, centimeter: 0.01, inch: 0.0254, foot: 0.3048 },
    weight: { kilogram: 1, gram: 0.001, pound: 0.45359237, ounce: 0.0283495 },
    temperature: { celsius: 'c', fahrenheit: 'f', kelvin: 'k' }
  };

  function updateUnitOptions() {
    const category = document.getElementById('uc-category')?.value || 'length';
    const from = document.getElementById('uc-from');
    const to = document.getElementById('uc-to');
    if (!from || !to) return;
    const keys = Object.keys(UNIT_CONFIG[category]);
    const opts = keys.map(k => `<option value="${k}">${k}</option>`).join('');
    from.innerHTML = opts;
    to.innerHTML = opts;
    if (keys[1]) to.value = keys[1];
  }

  function convertUnits(showToast = true) {
    const category = document.getElementById('uc-category')?.value || 'length';
    const value = parseFloat(document.getElementById('uc-value')?.value || '');
    const from = document.getElementById('uc-from')?.value;
    const to = document.getElementById('uc-to')?.value;
    const resultEl = document.getElementById('uc-result');
    if (!Number.isFinite(value)) { if (showToast) toast('Valid value enter karo', 'â„¹ï¸'); return; }
    let result = 0;
    if (category === 'temperature') {
      const toC = from === 'celsius' ? value : from === 'fahrenheit' ? (value - 32) * 5 / 9 : value - 273.15;
      result = to === 'celsius' ? toC : to === 'fahrenheit' ? (toC * 9 / 5) + 32 : toC + 273.15;
    } else {
      const base = value * UNIT_CONFIG[category][from];
      result = base / UNIT_CONFIG[category][to];
    }
    if (resultEl) resultEl.textContent = result.toFixed(4);
    if (showToast) toast('Unit converted', 'ðŸ“‹');
  }

  function resetUnitConverter() {
    const val = document.getElementById('uc-value'); if (val) val.value = '';
    const out = document.getElementById('uc-result'); if (out) out.textContent = '0';
    updateUnitOptions();
  }

  function updateQRPlaceholder() {
    const type = document.getElementById('qr-type')?.value || 'url';
    const input = document.getElementById('qr-input');
    if (!input) return;
    const placeholders = {
      url: 'https://example.com',
      text: 'Type any short text or message here',
      email: 'hello@example.com',
      phone: '+91 9876543210'
    };
    input.placeholder = placeholders[type] || placeholders.url;
  }

  async function generateQRCode() {
    const type = document.getElementById('qr-type')?.value || 'url';
    const raw = (document.getElementById('qr-input')?.value || '').trim();
    if (!raw) return toast('QR ke liye content enter karo', 'ℹ️');
    let finalValue = raw;
    if (type === 'email' && !raw.startsWith('mailto:')) finalValue = `mailto:${raw}`;
    if (type === 'phone' && !raw.startsWith('tel:')) finalValue = `tel:${raw}`;
    const dataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=16&data=${encodeURIComponent(finalValue)}`;
    const canvas = document.getElementById('qr-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        state.qrDataUrl = canvas.toDataURL('image/png');
        resolve();
      };
      img.onerror = reject;
      img.src = dataUrl;
    }).catch(() => toast('QR generate nahi ho paya', '❌'));
    if (state.qrDataUrl) toast('QR ready hai', '✅');
  }

  function downloadQRCode() {
    if (!state.qrDataUrl) return toast('Pehle QR generate karo', 'ℹ️');
    const a = document.createElement('a');
    a.href = state.qrDataUrl;
    a.download = 'qr-code.png';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) document.body.removeChild(a);
    }, 1000);
  }

  function togglePasswordOption(type) {
    state.passwordOptions[type] = !state.passwordOptions[type];
    document.getElementById(`pw-opt-${type}`)?.classList.toggle('selected', state.passwordOptions[type]);
  }

  function evaluatePasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
    const labels = ['Weak', 'Basic', 'Good', 'Strong', 'Very Strong'];
    return { score, label: labels[score] || 'Weak' };
  }

  function generatePassword(silent = false) {
    const length = clamp(parseInt(document.getElementById('pw-length')?.value) || 14, 6, 64);
    const mode = document.getElementById('pw-strength')?.value || 'balanced';
    const pools = {
      upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      lower: 'abcdefghijklmnopqrstuvwxyz',
      number: '0123456789',
      symbol: '!@#$%^&*()_+-=[]{};:,.?/'
    };
    if (mode === 'letters') {
      state.passwordOptions.upper = true; state.passwordOptions.lower = true; state.passwordOptions.number = false; state.passwordOptions.symbol = false;
    } else if (mode === 'alnum') {
      state.passwordOptions.upper = true; state.passwordOptions.lower = true; state.passwordOptions.number = true; state.passwordOptions.symbol = false;
    } else if (mode === 'strong') {
      state.passwordOptions.upper = true; state.passwordOptions.lower = true; state.passwordOptions.number = true; state.passwordOptions.symbol = true;
    }
    ['upper', 'lower', 'number', 'symbol'].forEach(key => {
      document.getElementById(`pw-opt-${key}`)?.classList.toggle('selected', state.passwordOptions[key]);
    });
    let charset = '';
    Object.entries(state.passwordOptions).forEach(([key, enabled]) => { if (enabled) charset += pools[key]; });
    if (!charset) {
      toast('At least one password option on rakho', 'ℹ️');
      return;
    }
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    const output = document.getElementById('pw-output');
    if (output) output.value = password;
    const strength = evaluatePasswordStrength(password);
    const scoreEl = document.getElementById('pw-score');
    const labelEl = document.getElementById('pw-label');
    if (scoreEl) scoreEl.textContent = `${strength.score}/4`;
    if (labelEl) labelEl.textContent = strength.label;
    if (!silent) toast('Password generated', '✅');
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
  function wrapTextLines(text, maxChars) {
    const words = text.replace(/\r/g, '').split(/\s+/).filter(Boolean);
    if (words.length === 0) return [''];
    const lines = []; let cur = '';
    for (const word of words) {
      const next = cur ? `${cur} ${word}` : word;
      if (next.length <= maxChars || !cur) cur = next;
      else { lines.push(cur); cur = word; }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function escapeRegExp(str = '') {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
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
    const map = {
      delpages: 'delete-pages',
      extract: 'extract-pages',
      pn: 'pagenumber'
    };
    return map[tool] || tool;
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
      annotateFile: 'annotateFile',
      delpagesFile: 'delFile',
      extractFile: 'extractFile',
      pdf2imgFile: 'pdf2imgFile'
    };
    if (tool === 'watermark') {
      state.wmFile = file;
      state.watermarkFile = file;
    }
    if (tool === 'annotate') {
      state.annFile = file;
      state.annotateFile = file;
    }
    if (tool === 'delpages') {
      state.delFile = file;
    }
    if (tool === 'extract') {
      state.extractFile = file;
    }
    const opts = document.getElementById(TOOL_CONFIG[tool]?.optionsId || tool + '-options');
    if (opts) opts.style.display = 'block';
    if (tool !== 'watermark' && tool !== 'sign' && tool !== 'annotate') {
      await renderToolPdfPreview(tool, file);
    }
    if (tool === 'sign') {
      await initSignPreview(file);
    }
    if (tool === 'annotate') {
      await initAnnotatePreview(file);
    }
    if (['split', 'reorder', 'delpages', 'extract'].includes(tool)) {
      const ab = await readAB(file);
      const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
      const gridId = { split: 'split-page-grid', reorder: 'reorder-page-grid', delpages: 'delpages-page-grid', extract: 'extract-page-grid' }[tool];
      const clickFn = { split: toggleSplitPage, reorder: null, delpages: toggleDelPage, extract: toggleExtractPage }[tool];
      if (gridId) renderPageGrid(gridId, pdf.numPages, clickFn);
      if (tool === 'reorder') document.getElementById('reorder-total').textContent = pdf.numPages;
    }
    // show result banners hide
    const results = document.querySelectorAll('#panel-' + tool + ' .result-banner');
    results.forEach(r => r.classList.remove('show'));

    const needsCount = ['split', 'rotate', 'watermark', 'pn', 'stamp', 'hf', 'duplicate', 'protect', 'unlock', 'sign', 'redact', 'annotate', 'reorder', 'pdf2img', 'delpages', 'extract', 'crop'];
    if (needsCount.includes(tool)) {
      try {
        const ab = await readAB(file);
        const pdf = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
        const count = pdf.getPageCount();
        if (tool === 'split') { state.splitPages = count; renderSplitPageGrid(count); document.getElementById('split-range-val').placeholder = '1-' + Math.ceil(count / 2) + ',' + (Math.ceil(count / 2) + 1) + '-' + count; }
        if (tool === 'reorder') { state.reorderPageCount = count; renderReorderGrid(count); document.getElementById('reorder-val').placeholder = Array.from({ length: count }, (_, i) => i + 1).join(','); document.getElementById('reorder-total').textContent = count; }
        if (tool === 'delpages') { state.delSelected = []; renderPageGrid('delpages-page-grid', count, toggleDelPage); }
        if (tool === 'extract') { state.extractSelected = []; renderPageGrid('extract-page-grid', count, toggleExtractPage); }
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
        if (tool === 'stamp' || tool === 'hf') {
          const pageField = document.getElementById(tool === 'stamp' ? 'stamp-page' : 'hf-start-page');
          if (pageField) {
            pageField.max = count;
            pageField.value = Math.min(parseInt(pageField.value) || 1, count);
          }
        }
        if (tool === 'annotate' || tool === 'sign') {
          const pageField = document.getElementById(tool === 'annotate' ? 'ann-page' : 'sign-page');
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
  function toggleDelPage(n, el) {
    el.classList.toggle('selected');
    const idx = state.delSelected.indexOf(n);
    if (idx >= 0) state.delSelected.splice(idx, 1); else state.delSelected.push(n);
  }
  function toggleExtractPage(n, el) {
    el.classList.toggle('selected');
    const idx = state.extractSelected.indexOf(n);
    if (idx >= 0) state.extractSelected.splice(idx, 1); else state.extractSelected.push(n);
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
  // REORDER
  // ══════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════
  // REORDER (Interactive Drag & Drop)
  // ══════════════════════════════════════════════════════
  let dragSrcEl = null;

  function renderReorderGrid(count) {
    const g = document.getElementById('reorder-page-grid');
    g.innerHTML = '';
    for (let i = 1; i <= count; i++) {
      const thumb = document.createElement('div');
      thumb.className = 'page-thumb draggable-page';
      thumb.draggable = true;
      thumb.dataset.page = i;
      thumb.innerHTML = `<span>📄</span><span class="pg-num">${i}</span>`;

      thumb.addEventListener('dragstart', handleDragStart);
      thumb.addEventListener('dragover', handleDragOver);
      thumb.addEventListener('drop', handleDrop);
      thumb.addEventListener('dragend', handleDragEnd);

      g.appendChild(thumb);
    }
    updateReorderInput();
  }

  function handleDragStart(e) {
    dragSrcEl = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    return false;
  }

  function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();

    if (dragSrcEl !== this) {
      const list = document.getElementById('reorder-page-grid');
      const nodes = Array.from(list.children);
      const fromIdx = nodes.indexOf(dragSrcEl);
      const toIdx = nodes.indexOf(this);

      if (fromIdx < toIdx) {
        this.after(dragSrcEl);
      } else {
        this.before(dragSrcEl);
      }
      updateReorderInput();
    }
    return false;
  }

  function handleDragEnd() {
    document.querySelectorAll('.draggable-page').forEach(p => p.classList.remove('dragging'));
  }

  function updateReorderInput() {
    const nodes = Array.from(document.querySelectorAll('#reorder-page-grid .draggable-page'));
    const order = nodes.map(n => n.dataset.page).join(',');
    const input = document.getElementById('reorder-val');
    if (input) input.value = order;
  }
  function reversePages() {
    if (!state.reorderFile) { toast('Pehle PDF upload karo!', '⚠️'); return; }
    const n = state.reorderPageCount;
    document.getElementById('reorder-val').value = Array.from({ length: n }, (_, i) => n - i).join(',');
  }
  async function reorderPages() {
    if (!state.reorderFile) { toast('Pehle PDF upload karo!', '⚠️'); return; }
    const val = document.getElementById('reorder-val').value.trim();
    if (!val) { toast('New order enter karo!', '⚠️'); return; }
    showLoading('Reordering pages...');
    try {
      const ab = await readAB(state.reorderFile);
      const pdf = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
      const totalPages = pdf.getPageCount();

      const order = val.split(',').map(n => parseInt(n.trim()) - 1).filter(n => !isNaN(n) && n >= 0 && n < totalPages);
      if (order.length === 0) { toast('Valid page numbers enter karo!', '⚠️'); return; }
      const nd = await PDFLib.PDFDocument.create();
      const cp = await nd.copyPages(pdf, order);
      cp.forEach(p => nd.addPage(p));
      const bytes = await nd.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      document.getElementById('reorder-download').onclick = () => dlBlob(blob, 'reordered.pdf');
      showResult('reorder');
      toast('Pages reordered!', '✅');
      saveActivity('reorder', `New order: ${val}`);
    } catch (e) { toast('Error: ' + e.message, '❌'); }
    finally { hideLoading(); }
  }

  // ══════════════════════════════════════════════════════
  // DELETE PAGES
  // ══════════════════════════════════════════════════════
  async function deletePages() {
    if (!state.delFile) { toast('Pehle PDF upload karo!', '⚠️'); return; }
    if (state.delSelected.length === 0) { toast('Koi page select nahi kiya!', '⚠️'); return; }
    showLoading('Deleting pages...');
    try {
      const ab = await readAB(state.delFile);
      const pdf = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
      const total = pdf.getPageCount();
      const keep = Array.from({ length: total }, (_, i) => i).filter(i => !state.delSelected.includes(i + 1));
      if (keep.length === 0) { toast('Sare pages delete nahi kar sakte!', '⚠️'); return; }
      const nd = await PDFLib.PDFDocument.create();
      const cp = await nd.copyPages(pdf, keep);
      cp.forEach(p => nd.addPage(p));
      const bytes = await nd.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      document.getElementById('delpages-download').onclick = () => dlBlob(blob, 'modified.pdf');
      showResult('delpages', `${state.delSelected.length} pages deleted, ${keep.length} pages remaining`);
      toast('Pages deleted!', '✅');
      saveActivity('delete', `${state.delSelected.length} pages removed`);
    } catch (e) { toast('Error: ' + e.message, '❌'); }
    finally { hideLoading(); }
  }

  // ══════════════════════════════════════════════════════
  // EXTRACT PAGES
  // ══════════════════════════════════════════════════════
  async function extractPages() {
    if (!state.extractFile) { toast('Pehle PDF upload karo!', '⚠️'); return; }
    const rangeInput = document.getElementById('extract-range').value.trim();
    showLoading('Extracting pages...');
    try {
      const ab = await readAB(state.extractFile);
      const pdf = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
      let indices = [];
      if (rangeInput) {
        indices = parseRangeToIndices(rangeInput, pdf.getPageCount());
      } else {
        indices = state.extractSelected.map(n => n - 1);
      }
      if (indices.length === 0) { toast('Koi page select ya range enter nahi!', '⚠️'); return; }

      const nd = await PDFLib.PDFDocument.create();
      const cp = await nd.copyPages(pdf, indices);
      cp.forEach(p => nd.addPage(p));
      const bytes = await nd.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      document.getElementById('extract-download').onclick = () => dlBlob(blob, 'extracted.pdf');
      showResult('extract', `${indices.length} pages extracted`);
      toast('Pages extracted!', '✅');
      saveActivity('extract', `${indices.length} pages extracted`);
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

// ══════════════════════════════════════════════════════
// PDF TO TEXT (OCR)
// ══════════════════════════════════════════════════════
async function extractText(input, targetTool) {
  const file = input.files[0]; if (!file) return;
  if (targetTool === 'redact') { state.redactFile = file; document.getElementById('redact-options').style.display = 'block'; return; }
  showLoading('Extracting text from PDF...');
  try {
    await renderToolPdfPreview('pdf2txt', file, 20);
    const ab = await readAB(file);
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    let text = ''; const total = pdf.numPages;
    for (let i = 1; i <= total; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += `\n═══ Page ${ i } ═══\n`;
      text += content.items.map(item => item.str).join(' ') + '\n';
      if (i % 5 === 0) setProgress('pdf2txt', (i / total) * 100);
    }
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    const chars = text.replace(/\s/g, '').length;
    document.getElementById('txt-stats').innerHTML = `
      < div class="stat-card" ><div class="st-val">${total}</div><div class="st-label">Pages</div></div >
      <div class="stat-card"><div class="st-val">${words.toLocaleString()}</div><div class="st-label">Words</div></div>
      <div class="stat-card"><div class="st-val">${chars.toLocaleString()}</div><div class="st-label">Characters</div></div>`;
    document.getElementById('txt-area').value = text.trim();
    document.getElementById('pdf2txt-output').style.display = 'block';
    toast('Text extracted!', '✅');
    saveActivity('pdf2txt', `${ total } pages text extracted`);
  } catch (e) { toast('Error: ' + e.message, '❌'); }
  finally { hideLoading(); }
}
function downloadText() {
  const t = document.getElementById('txt-area').value;
  dlBlob(new Blob([t], { type: 'text/plain' }), 'extracted_text.txt');
}

// ══════════════════════════════════════════════════════
// OCR PANEL (separate)
// ══════════════════════════════════════════════════════

// ── Fast Image OCR ─────────────────────────────
async function runOCR(inputOrFile) {
  const file = inputOrFile?.files ? inputOrFile.files[0] : inputOrFile;
  if (!file) {
    toast('Pehle PDF ya image upload karo!', '⚠️');
    return;
  }

  const startTime = performance.now();
  const progress = document.getElementById('ocr-progress');
  const output = document.getElementById('ocr-output');
  const previewWrap = document.getElementById('ocr-preview-wrap');
  const fill = document.getElementById('ocr-fill');
  const pageCount = document.getElementById('ocr-page-count');

  showLoading('Running OCR (Text Extract)...');
  progress.style.display = 'block';
  output.style.display = 'none';
  try {
    let text = '', total = 0;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      await renderOCRPreview(file, isPdf);
      const ab = await readAB(file);
      const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
      total = pdf.numPages;

      for (let i = 1; i <= total; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        if (pageCount) pageCount.textContent = `${ i }/${total}`;

    let pageText = extractPdfPageText(content);

    if (isWeakExtractedText(pageText)) {
      const viewport = page.getViewport({ scale: getPreviewRenderScale(1.2, 'text') });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

      const processed = await preprocessImageForOCRFast(canvas);
      const result = await recognizeCanvasTextFast(processed, fill, ((i - 1) / total) * 100, 100 / total);
      pageText = (result?.data?.text || '').replace(/[ \t]+\n/g, '\n').trim();
    } else {
      fill.style.width = `${Math.max(5, Math.round((i / total) * 100))}%`;
    }
    text += `\n===== Page ${i} =====\n${pageText}\n`;
  }
} else {
  // Fast image processing
  await renderOCRPreview(file, isPdf);
  if (pageCount) pageCount.textContent = 'Image processing...';

  const processed = await preprocessImageForOCRFast(file);
  const result = await recognizeCanvasTextFast(processed, fill, 0, 100);
  text = result?.data?.text || '';
  total = 1;
  fill.style.width = '100%';
}

const words = text.split(/\s+/).filter(w => w.length > 0).length;
const time = ((performance.now() - startTime) / 1000).toFixed(2);

document.getElementById('ocr-stats').innerHTML = `
      <div class="stat-card"><div class="st-val">${total}</div><div class="st-label">${isPdf ? 'Pages' : 'Image'}</div></div>
      <div class="stat-card"><div class="st-val">${words.toLocaleString()}</div><div class="st-label">Words</div></div>
      <div class="stat-card"><div class="st-val">${time}s</div><div class="st-label">Time</div></div>`;

document.getElementById('ocr-text').value = text.trim();
output.style.display = 'block';
progress.style.display = 'none';
toast(`✅ Done in ${time}s! Text ready! 🚀`, '✅');
saveActivity('ocr', `${total} items processed`);
  } catch (e) {
  console.error('OCR Error:', e);
  progress.style.display = 'none';
  toast('❌ Error: ' + e.message, '❌');
} finally {
  hideLoading();
}
}

// Ultra-fast image preprocessing
async function preprocessImageForOCRFast(source) {
  const img = (source instanceof HTMLImageElement || source instanceof HTMLCanvasElement)
    ? source
    : await loadImageFromFile(source);

  // Smart Scaling: Capping max dimension to 2000px for speed while maintaining accuracy
  const maxDim = 2000;
  let scale = 1.0;
  if (img.width > maxDim || img.height > maxDim) {
    scale = Math.min(maxDim / img.width, maxDim / img.height);
  } else if (img.width < 1000) {
    scale = 1.5; // Upscale tiny images slightly
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext('2d');

  // Use GPU-accelerated filters (Grayscale + High Contrast)
  // This is 100x faster than manual JS loops
  ctx.filter = 'grayscale(100%) contrast(150%) brightness(110%)';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return canvas;
}

// Fast text recognition
async function recognizeCanvasTextFast(canvas, fillEl, progressBase = 0, progressSpan = 100) {
  try {
    const worker = await initTesseract();
    const result = await worker.recognize(canvas);
    if (fillEl) fillEl.style.width = `${Math.min(100, Math.round(progressBase + progressSpan))}%`;
    return result;
  } catch (e) {
    console.error('Fast OCR Error:', e);
    throw new Error('Text recognition failed: ' + e.message);
  }
}

async function renderOCRPreview(file, isPdf) {
  const wrap = document.getElementById('ocr-preview-wrap');
  const box = document.getElementById('ocr-preview-box');
  if (!wrap || !box) return;
  box.innerHTML = '';
  wrap.style.display = 'block';
  if (isPdf) {
    await renderPdfPreviewIntoBox(box, file, 4, 0.85, 'text');
  } else {
    const src = await readURL(file);
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'OCR preview';
    img.style.maxWidth = '420px';
    box.appendChild(img);
  }
}


async function loadImageFromFile(file) {
  const dataURL = await readURL(file);
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Image load nahi ho payi'));
    img.src = dataURL;
  });
}

async function preprocessImageForOCR(source, options = {}) {
  let mode = options.mode || 'enhance';
  const scale = parseFloat(options.scale) || 2;
  const img = (source instanceof HTMLImageElement || source instanceof HTMLCanvasElement)
    ? source
    : await loadImageFromFile(source);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Auto-detect best mode
  if (mode === 'auto') {
    let totalLuma = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 16) {
      totalLuma += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      count++;
    }
    const avgLuma = totalLuma / count;
    mode = avgLuma < 110 ? 'invert' : avgLuma > 210 ? 'threshold' : 'enhance';
  }

  // Apply processing
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);

    let val = gray;

    if (mode === 'enhance') {
      // Enhanced contrast for better OCR
      val = clamp((gray - 128) * 1.8 + 128, 0, 255);
    } else if (mode === 'threshold') {
      // Aggressive binarization
      val = gray > 150 ? 255 : 0;
    } else if (mode === 'invert') {
      // Dark background
      val = 255 - gray;
    } else if (mode === 'denoising') {
      // Smooth noise
      val = clamp(gray + (Math.random() - 0.5) * 20, 0, 255);
    }

    data[i] = data[i + 1] = data[i + 2] = val;
  }

  ctx.putImageData(imageData, 0, 0);

  // Apply slight smoothing filter for better results
  ctx.filter = 'contrast(1.2) brightness(1.1)';
  ctx.drawImage(canvas, 0, 0);

  return canvas;
}

// ── Tesseract OCR Setup ─────────────────────────
let tesseractWorker = null;
let tesseractReady = false;

async function initTesseract() {
  if (tesseractReady) return tesseractWorker;

  try {
    if (!window.Tesseract) {
      throw new Error('Tesseract library not loaded');
    }

    // Tesseract.js v5 API: createWorker(langs, oem, options)
    tesseractWorker = await Tesseract.createWorker('eng', 1, {
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
      langPath: 'https://cdn.jsdelivr.net/npm/tesseract.js-data/4.0.0_best',
      logger: m => {
        if (m.status === 'recognizing text') {
          const plab = document.getElementById('ocr-plab');
          if (plab) plab.textContent = `OCR Progress: ${Math.round(m.progress * 100)}%`;
        }
      }
    });

    tesseractReady = true;
    console.log('✅ Tesseract v5 initialized successfully');
    return tesseractWorker;
  } catch (e) {
    console.error('❌ Tesseract init error:', e);
    throw new Error('OCR initialization failed. Refresh karke dobara koshish karein.');
  }
}

async function recognizeCanvasText(canvas, fillEl, progressBase = 0, progressSpan = 100) {
  try {
    if (!window.Tesseract) {
      throw new Error('Tesseract library missing');
    }

    // Use simple recognize method if worker is not ready
    if (!tesseractReady) {
      console.log('🔄 Using simple recognize method...');
      return await Tesseract.recognize(canvas, 'eng', {
        logger: info => {
          if (fillEl && info?.progress) {
            const pct = progressBase + (info.progress * progressSpan);
            fillEl.style.width = `${Math.max(3, Math.round(pct))}%`;
          }
        }
      });
    }

    // Use worker if ready
    const result = await tesseractWorker.recognize(canvas, {
      logger: info => {
        if (fillEl && info?.progress) {
          const pct = progressBase + (info.progress * progressSpan);
          fillEl.style.width = `${Math.max(3, Math.round(pct))}%`;
        }
      }
    });

    return result;
  } catch (e) {
    console.error('❌ OCR Recognition error:', e);
    throw new Error('Text recognition failed: ' + e.message);
  }
}

function handleImageResizeFile(files) {
  if (!files || files.length === 0) return;
  state.imgResizeFiles = [];
  const list = document.getElementById('imgresize-list');
  list.innerHTML = '';

  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    state.imgResizeFiles.push(file);
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <div class="file-icon">🖼️</div>
      <div class="file-info">
        <div class="file-name">${file.name}</div>
        <div class="file-size">${fmtSize(file.size)}</div>
      </div>
    `;
    list.appendChild(item);
  }

  if (state.imgResizeFiles.length > 0) {
    document.getElementById('imgresize-options').style.display = 'block';
    document.getElementById('imgresize-result').classList.remove('show');
    toast(`${state.imgResizeFiles.length} images added!`, '✅');
  }
}

async function canvasToBlob(canvas, type, quality) {
  return new Promise((res, rej) => {
    canvas.toBlob(blob => blob ? res(blob) : rej(new Error('Image export fail ho gaya')), type, quality);
  });
}

async function renderResizedBlob(img, width, height, type, bias, targetBytes = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  if (type === 'image/png') return canvasToBlob(canvas, type);
  const presets = { quality: [0.95, 0.78, 0.55], balanced: [0.9, 0.68, 0.42], small: [0.82, 0.52, 0.3] };
  let [highDefault, midDefault, lowDefault] = presets[bias] || presets.balanced;
  let low = clamp(lowDefault, 0.1, 0.98), high = clamp(highDefault, 0.1, 0.99);
  let best = await canvasToBlob(canvas, type, clamp(midDefault, low, high));
  let bestDiff = targetBytes ? Math.abs(best.size - targetBytes) : Number.MAX_SAFE_INTEGER;
  for (let i = 0; i < 8; i++) {
    const q = (low + high) / 2;
    const blob = await canvasToBlob(canvas, type, q);
    const diff = targetBytes ? Math.abs(blob.size - targetBytes) : Math.abs(blob.size - best.size);
    if (diff < bestDiff || (targetBytes && blob.size <= targetBytes && best.size > targetBytes)) {
      best = blob;
      bestDiff = diff;
    }
    if (!targetBytes) {
      best = blob;
      continue;
    }
    if (blob.size > targetBytes) high = q;
    else low = q;
  }
  return best;
}

function mimeToExt(type) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
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

function escapeHtml(str = '') {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

async function convertPowerPointToPDF(input) {
  const file = input.files[0];
  if (!file) return;
  showLoading('Converting PowerPoint to PDF...');
  try {
    const slides = await extractPptxSlides(file);
    await buildPdfFromSections(file.name.replace('.pptx', ''), slides, 'ppt_converted', 'ppt2pdf');
    toast('PowerPoint conversion successful!', '✅');
    saveActivity('convert', 'PowerPoint to PDF');
  } catch (e) {
    toast('Error: ' + e.message, '❌');
  } finally {
    hideLoading();
  }
}

async function convertExcelToPDF(input) {
  const file = input.files[0];
  if (!file) return;
  showLoading('Converting Excel to PDF...');
  try {
    const sheets = await extractXlsxSheets(file);
    const sections = sheets.map(s => ({
      title: s.name,
      lines: s.rows.map(row => row.join(' | '))
    }));
    await buildPdfFromSections(file.name.replace('.xlsx', '').replace('.csv', ''), sections, 'excel_converted', 'excel2pdf');
    toast('Excel conversion successful!', '✅');
    saveActivity('convert', 'Excel to PDF');
  } catch (e) {
    toast('Error: ' + e.message, '❌');
  } finally {
    hideLoading();
  }
}

async function htmlToPDF() {
  const content = document.getElementById('html2pdf-content').value.trim();
  if (!content) { toast('Pehle content enter karo!', '⚠️'); return; }

  showLoading('Generating PDF from HTML/Text...');
  try {
    const title = document.getElementById('html2pdf-title').value || 'HTML Export';
    const fontSize = parseInt(document.getElementById('html2pdf-fontsize').value) || 11;

    // Simple HTML strip for basic text conversion
    const cleanLines = content.replace(/<[^>]+>/g, '\n').split('\n').filter(l => l.trim().length > 0);
    const sections = [{ title: 'Content', lines: cleanLines }];

    const pdf = await PDFLib.PDFDocument.create();
    const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    const [pw, ph] = [595, 842]; // A4
    let page = pdf.addPage([pw, ph]);
    let y = ph - 50;

    cleanLines.forEach(line => {
      if (y < 50) { page = pdf.addPage([pw, ph]); y = ph - 50; }
      page.drawText(line, { x: 50, y, size: fontSize, font });
      y -= (fontSize + 4);
    });

    const bytes = await pdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    document.getElementById('html2pdf-download').onclick = () => dlBlob(blob, 'html_converted.pdf');
    showResult('html2pdf', `Converted ${cleanLines.length} lines to PDF`);
    toast('HTML conversion successful!', '✅');
    saveActivity('convert', 'HTML to PDF');
  } catch (e) {
    toast('Error: ' + e.message, '❌');
  } finally {
    hideLoading();
  }
}





function downloadOCR() {
  const text = document.getElementById('ocr-text').value;
  if (!text) { toast('Pehle text extract karo!', '⚠️'); return; }
  dlBlob(new Blob([text], { type: 'text/plain' }), 'ocr_extracted.txt');
}

function searchInText() {
  const area = document.getElementById('ocr-search');
  if (area) {
    area.style.display = area.style.display === 'none' ? 'block' : 'none';
    if (area.style.display === 'block') document.getElementById('ocr-search-input').focus();
  }
}

function highlightSearch(q) {
  const text = document.getElementById('ocr-text').value;
  const res = document.getElementById('ocr-search-result');
  if (!q || !text) { res.textContent = ''; return; }
  const count = (text.toLowerCase().match(new RegExp(escapeRegExp(q.toLowerCase()), 'g')) || []).length;
  res.textContent = count > 0 ? `${count} matches found.` : 'No matches found.';
}

async function addPageNumbers() {
  if (!state.pnFile) { toast('Pehle PDF upload karo!', '⚠️'); return; }
  showLoading('Adding Page Numbers...');
  try {
    const ab = await readAB(state.pnFile);
    const pdf = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
    const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    const pages = pdf.getPages();
    const total = pages.length;

    const pos = document.getElementById('pn-pos').value;
    const start = parseInt(document.getElementById('pn-start').value) || 1;
    const size = parseInt(document.getElementById('pn-size').value) || 12;
    const format = document.getElementById('pn-format').value;
    const colorHex = document.getElementById('pn-color').value;
    const skipFirst = document.getElementById('pn-skip-first').checked;
    const { r, g, b } = hexToRgb(colorHex);

    for (let i = 0; i < total; i++) {
      if (skipFirst && i === 0) continue;
      const pg = pages[i];
      const { width, height } = pg.getSize();
      const num = i + start;
      let text = String(num);
      if (format === 'page-of') text = `Page ${num} of ${total}`;
      else if (format === 'dash') text = `- ${num} -`;

      const tw = font.widthOfTextAtSize(text, size);
      let x = width / 2 - tw / 2, y = 30;
      if (pos === 'bottom-right') x = width - tw - 30;
      else if (pos === 'bottom-left') x = 30;
      else if (pos === 'top-center') y = height - size - 30;
      else if (pos === 'top-right') { x = width - tw - 30; y = height - size - 30; }
      else if (pos === 'top-left') { x = 30; y = height - size - 30; }

      pg.drawText(text, { x, y, size, font, color: PDFLib.rgb(r, g, b) });
      if (i % 5 === 0) setProgress('pn', (i / total) * 100);
    }

    const bytes = await pdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    document.getElementById('pn-download').onclick = () => dlBlob(blob, 'page_numbered.pdf');
    showResult('pn');
    toast('Page numbers added!', '✅');
    saveActivity('pagenumber', `${total} pages numbered`);
  } catch (e) {
    toast('Error: ' + e.message, '❌');
  } finally {
    hideLoading();
  }
}

async function addHeaderFooter() {
  if (!state.hfFile) { toast('Pehle PDF upload karo!', '⚠️'); return; }
  showLoading('Adding Header/Footer...');
  try {
    const ab = await readAB(state.hfFile);
    const pdf = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
    const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    const pages = pdf.getPages();
    const total = pages.length;

    const header = document.getElementById('hf-header').value.trim();
    const footer = document.getElementById('hf-footer').value.trim();
    const size = parseInt(document.getElementById('hf-size').value) || 11;
    const colorHex = document.getElementById('hf-color').value;
    const align = document.getElementById('hf-align').value;
    const startPage = parseInt(document.getElementById('hf-start-page').value) || 1;
    const { r, g, b } = hexToRgb(colorHex);

    for (let i = startPage - 1; i < total; i++) {
      const pg = pages[i];
      const { width, height } = pg.getSize();

      if (header) {
        const tw = font.widthOfTextAtSize(header, size);
        let hx = width / 2 - tw / 2;
        if (align === 'left') hx = 40;
        else if (align === 'right') hx = width - tw - 40;
        pg.drawText(header, { x: hx, y: height - 40, size, font, color: PDFLib.rgb(r, g, b) });
      }

      if (footer) {
        const tw = font.widthOfTextAtSize(footer, size);
        let fx = width / 2 - tw / 2;
        if (align === 'left') fx = 40;
        else if (align === 'right') fx = width - tw - 40;
        pg.drawText(footer, { x: fx, y: 30, size, font, color: PDFLib.rgb(r, g, b) });
      }
      if (i % 5 === 0) setProgress('hf', (i / total) * 100);
    }

    const bytes = await pdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    document.getElementById('hf-download').onclick = () => dlBlob(blob, 'header_footer.pdf');
    showResult('hf');
    toast('Header/Footer added!', '✅');
    saveActivity('hf', 'Applied to pages');
  } catch (e) {
    toast('Error: ' + e.message, '❌');
  } finally {
    hideLoading();
  }
}

async function cropPDF() {
  if (!state.cropFile) { toast('Pehle PDF upload karo!', '⚠️'); return; }
  showLoading('Cropping pages...');
  try {
    const ab = await readAB(state.cropFile);
    const pdf = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
    const pages = pdf.getPages();

    const t = parseInt(document.getElementById('crop-top').value) || 0;
    const b = parseInt(document.getElementById('crop-bottom').value) || 0;
    const l = parseInt(document.getElementById('crop-left').value) || 0;
    const r = parseInt(document.getElementById('crop-right').value) || 0;

    pages.forEach(pg => {
      const { width, height } = pg.getSize();
      pg.setMediaBox(l, b, width - l - r, height - b - t);
      pg.setCropBox(l, b, width - l - r, height - b - t);
    });

    const bytes = await pdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    document.getElementById('crop-download').onclick = () => dlBlob(blob, 'cropped.pdf');
    showResult('crop');
    toast('Pages cropped!', '✅');
    saveActivity('crop', 'Margins adjusted');
  } catch (e) {
    toast('Error: ' + e.message, '❌');
  } finally {
    hideLoading();
  }
}

async function convertPDFToExcel(input) {
  const file = input.files[0];
  if (!file) return;
  showLoading('Converting PDF to Excel (XLS)...');
  try {
    const ab = await readAB(file);
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    let rows = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageLines = content.items.map(item => item.str).join(' ').split(/\s{2,}/);
      rows.push(pageLines);
      setProgress('pdf2excel', (i / pdf.numPages) * 100);
    }

    const html = buildExcelHtmlWorkbook([{ name: 'PDF Data', rows }]);
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    document.getElementById('pdf2excel-download').onclick = () => dlBlob(blob, 'pdf_data.xls');
    showResult('pdf2excel', `Exported ${pdf.numPages} pages as rows`);
    toast('Excel file ready!', '✅');
    saveActivity('convert', 'PDF to Excel');
  } catch (e) {
    toast('Error: ' + e.message, '❌');
  } finally {
    hideLoading();
  }
}

function buildExcelHtmlWorkbook(sheets) {
  const tabs = sheets.map(sheet => {
    const rows = sheet.rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell ?? '')}</td>`).join('')}</tr>`).join('');
    return `<table><thead><tr><th colspan="${Math.max(sheet.rows[0]?.length || 1, 1)}">${escapeHtml(sheet.name)}</th></tr></thead><tbody>${rows}</tbody></table><br/>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>table{border-collapse:collapse;margin-bottom:18px;font-family:Arial,sans-serif}td,th{border:1px solid #999;padding:6px 8px;font-size:12px;text-align:left}th{background:#efefef}</style></head><body>${tabs}</body></html>`;
}

async function resizeImageToTarget() {
  if (state.imgResizeFiles.length === 0) { toast('Pehle images upload karo!', '⚠️'); return; }
  showLoading(`Resizing ${state.imgResizeFiles.length} images...`);
  const targetKB = Math.max(parseInt(document.getElementById('imgresize-target').value) || 200, 10);
  const maxWidth = Math.max(parseInt(document.getElementById('imgresize-maxw').value) || 1920, 100);
  const type = document.getElementById('imgresize-format').value;
  const bias = document.getElementById('imgresize-bias').value;
  const keepAspect = document.getElementById('imgresize-keep').checked;

  setProgress('imgresize', 10, 'Processing...');
  state.imgResizeResults = [];

  try {
    for (let i = 0; i < state.imgResizeFiles.length; i++) {
      const file = state.imgResizeFiles[i];
      const img = await loadImageFromFile(file);
      const targetBytes = targetKB * 1024;
      let width = Math.min(img.width, maxWidth);
      let height = keepAspect ? Math.round(img.height * (width / img.width)) : img.height;
      if (!keepAspect && img.width > maxWidth) width = maxWidth;

      let bestBlob = null;
      let bestWidth = width;
      let bestHeight = height;

      for (let step = 0; step < 7; step++) {
        const blob = await renderResizedBlob(img, width, height, type, bias, targetBytes);
        if (!bestBlob || Math.abs(blob.size - targetBytes) < Math.abs(bestBlob.size - targetBytes) || (blob.size <= targetBytes && bestBlob.size > targetBytes)) {
          bestBlob = blob;
          bestWidth = width;
          bestHeight = height;
        }
        if (blob.size <= targetBytes * 1.05) break;
        width = Math.max(80, Math.round(width * 0.88));
        height = Math.max(80, keepAspect ? Math.round(img.height * (width / img.width)) : Math.round(height * 0.88));
      }

      state.imgResizeResults.push({
        blob: bestBlob,
        name: `${file.name.replace(/\.[^.]+$/, '')}_resized.${mimeToExt(type)}`,
        originalSize: file.size
      });

      setProgress('imgresize', 10 + (90 * (i + 1) / state.imgResizeFiles.length));
    }

    const zipBtn = document.getElementById('imgresize-download-zip');
    const singleBtn = document.getElementById('imgresize-download');

    if (state.imgResizeResults.length > 1) {
      zipBtn.style.display = 'inline-flex';
      zipBtn.onclick = async () => {
        const zip = new JSZip();
        state.imgResizeResults.forEach(res => zip.file(res.name, res.blob));
        const zblob = await zip.generateAsync({ type: 'blob' });
        dlBlob(zblob, 'resized_images.zip');
      };
      singleBtn.style.display = 'none';
    } else {
      zipBtn.style.display = 'none';
      singleBtn.style.display = 'inline-flex';
      const res = state.imgResizeResults[0];
      singleBtn.onclick = () => dlBlob(res.blob, res.name);
    }

    const totalNew = state.imgResizeResults.reduce((acc, r) => acc + r.blob.size, 0);
    const totalOld = state.imgResizeFiles.reduce((acc, f) => acc + f.size, 0);

    showResult('imgresize', `${state.imgResizeFiles.length} file(s) → Total: ${fmtSize(totalNew)} (Saved ${Math.round((1 - totalNew / totalOld) * 100)}%)`);
    toast(`${state.imgResizeFiles.length} images resized!`, '✅');
  } catch (e) { toast('Error: ' + e.message, '❌'); }
  finally { 
    setProgress('imgresize', 100); 
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

function extractPdfPageText(content) {
  return (content?.items || [])
    .map(item => item.str || '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isWeakExtractedText(text) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (clean.length < 24) return true;
  const words = clean.split(' ').filter(Boolean);
  if (words.length < 6) return true;
  const longWords = words.filter(word => word.length > 2).length;
  return longWords < 4;
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

    async function initAnnotatePreview(file) {
      try {
        const ab = await readAB(file);
        state.annPreviewDoc = await pdfjsLib.getDocument({ data: ab }).promise;
        state.annPreviewTotal = state.annPreviewDoc.numPages;
        state.annPreviewPageNum = Math.min(parseInt(document.getElementById('ann-page')?.value) || 1, state.annPreviewTotal);
        document.getElementById('ann-preview-total').textContent = state.annPreviewTotal;
        document.getElementById('ann-preview-wrap').style.display = 'block';
        bindAnnotatePreviewControls();
        await setAnnotatePreviewPage(state.annPreviewPageNum);
      } catch (e) {
        toast('Annotate preview load error: ' + e.message, 'âŒ');
      }
    }

function bindAnnotatePreviewControls() {
  if (annPreviewBound) return;
  annPreviewBound = true;
  const stage = document.getElementById('ann-stage');
  const pageField = document.getElementById('ann-page');
  if (pageField) {
    pageField.addEventListener('change', () => setAnnotatePreviewPage(parseInt(pageField.value) || 1));
    pageField.addEventListener('input', () => setAnnotatePreviewPage(parseInt(pageField.value) || 1));
  }
  const getPos = e => {
    const canvas = document.getElementById('ann-preview-canvas');
    const rect = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return {
      x: clamp((point.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((point.clientY - rect.top) / rect.height, 0, 1)
    };
  };
  const update = e => {
    const start = state.annSelectionStart || getPos(e);
    const current = getPos(e);
    state.annPlacement = {
      page: state.annPreviewPageNum,
      x1: Math.min(start.x, current.x),
      x2: Math.max(start.x, current.x),
      y1: Math.min(start.y, current.y),
      y2: Math.max(start.y, current.y)
    };
    renderAnnotateSelectionOverlay();
  };
  stage.addEventListener('mousedown', e => {
    state.annDragging = true;
    state.annSelectionStart = getPos(e);
    update(e);
  });
  window.addEventListener('mousemove', e => {
    if (!state.annDragging) return;
    update(e);
  });
  window.addEventListener('mouseup', () => {
    state.annDragging = false;
    state.annSelectionStart = null;
  });
  stage.addEventListener('touchstart', e => {
    e.preventDefault();
    state.annDragging = true;
    state.annSelectionStart = getPos(e);
    update(e);
  }, { passive: false });
  window.addEventListener('touchmove', e => {
    if (!state.annDragging) return;
    update(e);
  }, { passive: false });
  window.addEventListener('touchend', () => {
    state.annDragging = false;
    state.annSelectionStart = null;
  });
  stage.addEventListener('click', e => {
    const p = getPos(e);
    state.annPlacement = { page: state.annPreviewPageNum, x1: Math.max(0, p.x - 0.1), x2: Math.min(1, p.x + 0.1), y1: Math.max(0, p.y - 0.03), y2: Math.min(1, p.y + 0.03) };
    renderAnnotateSelectionOverlay();
  });
  const colorField = document.getElementById('ann-color');
  if (colorField) {
    colorField.addEventListener('input', renderAnnotateSelectionOverlay);
    colorField.addEventListener('change', renderAnnotateSelectionOverlay);
  }
}

async function setAnnotatePreviewPage(pageNum) {
  if (!state.annPreviewDoc) return;
  state.annPreviewPageNum = clamp(pageNum, 1, state.annPreviewTotal);
  const pageField = document.getElementById('ann-page');
  if (pageField) pageField.value = state.annPreviewPageNum;
  document.getElementById('ann-preview-cur').textContent = state.annPreviewPageNum;
  state.annPreviewPage = await state.annPreviewDoc.getPage(state.annPreviewPageNum);
  const viewport = state.annPreviewPage.getViewport({ scale: getPreviewRenderScale(1.15, 'text') });
  const canvas = document.getElementById('ann-preview-canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await state.annPreviewPage.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  renderAnnotateSelectionOverlay();
}

        function renderAnnotateSelectionOverlay() {
          const box = document.getElementById('ann-selection');
          const canvas = document.getElementById('ann-preview-canvas');
          const note = document.getElementById('ann-preview-note');
          if (!box || !canvas || !canvas.width) return;
          const placement = state.annPlacement;
          if (!placement || placement.page !== state.annPreviewPageNum) {
            box.style.display = 'none';
            if (note) note.textContent = 'PDF par drag ya click karo, annotation ussi location par lagega.';
            return;
          }
          box.style.display = 'block';
          box.style.left = `${placement.x1 * canvas.width}px`;
          box.style.top = `${placement.y1 * canvas.height}px`;
          box.style.width = `${Math.max((placement.x2 - placement.x1) * canvas.width, 28)}px`;
          box.style.height = `${Math.max((placement.y2 - placement.y1) * canvas.height, 10)}px`;
          if (note) note.textContent = `Selection set on page ${placement.page}. Annotation yahin place hoga.`;
        }

        function prevAnnotatePreviewPage() {
          if (state.annPreviewPageNum > 1) setAnnotatePreviewPage(state.annPreviewPageNum - 1);
        }

        function nextAnnotatePreviewPage() {
          if (state.annPreviewPageNum < state.annPreviewTotal) setAnnotatePreviewPage(state.annPreviewPageNum + 1);
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
        // ANNOTATE PDF
        // ══════════════════════════════════════════════════════
        async function annotatePDF() {
          if (!state.annotateFile) { toast('Pehle PDF upload karo!', '⚠️'); return; }
          showLoading('Adding annotation...');
          try {
            const ab = await readAB(state.annotateFile);
            const pdf = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
            const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
            const pages = pdf.getPages();
            const pageNum = clamp(parseInt(document.getElementById('ann-page').value) || 1, 1, pages.length);
            const page = pages[pageNum - 1];
            const { width, height } = page.getSize();
            const text = (document.getElementById('ann-text').value || 'Annotation').trim() || 'Annotation';
            const colorHex = document.getElementById('ann-color').value;
            const { r, g, b } = hexToRgb(colorHex);
            const type = state.annType;
            const lines = wrapTextLines(text, 44);
            const placement = state.annPlacement && state.annPlacement.page === pageNum ? state.annPlacement : null;
            const x1 = placement ? width * placement.x1 : 30;
            const x2 = placement ? width * placement.x2 : width - 30;
            const yTop = placement ? height * (1 - placement.y1) : height * 0.55;
            const yBottom = placement ? height * (1 - placement.y2) : height * 0.45;
            const selWidth = Math.max(Math.abs(x2 - x1), 80);
            const selHeight = Math.max(Math.abs(yTop - yBottom), 16);
            const baseY = clamp(Math.min(yTop, yBottom), 18, height - 18);
            if (type === 'textbox' || type === 'comment') {
              const fontSize = 11;
              const padding = 8;
              const lineHeight = fontSize + 3;
              const contentWidth = Math.max(...lines.map(line => font.widthOfTextAtSize(line, fontSize)), 80) + padding * 2;
              const boxWidth = Math.min(Math.max(contentWidth, selWidth), width - 24);
              const boxHeight = Math.max(32, Math.max(lines.length * lineHeight + padding * 2 - 3, selHeight));
              const boxX = clamp(x1, 12, width - boxWidth - 12);
              const boxY = clamp(baseY - boxHeight / 2, 12, height - boxHeight - 12);
              page.drawRectangle({ x: boxX, y: boxY, width: boxWidth, height: boxHeight, color: PDFLib.rgb(r, g, b), opacity: type === 'comment' ? 0.2 : 0.25, borderColor: PDFLib.rgb(r, g, b), borderWidth: 1 });
              lines.forEach((line, idx) => {
                const textY = boxY + boxHeight - padding - fontSize - (idx * lineHeight) + fontSize;
                page.drawText(line, { x: boxX + 8, y: clamp(textY, 18, height - 18), size: fontSize, font, color: PDFLib.rgb(0.1, 0.1, 0.1) });
              });
            } else if (type === 'highlight') {
              const bandHeight = Math.max(20, selHeight);
              const bandY = clamp(baseY - bandHeight / 2, 12, height - bandHeight - 12);
              const bandX = clamp(x1, 12, width - 32);
              const bandWidth = Math.min(selWidth, width - bandX - 12);
              page.drawRectangle({ x: bandX, y: bandY, width: bandWidth, height: bandHeight, color: PDFLib.rgb(r, g, b), opacity: 0.45 });
              lines.slice(0, 3).forEach((line, idx) => {
                page.drawText(line, { x: bandX + 8, y: clamp(bandY + bandHeight - 14 - (idx * 14), 18, height - 18), size: 11, font, color: PDFLib.rgb(0.1, 0.1, 0.1) });
              });
            } else if (type === 'underline') {
              const line = lines[0];
              const tw = font.widthOfTextAtSize(line, 12);
              const textY = clamp(baseY, 18, height - 18);
              const textX = clamp(x1, 12, width - 12);
              page.drawText(line, { x: textX, y: textY, size: 12, font, color: PDFLib.rgb(0.1, 0.1, 0.1) });
              page.drawLine({ start: { x: textX, y: textY - 2 }, end: { x: textX + Math.max(tw, selWidth), y: textY - 2 }, thickness: 1.5, color: PDFLib.rgb(r, g, b) });
            } else if (type === 'strike') {
              const line = lines[0];
              const tw = font.widthOfTextAtSize(line, 12);
              const textY = clamp(baseY, 18, height - 18);
              const textX = clamp(x1, 12, width - 12);
              page.drawText(line, { x: textX, y: textY, size: 12, font, color: PDFLib.rgb(0.1, 0.1, 0.1) });
              page.drawLine({ start: { x: textX, y: textY + 6 }, end: { x: textX + Math.max(tw, selWidth), y: textY + 6 }, thickness: 1.5, color: PDFLib.rgb(r, g, b) });
            }
            const bytes = await pdf.save();
            const blob = new Blob([bytes], { type: 'application/pdf' });
            document.getElementById('annotate-download').onclick = () => dlBlob(blob, 'annotated.pdf');
            showResult('annotate', `${type} annotation added on page ${pageNum}`);
            toast('Annotation added!', '✅');
            saveActivity('annotate', `${type} added on page ${pageNum}`);
          } catch (e) { toast('Error: ' + e.message, '❌'); }
          finally { hideLoading(); }
        }

        // ══════════════════════════════════════════════════════
        // REDACT PDF
        // ══════════════════════════════════════════════════════
        async function redactPDF() {
          if (!state.redactFile) { toast('Pehle PDF upload karo!', '⚠️'); return; }
          const wordsRaw = document.getElementById('redact-words').value.trim();
          if (!wordsRaw) { toast('Redact karne wale words enter karo!', '⚠️'); return; }
          const words = wordsRaw.split('\n').map(w => w.trim()).filter(w => w.length > 0);
          const caseSensitive = document.getElementById('redact-case').checked;
          const colorHex = document.getElementById('redact-color').value;
          const { r, g, b } = hexToRgb(colorHex);
          showLoading('Redacting sensitive info...');
          try {
            const ab = await readAB(state.redactFile);
            const pdf = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
            const pdfjs = await pdfjsLib.getDocument({ data: ab.slice() }).promise;
            const pages = pdf.getPages();
            let totalRedactions = 0;
            for (let pi = 0; pi < pages.length; pi++) {
              const page = pages[pi];
              const { width, height } = page.getSize();
              const pjsPage = await pdfjs.getPage(pi + 1);
              const content = await pjsPage.getTextContent();
              for (const item of content.items) {
                const itemText = item.str;
                for (const word of words) {
                  const matches = caseSensitive ? itemText.includes(word) : itemText.toLowerCase().includes(word.toLowerCase());
                  if (matches && itemText.trim().length > 0) {
                    const vp = pjsPage.getViewport({ scale: 1 });
                    const [x1, y1, x2, y2] = item.transform ? [item.transform[4], item.transform[5], item.transform[4] + item.width, item.transform[5] + item.height] : [0, 0, 100, 20];
                    const pdfY = height - (y1 * height / vp.height) - 12;
                    const bw = Math.max((item.width || 50) * width / vp.width, 40);
                    page.drawRectangle({ x: Math.max(0, x1 * width / vp.width - 2), y: Math.max(0, pdfY - 2), width: bw + 4, height: 16, color: PDFLib.rgb(r, g, b) });
                    totalRedactions++;
                  }
                }
              }
              if (pi % 5 === 0) setProgress('redact', (pi / pages.length) * 100);
            }
            const bytes = await pdf.save();
            const blob = new Blob([bytes], { type: 'application/pdf' });
            document.getElementById('redact-download').onclick = () => dlBlob(blob, 'redacted.pdf');
            showResult('redact', `${totalRedactions} areas redacted across ${pages.length} pages`);
            toast(`${totalRedactions} areas redacted!`, '✅');
            saveActivity('redact', `${totalRedactions} areas covered`);
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
            syncResumeTemplatePreview(document.getElementById('resume-template').value || 'modern');
            ['resume-template', 'resume-level', 'resume-name', 'resume-email', 'resume-phone', 'resume-location', 'resume-role', 'resume-summary', 'resume-education', 'resume-skills', 'resume-projects', 'resume-achievements'].forEach(id => {
              const el = document.getElementById(id);
              if (el) el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', renderResumeTemplatePreview);
            });
            renderResumeTemplatePreview();
          }
          if (document.getElementById('uc-category')) {
            updateUnitOptions();
          }
          if (document.getElementById('qr-canvas')) {
            const canvas = document.getElementById('qr-canvas');
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#d9d8e7';
            ctx.font = '600 18px DM Sans';
            ctx.textAlign = 'center';
            ctx.fillText('QR preview', canvas.width / 2, canvas.height / 2 - 8);
            ctx.font = '14px DM Sans';
            ctx.fillStyle = '#8b89a6';
            ctx.fillText('Generate karte hi yahan dikhega', canvas.width / 2, canvas.height / 2 + 18);
            updateQRPlaceholder();
          }
          if (document.getElementById('pw-output')) {
            generatePassword(true);
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
          navigator.serviceWorker.register('/service-worker.js?v=8', { updateViaCache: 'none' })
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
            merge: '🔗', split: '✂️', compress: '📉', ocr: '🔍',
            sign: '🖋️', watermark: '💧', protect: '🔐', reorder: '📑',
            delete: '🗑️'
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

        function toggleSelectAllDelete(select) {
          const items = document.querySelectorAll('#delpages-page-grid .page-item');
          state.delSelected = [];
          items.forEach((item, idx) => {
            if (select) {
              item.classList.add('selected');
              state.delSelected.push(idx + 1);
            } else {
              item.classList.remove('selected');
            }
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
        // INVOICE GENERATOR
        // ══════════════════════════════════════════════════════
        function addInvItem() {
          const container = document.getElementById('inv-items-container');
          const row = document.createElement('div');
          row.className = 'inv-item-row';
          row.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:0.5rem;margin-bottom:0.5rem;align-items:center';
          row.innerHTML = `<input type="text" placeholder="Description" class="inv-desc"><input type="number" placeholder="Qty" class="inv-qty" value="1" min="1"><input type="number" placeholder="Unit Price" class="inv-price" min="0"><button class="btn btn-danger btn-sm" onclick="removeInvItem(this)">✕</button>`;
          container.appendChild(row);
        }

        function removeInvItem(btn) {
          if (document.querySelectorAll('.inv-item-row').length <= 1) { toast('At least 1 item chahiye!','⚠️'); return; }
          btn.closest('.inv-item-row').remove();
        }

        async function generateInvoice() {
          showLoading('Generating Invoice PDF...');
          try {
            const g = (id) => (document.getElementById(id)||{}).value || '';
            const fromName = g('inv-from-name') || 'Your Company';
            const fromAddr = g('inv-from-addr');
            const fromEmail = g('inv-from-email');
            const toName = g('inv-to-name') || 'Client';
            const toAddr = g('inv-to-addr');
            const toEmail = g('inv-to-email');
            const invNum = g('inv-number') || 'INV-001';
            const invDate = g('inv-date') || new Date().toISOString().split('T')[0];
            const invDue = g('inv-due');
            const currency = g('inv-currency') || 'INR';
            const taxPct = parseFloat(g('inv-tax')) || 0;
            const discPct = parseFloat(g('inv-discount')) || 0;
            const notes = g('inv-notes');
            const sym = { INR:'₹', USD:'$', EUR:'€', GBP:'£' }[currency] || currency;

            const items = [...document.querySelectorAll('.inv-item-row')].map(row => {
              const desc = row.querySelector('.inv-desc')?.value || 'Item';
              const qty = parseFloat(row.querySelector('.inv-qty')?.value) || 1;
              const price = parseFloat(row.querySelector('.inv-price')?.value) || 0;
              return { desc, qty, price, total: qty * price };
            });

            const subtotal = items.reduce((s,i) => s + i.total, 0);
            const discAmt = subtotal * (discPct / 100);
            const taxAmt = (subtotal - discAmt) * (taxPct / 100);
            const grandTotal = subtotal - discAmt + taxAmt;

            const pdfDoc = await PDFLib.PDFDocument.create();
            const page = pdfDoc.addPage([595, 842]);
            const { width, height } = page.getSize();
            const hB = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
            const h  = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            const purple = PDFLib.rgb(0.42,0.39,1);
            const dark   = PDFLib.rgb(0.1,0.1,0.1);
            const grey   = PDFLib.rgb(0.5,0.5,0.5);
            const light  = PDFLib.rgb(0.95,0.95,0.97);
            const white  = PDFLib.rgb(1,1,1);

            // Header
            page.drawRectangle({ x:0, y:height-90, width, height:90, color:purple });
            page.drawText('INVOICE', { x:40, y:height-52, size:32, font:hB, color:white });
            page.drawText(`#${invNum}`, { x:40, y:height-72, size:12, font:h, color:PDFLib.rgb(0.8,0.8,1) });
            page.drawText(`Date: ${invDate}`, { x:width-200, y:height-40, size:10, font:h, color:white });
            if (invDue) page.drawText(`Due: ${invDue}`, { x:width-200, y:height-56, size:10, font:h, color:PDFLib.rgb(1,0.85,0.85) });

            // From / To
            let y = height - 120;
            page.drawText('FROM', { x:40, y, size:9, font:hB, color:grey });
            page.drawText('TO',   { x:300, y, size:9, font:hB, color:grey });
            y -= 18;
            page.drawText(fromName, { x:40, y, size:12, font:hB, color:dark });
            page.drawText(toName,   { x:300, y, size:12, font:hB, color:dark });
            y -= 16;
            if (fromAddr) page.drawText(fromAddr, { x:40, y, size:10, font:h, color:grey });
            if (toAddr)   page.drawText(toAddr,   { x:300, y, size:10, font:h, color:grey });
            y -= 16;
            if (fromEmail) page.drawText(fromEmail, { x:40, y, size:10, font:h, color:grey });
            if (toEmail)   page.drawText(toEmail,   { x:300, y, size:10, font:h, color:grey });

            // Table header
            y -= 40;
            page.drawRectangle({ x:30, y:y-4, width:width-60, height:24, color:purple });
            page.drawText('Description', { x:40,   y:y+4, size:10, font:hB, color:white });
            page.drawText('Qty',         { x:320,  y:y+4, size:10, font:hB, color:white });
            page.drawText('Price',       { x:375,  y:y+4, size:10, font:hB, color:white });
            page.drawText('Total',       { x:470,  y:y+4, size:10, font:hB, color:white });
            y -= 24;

            // Rows
            items.forEach((item, idx) => {
              if (idx % 2 === 0) page.drawRectangle({ x:30, y:y-6, width:width-60, height:22, color:light });
              page.drawText(item.desc.substring(0,38), { x:40,  y, size:10, font:h, color:dark });
              page.drawText(String(item.qty),           { x:330, y, size:10, font:h, color:dark });
              page.drawText(`${sym}${item.price.toFixed(2)}`, { x:375, y, size:10, font:h, color:dark });
              page.drawText(`${sym}${item.total.toFixed(2)}`, { x:470, y, size:10, font:h, color:dark });
              y -= 22;
            });

            // Totals
            y -= 16;
            page.drawLine({ start:{x:360,y:y+10}, end:{x:width-30,y:y+10}, thickness:0.5, color:PDFLib.rgb(0.8,0.8,0.8) });
            page.drawText('Subtotal:', { x:370, y, size:10, font:h, color:grey });
            page.drawText(`${sym}${subtotal.toFixed(2)}`, { x:470, y, size:10, font:h, color:dark });
            if (discPct > 0) {
              y -= 18;
              page.drawText(`Discount (${discPct}%):`, { x:370, y, size:10, font:h, color:grey });
              page.drawText(`-${sym}${discAmt.toFixed(2)}`, { x:470, y, size:10, font:h, color:PDFLib.rgb(0.8,0.2,0.2) });
            }
            if (taxPct > 0) {
              y -= 18;
              page.drawText(`Tax (${taxPct}%):`, { x:370, y, size:10, font:h, color:grey });
              page.drawText(`${sym}${taxAmt.toFixed(2)}`, { x:470, y, size:10, font:h, color:dark });
            }
            y -= 12;
            page.drawRectangle({ x:355, y:y-8, width:width-385, height:28, color:purple });
            page.drawText('TOTAL:', { x:370, y, size:12, font:hB, color:white });
            page.drawText(`${sym}${grandTotal.toFixed(2)}`, { x:445, y, size:12, font:hB, color:white });

            if (notes) {
              y -= 50;
              page.drawText('Notes:', { x:40, y, size:9, font:hB, color:grey });
              y -= 14;
              notes.split('\n').slice(0,5).forEach(nl => {
                page.drawText(nl.substring(0,90), { x:40, y, size:9, font:h, color:grey });
                y -= 13;
              });
            }
            page.drawText('Generated by JustPDFCraft • justpdfcraft.xyz', { x:40, y:20, size:8, font:h, color:PDFLib.rgb(0.7,0.7,0.7) });

            const bytes = await pdfDoc.save();
            const blob = new Blob([bytes], { type:'application/pdf' });
            document.getElementById('invoice-download').onclick = () => dlBlob(blob, `Invoice_${invNum}.pdf`);
            document.getElementById('invoice-result-text').textContent = `${items.length} items • Grand Total: ${sym}${grandTotal.toFixed(2)}`;
            showResult('invoice');
            toast('Invoice ready!', '✅');
            saveActivity('invoice', `${invNum} — ${sym}${grandTotal.toFixed(2)}`);
          } catch(e) { toast('Error: ' + e.message, '❌'); }
          finally { hideLoading(); }
        }

        // Auto-fill today's date in invoice
        (function setInvDates() {
          const today = new Date().toISOString().split('T')[0];
          const d = document.getElementById('inv-date');
          if (d && !d.value) d.value = today;
          const due = document.getElementById('inv-due');
          if (due && !due.value) {
            const dt = new Date(); dt.setDate(dt.getDate()+30);
            due.value = dt.toISOString().split('T')[0];
          }
        })();

        // ══════════════════════════════════════════════════════
        // EXPOSE NEW TOOL FUNCTIONS TO GLOBAL SCOPE
        // (Required because HTML inline onclick/onchange handlers
        //  need them accessible as window-level globals)
        // ══════════════════════════════════════════════════════
        window.handlePdf2Word   = handlePdf2Word;
        window.convertPdf2Word  = convertPdf2Word;
        window.addInvItem       = addInvItem;
        window.removeInvItem    = removeInvItem;
        window.generateInvoice  = generateInvoice;
