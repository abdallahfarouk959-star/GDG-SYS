import '@material/web/all.js';
import { icon } from './icons.js';
import { STORAGE_KEY, routes, tasks, lessons, tracks, loadState, getProgress, getTasks, toggleLesson } from './state.js';

const app = document.querySelector('#app');
const brand = () => `<img class="brand-lockup" src="/assets/brand/gdgoc-learn-lockup.svg" alt="GDGoC · AAST Aswan" width="196" height="57"><span class="brand-product">Learn</span>`;
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const trailing = name => ['arrow-right', 'chevron-right', 'external'].includes(name) ? 'trailing-icon' : '';
const filled = (label, action, name = 'arrow-right', attrs = '') => `<md-filled-button type="button" data-action="${action}" ${trailing(name)} ${attrs}>${label}${name ? icon(name, 'icon') : ''}</md-filled-button>`;
const outlined = (label, action, name = '', attrs = '') => `<md-outlined-button type="button" data-action="${action}" ${trailing(name)} ${attrs}>${name ? icon(name, 'icon') : ''}${label}</md-outlined-button>`;
const progress = (value, label, extra = '') => `<md-linear-progress value="${value}" aria-label="${label}" class="${extra}"></md-linear-progress>`;
const navItems = [ ['dashboard', 'home', 'Dashboard'], ['tracks', 'layers', 'Learning Tracks'], ['sessions', 'calendar', 'My Sessions'], ['tasks', 'list-check', 'Tasks'], ['xp', 'award', 'XP & Badges'], ['certificate', 'shield', 'Certificate'] ];
let state;
try { state = loadState(localStorage); } catch { state = loadState({ getItem: () => null }); }
let route = readRoute();
let lessonTab = 0;
let taskStatus = 'all';
let taskTrack = 'all';
let toastTimer;
let walkthroughTimer;
let walkthroughStep = 0;
let walkthroughPlaying = false;
let practiceSource = '<style>\n  body { font-family: sans-serif; padding: 24px; }\n  h1 { color: #1a73e8; }\n</style>\n<h1>Hello GDGoC!</h1>\n<p>My first webpage.</p>';

function readRoute() {
  const candidate = location.hash.replace(/^#\/?/, '').split('?')[0];
  return routes.includes(candidate) ? candidate : 'dashboard';
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { toast('Your changes will last for this visit. Browser storage is unavailable.'); }
}

function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('visible'), 3600);
}

function go(next) {
  if (route === next) { render(); return; }
  location.hash = `/${next}`;
}

function shell(content) {
  return `<div class="app-shell">
    <aside class="sidebar" id="sidebar" aria-label="Main navigation">
      <a class="brand" href="#/dashboard" aria-label="GDGoC Learn · AAST Aswan home">${brand()}</a>
      <nav>${navItems.map(([key, name, label]) => `<a href="#/${key}" class="nav-link ${route === key ? 'active' : ''}" ${route === key ? 'aria-current="page"' : ''}>${icon(name)}<span>${label}</span>${key === 'tasks' && getTasks(state, 'todo').length ? '<span class="nav-count">1</span>' : ''}</a>`).join('')}</nav>
      <div class="sidebar-bottom"><div class="community-note"><span class="community-dot"></span> A little progress, every day.</div><button class="nav-link help-link" data-action="help">${icon('help')}<span>Help & Support</span>${icon('arrow-up-right')}</button></div>
    </aside>
    <button class="sidebar-scrim" data-action="close-menu" aria-label="Close navigation"></button>
    <div class="workspace"><div class="mobile-bar"><md-icon-button data-action="menu" aria-label="Open navigation" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</md-icon-button><a class="mobile-brand" href="#/dashboard" aria-label="GDGoC Learn home">${brand()}</a><span class="mobile-xp">${getProgress(state).xp} XP</span></div>
    <main id="main" tabindex="-1">${content}</main>
    <footer class="page-footer"><span>Made for curious minds. Built by our community.</span><span>GDGoC · AAST Aswan <span class="brand-dots" aria-hidden="true"><i></i><i></i><i></i><i></i></span></span></footer>
    </div></div>`;
}

function pageHeading(title, description, name, right = '') {
  return `<header class="page-heading"><div class="heading-group"><div class="heading-icon">${icon(name)}</div><div><h1>${title}</h1><p>${description}</p></div></div>${right}</header>`;
}

function dashboard() {
  const p = getProgress(state);
  const todo = getTasks(state, 'todo')[0];
  return `<header class="dashboard-header"><div><div class="eyebrow muted">My learning</div><h1>Hello, Ahmed <span class="wave">👋</span></h1><p>Keep building with GDGoC!</p></div><div class="header-actions"><md-icon-button class="notification-button" data-action="notifications" aria-label="View notifications">${icon('bell')}<span class="notification-dot"></span></md-icon-button><a href="#/xp" class="xp-pill">${icon('flame')}<strong>${p.xp} XP</strong></a><button class="avatar-button" data-action="profile" aria-label="View Ahmed’s profile"><img src="/assets/avatars/student-placeholder.svg" alt="" width="38" height="38"></button></div></header>
    <section class="journey-hero" aria-labelledby="journey-title"><div class="hero-copy"><span class="eyebrow">Your learning journey</span><h2 id="journey-title">Keep building. Keep growing.</h2><p>Continue your track and get closer to your season certificate.</p><div class="hero-progress"><div class="progress-label"><strong>Certificate progress</strong><strong>${p.percent}%</strong></div>${progress(p.xp / 1000, `${p.percent}% toward your certificate`)}<div class="progress-caption">${p.xp} / 1,000 XP <span>·</span> ${1000 - p.xp} XP remaining</div></div></div><img class="hero-art" src="/assets/illustrations/certificate-hero.svg" alt="An illustrated certificate with a golden achievement ribbon" width="360" height="250"><span class="hero-orbit" aria-hidden="true"></span></section>
    <section class="xp-grid" aria-label="Your XP breakdown">${[['calendar-check', p.attendance, 'Attendance', 'blue'], ['chart', p.activity, 'Activity', 'purple'], ['check-square', p.tasks, 'Tasks', 'green']].map(([name, amount, label, color]) => `<a class="xp-card card" href="#/xp"><span class="icon-tile ${color}">${icon(name)}</span><div><h2>${amount} <span>XP</span></h2><p>${label}</p></div>${icon('chevron-right')}</a>`).join('')}</section>
    <div class="dashboard-bottom"><section class="card continue-card"><div class="section-card-heading"><h2>Continue learning</h2><span class="tiny-label">PICK UP WHERE YOU LEFT OFF</span></div><div class="continue-content"><span class="icon-tile blue large">${icon('code')}</span><div class="continue-text"><span class="track-label">Web Development</span><h3>HTML & CSS Workshop</h3><p>Session 2 <span>·</span> ${p.lessons} of 6 lessons completed</p>${progress(p.lessons / 6, `${p.lessons} of 6 lessons completed`, 'small-progress')}</div>${filled(p.lessons === 6 ? 'Revisit' : 'Resume', 'resume', 'arrow-right')}</div></section>
    <section class="card deadline-card"><div class="section-card-heading"><h2>${todo ? 'Next deadline' : 'You’re all caught up'}</h2>${icon(todo ? 'clock' : 'check-circle')}</div><div class="deadline-content"><span class="icon-tile ${todo ? 'red' : 'green'}">${icon(todo ? 'clock' : 'check-circle')}</span><div><h3>${todo ? 'Portfolio Landing Page' : 'Nice work, Ahmed!'}</h3><p>${todo ? 'Due: Fri, Jan 24, 11:59 PM' : 'Your work is ready for review.'}</p>${outlined(todo ? 'View Task' : 'View submissions', todo ? 'task:portfolio' : 'go:tasks')}</div></div></section></div>
    <div class="learning-note">${icon('sparkles')}<p>Big things start with small steps. <strong>You’ve got this.</strong></p><a href="#/tracks">Explore your tracks ${icon('arrow-right')}</a></div>`;
}

function sessions() {
  const p = getProgress(state);
  return `<div class="breadcrumbs"><a href="#/tracks">Web Development</a>${icon('chevron-right')}<span>Session 2: Getting Started</span></div>
    ${pageHeading('Session 2 · Getting Started with HTML & CSS', 'Learn the basics of HTML structure and style your first webpage.', 'play', `<div class="session-status"><span class="status-pill green">${icon('check-circle')}${p.lessons === 6 ? 'Completed' : 'In Progress'}</span><span>${p.lessons} / 6 lessons</span></div>`)}
    <md-tabs class="lesson-tabs" aria-label="Session learning format">${[['book', 'Tutorial'], ['video', 'Video'], ['code', 'Practice'], ['paperclip', 'Resources']].map(([name, label], i) => `<md-primary-tab id="lesson-tab-${i}" aria-controls="lesson-panel" inline-icon ${lessonTab === i ? 'active' : ''}>${icon(name, 'icon')}${label}</md-primary-tab>`).join('')}</md-tabs>
    <div class="session-layout"><aside class="card lesson-sidebar"><h2>Session Content <span>(6)</span></h2><ol>${lessons.map((lesson, i) => `<li><button class="lesson-link ${state.selectedLesson === i ? 'selected' : ''}" data-action="lesson:${i}" ${state.selectedLesson === i ? 'aria-current="step"' : ''}><span class="lesson-indicator ${state.completedLessons.includes(i) ? 'done' : ''}">${state.selectedLesson === i ? icon('play') : state.completedLessons.includes(i) ? icon('check') : ''}</span><span>${i + 1}. ${lesson.title}</span></button></li>`).join('')}</ol><div class="lesson-sidebar-foot">${progress(p.lessons / 6, 'Session progress')}<span>${p.lessons === 6 ? 'Session completed. Great work!' : 'One lesson closer to your goal.'}</span></div></aside>
    <div class="lesson-main card"><section class="lesson-content" id="lesson-panel" tabindex="-1" role="tabpanel" aria-label="${['Tutorial', 'Video', 'Practice', 'Resources'][lessonTab]}">${lessonPanel()}</section><div class="lesson-controls"><label class="completion-label" for="lesson-completed"><md-checkbox id="lesson-completed" aria-label="Mark lesson ${state.selectedLesson + 1} as completed" ${state.completedLessons.includes(state.selectedLesson) ? 'checked' : ''}></md-checkbox><span>Mark lesson as completed</span></label><div class="lesson-buttons">${outlined('Previous', 'previous-lesson', 'chevron-left', state.selectedLesson === 0 ? 'disabled' : '')}${filled(state.selectedLesson === 5 ? 'Finish session' : 'Next lesson', 'next-lesson', state.selectedLesson === 5 ? 'check' : 'chevron-right')}</div></div></div></div>`;
}

function lessonPanel() {
  const lesson = lessons[state.selectedLesson];
  const top = `<div class="lesson-meta"><span class="lesson-chip">Lesson ${state.selectedLesson + 1} of 6</span><span>${icon('clock')} ~ ${lesson.time} min read</span></div>`;
  if (lessonTab === 1) return `${top}<h2>${lesson.heading}</h2><p>A short, guided walkthrough of this lesson’s key ideas.</p><div class="walkthrough"><span class="walkthrough-kicker">GDGoC Learn · Guided walkthrough</span><div id="walkthrough-slide" aria-live="polite">${walkthroughSlide()}</div><div class="walkthrough-footer"><md-filled-button type="button" id="walkthrough-toggle" data-action="walkthrough">${icon('play', 'icon')}Play walkthrough</md-filled-button><div class="walkthrough-step-controls"><md-icon-button data-action="walkthrough-back" aria-label="Previous walkthrough step">${icon('chevron-left')}</md-icon-button><span id="walkthrough-position">${walkthroughStep + 1} / 3</span><md-icon-button data-action="walkthrough-next" aria-label="Next walkthrough step">${icon('chevron-right')}</md-icon-button></div></div>${progress((walkthroughStep + 1) / 3, 'Walkthrough progress', 'walkthrough-progress')}</div><p class="supporting-text">Prefer to learn by reading? The Tutorial tab has all the examples.</p>`;
  if (lessonTab === 2) return `${top}<h2>Your little web playground</h2><p>Experiment with HTML and CSS, then run your code to see what happens.</p><label class="editor-label" for="practice-code">index.html</label><textarea id="practice-code" spellcheck="false" aria-label="HTML and CSS code editor">${esc(practiceSource)}</textarea><div class="practice-actions">${outlined('Reset example', 'reset-practice', 'refresh')}${filled('Run code', 'run-practice', 'play')}</div><div class="preview-label">LIVE PREVIEW</div><iframe id="practice-preview" title="Your HTML and CSS preview" sandbox=""></iframe>`;
  if (lessonTab === 3) return `${top}<h2>A few things to keep handy</h2><p>Take the next step with these guides and starter files.</p><div class="resource-list"><a href="https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content" target="_blank" rel="noopener noreferrer">${icon('book')}<span><strong>HTML essentials</strong><small>MDN Web Docs · A guide to structuring your page</small></span>${icon('external')}</a><a href="https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics" target="_blank" rel="noopener noreferrer">${icon('code')}<span><strong>CSS fundamentals</strong><small>MDN Web Docs · Bring your ideas to life with CSS</small></span>${icon('external')}</a><button data-action="download-starter">${icon('file-text')}<span><strong>Your first webpage starter</strong><small>HTML file · Download and make it your own</small></span>${icon('arrow-right')}</button></div><div class="resource-note">${icon('lightbulb')}<p>You don’t need to memorize everything. Good developers keep good references.</p></div>`;
  return `${top}<h2>${lesson.heading}</h2><p>${lesson.text}</p><div class="code-block"><div class="code-header"><span>${state.selectedLesson === 1 ? 'PROJECT' : [3, 4].includes(state.selectedLesson) ? 'CSS' : 'HTML'}</span><md-icon-button data-action="copy-code" aria-label="Copy lesson code">${icon('clipboard')}</md-icon-button></div><pre><code>${highlight(lesson.code)}</code></pre></div><p>${lesson.after}</p><div class="lesson-tip">${icon('lightbulb')}<span>${state.selectedLesson === 2 ? 'Think of HTML as the skeleton of your page. Every element has a purpose.' : 'Learning sticks when you try it. Open Practice and experiment with this example.'}</span></div>`;
}

function highlight(code) {
  return esc(code).replace(/(&lt;\/?)([a-z][a-z0-9]*)(.*?&gt;)/gi, '$1<span class="syntax-tag">$2</span>$3').replace(/(#[a-f0-9]{6})/gi, '<span class="syntax-value">$1</span>');
}

const statusLabels = { todo: 'To Do', submitted: 'Submitted', completed: 'Completed' };
function walkthroughSlide() {
  const lesson = lessons[state.selectedLesson];
  const titles = ['Start with the content', 'Create your project folder', 'HTML gives your page structure', 'Select it. Style it.', 'A little space goes a long way', 'Put your skills into practice'];
  if (walkthroughStep === 1) return `<span class="walkthrough-number">02</span><h3>See it in code</h3><pre class="walkthrough-code"><code>${esc(lesson.code)}</code></pre>`;
  if (walkthroughStep === 2) return `<span class="walkthrough-number">03</span><h3>Now it’s your turn</h3><p>Open the Practice tab, change the example, and run your code. You learn by building.</p>`;
  return `<span class="walkthrough-number">01</span><h3>${titles[state.selectedLesson]}</h3><p>${lesson.text}</p>`;
}

function stopWalkthrough() { clearInterval(walkthroughTimer); walkthroughPlaying = false; }
function updateWalkthrough() {
  const slide = document.querySelector('#walkthrough-slide');
  if (!slide) { stopWalkthrough(); return; }
  slide.innerHTML = walkthroughSlide();
  document.querySelector('#walkthrough-position').textContent = `${walkthroughStep + 1} / 3`;
  document.querySelector('.walkthrough-progress').value = (walkthroughStep + 1) / 3;
  const button = document.querySelector('#walkthrough-toggle');
  button.innerHTML = `${walkthroughPlaying ? '<svg class="icon" slot="icon" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M280-200v-560h120v560H280Zm280 0v-560h120v560H560Z"/></svg>' : icon('play', 'icon')}${walkthroughPlaying ? 'Pause walkthrough' : walkthroughStep === 2 ? 'Replay walkthrough' : 'Play walkthrough'}`;
}
function taskCards() {
  const visible = getTasks(state, taskStatus, taskTrack);
  if (!visible.length) return `<div class="card empty-state"><img src="/assets/illustrations/empty-tasks.svg" alt="" width="150" height="110"><h2>No tasks here just yet</h2><p>Try another status or track to find your assignments.</p>${outlined('Show all tasks', 'reset-filters', 'refresh')}</div>`;
  return visible.map(task => `<article class="card task-card"><span class="icon-tile large ${task.color}">${icon(task.icon)}</span><div class="task-info"><h2>${task.title}</h2><span class="track-chip">${task.track}</span><p>${task.description}</p></div><div class="task-meta"><strong>+${task.xp} XP</strong><span class="status-pill ${task.status === 'todo' ? 'yellow' : task.status === 'submitted' ? 'purple' : 'green'}">${statusLabels[task.status]}${icon(task.status === 'completed' ? 'check' : task.status === 'submitted' ? 'upload' : 'clock')}</span><small>${task.submission ? `Submitted: ${esc(task.submission.date)}` : task.date}</small></div>${outlined('View Details', `task:${task.id}`, 'arrow-right')}</article>`).join('');
}

function taskPage() {
  const all = getTasks(state);
  return `${pageHeading('Tasks', 'Build something with what you’ve learned.', 'list-check')}<div class="tasks-toolbar"><md-chip-set class="task-filters" aria-label="Filter tasks by status">${[['all', 'All tasks'], ['todo', 'To do'], ['submitted', 'Submitted'], ['completed', 'Completed']].map(([key, label]) => `<md-filter-chip id="task-filter-${key}" data-action="filter:${key}" label="${label} (${key === 'all' ? all.length : all.filter(t => t.status === key).length})" ${taskStatus === key ? 'selected' : ''}></md-filter-chip>`).join('')}</md-chip-set><md-outlined-select class="track-select" aria-label="Filter tasks by learning track"><md-select-option value="all" ${taskTrack === 'all' ? 'selected' : ''}><div slot="headline">All tracks</div></md-select-option>${['Web Development', 'Software Engineering'].map(track => `<md-select-option value="${track}" ${taskTrack === track ? 'selected' : ''}><div slot="headline">${track}</div></md-select-option>`).join('')}</md-outlined-select></div><section class="task-list" id="task-list" aria-label="Assignments" aria-live="polite">${taskCards()}</section><div class="subtle-note">${icon('help')}<span>Submitted work is reviewed by your track mentor. XP is awarded when your task is approved.</span></div>`;
}

function certificate() {
  const p = getProgress(state);
  return `${pageHeading('Your Certificate Journey', 'Track what you need to complete before becoming eligible.', 'award')}<div class="certificate-intro"><section class="card certificate-progress"><div class="progress-label"><h2>XP Requirement</h2><strong>${p.xp} / 1,000 XP</strong></div>${progress(p.xp / 1000, 'Season certificate XP requirement')}<p>${1000 - p.xp} XP remaining to meet the threshold.</p></section><img class="certificate-art" src="/assets/illustrations/season-certificate.svg" alt="GDGoC AAST Aswan season certificate illustration" width="310" height="215"></div><h2 class="section-title">Completion Requirements</h2><div class="certificate-grid"><section class="card requirements-list" aria-label="Certificate completion requirements">${[
    ['Attendance', 'Attend the required number of sessions.', '4 / 6 sessions', true, 'attendance'],
    ['Session participation', 'Earn XP through in-session activity.', `${p.activity} XP earned`, true, 'participation'],
    ['Required assignments', 'Complete the mandatory tasks.', '2 / 4 completed', false, 'assignments'],
    ['Minimum XP target', 'Reach the total XP threshold for the season.', `${p.xp} / 1,000 XP`, p.xp >= 1000, 'minimum-xp'],
  ].map(([title, description, amount, done, id]) => `<button class="requirement-row" data-action="requirement:${id}"><span class="requirement-state ${done ? 'done' : ''}">${done ? icon('check') : ''}</span><span class="requirement-info"><strong>${title}</strong><small>${description}</small></span><span class="requirement-value">${amount}</span>${icon('chevron-right')}</button>`).join('')}</section><aside class="card certificate-locked">${icon('lock')}<h3>Certificate not yet unlocked</h3><p>Once all season requirements are met and approved, the verified certificate will be available here.</p><span class="locked-tag">A little closer every day</span></aside></div><div class="certificate-encouragement">${icon('sparkles')}<div><strong>The work you put in will show.</strong><p>Keep showing up, trying new things, and building with your community.</p></div>${outlined('Continue learning', 'resume', 'arrow-right')}</div>`;
}

function learningTracks() {
  return `${pageHeading('Learning Tracks', 'Find your curiosity. Follow it somewhere new.', 'layers')}<div class="tracks-intro"><span class="eyebrow">LEARN TOGETHER. BUILD TOGETHER.</span><h2>A new skill is a new possibility.</h2><p>Hands-on sessions, real projects, and a community to learn with.</p></div><div class="tracks-grid">${tracks.map(track => { const joined = state.joinedTracks.includes(track.slug); return `<article class="card track-card"><div class="track-art ${track.color}"><img src="/assets/tracks/${track.slug}.svg" alt="" width="190" height="130"><span>${icon('book')}${track.sessions} sessions</span></div><div class="track-card-body"><span class="eyebrow ${joined ? '' : 'muted'}">${joined ? track.tag : 'EXPLORE A NEW SKILL'}</span><h2>${track.name}</h2><p>${track.description}</p><div class="track-progress-info"><span>${joined ? 'Your progress' : 'Ready when you are'}</span><strong>${track.progress}%</strong></div>${progress(track.progress / 100, `${track.name} progress`)}${joined ? filled('Continue track', `track:${track.slug}`) : outlined('Explore track', `track:${track.slug}`, 'arrow-right')}</div></article>`; }).join('')}</div>`;
}

function xpPage() {
  const p = getProgress(state);
  return `${pageHeading('XP & Badges', 'Every step counts. See how far you’ve come.', 'award', `<span class="season-chip">${icon('calendar')} This season</span>`)}<section class="xp-hero"><div><span class="eyebrow">SMALL STEPS. REAL PROGRESS.</span><h2>${p.xp} <span>XP earned</span></h2><p>You’re building more than skills. You’re building momentum.</p></div><div class="xp-hero-award">${icon('trophy')}</div></section><div class="xp-grid">${[['calendar-check', p.attendance, 'Attendance', 'blue'], ['chart', p.activity, 'Activity', 'purple'], ['check-square', p.tasks, 'Tasks', 'green']].map(([name, value, label, color]) => `<section class="card xp-card"><span class="icon-tile ${color}">${icon(name)}</span><div><h2>${value} <span>XP</span></h2><p>${label}</p></div></section>`).join('')}</div><div class="section-card-heading badge-heading"><h2>Your badge collection</h2><span class="muted">2 of 4 unlocked</span></div><div class="badges-grid">${[['first-step', 'First Step', 'Complete your first lesson.', true], ['consistent-builder', 'Consistent Builder', 'Attend 4 community sessions.', true], ['challenge-complete', 'Challenge Complete', 'Complete all required assignments.', false], ['community-helper', 'Community Helper', 'Help your community grow.', false]].map(([slug, title, description, unlocked]) => `<article class="card badge-card ${unlocked ? '' : 'locked'}"><img src="/assets/badges/${slug}.svg" alt="" width="84" height="84"><h3>${title}</h3><p>${description}</p><span class="status-pill ${unlocked ? 'green' : 'slate'}">${icon(unlocked ? 'check' : 'lock')}${unlocked ? 'Unlocked' : 'Keep going'}</span></article>`).join('')}</div><section class="card xp-explainer"><div><h2>More ways to grow</h2><p>Join a session, participate in a workshop, or put your skills to work on a task.</p></div>${filled('Find your next task', 'go:tasks')}</section>`;
}

function render({ focus = false, focusSelector = '' } = {}) {
  stopWalkthrough();
  walkthroughStep = 0;
  document.body.classList.remove('menu-open');
  app.innerHTML = shell(({ dashboard, tracks: learningTracks, sessions, tasks: taskPage, xp: xpPage, certificate })[route]());
  document.title = `${navItems.find(item => item[0] === route)[2]} · GDGoC Learn`;
  if (route === 'sessions' && lessonTab === 2) document.querySelector('#practice-preview').srcdoc = practiceSource;
  if (focus) { document.querySelector('#main').focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }
  if (focusSelector) document.querySelector(focusSelector)?.focus({ preventScroll: true });
}

async function openDialog(title, content, actions = '') {
  const root = document.querySelector('#dialog-root');
  if (root.firstElementChild?.open) await root.firstElementChild.close();
  root.innerHTML = `<md-dialog class="app-dialog"><div slot="headline">${title}</div><div slot="content" class="dialog-content">${content}</div><div slot="actions">${outlined('Close', 'close-dialog')}${actions}</div></md-dialog>`;
  await root.firstElementChild.updateComplete;
  await root.firstElementChild.show();
}

function openTask(id) {
  const task = getTasks(state).find(task => task.id === id);
  if (!task) return;
  openDialog(task.title, `<div class="task-dialog-meta"><span class="track-chip">${task.track}</span><span class="status-pill ${task.status === 'todo' ? 'yellow' : task.status === 'completed' ? 'green' : 'purple'}">${statusLabels[task.status]}</span><strong>+${task.xp} XP</strong></div><p>${task.description}</p><h3>What you’ll build</h3><ul class="checklist">${task.requirements.map(item => `<li>${icon('check-circle')}<span>${item}</span></li>`).join('')}</ul><div class="dialog-callout">${icon(task.status === 'completed' ? 'check-circle' : 'clock')}<span>${task.submission ? `Submitted ${esc(task.submission.date)}. Your mentor will review your work.` : task.status === 'submitted' ? 'Your work has been submitted and is awaiting mentor review.' : task.date}</span></div>${task.status === 'todo' ? `<h3>Ready to share your work?</h3><p>Add the link to your published page or GitHub repository.</p><md-outlined-text-field id="submission-url" type="url" label="Project or repository URL" placeholder="https://github.com/you/your-project" required supporting-text="Your mentor will use this link to review your work."></md-outlined-text-field><p class="field-error" id="submission-error" role="alert"></p>` : task.submission ? `<a class="submission-link" href="${esc(task.submission.url)}" target="_blank" rel="noopener noreferrer">View your submission ${icon('external')}</a>` : ''}`, task.status === 'todo' ? filled('Submit project', `submit:${task.id}`, 'upload') : '');
}

function requirementDialog(id) {
  const p = getProgress(state);
  const info = {
    attendance: ['You keep showing up', '<p>You’ve attended 4 out of 6 sessions this season and met the minimum attendance requirement of 4 sessions.</p><p>Each attended session adds 60 XP to your learning journey.</p>', 'go:sessions', 'View sessions'],
    participation: ['Learning by taking part', `<p>You’ve earned ${p.activity} XP through learning activities and participation.</p><p>Continue the HTML & CSS workshop to build your skills and earn 20 XP for each newly completed lesson.</p>`, 'resume', 'Continue learning'],
    assignments: ['Put your skills into practice', '<p>You’ve completed 2 of the 4 mandatory assignments. Submit your remaining projects and have them approved by your mentor to meet this requirement.</p><p>Work that is awaiting review will appear as Submitted in your task list.</p>', 'go:tasks', 'View tasks'],
    'minimum-xp': ['Your next milestone: 1,000 XP', `<p>You have ${p.xp} XP. Earn another ${1000 - p.xp} XP to reach the season target.</p><p>Attend sessions, join activities, and complete approved assignments to get there.</p>`, 'go:xp', 'View your XP'],
  }[id];
  if (info) openDialog(info[0], info[1], filled(info[3], `dialog-${info[2]}`));
}

async function act(action) {
  const [type, value] = action.split(':');
  if (type === 'go') return go(value);
  if (type === 'dialog-go') { await document.querySelector('md-dialog')?.close(); return go(value); }
  if (type === 'dialog-resume') { await document.querySelector('md-dialog')?.close(); return go('sessions'); }
  if (type === 'resume') { lessonTab = 0; return go('sessions'); }
  if (type === 'menu') { document.querySelector('[data-action="menu"]').setAttribute('aria-expanded', String(document.body.classList.toggle('menu-open'))); return; }
  if (type === 'close-menu') { closeMenu(); return; }
  if (type === 'close-dialog') return document.querySelector('md-dialog')?.close();
  if (type === 'task') return openTask(value);
  if (type === 'requirement') return requirementDialog(value);
  if (type === 'lesson') { state.selectedLesson = Number(value); save(); render({ focusSelector: '#lesson-panel' }); return; }
  if (type === 'previous-lesson') { state.selectedLesson = Math.max(0, state.selectedLesson - 1); save(); render({ focusSelector: '#lesson-panel' }); return; }
  if (type === 'next-lesson') {
    state = toggleLesson(state, state.selectedLesson, true);
    if (state.selectedLesson < 5) { state.selectedLesson++; save(); render({ focusSelector: '#lesson-panel' }); }
    else {
      save(); render();
      const complete = state.completedLessons.length === lessons.length;
      openDialog(complete ? 'One more milestone, Ahmed! 🎉' : 'You’ve reached the final lesson', complete ? '<p>You’ve completed all 6 lessons in Getting Started with HTML & CSS.</p><p>Now turn what you’ve learned into something you can share. Your portfolio landing page is a great place to start.</p>' : `<p>You’ve completed ${state.completedLessons.length} of 6 lessons. Finish the remaining lessons to complete this session.</p>`, filled(complete ? 'Build your portfolio' : 'Continue learning', complete ? 'dialog-go:tasks' : 'dialog-resume'));
    }
    return;
  }
  if (type === 'copy-code') {
    try { await navigator.clipboard.writeText(lessons[state.selectedLesson].code); toast('Code copied. Make it your own!'); } catch { toast('Select the code and use Ctrl+C to copy it.'); }
    return;
  }
  if (type === 'reset-filters') { taskStatus = 'all'; taskTrack = 'all'; render(); return; }
  if (type === 'filter') { taskStatus = ['all', 'todo', 'submitted', 'completed'].includes(value) ? value : 'all'; render({ focusSelector: `#task-filter-${taskStatus}` }); return; }
  if (type === 'submit') {
    const field = document.querySelector('#submission-url');
    if (!field.reportValidity()) return;
    let url;
    try { url = new URL(field.value); if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol'); }
    catch { document.querySelector('#submission-error').textContent = 'Enter a complete link that starts with https:// or http://.'; return; }
    state.submissions[value] = { url: url.href, date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) };
    save(); await document.querySelector('md-dialog').close(); render(); toast('Project saved as submitted. Ready for mentor review.'); return;
  }
  if (type === 'run-practice') { practiceSource = document.querySelector('#practice-code').value; document.querySelector('#practice-preview').srcdoc = practiceSource; toast('Preview updated. Keep experimenting!'); return; }
  if (type === 'reset-practice') {
    const lessonCode = lessons[state.selectedLesson].code;
    practiceSource = [3, 4].includes(state.selectedLesson) ? `<style>body { font-family: sans-serif; padding: 24px; }\n${lessonCode}</style>\n<h1>Hello GDGoC!</h1>\n<p>My first webpage.</p>` : `<style>body { font-family: sans-serif; padding: 24px; } h1 { color: #1a73e8; }</style>\n${state.selectedLesson === 1 ? '<h1>My project is ready!</h1>\n<p>Let’s build something.</p>' : lessonCode}`;
    render(); return;
  }
  if (type === 'download-starter') {
    const blob = new Blob(['<!doctype html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>My first webpage</title>\n<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:48px auto;padding:24px;line-height:1.6}h1{color:#1a73e8}</style>\n</head>\n<body>\n<main>\n<h1>Hello GDGoC!</h1>\n<p>My first webpage. Make this space your own!</p>\n</main>\n</body>\n</html>'], { type: 'text/html' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'gdgoc-first-webpage.html'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Your starter file is ready. Happy building!'); return;
  }
  if (type === 'walkthrough') {
    if (walkthroughPlaying) { stopWalkthrough(); updateWalkthrough(); return; }
    if (walkthroughStep === 2) walkthroughStep = 0;
    walkthroughPlaying = true;
    updateWalkthrough();
    walkthroughTimer = setInterval(() => { walkthroughStep++; if (walkthroughStep >= 2) { walkthroughStep = 2; stopWalkthrough(); } updateWalkthrough(); }, 6000);
    return;
  }
  if (type === 'walkthrough-back' || type === 'walkthrough-next') { stopWalkthrough(); walkthroughStep = Math.max(0, Math.min(2, walkthroughStep + (type === 'walkthrough-next' ? 1 : -1))); updateWalkthrough(); return; }
  if (type === 'track') {
    const track = tracks.find(track => track.slug === value);
    if (!track) return;
    if (track.slug === 'web-development') { lessonTab = 0; return go('sessions'); }
    return openDialog(track.name, `<img class="dialog-track-art" src="/assets/tracks/${track.slug}.svg" alt="" width="200" height="130"><p>${track.description}</p><p>This track includes ${track.sessions} community sessions, practical exercises, and projects to help you build confidence.</p><div class="dialog-callout">${icon('calendar')}<span>${state.joinedTracks.includes(value) ? 'You’re following this track. Your next session will appear when the community schedule is available.' : 'Follow this track to keep it in your learning collection. Session details will appear when the community schedule is available.'}</span></div>`, state.joinedTracks.includes(value) ? '' : filled('Follow this track', `join:${value}`, 'plus'));
  }
  if (type === 'join') { if (!tracks.some(track => track.slug === value)) return; state.joinedTracks = [...new Set([...state.joinedTracks, value])]; save(); await document.querySelector('md-dialog').close(); render(); toast('Track added to your learning collection.'); return; }
  if (type === 'notifications') return openDialog('A little heads-up', `<div class="notification-item"><span class="icon-tile red">${icon('clock')}</span><div><h3>Your next building challenge</h3><p>The Portfolio Landing Page assignment is ready for you.</p><small>Web Development · +100 XP on approval</small></div></div><div class="notification-item"><span class="icon-tile green">${icon('award')}</span><div><h3>You’re making progress</h3><p>You’re ${getProgress(state).percent}% of the way to your season XP target. Keep it going!</p></div></div>`, filled('View tasks', 'dialog-go:tasks'));
  if (type === 'profile') return openDialog('Your learning profile', `<div class="profile-overview"><img src="/assets/avatars/student-placeholder.svg" alt="" width="72" height="72"><div><h3>Ahmed</h3><p>GDGoC · AAST Aswan</p><span class="track-chip">Community learner</span></div></div><div class="profile-stats"><div><strong>${getProgress(state).xp}</strong><span>Total XP</span></div><div><strong>${state.joinedTracks.length}</strong><span>Tracks followed</span></div><div><strong>2</strong><span>Badges earned</span></div></div><p class="supporting-text">Your learning progress is saved in this browser.</p>`);
  if (type === 'help') return openDialog('We’re learning together', `<p>A few answers to keep you moving.</p><div class="help-answer"><h3>How do I earn XP?</h3><p>Attend community sessions, complete lessons, and have your assignments approved by your mentor.</p></div><div class="help-answer"><h3>Where do I submit my work?</h3><p>Open Tasks, choose View Details, and add a link to your project or GitHub repository.</p></div><div class="help-answer"><h3>When will my certificate be ready?</h3><p>Visit Certificate to see the requirements. Your certificate becomes available after your season progress is reviewed and approved.</p></div><div class="dialog-callout">${icon('users')}<span>Need a hand with a lesson? Reach out to your track mentor during your next community session.</span></div><p class="supporting-text">This is a local learning portal preview. Progress and submissions are saved in this browser; mentor review requires a connected backend.</p>`);
}

document.addEventListener('click', event => {
  if (event.target.closest('.skip-link')) { event.preventDefault(); document.querySelector('#main').focus(); return; }
  const target = event.target.closest('[data-action]');
  if (target && !target.hasAttribute('disabled')) act(target.dataset.action).catch(error => { console.error(error); toast('Something didn’t finish. Please try again.'); });
});
document.addEventListener('change', event => {
  if (event.target.matches('.lesson-tabs')) {
    if (lessonTab === 2) practiceSource = document.querySelector('#practice-code')?.value ?? practiceSource;
    lessonTab = event.target.activeTabIndex;
    stopWalkthrough(); walkthroughStep = 0;
    const panel = document.querySelector('#lesson-panel'); panel.innerHTML = lessonPanel(); panel.setAttribute('aria-label', ['Tutorial', 'Video', 'Practice', 'Resources'][lessonTab]);
    if (lessonTab === 2) document.querySelector('#practice-preview').srcdoc = practiceSource;
  }
  if (event.target.matches('#lesson-completed')) { const checked = event.target.checked; state = toggleLesson(state, state.selectedLesson, checked); save(); render({ focusSelector: '#lesson-completed' }); toast(checked ? 'Lesson completed. Another step forward!' : 'Lesson marked as incomplete.'); }
  if (event.target.matches('.track-select')) { taskTrack = event.target.value; document.querySelector('#task-list').innerHTML = taskCards(); }
});
document.addEventListener('input', event => { if (event.target.id === 'practice-code') practiceSource = event.target.value; });
function closeMenu() {
  document.body.classList.remove('menu-open');
  const button = document.querySelector('[data-action="menu"]');
  button.setAttribute('aria-expanded', 'false');
  button.focus();
}
document.addEventListener('keydown', event => { if (event.key === 'Escape' && document.body.classList.contains('menu-open')) closeMenu(); });
window.addEventListener('hashchange', () => { route = readRoute(); render({ focus: true }); });
render();
