/* ==========================================================================
   PORTFOLIO FORGE — APP LOGIC
   Reads the form state, renders a live preview into an iframe via srcdoc,
   and can export that same generated document as a standalone .html file.
   ========================================================================== */

(() => {
  'use strict';

  /* ---------- STATE ---------- */
  let state = {
    fullName: '', role: '', bio: '', photoUrl: '',
    email: '', phone: '', location: '', resumeUrl: '',
    linkGithub: '', linkLinkedin: '', linkTwitter: '', linkDribbble: '',
    skills: [],
    projects: [],
    accent: '#2F6FED',
    mood: 'dark'
  };

  const STORAGE_KEY = 'portfolio-forge-draft';

  /* ---------- DOM REFS ---------- */
  const form = document.getElementById('forgeForm');
  const previewFrame = document.getElementById('previewFrame');
  const previewFrameOuter = document.getElementById('previewFrameOuter');
  const skillInput = document.getElementById('skillInput');
  const skillChips = document.getElementById('skillChips');
  const projectsList = document.getElementById('projectsList');
  const projectTemplate = document.getElementById('projectTemplate');
  const addProjectBtn = document.getElementById('addProjectBtn');
  const swatchRow = document.getElementById('swatchRow');
  const moodRow = document.getElementById('moodRow');
  const bioField = document.getElementById('bio');
  const bioCount = document.getElementById('bioCount');

  const simpleFieldIds = ['fullName', 'role', 'bio', 'photoUrl', 'email', 'phone', 'location', 'resumeUrl', 'linkGithub', 'linkLinkedin', 'linkTwitter', 'linkDribbble'];

  /* ---------- HELPERS ---------- */
  function escapeHtml(str = '') {
    return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function initials(name) {
    if (!name) return 'YN';
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  function uid() {
    return 'p' + Math.random().toString(36).slice(2, 9);
  }

  /* ---------- PROJECT ROWS ---------- */
  function addProjectRow(data = {}) {
    const id = data.id || uid();
    const node = projectTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = id;
    node.querySelector('.proj-title').value = data.title || '';
    node.querySelector('.proj-desc').value = data.desc || '';
    node.querySelector('.proj-tech').value = data.tech || '';
    node.querySelector('.proj-link').value = data.link || '';
    node.querySelector('.proj-repo').value = data.repo || '';

    node.querySelector('.btn-remove-project').addEventListener('click', () => {
      node.remove();
      renumberProjects();
      syncStateFromForm();
    });

    ['proj-title', 'proj-desc', 'proj-tech', 'proj-link', 'proj-repo'].forEach(cls => {
      node.querySelector(`.${cls}`).addEventListener('input', syncStateFromForm);
    });

    projectsList.appendChild(node);
    renumberProjects();
  }

  function renumberProjects() {
    projectsList.querySelectorAll('[data-project-row]').forEach((row, i) => {
      row.querySelector('.project-index').textContent = 'EXHIBIT ' + String.fromCharCode(65 + i);
    });
  }

  /* ---------- SKILLS ---------- */
  function renderSkillChips() {
    skillChips.innerHTML = state.skills.map((s, i) => `
      <span class="deck-chip">${escapeHtml(s)}<button type="button" data-i="${i}" aria-label="Remove ${escapeHtml(s)}">&times;</button></span>
    `).join('');
    skillChips.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        state.skills.splice(Number(btn.dataset.i), 1);
        renderSkillChips();
        renderPreview();
        saveDraft();
      });
    });
  }

  skillInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = skillInput.value.trim();
      if (val && !state.skills.includes(val)) {
        state.skills.push(val);
        renderSkillChips();
        renderPreview();
        saveDraft();
      }
      skillInput.value = '';
    }
  });

  /* ---------- SYNC FORM -> STATE ---------- */
  function syncStateFromForm() {
    simpleFieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) state[id] = el.value;
    });

    state.projects = Array.from(projectsList.querySelectorAll('[data-project-row]')).map(row => ({
      id: row.dataset.id,
      title: row.querySelector('.proj-title').value,
      desc: row.querySelector('.proj-desc').value,
      tech: row.querySelector('.proj-tech').value,
      link: row.querySelector('.proj-link').value,
      repo: row.querySelector('.proj-repo').value
    }));

    bioCount.textContent = state.bio.length;
    renderPreview();
    saveDraft();
  }

  form.addEventListener('input', syncStateFromForm);

  /* ---------- COLOR / MOOD ---------- */
  swatchRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.swatch');
    if (!btn) return;
    swatchRow.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    state.accent = btn.dataset.color;
    renderPreview();
    saveDraft();
  });

  moodRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.mood-btn');
    if (!btn) return;
    moodRow.querySelectorAll('.mood-btn').forEach(m => m.classList.remove('active'));
    btn.classList.add('active');
    state.mood = btn.dataset.mood;
    renderPreview();
    saveDraft();
  });

  /* ---------- ADD PROJECT BUTTON ---------- */
  addProjectBtn.addEventListener('click', () => {
    addProjectRow();
    syncStateFromForm();
  });

  /* ---------- PREVIEW VIEWPORT TOGGLE ---------- */
  document.querySelectorAll('.zoom-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.zoom-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      previewFrameOuter.classList.toggle('mobile-view', btn.dataset.view === 'mobile');
    });
  });

  /* ---------- GENERATE PORTFOLIO HTML (used by both preview + export) ---------- */
  function buildPortfolioDocument(forExport = false) {
    const d = state;
    const isLight = d.mood === 'light';
    const bg = isLight ? '#FAFAF7' : '#0B0F14';
    const surface = isLight ? '#FFFFFF' : '#121822';
    const text = isLight ? '#15191E' : '#EAEFF5';
    const textMuted = isLight ? '#5B6470' : '#8C97A8';
    const border = isLight ? 'rgba(21,25,30,0.1)' : 'rgba(255,255,255,0.08)';

    const socials = [
      { url: d.linkGithub, icon: 'bi-github' },
      { url: d.linkLinkedin, icon: 'bi-linkedin' },
      { url: d.linkTwitter, icon: 'bi-twitter-x' },
      { url: d.linkDribbble, icon: 'bi-dribbble' }
    ].filter(s => s.url);

    const skillsHtml = d.skills.map(s => `<span class="pf-chip">${escapeHtml(s)}</span>`).join('');

    const projectsHtml = d.projects.map(p => `
      <article class="pf-project">
        <h3>${escapeHtml(p.title || 'Untitled project')}</h3>
        <p>${escapeHtml(p.desc || '')}</p>
        ${p.tech ? `<div class="pf-tech">${p.tech.split(',').map(t => `<span>${escapeHtml(t.trim())}</span>`).join('')}</div>` : ''}
        <div class="pf-project-links">
          ${p.link ? `<a href="${escapeHtml(p.link)}" target="_blank" rel="noopener">Live demo &rarr;</a>` : ''}
          ${p.repo ? `<a href="${escapeHtml(p.repo)}" target="_blank" rel="noopener">Source code &rarr;</a>` : ''}
        </div>
      </article>
    `).join('') || `<p class="pf-empty">Add a project on the left to see it appear here.</p>`;

    const photoBlock = d.photoUrl
      ? `<img src="${escapeHtml(d.photoUrl)}" alt="${escapeHtml(d.fullName || 'Profile photo')}" class="pf-photo">`
      : `<div class="pf-photo pf-photo-fallback">${escapeHtml(initials(d.fullName))}</div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(d.fullName || 'Your Name')} — ${escapeHtml(d.role || 'Portfolio')}</title>
<meta name="description" content="${escapeHtml(d.bio || '')}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css">
<style>
  :root{--accent:${d.accent};--bg:${bg};--surface:${surface};--text:${text};--text-muted:${textMuted};--border:${border};}
  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;line-height:1.7;}
  .pf-wrap{max-width:880px;margin:0 auto;padding:4rem 1.5rem 6rem;}
  h1,h2,h3{font-family:'Fraunces',serif;font-weight:600;letter-spacing:-0.01em;}
  .pf-hero{display:flex;gap:2rem;align-items:center;flex-wrap:wrap;margin-bottom:3.5rem;}
  .pf-photo{width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid var(--accent);}
  .pf-photo-fallback{display:flex;align-items:center;justify-content:center;background:var(--accent);color:#fff;font-size:2.1rem;font-weight:700;font-family:'Fraunces',serif;}
  .pf-hero h1{font-size:2.1rem;margin:0 0 0.2rem;}
  .pf-role{color:var(--accent);font-weight:600;margin:0 0 0.8rem;}
  .pf-bio{color:var(--text-muted);max-width:520px;margin:0;}
  .pf-section{margin-bottom:3rem;}
  .pf-section h2{font-size:1.3rem;border-bottom:1px solid var(--border);padding-bottom:0.6rem;margin-bottom:1.4rem;}
  .pf-chip{display:inline-block;background:color-mix(in srgb, var(--accent) 14%, transparent);color:var(--accent);font-size:0.82rem;font-weight:600;padding:0.4rem 0.9rem;border-radius:999px;margin:0 0.5rem 0.5rem 0;}
  .pf-project{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.4rem 1.6rem;margin-bottom:1.2rem;}
  .pf-project h3{margin:0 0 0.4rem;font-size:1.1rem;}
  .pf-project p{color:var(--text-muted);margin:0 0 0.8rem;}
  .pf-tech span{font-size:0.74rem;background:var(--border);color:var(--text-muted);padding:0.25rem 0.6rem;border-radius:6px;margin:0 0.4rem 0.4rem 0;display:inline-block;}
  .pf-project-links a{color:var(--accent);font-weight:600;font-size:0.88rem;margin-right:1.2rem;text-decoration:none;}
  .pf-project-links a:hover{text-decoration:underline;}
  .pf-empty{color:var(--text-muted);font-style:italic;}
  .pf-contact-row{display:flex;flex-wrap:wrap;gap:1.4rem;margin-bottom:1.4rem;}
  .pf-contact-row a, .pf-contact-row span{color:var(--text-muted);font-size:0.94rem;text-decoration:none;display:flex;align-items:center;gap:0.5rem;}
  .pf-contact-row a:hover{color:var(--accent);}
  .pf-socials{display:flex;gap:0.7rem;}
  .pf-socials a{width:42px;height:42px;border-radius:50%;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--text);transition:all .2s ease;}
  .pf-socials a:hover{background:var(--accent);color:#fff;}
  .pf-footer{color:var(--text-muted);font-size:0.82rem;text-align:center;margin-top:4rem;}
  @media(max-width:520px){.pf-hero{text-align:center;justify-content:center;}.pf-bio{margin:0 auto;}}
</style>
</head>
<body>
  <div class="pf-wrap">
    <header class="pf-hero">
      ${photoBlock}
      <div>
        <h1>${escapeHtml(d.fullName || 'Your Name')}</h1>
        <p class="pf-role">${escapeHtml(d.role || 'Your role')}</p>
        <p class="pf-bio">${escapeHtml(d.bio || 'Write a short bio in the form to see it appear here.')}</p>
      </div>
    </header>

    ${d.skills.length ? `<section class="pf-section"><h2>Skills</h2><div>${skillsHtml}</div></section>` : ''}

    <section class="pf-section">
      <h2>Projects</h2>
      ${projectsHtml}
    </section>

    <section class="pf-section">
      <h2>Contact</h2>
      <div class="pf-contact-row">
        ${d.email ? `<a href="mailto:${escapeHtml(d.email)}"><i class="bi bi-envelope-fill"></i> ${escapeHtml(d.email)}</a>` : ''}
        ${d.phone ? `<a href="tel:${escapeHtml(d.phone)}"><i class="bi bi-telephone-fill"></i> ${escapeHtml(d.phone)}</a>` : ''}
        ${d.location ? `<span><i class="bi bi-geo-alt-fill"></i> ${escapeHtml(d.location)}</span>` : ''}
        ${d.resumeUrl ? `<a href="${escapeHtml(d.resumeUrl)}" target="_blank" rel="noopener"><i class="bi bi-download"></i> Resume</a>` : ''}
      </div>
      ${socials.length ? `<div class="pf-socials">${socials.map(s => `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener"><i class="bi ${s.icon}"></i></a>`).join('')}</div>` : ''}
    </section>

    <p class="pf-footer">&copy; ${new Date().getFullYear()} ${escapeHtml(d.fullName || 'Your Name')}. Built with Portfolio Forge.</p>
  </div>
</body>
</html>`;
  }

  /* ---------- RENDER PREVIEW ---------- */
  function renderPreview() {
    previewFrame.srcdoc = buildPortfolioDocument(false);
  }

  /* ---------- EXPORT ---------- */
  document.getElementById('downloadBtn').addEventListener('click', () => {
    const html = buildPortfolioDocument(true);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (state.fullName || 'portfolio').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.href = url;
    a.download = `${safeName || 'portfolio'}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  /* ---------- DRAFT PERSISTENCE ---------- */
  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Could not save draft to localStorage.', err);
    }
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.warn('Could not load saved draft.', err);
    }
    return null;
  }

  function hydrateFormFromState() {
    simpleFieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && state[id] !== undefined) el.value = state[id];
    });
    bioCount.textContent = (state.bio || '').length;

    projectsList.innerHTML = '';
    (state.projects || []).forEach(p => addProjectRow(p));

    renderSkillChips();

    swatchRow.querySelectorAll('.swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color.toLowerCase() === (state.accent || '').toLowerCase());
    });
    moodRow.querySelectorAll('.mood-btn').forEach(m => {
      m.classList.toggle('active', m.dataset.mood === state.mood);
    });

    renderPreview();
  }

  /* ---------- DEMO DATA ---------- */
  function demoData() {
    return {
      fullName: 'Maya Iyer',
      role: 'Product Designer',
      bio: 'I design clear, considered interfaces for fintech and health products — currently leading design at a Series B startup.',
      photoUrl: '',
      email: 'maya@example.com',
      phone: '+91 90000 00000',
      location: 'Bengaluru, India',
      resumeUrl: '',
      linkGithub: 'https://github.com/',
      linkLinkedin: 'https://linkedin.com/',
      linkTwitter: '',
      linkDribbble: 'https://dribbble.com/',
      skills: ['Figma', 'Design Systems', 'User Research', 'Prototyping', 'HTML/CSS'],
      projects: [
        { id: uid(), title: 'Nimbus Banking App', desc: 'Redesigned the core banking flows, reducing drop-off at onboarding by 24%.', tech: 'Figma, Design Tokens', link: '', repo: '' },
        { id: uid(), title: 'Vital Health Dashboard', desc: 'A patient-facing dashboard for tracking chronic care metrics.', tech: 'Figma, React', link: '', repo: '' }
      ],
      accent: '#1E9E6B',
      mood: 'dark'
    };
  }

  /* ---------- RESET / DEMO BUTTONS ---------- */
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('Clear everything and start a fresh draft?')) return;
    state = { fullName: '', role: '', bio: '', photoUrl: '', email: '', phone: '', location: '', resumeUrl: '', linkGithub: '', linkLinkedin: '', linkTwitter: '', linkDribbble: '', skills: [], projects: [], accent: '#2F6FED', mood: 'dark' };
    hydrateFormFromState();
    saveDraft();
  });

  document.getElementById('loadDemoBtn').addEventListener('click', () => {
    state = demoData();
    hydrateFormFromState();
    saveDraft();
  });

  /* ---------- INIT ---------- */
  function init() {
    const saved = loadDraft();
    state = saved || demoData();
    hydrateFormFromState();
  }

  init();
})();
