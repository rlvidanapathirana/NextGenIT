// ===== SHARED JS — NextGenIT AI Guide =====

// Dark/Light Mode
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeBtn(saved);
}
function toggleTheme() {
  const curr = document.documentElement.getAttribute('data-theme');
  const next = curr === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeBtn(next);
}
function updateThemeBtn(theme) {
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// Mobile nav hamburger
function toggleMobileNav() {
  const links = document.querySelector('.nav-links');
  if (links) links.classList.toggle('open');
}

// Copy to clipboard
function copyPrompt(text, btnEl) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btnEl.innerHTML;
    btnEl.innerHTML = '✅ Copied!';
    btnEl.classList.add('copied');
    setTimeout(() => { btnEl.innerHTML = orig; btnEl.classList.remove('copied'); }, 2000);
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const orig = btnEl.innerHTML;
    btnEl.innerHTML = '✅ Copied!';
    btnEl.classList.add('copied');
    setTimeout(() => { btnEl.innerHTML = orig; btnEl.classList.remove('copied'); }, 2000);
  });
}

// Expand/collapse prompt
function toggleExpand(id) {
  const box = document.getElementById('pb-' + id);
  const btn = document.getElementById('eb-' + id);
  if (!box || !btn) return;
  const isExp = box.classList.contains('expanded');
  box.classList.toggle('expanded', !isExp);
  btn.textContent = isExp ? '▼ Show more' : '▲ Less';
}

// Filter prompts by platform
let activePlatform = 'all';
function filterPlatform(platform, pillEl) {
  activePlatform = platform;
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('on'));
  if (pillEl) pillEl.classList.add('on');
  doFilter();
}

function doFilter() {
  const searchInput = document.getElementById('searchInput');
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const cards = document.querySelectorAll('.prompt-card');
  const headers = document.querySelectorAll('.plat-header');
  const grids = document.querySelectorAll('[id^="grid-"]');

  cards.forEach(card => {
    const plat = card.dataset.platform || '';
    const text = card.textContent.toLowerCase();
    const platMatch = activePlatform === 'all' || plat === activePlatform;
    const textMatch = !q || text.includes(q);
    card.style.display = (platMatch && textMatch) ? '' : 'none';
  });

  headers.forEach(h => {
    const plat = h.dataset.platform || '';
    const grid = document.getElementById('grid-' + plat);
    const platMatch = activePlatform === 'all' || plat === activePlatform;
    const anyVisible = grid ? [...grid.querySelectorAll('.prompt-card')].some(c => c.style.display !== 'none') : false;
    h.style.display = (platMatch && anyVisible) ? '' : 'none';
    if (grid) grid.style.display = (platMatch && anyVisible) ? '' : 'none';
  });
}

function setupFilter() {
  const searchInput = document.getElementById('searchInput');
  const filterPills = document.querySelectorAll('.filter-pill');

  filterPills.forEach(pill => {
    pill.addEventListener('click', function() {
      filterPlatform(this.dataset.f, this);
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', doFilter);
  }
}

// Scroll animations
function setupScrollAnim() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.06 });
  document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));
}

// Quiz
let quizScore = 0;
let quizAnswered = {};
function answerQuiz(btn, result, qid, totalQ) {
  if (quizAnswered[qid]) return;
  quizAnswered[qid] = true;
  btn.closest('.quiz-opts').querySelectorAll('.quiz-opt').forEach(o => o.style.pointerEvents = 'none');
  if (result === 'correct') {
    btn.classList.add('correct');
    const ok = document.getElementById(qid + '-ok');
    if (ok) ok.classList.add('show', 'ok');
    quizScore++;
  } else {
    btn.classList.add('wrong');
    const no = document.getElementById(qid + '-no');
    if (no) no.classList.add('show', 'no');
  }
  if (Object.keys(quizAnswered).length >= totalQ) setTimeout(showQuizScore, 600);
}
function showQuizScore() {
  const sc = document.getElementById('quizScore');
  const sn = document.getElementById('scoreNum');
  const sm = document.getElementById('scoreMsg');
  if (!sc) return;
  const total = Object.keys(quizAnswered).length;
  sn.textContent = quizScore + '/' + total;
  const msgs = ['Keep practicing! 💪', 'Getting there! 📚', 'Good effort! 👍', 'Well done! 🎉', 'Excellent! 🌟', 'Perfect! 🏆', 'Amazing! 🥇'];
  sm.textContent = msgs[Math.min(quizScore, msgs.length - 1)];
  sc.classList.add('show');
}
function resetQuiz() {
  quizScore = 0; quizAnswered = {};
  document.querySelectorAll('.quiz-opt').forEach(o => { o.classList.remove('correct', 'wrong'); o.style.pointerEvents = ''; });
  document.querySelectorAll('.quiz-fb').forEach(f => f.classList.remove('show', 'ok', 'no'));
  const qs = document.getElementById('quizScore');
  if (qs) qs.classList.remove('show');
}

// Practice tabs
function showPTab(id, btn) {
  document.querySelectorAll('.pcon').forEach(e => e.classList.remove('show'));
  document.querySelectorAll('.ptab').forEach(b => b.classList.remove('on'));
  const el = document.getElementById(id);
  if (el) el.classList.add('show');
  if (btn) btn.classList.add('on');
}
function reveal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('show');
}

// Init on load
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupScrollAnim();
  setupFilter();
});
