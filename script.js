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
    if (!content.trim()) return toast('Pehle resume generate karo', 'ðŸ"‹');
    dlBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), 'resume.txt');
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
            syncResumeTemplatePreview(document.getElementById('resume-template').value || 'modern');
            ['resume-template', 'resume-level', 'resume-name', 'resume-email', 'resume-phone', 'resume-location', 'resume-role', 'resume-summary', 'resume-education', 'resume-skills', 'resume-projects', 'resume-achievements'].forEach(id => {
              const el = document.getElementById(id);
              if (el) el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', renderResumeTemplatePreview);
            });
            renderResumeTemplatePreview();
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
        // EXPOSE NEW TOOL FUNCTIONS TO GLOBAL SCOPE
        // ══════════════════════════════════════════════════════
        window.handlePdf2Word   = handlePdf2Word;
        window.convertPdf2Word  = convertPdf2Word;
