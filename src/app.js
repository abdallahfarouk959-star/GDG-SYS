import '@material/web/all.js';
import { icon } from './icons.js';
import {
  STORAGE_KEY,
  routes,
  tasks,
  lessons,
  tracks,
  SESSIONS_LIST,
  loadState,
  getProgress,
  getTasks,
  toggleLesson,
  hydrateUser,
  getAllSessions,
  saveCustomSession,
  getAllLessons,
  saveCustomLesson,
  saveCustomTask,
  getTrackLessons,
  saveLesson,
  deleteLesson,
  toggleLessonVisibility,
  getTrackTasks,
  saveTrackTask,
  deleteTrackTask,
  toggleTaskVisibility,
  getTrackSubmissions,
  reviewSubmission,
  getHrEvaluations,
  saveHrEvaluation,
  deleteHrEvaluation,
  getLogisticsCheckins,
  saveLogisticsCheckins,
  getAllManagedSessions,
  saveManagedSession,
  deleteManagedSession,
  toggleSessionPublish,
  getSessionRegistrations,
  registerAttendeeForSession,
  toggleSessionCheckIn,
  getMasterMembers,
  upsertMasterMember
} from './state.js';
import {
  getCurrentSession,
  signUp,
  signIn,
  signInDemo,
  signOut,
  dismissCelebration,
  DEMO_ACCOUNTS
} from './services/authService.js';
import { HISTORICAL_ATTENDEES } from './services/historicalData.js';

const app = document.querySelector('#app');
const brand = () => `<img class="brand-lockup" src="/assets/brand/gdgoc-learn-lockup.svg" alt="GDGoC · AAST Aswan" width="196" height="57"><span class="brand-product">Learn</span>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const trailing = name => ['arrow-right', 'chevron-right', 'external'].includes(name) ? 'trailing-icon' : '';
const filled = (label, action, name = 'arrow-right', attrs = '') => `<md-filled-button type="button" data-action="${action}" ${trailing(name)} ${attrs}>${label}${name ? icon(name, 'icon') : ''}</md-filled-button>`;
const outlined = (label, action, name = '', attrs = '') => `<md-outlined-button type="button" data-action="${action}" ${trailing(name)} ${attrs}>${name ? icon(name, 'icon') : ''}${label}</md-outlined-button>`;
const progress = (value, label, extra = '') => `<md-linear-progress value="${value}" aria-label="${label}" class="${extra}"></md-linear-progress>`;
const navItems = [
  ['dashboard', 'home', 'Dashboard'],
  ['tracks', 'layers', 'Learning Tracks'],
  ['sessions', 'calendar', 'My Sessions'],
  ['tasks', 'list-check', 'Tasks'],
  ['xp', 'award', 'XP & Badges'],
  ['certificate', 'shield', 'Certificate']
];

let authSession = getCurrentSession();
let authMode = 'signup'; // 'signup' | 'signin'
let authErrors = {};
let authGlobalError = '';
let isStudentChecked = true;

// Super Admin & Studio State
let superAdminView = 'scheduler'; // 'scheduler' | 'studio' | 'hr' | 'logistics' | 'insights' | 'student'
let studioTrack = 'web-development';
let studioTab = 'sessions'; // 'sessions' | 'lessons' | 'tasks'

// Logistics Portal State
let logisticsActiveSession = 'sess-web-dev-3';
let logisticsSearchQuery = '';

// HR Portal State
let hrRatingComm = 5;
let hrRatingClarity = 5;
let hrRatingEngage = 4;
let hrRatingPunct = 5;

// Public Registration State
let publicRegSuccess = null;
let publicRegError = '';

let state;
try { state = loadState(localStorage, authSession); } catch { state = loadState({ getItem: () => null }, authSession); }
if (authSession) {
  state = hydrateUser(state, authSession);
}

let route = readRoute();
let publicSessionId = readPublicSessionId();
let lessonTab = 0;
let taskStatus = 'all';
let taskTrack = 'all';
let toastTimer;
let walkthroughTimer;
let walkthroughStep = 0;
let walkthroughPlaying = false;
let practiceSource = '<style>\n  body { font-family: sans-serif; padding: 24px; }\n  h1 { color: #1a73e8; }\n</style>\n<h1>Hello GDGoC!</h1>\n<p>My first webpage.</p>';

function readRoute() {
  const hash = location.hash.replace(/^#\/?/, '').split('?')[0];
  if (hash.startsWith('register/')) {
    return 'register';
  }
  if (hash === 'insights') {
    return 'insights';
  }
  const candidate = hash.split('/')[0];
  return routes.includes(candidate) ? candidate : 'dashboard';
}

function readPublicSessionId() {
  const hash = location.hash.replace(/^#\/?/, '').split('?')[0];
  if (hash.startsWith('register/')) {
    return hash.replace('register/', '').trim();
  }
  return 'sess-web-dev-3';
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { toast('Your changes will last for this visit. Browser storage is unavailable.'); }
}

function toast(message) {
  const element = document.querySelector('#toast');
  if (!element) return;
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('visible'), 3600);
}

function go(next) {
  if (route === next) { render(); return; }
  location.hash = `/${next}`;
}

function formatSessionDate(dateStr) {
  if (!dateStr) return '';
  if (dateStr.includes(',') || dateStr.includes('·') || dateStr === 'Completed') return dateStr;
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch {}
  return dateStr;
}

function formatSessionTime(timeStr) {
  if (!timeStr) return '';
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
  try {
    const [hh, mm] = timeStr.split(':');
    const h = Number(hh);
    const m = Number(mm);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const padM = m < 10 ? '0' + m : m;
    return `${h12 < 10 ? '0' + h12 : h12}:${padM} ${ampm}`;
  } catch {}
  return timeStr;
}

function roleBadge(user) {
  const role = user.role || 'learner';
  if (role === 'super_admin') return `<span class="role-badge super_admin">${icon('shield')} Super Admin</span>`;
  if (role === 'track_lead') {
    const trackSlug = user.assignedTrack || 'web-development';
    const track = tracks.find(t => t.slug === trackSlug)?.name || 'Track Lead';
    let badgeClass = 'track_lead';
    if (trackSlug === 'software-engineering') badgeClass = 'swe_lead';
    else if (trackSlug === 'ai-ml') badgeClass = 'ai_lead';
    else if (trackSlug === 'data-science') badgeClass = 'ds_lead';
    return `<span class="role-badge ${badgeClass}">${icon('code')} Lead · ${esc(track)}</span>`;
  }
  if (role === 'hr') return `<span class="role-badge hr">${icon('check-circle')} HR Team</span>`;
  if (role === 'logistics') return `<span class="role-badge logistics">${icon('qr')} Logistics Team</span>`;
  return `<span class="role-badge learner">${icon('award')} Student</span>`;
}

function authView() {
  const isSignUp = authMode === 'signup';
  return `<div class="auth-layout">
    <div class="auth-card">
      <div class="auth-brand-section">
        <a class="brand" href="#" aria-label="GDGoC Learn">${brand()}</a>
        <span class="auth-brand-badge">${icon('shield')} Official Learning Portal · AASTMT Aswan</span>
        <h1 class="auth-title">${isSignUp ? 'Create your learner account' : 'Sign in to GDGoC Learn'}</h1>
        <p class="auth-subtitle">${isSignUp ? 'Register to access community workshops, build real projects, and automatically restore your historical attendances.' : 'Welcome back! Enter your credentials or choose a pre-configured team role below.'}</p>
      </div>

      <div class="auth-nav-tabs" role="tablist" aria-label="Authentication mode selection">
        <button type="button" class="auth-tab-btn ${isSignUp ? 'active' : ''}" data-action="auth-tab:signup" role="tab" aria-selected="${isSignUp}">Create Account</button>
        <button type="button" class="auth-tab-btn ${!isSignUp ? 'active' : ''}" data-action="auth-tab:signin" role="tab" aria-selected="${!isSignUp}">Sign In</button>
      </div>

      ${authGlobalError ? `<div class="auth-error-banner" role="alert">${icon('close')}<span>${esc(authGlobalError)}</span></div>` : ''}

      ${isSignUp ? signUpForm() : signInForm()}
    </div>
  </div>`;
}

function signUpForm() {
  return `<form class="auth-form" id="signup-form" novalidate onsubmit="return false;">
    <div class="auth-field-group">
      <md-outlined-text-field id="signup-name" type="text" label="Full Name" placeholder="e.g. Ahmed Mahmoud" required supporting-text="Full legal or academic name used in workshop check-ins" ${authErrors.fullName ? `error error-text="${esc(authErrors.fullName)}"` : ''}></md-outlined-text-field>
    </div>

    <div class="auth-field-group">
      <md-outlined-text-field id="signup-email" type="email" label="Email Address" placeholder="student@example.com" required supporting-text="Used for workshop updates & season certificate delivery" ${authErrors.email ? `error error-text="${esc(authErrors.email)}"` : ''}></md-outlined-text-field>
    </div>

    <div class="auth-field-group">
      <md-outlined-text-field id="signup-phone" type="tel" label="Phone Number" placeholder="01XXXXXXXXX" required supporting-text="11-digit Egyptian mobile number (e.g. 01012345678)" ${authErrors.phone ? `error error-text="${esc(authErrors.phone)}"` : ''}></md-outlined-text-field>
    </div>

    <div class="auth-field-group">
      <md-outlined-text-field id="signup-national-id" type="text" label="National ID (14 digits)" placeholder="14-digit Egyptian National ID" required supporting-text="Required for official certificate verification and attendance recovery" ${authErrors.nationalId ? `error error-text="${esc(authErrors.nationalId)}"` : ''}></md-outlined-text-field>
    </div>

    <div class="auth-checkbox-row" data-action="toggle-student">
      <md-checkbox id="signup-is-student" ${isStudentChecked ? 'checked' : ''} aria-label="I am an AASTMT student"></md-checkbox>
      <span class="auth-checkbox-label">I am an AASTMT student</span>
    </div>

    <div class="auth-field-group ${isStudentChecked ? '' : 'auth-hidden'}" id="uni-field-container">
      <md-outlined-text-field id="signup-uni-id" type="text" label="AASTMT University ID (9 digits)" placeholder="e.g. 251009966" supporting-text="9-digit academic registration number" ${authErrors.universityId ? `error error-text="${esc(authErrors.universityId)}"` : ''}></md-outlined-text-field>
    </div>

    <div class="auth-field-group">
      <md-outlined-select id="signup-track" label="Primary Learning Track" aria-label="Select your primary learning track">
        <md-select-option value="web-development" selected><div slot="headline">Web Development</div></md-select-option>
        <md-select-option value="software-engineering"><div slot="headline">Software Engineering</div></md-select-option>
        <md-select-option value="ai-ml"><div slot="headline">AI & Machine Learning</div></md-select-option>
        <md-select-option value="data-science"><div slot="headline">Data Science</div></md-select-option>
      </md-outlined-select>
    </div>

    <div class="auth-field-group">
      <md-outlined-text-field id="signup-password" type="password" label="Password (min 8 characters)" placeholder="••••••••" required supporting-text="Must be at least 8 characters long" ${authErrors.password ? `error error-text="${esc(authErrors.password)}"` : ''}>
        <md-icon-button slot="trailing-icon" type="button" class="password-toggle-btn" data-action="toggle-password:signup-password" aria-label="Toggle password visibility">
          ${icon('eye')}
        </md-icon-button>
      </md-outlined-text-field>
    </div>

    <div class="auth-notice-box">
      ${icon('sparkles')}
      <div><strong>Automatic Progress Recovery:</strong> If you attended past sessions, our identity engine will automatically reconcile your records and restore your attendances and earned XP.</div>
    </div>

    <md-filled-button type="button" class="auth-submit-btn" data-action="submit-signup">${icon('user', 'icon')}Create Account</md-filled-button>

    <div class="auth-switch-prompt">
      Already have an account? <button type="button" class="auth-switch-link" data-action="auth-tab:signin">Sign in</button>
    </div>
  </form>`;
}

function signInForm() {
  return `<form class="auth-form" id="signin-form" novalidate onsubmit="return false;">
    <div class="auth-field-group">
      <md-outlined-text-field id="signin-email" type="email" label="Email Address" placeholder="name@example.com" required supporting-text="Enter your registered email address" ${authErrors.email ? `error error-text="${esc(authErrors.email)}"` : ''}></md-outlined-text-field>
    </div>

    <div class="auth-field-group">
      <md-outlined-text-field id="signin-password" type="password" label="Password" placeholder="••••••••" required ${authErrors.password ? `error error-text="${esc(authErrors.password)}"` : ''}>
        <md-icon-button slot="trailing-icon" type="button" class="password-toggle-btn" data-action="toggle-password:signin-password" aria-label="Toggle password visibility">
          ${icon('eye')}
        </md-icon-button>
      </md-outlined-text-field>
    </div>

    <md-filled-button type="button" class="auth-submit-btn" data-action="submit-signin">${icon('arrow-right', 'icon')}Sign In</md-filled-button>

    <div class="demo-access-box">
      <div class="demo-access-header">
        <div class="demo-header-title">
          ${icon('sparkles')}
          <strong>Quick Demo Access (Role Preview)</strong>
        </div>
        <span class="demo-header-sub">One-click sign in as any team role (Password: <code>Password123!</code>)</span>
      </div>
      <div class="demo-buttons-grid">
        <button type="button" class="demo-btn student" data-action="demo-login:student@gdgoc.edu.eg">
          <span class="demo-role-badge">Student</span>
          <span class="demo-role-desc">Restored History (4 Sessions, 240 XP)</span>
        </button>
        <button type="button" class="demo-btn admin" data-action="demo-login:admin@gdgoc.edu.eg">
          <span class="demo-role-badge">Super Admin</span>
          <span class="demo-role-desc">Master Console & Scheduler</span>
        </button>
        <button type="button" class="demo-btn web-lead" data-action="demo-login:web.lead@gdgoc.edu.eg">
          <span class="demo-role-badge">Web Lead</span>
          <span class="demo-role-desc">Web Development Studio</span>
        </button>
        <button type="button" class="demo-btn swe-lead" data-action="demo-login:swe.lead@gdgoc.edu.eg">
          <span class="demo-role-badge">SWE Lead</span>
          <span class="demo-role-desc">Software Engineering Studio</span>
        </button>
        <button type="button" class="demo-btn ai-lead" data-action="demo-login:ai.lead@gdgoc.edu.eg">
          <span class="demo-role-badge">AI Lead</span>
          <span class="demo-role-desc">AI & Machine Learning Studio</span>
        </button>
        <button type="button" class="demo-btn ds-lead" data-action="demo-login:ds.lead@gdgoc.edu.eg">
          <span class="demo-role-badge">DS Lead</span>
          <span class="demo-role-desc">Data Science Studio</span>
        </button>
        <button type="button" class="demo-btn hr" data-action="demo-login:hr@gdgoc.edu.eg">
          <span class="demo-role-badge">HR Team</span>
          <span class="demo-role-desc">Session & Speaker Evaluations</span>
        </button>
        <button type="button" class="demo-btn logistics" data-action="demo-login:logistics@gdgoc.edu.eg">
          <span class="demo-role-badge">Logistics Team</span>
          <span class="demo-role-desc">Door Check-In & Walk-in Desk</span>
        </button>
      </div>

      <div style="margin-top: 14px; text-align: center;">
        <button type="button" class="demo-btn insights" data-action="open-insights-view" style="width: 100%; align-items: center; justify-content: center; flex-direction: row; gap: 8px;">
          ${icon('chart')}
          <strong>Explore Analytics & Attendance Dashboard</strong>
        </button>
      </div>
    </div>

    <div class="auth-switch-prompt">
      Don't have an account yet? <button type="button" class="auth-switch-link" data-action="auth-tab:signup">Create account</button>
    </div>
  </form>`;
}

/* ==========================================================================
   STAFF & ADMIN DEDICATED SHELL (No Student Sidebar Overlap)
   ========================================================================== */

function staffShell(user, content) {
  const isSuperAdmin = user.role === 'super_admin';

  return `<div class="staff-portal-shell">
    <header class="staff-header">
      <div class="staff-header-left">
        <a class="brand" href="#" aria-label="GDGoC Learn home">${brand()}</a>
        <div class="staff-header-title-group">
          <span class="staff-header-subtitle">Staff & Team Console</span>
          <div>${roleBadge(user)}</div>
        </div>
      </div>

      ${isSuperAdmin ? `
        <nav class="superadmin-top-nav" aria-label="Master Console navigation">
          <button type="button" class="staff-nav-pill ${superAdminView === 'scheduler' ? 'active' : ''}" data-action="super-view:scheduler">${icon('calendar')} Sessions & Scheduler</button>
          <button type="button" class="staff-nav-pill ${superAdminView === 'studio' ? 'active' : ''}" data-action="super-view:studio">${icon('code')} Track Studios</button>
          <button type="button" class="staff-nav-pill ${superAdminView === 'hr' ? 'active' : ''}" data-action="super-view:hr">${icon('check-circle')} HR Portal</button>
          <button type="button" class="staff-nav-pill ${superAdminView === 'logistics' ? 'active' : ''}" data-action="super-view:logistics">${icon('qr')} Logistics Check-In</button>
          <button type="button" class="staff-nav-pill ${superAdminView === 'insights' ? 'active' : ''}" data-action="super-view:insights">${icon('chart')} Team Insights</button>
          <button type="button" class="staff-nav-pill ${superAdminView === 'student' ? 'active' : ''}" data-action="super-view:student">${icon('award')} Student View</button>
        </nav>
      ` : ''}

      <div class="staff-header-right">
        <div class="staff-user-chip">
          <span>${esc(user.fullName || user.firstName)}</span>
        </div>
        <md-icon-button data-action="signout" aria-label="Sign out">${icon('logout')}</md-icon-button>
      </div>
    </header>

    <main class="staff-workspace" tabindex="-1">
      ${content}
    </main>

    <footer class="page-footer">
      <span>Made for curious minds. Built by our community.</span>
      <span>GDGoC · AAST Aswan</span>
    </footer>
  </div>`;
}

function studentShell(content) {
  const p = getProgress(state);
  const user = state.user || { firstName: 'Learner', role: 'learner' };
  const isSuperAdmin = user.role === 'super_admin';

  return `<div class="app-shell">
    <aside class="sidebar" id="sidebar" aria-label="Main navigation">
      <a class="brand" href="#/dashboard" aria-label="GDGoC Learn · AAST Aswan home">${brand()}</a>
      <nav>${navItems.map(([key, name, label]) => `<a href="#/${key}" class="nav-link ${route === key ? 'active' : ''}" ${route === key ? 'aria-current="page"' : ''}>${icon(name)}<span>${label}</span>${key === 'tasks' && getTasks(state, 'todo').length ? '<span class="nav-count">1</span>' : ''}</a>`).join('')}</nav>
      <div class="sidebar-bottom">
        <div class="community-note"><span class="community-dot"></span> A little progress, every day.</div>
        <button class="nav-link help-link" data-action="help">${icon('help')}<span>Help & Support</span>${icon('arrow-up-right')}</button>
      </div>
    </aside>
    <button class="sidebar-scrim" data-action="close-menu" aria-label="Close navigation"></button>
    <div class="workspace">
      ${isSuperAdmin ? `
        <div style="background:#fce8e6; border-bottom:1px solid #fad2cf; padding:8px 20px; display:flex; justify-content:space-between; align-items:center; font-size:13px; color:#c5221f;">
          <span>${icon('shield')} Previewing Learner Experience as Super Admin</span>
          <button type="button" class="staff-nav-pill active" data-action="super-view:scheduler" style="padding:4px 12px; font-size:12px;">${icon('arrow-right')} Return to Admin Console</button>
        </div>
      ` : ''}
      <div class="mobile-bar"><md-icon-button data-action="menu" aria-label="Open navigation" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</md-icon-button><a class="mobile-brand" href="#/dashboard" aria-label="GDGoC Learn home">${brand()}</a><span class="mobile-xp">${p.xp} XP</span></div>
      <main id="main" tabindex="-1">${content}</main>
      <footer class="page-footer"><span>Made for curious minds. Built by our community.</span><span>GDGoC · AAST Aswan</span></footer>
    </div>
  </div>`;
}

function pageHeading(title, description, name, right = '') {
  return `<header class="page-heading"><div class="heading-group"><div class="heading-icon">${icon(name)}</div><div><h1>${title}</h1><p>${description}</p></div></div>${right}</header>`;
}

/* ==========================================================================
   SUPER ADMIN SESSION SCHEDULER & REGISTRATION MANAGER
   ========================================================================== */

function superAdminSessionsManager(user) {
  const sessions = getAllManagedSessions();
  const publishedCount = sessions.filter(s => s.publishedToStudents).length;
  const draftCount = sessions.length - publishedCount;

  return `<div class="portal-container">
    <header class="portal-header">
      <div class="portal-header-info">
        <span class="eyebrow">Executive Management</span>
        <h1>Sessions & Registration Manager</h1>
        <p>Schedule official workshops, control student portal visibility, and generate external WhatsApp registration links.</p>
      </div>
    </header>

    <div class="logistics-stats-grid">
      <div class="logistics-stat-card">
        <h3>${sessions.length}</h3>
        <p>Total Master Sessions</p>
      </div>
      <div class="logistics-stat-card">
        <h3 style="color:#137333;">${publishedCount}</h3>
        <p>Published to Students</p>
      </div>
      <div class="logistics-stat-card">
        <h3 style="color:#b06000;">${draftCount}</h3>
        <p>Draft / Private Sessions</p>
      </div>
      <div class="logistics-stat-card">
        <h3>${getMasterMembers().length}</h3>
        <p>Core Members in Database</p>
      </div>
    </div>

    <div class="studio-grid">
      <div class="studio-card">
        <div class="section-card-heading"><h2>Schedule New Session</h2><span class="tiny-label">SESSION LIFECYCLE</span></div>
        <form class="studio-form" id="admin-create-session-form" novalidate onsubmit="return false;">
          <md-outlined-text-field id="admin-sess-title" label="Session Title" placeholder="e.g. Web Dev 3 · Responsive Layouts & Modern Components" required></md-outlined-text-field>

          <md-outlined-select id="admin-sess-track" label="Track" aria-label="Track">
            ${tracks.map(t => `<md-select-option value="${t.slug}"><div slot="headline">${t.name}</div></md-select-option>`).join('')}
          </md-outlined-select>

          <div class="md3-picker-row">
            <div class="md3-picker-field" onclick="this.querySelector('input')?.showPicker?.()">
              <span class="md3-picker-label">Session Date *</span>
              <div class="md3-picker-input-wrapper">
                <input type="date" id="admin-sess-date-input" class="md3-picker-input" required />
                <button type="button" class="md3-picker-icon-btn" aria-label="Open date picker">${icon('calendar')}</button>
              </div>
            </div>
            <div class="md3-picker-field" onclick="this.querySelector('input')?.showPicker?.()">
              <span class="md3-picker-label">Session Time *</span>
              <div class="md3-picker-input-wrapper">
                <input type="time" id="admin-sess-time-input" class="md3-picker-input" value="16:00" required />
                <button type="button" class="md3-picker-icon-btn" aria-label="Open time picker">${icon('clock')}</button>
              </div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <md-outlined-text-field id="admin-sess-room" label="Room / Hall Location" placeholder="e.g. Hall A204 - AASTMT Aswan" required></md-outlined-text-field>
            <md-outlined-text-field id="admin-sess-speaker" label="Lead / Speaker" placeholder="e.g. Youssef Ali" required></md-outlined-text-field>
          </div>

          <div class="auth-checkbox-row" style="margin-top:4px;">
            <md-checkbox id="admin-sess-publish" aria-label="Publish immediately to student accounts"></md-checkbox>
            <span class="auth-checkbox-label">Publish to Student Accounts immediately (Unchecked = Draft Mode)</span>
          </div>

          <md-filled-button type="button" data-action="admin-create-session">${icon('plus', 'icon')}Create & Save Session</md-filled-button>
        </form>
      </div>

      <div class="studio-card">
        <div class="section-card-heading"><h2>Managed Sessions Directory</h2><span class="tiny-label">OPEN UNLIMITED REGISTRATION</span></div>
        <div class="sessions-directory-list">
          ${sessions.map(s => {
            const regs = getSessionRegistrations(s.id);
            const isPub = Boolean(s.publishedToStudents);
            return `<article class="scheduler-session-card">
              <div class="session-card-header">
                <div>
                  <h3 style="margin:0 0 4px; font-size:16px; color:#1f1f1f;">${esc(s.title)}</h3>
                  <div style="font-size:12px; color:#5e6266;">${icon('calendar')} ${esc(s.date)} · ${esc(s.time || '4:00 PM')} · ${esc(s.room || 'AASTMT Campus')}</div>
                </div>
                <span class="session-visibility-chip ${isPub ? 'published' : 'draft'}">
                  ${isPub ? `${icon('check')} Published to Students` : `${icon('lock')} Draft / Private`}
                </span>
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#444746; margin:8px 0 10px;">
                <span>Speaker: <strong>${esc(s.speaker || 'Track Lead')}</strong></span>
                <span class="session-registered-count">${icon('user')} <strong>${regs.length}</strong> Registered (Unlimited Access)</span>
              </div>

              <div class="session-actions-row">
                <md-outlined-button type="button" data-action="admin-toggle-publish:${s.id}">
                  ${isPub ? `${icon('close', 'icon')}Move to Draft` : `${icon('check', 'icon')}Publish to Students`}
                </md-outlined-button>

                <md-filled-button type="button" data-action="copy-whatsapp-link:${s.id}">
                  ${icon('link', 'icon')}Copy External WhatsApp Link
                </md-filled-button>

                <md-outlined-button type="button" data-action="admin-open-checkin:${s.id}">
                  ${icon('qr', 'icon')}Check-In Desk
                </md-outlined-button>

                <md-outlined-button type="button" data-action="admin-delete-session:${s.id}" style="--md-outlined-button-label-text-color:#c5221f;">
                  ${icon('close', 'icon')}Delete
                </md-outlined-button>
              </div>
            </article>`;
          }).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

/* ==========================================================================
   PUBLIC EXTERNAL SESSION REGISTRATION VIEW (#/register/<sessionId>)
   ========================================================================== */

function publicRegistrationView(sessionId) {
  const sessions = getAllManagedSessions();
  const session = sessions.find(s => s.id === sessionId) || sessions[0];
  const registrations = getSessionRegistrations(session.id);

  if (publicRegSuccess) {
    return `<div class="public-reg-container">
      <div class="public-reg-card">
        <div class="confirmation-card">
          <div style="display:inline-flex; align-items:center; justify-content:center; width:64px; height:64px; border-radius:50%; background:#e6f4ea; color:#137333; margin-bottom:16px;">
            ${icon('check-circle')}
          </div>
          <h1 style="font-size:24px; color:#1f1f1f; margin:0 0 8px;">Registration Confirmed!</h1>
          <p style="font-size:14px; color:#5e6266; margin:0 0 16px;">You are registered for <strong>${esc(session.title)}</strong>.</p>

          <div class="confirmation-pass-box">
            <span style="font-size:12px; color:#174ea6; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Your Door Check-In Pass</span>
            <div class="confirmation-pass-code">${esc(publicRegSuccess.passCode)}</div>
            <small style="color:#5e6266;">Present this pass code or your Phone Number (<code>${esc(publicRegSuccess.phone)}</code>) upon arrival at the door.</small>
          </div>

          <div class="public-session-meta" style="text-align:left; background:#f8fafd; padding:16px; border-radius:12px; margin-bottom:20px;">
            <span>${icon('calendar')} <strong>Date & Time:</strong> ${esc(session.date)} · ${esc(session.time || '4:00 PM')}</span>
            <span>${icon('home')} <strong>Location:</strong> ${esc(session.room || 'AASTMT Aswan Campus')}</span>
            <span>${icon('user')} <strong>Attendee:</strong> ${esc(publicRegSuccess.name)} (${esc(publicRegSuccess.affiliation)})</span>
          </div>

          <div style="display:flex; gap:10px; justify-content:center;">
            <md-filled-button type="button" data-action="reset-public-reg">Register Another Attendee</md-filled-button>
            <a href="#" style="text-decoration:none;"><md-outlined-button type="button">Sign In to Platform</md-outlined-button></a>
          </div>
        </div>
      </div>
    </div>`;
  }

  return `<div class="public-reg-container">
    <div class="public-reg-card">
      <div class="public-reg-header">
        <a class="brand" href="#" aria-label="GDGoC Learn">${brand()}</a>
        <h1 style="font-size:22px; color:#1f1f1f; margin:8px 0 4px;">Workshop Registration</h1>
        <p style="font-size:13px; color:#5e6266; margin:0;">GDG on Campus · Arab Academy for Science & Technology (AASTMT Aswan)</p>
      </div>

      <div class="public-session-banner">
        <h2>${esc(session.title)}</h2>
        <div class="public-session-meta">
          <span>${icon('calendar')} ${esc(session.date)} · ${esc(session.time || '4:00 PM - 6:30 PM')}</span>
          <span>${icon('home')} ${esc(session.room || 'Hall A204 - AASTMT Aswan Campus')}</span>
          <span>${icon('award')} Track: <strong>${esc(session.track || 'Technical Track')}</strong></span>
          <span class="open-registration-badge">${icon('check-circle')} Open Registration · Unlimited Seats</span>
        </div>
      </div>

      ${publicRegError ? `<div class="auth-error-banner" role="alert">${icon('close')}<span>${esc(publicRegError)}</span></div>` : ''}

      <form class="auth-form" id="public-reg-form" novalidate onsubmit="return false;">
        <md-outlined-text-field id="pub-name" label="Full Name" placeholder="e.g. Ahmed Mahmoud" required supporting-text="Full legal or academic name"></md-outlined-text-field>

        <md-outlined-text-field id="pub-email" type="email" label="Email Address" placeholder="name@example.com" required supporting-text="For workshop materials & certificate"></md-outlined-text-field>

        <md-outlined-text-field id="pub-phone" type="tel" label="Phone Number" placeholder="01XXXXXXXXX" required supporting-text="11-digit Egyptian mobile number"></md-outlined-text-field>

        <md-outlined-text-field id="pub-nid" label="National ID (14 digits)" placeholder="14-digit Egyptian National ID" required supporting-text="Used for attendance verification"></md-outlined-text-field>

        <div class="auth-checkbox-row" data-action="toggle-pub-student">
          <md-checkbox id="pub-is-student" ${isStudentChecked ? 'checked' : ''} aria-label="I am an AASTMT student"></md-checkbox>
          <span class="auth-checkbox-label">I am an AASTMT student</span>
        </div>

        <div class="auth-field-group ${isStudentChecked ? '' : 'auth-hidden'}" id="pub-uni-container">
          <md-outlined-text-field id="pub-uni-id" label="AASTMT University ID (9 digits)" placeholder="e.g. 251009966" supporting-text="9-digit student ID"></md-outlined-text-field>
        </div>

        <md-filled-button type="button" class="auth-submit-btn" data-action="submit-public-reg:${session.id}">${icon('check', 'icon')}Complete Free Registration</md-filled-button>
      </form>
    </div>
  </div>`;
}

/* ==========================================================================
   DEDICATED PUBLIC INSIGHTS VIEW
   ========================================================================== */

function publicInsightsView() {
  return `<div class="portal-container" style="max-width:100%; padding:20px;">
    <header class="portal-header">
      <div class="portal-header-info">
        <a class="brand" href="#" style="margin-bottom:8px; display:inline-block;">${brand()}</a>
        <h1>Master Attendance & Analytics Dashboard</h1>
        <p>Public analytics visualizer tracking attendance across all GDGoC sessions and historical records.</p>
      </div>
      <div class="portal-header-actions">
        <md-filled-button type="button" data-action="back-to-signin">${icon('arrow-right', 'icon')}Back to Sign In</md-filled-button>
      </div>
    </header>

    <div class="insights-frame-container">
      <iframe class="insights-iframe" src="/dashboard/index.html" title="GDGoC Attendance & Analytics Dashboard"></iframe>
    </div>
  </div>`;
}

/* ==========================================================================
   LEARNER DASHBOARD & SCREENS
   ========================================================================== */

function dashboard() {
  const p = getProgress(state);
  const todo = getTasks(state, 'todo')[0];
  const user = state.user || { firstName: 'Learner', fullName: 'Community Learner', primaryTrack: 'web-development', role: 'learner' };
  const recovery = state.recovery;

  const celebrationBanner = (recovery && recovery.isMatched && !recovery.celebrationDismissed)
    ? `<section class="match-celebration-banner" aria-label="Identity match confirmation">
        <span class="celebration-icon-tile">${icon('sparkles')}</span>
        <div class="celebration-content">
          <h3>Identity Matched & Past Progress Restored</h3>
          <p>Welcome back, <strong>${esc(user.fullName)}</strong>. We verified your records in our historical attendance database.</p>
          <div class="celebration-badges-row">
            <span class="restored-chip">${icon('calendar-check')} ${recovery.restoredSessionsCount} Past Workshops Restored</span>
            <span class="restored-chip">${icon('flame')} +${recovery.historicalXp} XP Credited</span>
            ${recovery.restoredSessions.map(s => `<span class="restored-chip">${icon('check')} ${esc(s)}</span>`).join('')}
          </div>
        </div>
        <md-icon-button class="dismiss-celebration-btn" data-action="dismiss-celebration" aria-label="Dismiss notification">${icon('close')}</md-icon-button>
      </section>`
    : '';

  const trackObj = tracks.find(t => t.slug === user.primaryTrack) || tracks[0];

  return `${celebrationBanner}
    <header class="dashboard-header">
      <div>
        <div class="eyebrow muted">My learning</div>
        <h1>Hello, ${esc(user.firstName)}</h1>
        <p>Keep building with GDGoC AASTMT Aswan! ${roleBadge(user)}</p>
      </div>
      <div class="header-actions">
        <md-icon-button class="notification-button" data-action="notifications" aria-label="View notifications">${icon('bell')}<span class="notification-dot"></span></md-icon-button>
        <a href="#/xp" class="xp-pill">${icon('flame')}<strong>${p.xp} XP</strong></a>
        <button class="avatar-button" data-action="profile" aria-label="View ${esc(user.firstName)}’s profile"><img src="/assets/avatars/student-placeholder.svg" alt="" width="38" height="38"></button>
        <md-icon-button class="signout-header-btn" data-action="signout" aria-label="Sign out">${icon('logout')}</md-icon-button>
      </div>
    </header>
    <section class="journey-hero" aria-labelledby="journey-title"><div class="hero-copy"><span class="eyebrow">Your learning journey</span><h2 id="journey-title">Keep building. Keep growing.</h2><p>Continue your track and get closer to your season certificate.</p><div class="hero-progress"><div class="progress-label"><strong>Certificate progress</strong><strong>${p.percent}%</strong></div>${progress(p.xp / 1000, `${p.percent}% toward your certificate`)}<div class="progress-caption">${p.xp} / 1,000 XP <span>·</span> ${Math.max(0, 1000 - p.xp)} XP remaining</div></div></div><img class="hero-art" src="/assets/illustrations/certificate-hero.svg" alt="An illustrated certificate with a golden achievement ribbon" width="360" height="250"><span class="hero-orbit" aria-hidden="true"></span></section>
    <section class="xp-grid" aria-label="Your XP breakdown">${[['calendar-check', p.attendance, 'Attendance', 'blue'], ['chart', p.activity, 'Activity', 'purple'], ['check-square', p.tasks, 'Tasks', 'green']].map(([name, amount, label, color]) => `<a class="xp-card card" href="#/xp"><span class="icon-tile ${color}">${icon(name)}</span><div><h2>${amount} <span>XP</span></h2><p>${label}</p></div>${icon('chevron-right')}</a>`).join('')}</section>
    <div class="dashboard-bottom"><section class="card continue-card"><div class="section-card-heading"><h2>Continue learning</h2><span class="tiny-label">PICK UP WHERE YOU LEFT OFF</span></div><div class="continue-content"><span class="icon-tile blue large">${icon('code')}</span><div class="continue-text"><span class="track-label">${esc(trackObj.name)}</span><h3>HTML & CSS Workshop</h3><p>Session 2 <span>·</span> ${p.lessons} of 6 lessons completed</p>${progress(p.lessons / 6, `${p.lessons} of 6 lessons completed`, 'small-progress')}</div>${filled(p.lessons === 6 ? 'Revisit' : 'Resume', 'resume', 'arrow-right')}</div></section>
    <section class="card deadline-card"><div class="section-card-heading"><h2>${todo ? 'Next deadline' : 'You’re all caught up'}</h2>${icon(todo ? 'clock' : 'check-circle')}</div><div class="deadline-content"><span class="icon-tile ${todo ? 'red' : 'green'}">${icon(todo ? 'clock' : 'check-circle')}</span><div><h3>${todo ? 'Portfolio Landing Page' : `Nice work, ${esc(user.firstName)}.`}</h3><p>${todo ? 'Due: Fri, Jan 24, 11:59 PM' : 'Your work is ready for review.'}</p>${outlined(todo ? 'View Task' : 'View submissions', todo ? 'task:portfolio' : 'go:tasks')}</div></div></section></div>
    <div class="learning-note">${icon('sparkles')}<p>Big things start with small steps. <strong>You’ve got this.</strong></p><a href="#/tracks">Explore your tracks ${icon('arrow-right')}</a></div>`;
}

function sessions() {
  const p = getProgress(state);
  const allLessons = getAllLessons();
  const managedSessions = getAllManagedSessions().filter(s => s.publishedToStudents);
  const user = state.user || {};

  return `<div class="breadcrumbs"><a href="#/tracks">Web Development</a>${icon('chevron-right')}<span>Session 2: Getting Started</span></div>
    ${pageHeading('Session 2 · Getting Started with HTML & CSS', 'Learn the basics of HTML structure and style your first webpage.', 'play', `<div class="session-status"><span class="status-pill green">${icon('check-circle')}${p.lessons === allLessons.length ? 'Completed' : 'In Progress'}</span><span>${p.lessons} / ${allLessons.length} lessons</span></div>`)}

    <section class="card" style="margin-bottom: 24px; padding: 22px;">
      <div class="section-card-heading"><h2>Community Workshops & Registration</h2><span class="tiny-label">ONE-CLICK ENROLLMENT</span></div>
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; margin-top: 12px;">
        ${managedSessions.map(s => {
          const regs = getSessionRegistrations(s.id);
          const isRegistered = regs.some(r => r.email === user.email || r.phone === user.phone);
          return `<div class="studio-item-row" style="flex-direction:column; align-items:flex-start; gap:8px;">
            <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
              <span class="track-chip">${esc(s.track)}</span>
              <span class="status-pill ${isRegistered ? 'green' : 'blue'}">${isRegistered ? 'Enrolled' : 'Open'}</span>
            </div>
            <h4 style="margin:4px 0 2px;">${esc(s.title)}</h4>
            <p style="font-size:12px; color:#5e6266;">${icon('calendar')} ${esc(s.date)} · ${esc(s.room || 'AASTMT')}</p>
            <div style="margin-top:6px; width:100%; display:flex; justify-content:space-between; align-items:center;">
              <small style="color:#5e6266;">${icon('user')} ${regs.length} Registered (Open Access)</small>
              ${isRegistered ? `
                <span style="font-size:12px; color:#137333; font-weight:700;">${icon('check')} You're registered</span>
              ` : `
                <md-filled-button type="button" data-action="student-register-session:${s.id}">Register (1-Click)</md-filled-button>
              `}
            </div>
          </div>`;
        }).join('')}
      </div>
    </section>

    <md-tabs class="lesson-tabs" aria-label="Session learning format">${[['book', 'Tutorial'], ['video', 'Video'], ['code', 'Practice'], ['paperclip', 'Resources']].map(([name, label], i) => `<md-primary-tab id="lesson-tab-${i}" aria-controls="lesson-panel" inline-icon ${lessonTab === i ? 'active' : ''}>${icon(name, 'icon')}${label}</md-primary-tab>`).join('')}</md-tabs>
    <div class="session-layout"><aside class="card lesson-sidebar"><h2>Session Content <span>(${allLessons.length})</span></h2><ol>${allLessons.map((lesson, i) => `<li><button class="lesson-link ${state.selectedLesson === i ? 'selected' : ''}" data-action="lesson:${i}" ${state.selectedLesson === i ? 'aria-current="step"' : ''}><span class="lesson-indicator ${state.completedLessons.includes(i) ? 'done' : ''}">${state.selectedLesson === i ? icon('play') : state.completedLessons.includes(i) ? icon('check') : ''}</span><span>${i + 1}. ${lesson.title}</span></button></li>`).join('')}</ol><div class="lesson-sidebar-foot">${progress(p.lessons / allLessons.length, 'Session progress')}<span>${p.lessons === allLessons.length ? 'Session completed. Great work.' : 'One lesson closer to your goal.'}</span></div></aside>
    <div class="lesson-main card"><section class="lesson-content" id="lesson-panel" tabindex="-1" role="tabpanel" aria-label="${['Tutorial', 'Video', 'Practice', 'Resources'][lessonTab]}">${lessonPanel()}</section><div class="lesson-controls"><label class="completion-label" for="lesson-completed"><md-checkbox id="lesson-completed" aria-label="Mark lesson ${state.selectedLesson + 1} as completed" ${state.completedLessons.includes(state.selectedLesson) ? 'checked' : ''}></md-checkbox><span>Mark lesson as completed</span></label><div class="lesson-buttons">${outlined('Previous', 'previous-lesson', 'chevron-left', state.selectedLesson === 0 ? 'disabled' : '')}${filled(state.selectedLesson === allLessons.length - 1 ? 'Finish session' : 'Next lesson', 'next-lesson', state.selectedLesson === allLessons.length - 1 ? 'check' : 'chevron-right')}</div></div></div></div>`;
}

function lessonPanel() {
  const allLessons = getAllLessons();
  const lesson = allLessons[state.selectedLesson] || allLessons[0];
  const top = `<div class="lesson-meta"><span class="lesson-chip">Lesson ${state.selectedLesson + 1} of ${allLessons.length}</span><span>${icon('clock')} ~ ${lesson.time} min read</span></div>`;
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
  const allLessons = getAllLessons();
  const lesson = allLessons[state.selectedLesson] || allLessons[0];
  const titles = ['Start with the content', 'Create your project folder', 'HTML gives your page structure', 'Select it. Style it.', 'A little space goes a long way', 'Put your skills into practice'];
  if (walkthroughStep === 1) return `<span class="walkthrough-number">02</span><h3>See it in code</h3><pre class="walkthrough-code"><code>${esc(lesson.code)}</code></pre>`;
  if (walkthroughStep === 2) return `<span class="walkthrough-number">03</span><h3>Now it’s your turn</h3><p>Open the Practice tab, change the example, and run your code. You learn by building.</p>`;
  return `<span class="walkthrough-number">01</span><h3>${titles[state.selectedLesson] || lesson.title}</h3><p>${lesson.text}</p>`;
}

function stopWalkthrough() { clearInterval(walkthroughTimer); walkthroughPlaying = false; }
function updateWalkthrough() {
  const slide = document.querySelector('#walkthrough-slide');
  if (!slide) { stopWalkthrough(); return; }
  slide.innerHTML = walkthroughSlide();
  document.querySelector('#walkthrough-position').textContent = `${walkthroughStep + 1} / 3`;
  document.querySelector('.walkthrough-progress').value = (walkthroughStep + 1) / 3;
  const button = document.querySelector('#walkthrough-toggle');
  button.innerHTML = `${walkthroughPlaying ? icon('clock', 'icon') : icon('play', 'icon')}${walkthroughPlaying ? 'Pause walkthrough' : walkthroughStep === 2 ? 'Replay walkthrough' : 'Play walkthrough'}`;
}

function taskCards() {
  const visible = getTasks(state, taskStatus, taskTrack);
  if (!visible.length) return `<div class="card empty-state"><img src="/assets/illustrations/empty-tasks.svg" alt="" width="150" height="110"><h2>No tasks here just yet</h2><p>Try another status or track to find your assignments.</p>${outlined('Show all tasks', 'reset-filters', 'refresh')}</div>`;
  return visible.map(task => `<article class="card task-card"><span class="icon-tile large ${task.color || 'blue'}">${icon(task.icon || 'list-check')}</span><div class="task-info"><h2>${task.title}</h2><span class="track-chip">${task.track}</span><p>${task.description}</p></div><div class="task-meta"><strong>+${task.xp} XP</strong><span class="status-pill ${task.status === 'todo' ? 'yellow' : task.status === 'submitted' ? 'purple' : 'green'}">${statusLabels[task.status] || task.status}${icon(task.status === 'completed' ? 'check' : task.status === 'submitted' ? 'upload' : 'clock')}</span><small>${task.submission ? `Submitted: ${esc(task.submission.date)}` : task.date}</small></div>${outlined('View Details', `task:${task.id}`, 'arrow-right')}</article>`).join('');
}

function taskPage() {
  const all = getTasks(state);
  return `${pageHeading('Tasks', 'Build something with what you’ve learned.', 'list-check')}<div class="tasks-toolbar"><md-chip-set class="task-filters" aria-label="Filter tasks by status">${[['all', 'All tasks'], ['todo', 'To do'], ['submitted', 'Submitted'], ['completed', 'Completed']].map(([key, label]) => `<md-filter-chip id="task-filter-${key}" data-action="filter:${key}" label="${label} (${key === 'all' ? all.length : all.filter(t => t.status === key).length})" ${taskStatus === key ? 'selected' : ''}></md-filter-chip>`).join('')}</md-chip-set><md-outlined-select class="track-select" aria-label="Filter tasks by learning track"><md-select-option value="all" ${taskTrack === 'all' ? 'selected' : ''}><div slot="headline">All tracks</div></md-select-option>${['Web Development', 'Software Engineering', 'AI & Machine Learning', 'Data Science'].map(track => `<md-select-option value="${track}" ${taskTrack === track ? 'selected' : ''}><div slot="headline">${track}</div></md-select-option>`).join('')}</md-outlined-select></div><section class="task-list" id="task-list" aria-label="Assignments" aria-live="polite">${taskCards()}</section><div class="subtle-note">${icon('help')}<span>Submitted work is reviewed by your track mentor. XP is awarded when your task is approved.</span></div>`;
}

function certificate() {
  const p = getProgress(state);
  return `${pageHeading('Your Certificate Journey', 'Track what you need to complete before becoming eligible.', 'award')}<div class="certificate-intro"><section class="card certificate-progress"><div class="progress-label"><h2>XP Requirement</h2><strong>${p.xp} / 1,000 XP</strong></div>${progress(p.xp / 1000, 'Season certificate XP requirement')}<p>${Math.max(0, 1000 - p.xp)} XP remaining to meet the threshold.</p></section><img class="certificate-art" src="/assets/illustrations/season-certificate.svg" alt="GDGoC AAST Aswan season certificate illustration" width="310" height="215"></div><h2 class="section-title">Completion Requirements</h2><div class="certificate-grid"><section class="card requirements-list" aria-label="Certificate completion requirements">${[
    ['Attendance', 'Attend the required number of sessions.', `${Math.min(6, Math.round(p.attendance / 60))} / 6 sessions`, p.attendance >= 240, 'attendance'],
    ['Session participation', 'Earn XP through in-session activity.', `${p.activity} XP earned`, p.activity >= 160, 'participation'],
    ['Required assignments', 'Complete the mandatory tasks.', '2 / 4 completed', false, 'assignments'],
    ['Minimum XP target', 'Reach the total XP threshold for the season.', `${p.xp} / 1,000 XP`, p.xp >= 1000, 'minimum-xp'],
  ].map(([title, description, amount, done, id]) => `<button class="requirement-row" data-action="requirement:${id}"><span class="requirement-state ${done ? 'done' : ''}">${done ? icon('check') : ''}</span><span class="requirement-info"><strong>${title}</strong><small>${description}</small></span><span class="requirement-value">${amount}</span>${icon('chevron-right')}</button>`).join('')}</section><aside class="card certificate-locked">${icon('lock')}<h3>Certificate not yet unlocked</h3><p>Once all season requirements are met and approved, the verified certificate will be available here.</p><span class="locked-tag">A little closer every day</span></aside></div><div class="certificate-encouragement">${icon('sparkles')}<div><strong>The work you put in will show.</strong><p>Keep showing up, trying new things, and building with your community.</p></div>${outlined('Continue learning', 'resume', 'arrow-right')}</div>`;
}

function learningTracks() {
  return `${pageHeading('Learning Tracks', 'Find your curiosity. Follow it somewhere new.', 'layers')}<div class="tracks-intro"><span class="eyebrow">LEARN TOGETHER. BUILD TOGETHER.</span><h2>A new skill is a new possibility.</h2><p>Hands-on sessions, real projects, and a community to learn with.</p></div><div class="tracks-grid">${tracks.map(track => { const joined = state.joinedTracks.includes(track.slug); return `<article class="card track-card"><div class="track-art ${track.color}"><img src="/assets/tracks/${track.slug}.svg" alt="" width="190" height="130"><span>${icon('book')}${track.sessions} sessions</span></div><div class="track-card-body"><span class="eyebrow ${joined ? '' : 'muted'}">${joined ? track.tag : 'EXPLORE A NEW SKILL'}</span><h2>${track.name}</h2><p>${track.description}</p><div class="track-progress-info"><span>${joined ? 'Your progress' : 'Ready when you are'}</span><strong>${track.progress}%</strong></div>${progress(track.progress / 100, `${track.name} progress`)}${joined ? filled('Continue track', `track:${track.slug}`) : outlined('Explore track', `track:${track.slug}`, 'arrow-right')}</div></article>`; }).join('')}</div>`;
}

function xpPage() {
  const p = getProgress(state);
  return `${pageHeading('XP & Badges', 'Every step counts. See how far you’ve come.', 'award', `<span class="season-chip">${icon('calendar')} This season</span>`)}<section class="xp-hero"><div><span class="eyebrow">SMALL STEPS. REAL PROGRESS.</span><h2>${p.xp} <span>XP earned</span></h2><p>You’re building more than skills. You’re building momentum.</p></div><div class="xp-hero-award">${icon('trophy')}</div></section><div class="xp-grid">${[['calendar-check', p.attendance, 'Attendance', 'blue'], ['chart', p.activity, 'Activity', 'purple'], ['check-square', p.tasks, 'Tasks', 'green']].map(([name, value, label, color]) => `<section class="card xp-card"><span class="icon-tile ${color}">${icon(name)}</span><div><h2>${value} <span>XP</span></h2><p>${label}</p></div></section>`).join('')}</div><div class="section-card-heading badge-heading"><h2>Your badge collection</h2><span class="muted">2 of 4 unlocked</span></div><div class="badges-grid">${[['first-step', 'First Step', 'Complete your first lesson.', true], ['consistent-builder', 'Consistent Builder', 'Attend 4 community sessions.', p.attendance >= 240], ['challenge-complete', 'Challenge Complete', 'Complete all required assignments.', false], ['community-helper', 'Community Helper', 'Help your community grow.', false]].map(([slug, title, description, unlocked]) => `<article class="card badge-card ${unlocked ? '' : 'locked'}"><img src="/assets/badges/${slug}.svg" alt="" width="84" height="84"><h3>${title}</h3><p>${description}</p><span class="status-pill ${unlocked ? 'green' : 'slate'}">${icon(unlocked ? 'check' : 'lock')}${unlocked ? 'Unlocked' : 'Keep going'}</span></article>`).join('')}</div><section class="card xp-explainer"><div><h2>More ways to grow</h2><p>Join a session, participate in a workshop, or put your skills to work on a task.</p></div>${filled('Find your next task', 'go:tasks')}</section>`;
}

/* ==========================================================================
   TRACK LEAD STUDIO (Scoped strictly to assigned track)
   ========================================================================== */

function trackLeadStudio(user) {
  const effectiveTrackSlug = user.role === 'super_admin' ? studioTrack : (user.assignedTrack || 'web-development');
  const trackObj = tracks.find(t => t.slug === effectiveTrackSlug) || tracks[0];
  const allSessions = getAllManagedSessions().filter(s => s.trackSlug === effectiveTrackSlug || s.track === trackObj.name);
  const trackLessons = getTrackLessons(effectiveTrackSlug, true);
  const trackTasks = getTrackTasks(effectiveTrackSlug, true);
  const trackSubmissions = getTrackSubmissions(effectiveTrackSlug);
  const pendingSubs = trackSubmissions.filter(s => s.status === 'pending');

  return `<div class="portal-container">
    <header class="portal-header">
      <div class="portal-header-info">
        <span class="eyebrow">Technical Team Portal</span>
        <h1>Track Lead Studio · ${esc(trackObj.name)}</h1>
        <p>Curate curriculum, schedule sessions, and publish technical tasks for ${esc(trackObj.name)} learners.</p>
      </div>
      <div class="portal-header-actions">
        ${user.role === 'super_admin' ? `
          <md-outlined-select label="Switch Studio Track" aria-label="Switch Studio Track" id="super-track-select">
            ${tracks.map(t => `<md-select-option value="${t.slug}" ${t.slug === studioTrack ? 'selected' : ''}><div slot="headline">${t.name}</div></md-select-option>`).join('')}
          </md-outlined-select>
        ` : ''}
      </div>
    </header>

    <div class="studio-tabs">
      <button type="button" class="studio-tab-btn ${studioTab === 'sessions' ? 'active' : ''}" data-action="studio-tab:sessions">${icon('calendar')} Sessions Manager (${allSessions.length})</button>
      <button type="button" class="studio-tab-btn ${studioTab === 'lessons' ? 'active' : ''}" data-action="studio-tab:lessons">${icon('book')} Curriculum & Lessons (${trackLessons.length})</button>
      <button type="button" class="studio-tab-btn ${studioTab === 'tasks' ? 'active' : ''}" data-action="studio-tab:tasks">${icon('list-check')} Track Tasks (${trackTasks.length})</button>
      <button type="button" class="studio-tab-btn ${studioTab === 'submissions' ? 'active' : ''}" data-action="studio-tab:submissions">${icon('check-circle')} Submissions Review (${pendingSubs.length})</button>
    </div>

    ${studioTab === 'sessions'
      ? studioSessionsPanel(trackObj, allSessions)
      : studioTab === 'lessons'
        ? studioLessonsPanel(trackObj, trackLessons)
        : studioTab === 'tasks'
          ? studioTasksPanel(trackObj, trackTasks)
          : studioSubmissionsPanel(trackObj, trackSubmissions)}
  </div>`;
}

function studioSessionsPanel(trackObj, sessionsList) {
  return `<div class="studio-grid">
    <div class="studio-card">
      <div class="section-card-heading"><h2>Managed Track Sessions</h2><span class="tiny-label">${sessionsList.length} TOTAL</span></div>
      ${sessionsList.length === 0 ? `<p style="padding:20px; text-align:center; color:#5e6266;">No sessions scheduled for this track yet.</p>` : ''}
      ${sessionsList.map(s => {
        const isPub = Boolean(s.publishedToStudents);
        const regs = getSessionRegistrations(s.id);
        return `
        <div class="studio-item-row" style="flex-direction:column; align-items:flex-start; gap:8px;">
          <div style="display:flex; justify-content:space-between; width:100%; align-items:flex-start; gap:10px;">
            <div class="studio-item-info">
              <h4>${esc(s.title)}</h4>
              <p>${icon('calendar')} ${esc(s.date)} · ${esc(s.time || '4:00 PM')} · ${icon('user')} Speaker: ${esc(s.speaker || 'Track Lead')} · ${esc(s.room || 'Hall 1')}</p>
            </div>
            <span class="status-pill ${isPub ? 'published' : 'draft'}">${isPub ? 'Published' : 'Draft'}</span>
          </div>
          <div style="display:flex; justify-content:space-between; width:100%; align-items:center; margin-top:4px;">
            <span class="session-registered-count">${icon('user')} <strong>${regs.length}</strong> Registered Attendees</span>
            <div class="studio-item-actions">
              <button type="button" class="studio-action-icon-btn" data-action="studio-toggle-session:${s.id}" title="${isPub ? 'Hide from students' : 'Publish to students'}">${icon(isPub ? 'eye' : 'lock')}</button>
              <button type="button" class="studio-action-icon-btn" data-action="studio-edit-session:${s.id}" title="Edit session details">${icon('edit')}</button>
              <button type="button" class="studio-action-icon-btn delete" data-action="studio-delete-session:${s.id}" title="Delete session">${icon('close')}</button>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div class="studio-card">
      <div class="section-card-heading"><h2>Schedule Track Workshop</h2><span class="tiny-label">UNLIMITED ACCESS</span></div>
      <form class="studio-form" id="studio-session-form" novalidate onsubmit="return false;">
        <md-outlined-text-field id="sess-title" label="Session Title" placeholder="e.g. Session 3: Responsive UI & CSS Grid" required></md-outlined-text-field>

        <div class="md3-picker-row">
          <div class="md3-picker-field" onclick="this.querySelector('input')?.showPicker?.()">
            <span class="md3-picker-label">Session Date *</span>
            <div class="md3-picker-input-wrapper">
              <input type="date" id="sess-date-input" class="md3-picker-input" required />
              <button type="button" class="md3-picker-icon-btn" aria-label="Open date picker">${icon('calendar')}</button>
            </div>
          </div>
          <div class="md3-picker-field" onclick="this.querySelector('input')?.showPicker?.()">
            <span class="md3-picker-label">Session Time *</span>
            <div class="md3-picker-input-wrapper">
              <input type="time" id="sess-time-input" class="md3-picker-input" value="16:00" required />
              <button type="button" class="md3-picker-icon-btn" aria-label="Open time picker">${icon('clock')}</button>
            </div>
          </div>
        </div>

        <md-outlined-text-field id="sess-room" label="Room / Hall Location" placeholder="e.g. Lab 302, AASTMT Campus" required></md-outlined-text-field>
        <md-outlined-text-field id="sess-speaker" label="Lead / Speaker" placeholder="e.g. Youssef Ali" required></md-outlined-text-field>

        <div class="auth-checkbox-row" style="margin-top:4px;">
          <md-checkbox id="sess-publish-checkbox" checked aria-label="Publish to student catalog"></md-checkbox>
          <span class="auth-checkbox-label">Publish immediately to Student Catalog (Unchecked = Draft Mode)</span>
        </div>

        <md-filled-button type="button" data-action="studio-publish-session">${icon('plus', 'icon')}Publish Track Workshop</md-filled-button>
      </form>
    </div>
  </div>`;
}

function studioLessonsPanel(trackObj, lessonsList) {
  return `<div class="studio-grid">
    <div class="studio-card">
      <div class="section-card-heading"><h2>Active Curriculum</h2><span class="tiny-label">${lessonsList.length} LESSONS</span></div>
      ${lessonsList.length === 0 ? `<p style="padding:20px; text-align:center; color:#5e6266;">No lesson materials created yet.</p>` : ''}
      ${lessonsList.map((l, i) => `
        <div class="studio-item-row" style="align-items:center;">
          <div class="studio-item-info">
            <h4>${i + 1}. ${esc(l.title)}</h4>
            <p>${icon('clock')} ~${l.time} mins · ${esc(l.heading)}</p>
          </div>
          <span class="status-pill ${l.hidden ? 'hidden' : 'visible'}" style="margin-right:8px;">${l.hidden ? 'Hidden' : 'Visible'}</span>
          <div class="studio-item-actions">
            <button type="button" class="studio-action-icon-btn" data-action="studio-toggle-lesson:${l.id}" title="${l.hidden ? 'Make visible' : 'Hide from students'}">${icon(l.hidden ? 'lock' : 'eye')}</button>
            <button type="button" class="studio-action-icon-btn" data-action="studio-edit-lesson:${l.id}" title="Edit lesson">${icon('edit')}</button>
            <button type="button" class="studio-action-icon-btn delete" data-action="studio-delete-lesson:${l.id}" title="Delete lesson">${icon('close')}</button>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="studio-card">
      <div class="section-card-heading"><h2>Add Lesson Material</h2><span class="tiny-label">INTERACTIVE EDITOR</span></div>
      <form class="studio-form" id="studio-lesson-form" novalidate onsubmit="return false;">
        <md-outlined-text-field id="les-title" label="Lesson Title" placeholder="e.g. CSS Grid Layouts" required></md-outlined-text-field>
        <md-outlined-text-field id="les-heading" label="Heading / Concept" placeholder="e.g. Master the Two-Dimensional Grid" required></md-outlined-text-field>
        <md-outlined-text-field id="les-time" type="number" label="Read Time (minutes)" placeholder="8" value="8" required></md-outlined-text-field>
        <md-outlined-text-field id="les-text" type="textarea" rows="3" label="Lesson Content / Explanation" placeholder="Explain the core concept in clear terms..." required></md-outlined-text-field>
        <md-outlined-text-field id="les-code" type="textarea" rows="3" label="Sample Code Snippet" placeholder="<div class='grid-container'>...</div>" required></md-outlined-text-field>
        <md-outlined-text-field id="les-after" label="Key Takeaway / After Note" placeholder="Practice building a 3-column card grid." required></md-outlined-text-field>
        <md-filled-button type="button" data-action="studio-publish-lesson">${icon('plus', 'icon')}Save Lesson Material</md-filled-button>
      </form>
    </div>
  </div>`;
}

function studioTasksPanel(trackObj, tasksList) {
  return `<div class="studio-grid">
    <div class="studio-card">
      <div class="section-card-heading"><h2>Current Track Assignments</h2><span class="tiny-label">${tasksList.length} ASSIGNMENTS</span></div>
      ${tasksList.length === 0 ? `<p style="padding:20px; text-align:center; color:#5e6266;">No tasks published yet.</p>` : ''}
      ${tasksList.map(t => `
        <div class="studio-item-row" style="align-items:center;">
          <div class="studio-item-info">
            <h4>${esc(t.title)}</h4>
            <p>${esc(t.description)} · Due: ${esc(t.date || 'TBD')}</p>
          </div>
          <span class="status-pill purple" style="margin-right:6px;">+${t.xp} XP</span>
          <span class="status-pill ${t.hidden ? 'hidden' : 'visible'}" style="margin-right:8px;">${t.hidden ? 'Hidden' : 'Active'}</span>
          <div class="studio-item-actions">
            <button type="button" class="studio-action-icon-btn" data-action="studio-toggle-task:${t.id}" title="${t.hidden ? 'Activate task' : 'Hide task'}">${icon(t.hidden ? 'lock' : 'eye')}</button>
            <button type="button" class="studio-action-icon-btn" data-action="studio-edit-task:${t.id}" title="Edit task">${icon('edit')}</button>
            <button type="button" class="studio-action-icon-btn delete" data-action="studio-delete-task:${t.id}" title="Delete task">${icon('close')}</button>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="studio-card">
      <div class="section-card-heading"><h2>Create Track Assignment</h2><span class="tiny-label">PRACTICE TASK</span></div>
      <form class="studio-form" id="studio-task-form" novalidate onsubmit="return false;">
        <md-outlined-text-field id="task-title" label="Task Title" placeholder="e.g. Responsive Landing Page" required></md-outlined-text-field>
        <md-outlined-text-field id="task-xp" type="number" label="XP Reward" placeholder="100" value="80" required></md-outlined-text-field>
        <md-outlined-text-field id="task-date" label="Due Date String" placeholder="Due: Fri, Dec 5, 11:59 PM" required></md-outlined-text-field>
        <md-outlined-text-field id="task-desc" type="textarea" rows="2" label="Short Description" placeholder="Build a responsive webpage using..." required></md-outlined-text-field>
        <md-outlined-text-field id="task-reqs" type="textarea" rows="3" label="Requirements (one per line)" placeholder="1. Use semantic HTML5 elements&#10;2. Apply CSS Flexbox&#10;3. Deploy to GitHub Pages" required></md-outlined-text-field>
        <md-filled-button type="button" data-action="studio-publish-task">${icon('plus', 'icon')}Create Track Task</md-filled-button>
      </form>
    </div>
  </div>`;
}

function studioSubmissionsPanel(trackObj, submissionsList) {
  return `<div class="studio-grid" style="grid-template-columns: 1fr;">
    <div class="studio-card">
      <div class="section-card-heading">
        <h2>Student Submissions & Grading Review</h2>
        <span class="tiny-label">${submissionsList.length} SUBMISSIONS</span>
      </div>
      <p style="font-size:13px; color:#5e6266; margin-bottom:16px;">
        Review learner project repositories and code deliverables. Approving awards XP to the student's profile.
      </p>

      ${submissionsList.length === 0 ? `<p style="padding:24px; text-align:center; color:#5e6266;">No submissions for this track yet.</p>` : ''}
      <div class="submissions-review-list">
        ${submissionsList.map(sub => `
          <div class="submission-review-card">
            <div class="submission-card-top">
              <div>
                <h4 class="submission-student-name">${esc(sub.studentName)} <small style="font-weight:400; color:#5e6266;">(${esc(sub.studentEmail)})</small></h4>
                <p class="submission-task-title">Assignment: <strong>${esc(sub.taskTitle)}</strong> · Submitted on ${esc(sub.date)}</p>
                <a href="${esc(sub.url)}" target="_blank" rel="noopener noreferrer" class="submission-url-link">
                  ${icon('github')} <span>${esc(sub.url)}</span> ${icon('arrow-up-right')}
                </a>
              </div>
              <span class="sub-badge ${sub.status}">${esc(sub.status)}</span>
            </div>

            ${sub.feedback ? `<div class="submission-feedback-text"><strong>Reviewer Feedback:</strong> ${esc(sub.feedback)}</div>` : ''}

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; pt-2; border-top:1px solid #f1f3f4;">
              <span style="font-size:12px; font-weight:700; color:#137333;">Reward: +${sub.xp} XP</span>
              <div style="display:flex; gap:8px;">
                <md-filled-button type="button" data-action="review-sub:approve:${sub.id}" style="--md-filled-button-container-color:#137333;">
                  ${icon('check', 'icon')}Approve (+XP)
                </md-filled-button>
                <md-outlined-button type="button" data-action="review-sub:reject:${sub.id}" style="--md-outlined-button-label-text-color:#c5221f;">
                  ${icon('close', 'icon')}Reject with Feedback
                </md-outlined-button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>`;
}

/* ==========================================================================
   HR SESSION EVALUATION PORTAL (Full Audit, Edit, Delete & Dynamic KPIs)
   ========================================================================== */

function hrPortal(user) {
  const evals = getHrEvaluations();
  const allSessions = getAllManagedSessions();
  const avgOverall = (evals.reduce((acc, curr) => acc + (Number(curr.averageScore) || 5), 0) / (evals.length || 1)).toFixed(1);

  // Dynamic calculation of top rated presenter from actual evaluations
  const speakerScores = {};
  for (const ev of evals) {
    if (!speakerScores[ev.speaker]) speakerScores[ev.speaker] = { sum: 0, count: 0 };
    speakerScores[ev.speaker].sum += (Number(ev.averageScore) || 5);
    speakerScores[ev.speaker].count++;
  }
  let topSpeaker = 'Youssef Ali (Web Lead)';
  let topAvg = 0;
  for (const [sp, data] of Object.entries(speakerScores)) {
    const spAvg = data.sum / data.count;
    if (spAvg > topAvg) { topAvg = spAvg; topSpeaker = sp; }
  }

  const liveFormAvg = ((hrRatingComm + hrRatingEngage + hrRatingPunct) / 3).toFixed(1);

  return `<div class="portal-container">
    <header class="portal-header">
      <div class="portal-header-info">
        <span class="eyebrow">People & Culture</span>
        <h1>HR Session Evaluation Portal</h1>
        <p>Record speaker evaluations, behavioral observations, and audience engagement metrics.</p>
      </div>
    </header>

    <div class="hr-kpi-bar">
      <div class="hr-kpi-card">
        <span class="icon-tile green large">${icon('check-circle')}</span>
        <div><h3>${evals.length}</h3><p>Total Evaluations Submitted</p></div>
      </div>
      <div class="hr-kpi-card">
        <span class="icon-tile blue large">${icon('star')}</span>
        <div><h3>${avgOverall} / 5.0</h3><p>Average Session Score</p></div>
      </div>
      <div class="hr-kpi-card">
        <span class="icon-tile purple large">${icon('award')}</span>
        <div><h3>${esc(topSpeaker)}</h3><p>Top Rated Presenter</p></div>
      </div>
    </div>

    <div class="studio-grid">
      <div class="studio-card">
        <div class="section-card-heading"><h2>New Session Evaluation</h2><span class="tiny-label">BEHAVIORAL RUBRIC</span></div>
        <form class="studio-form" id="hr-eval-form" novalidate onsubmit="return false;">
          <md-outlined-select id="hr-session-select" label="Session to Evaluate" aria-label="Session to Evaluate">
            ${allSessions.map((s, idx) => `<md-select-option value="${esc(s.title)}" ${idx === 0 ? 'selected' : ''}><div slot="headline">${esc(s.title)}</div></md-select-option>`).join('')}
          </md-outlined-select>

          <md-outlined-text-field id="hr-speaker" label="Presenter / Speaker" placeholder="e.g. Youssef Ali (Web Lead)" required value="${esc(allSessions[0]?.speaker || 'Youssef Ali')}"></md-outlined-text-field>

          <div class="rating-group">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label>Communication & Clarity (1–5)</label>
              <strong style="color:#1a73e8; font-size:13px;">${hrRatingComm} / 5</strong>
            </div>
            <div class="rating-radios">
              ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="rating-label ${hrRatingComm === n ? 'selected' : ''}" data-action="set-rating:comm:${n}">${n}</button>`).join('')}
            </div>
          </div>

          <div class="rating-group">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label>Audience Engagement & Energy (1–5)</label>
              <strong style="color:#1a73e8; font-size:13px;">${hrRatingEngage} / 5</strong>
            </div>
            <div class="rating-radios">
              ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="rating-label ${hrRatingEngage === n ? 'selected' : ''}" data-action="set-rating:engage:${n}">${n}</button>`).join('')}
            </div>
          </div>

          <div class="rating-group">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label>Punctuality & Time Management (1–5)</label>
              <strong style="color:#1a73e8; font-size:13px;">${hrRatingPunct} / 5</strong>
            </div>
            <div class="rating-radios">
              ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="rating-label ${hrRatingPunct === n ? 'selected' : ''}" data-action="set-rating:punct:${n}">${n}</button>`).join('')}
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; background:#e8f0fe; padding:8px 14px; border-radius:8px; margin-top:4px;">
            <span style="font-size:12px; color:#174ea6; font-weight:600;">Evaluation Score Preview:</span>
            <span style="font-size:14px; color:#174ea6; font-weight:800;">${icon('star')} ${liveFormAvg} / 5.0</span>
          </div>

          <md-outlined-text-field id="hr-notes" type="textarea" rows="3" label="Qualitative Feedback & Observations" placeholder="Notable strengths, audience interaction, constructive tips..." required></md-outlined-text-field>

          <md-filled-button type="button" data-action="hr-submit-eval">${icon('check', 'icon')}Submit Evaluation</md-filled-button>
        </form>
      </div>

      <div class="studio-card">
        <div class="section-card-heading"><h2>Evaluation Log</h2><span class="tiny-label">RECENT SUBMISSIONS</span></div>
        <div class="eval-log-list">
          ${evals.length === 0 ? `<p style="padding:20px; text-align:center; color:#5e6266;">No evaluations recorded yet.</p>` : ''}
          ${evals.map(ev => `
            <div class="eval-card">
              <div class="eval-card-header">
                <div>
                  <h4 style="margin:0 0 2px; font-size:15px; color:#1f1f1f;">${esc(ev.sessionName)}</h4>
                  <small style="color:#5e6266;">Speaker: <strong>${esc(ev.speaker)}</strong> · Evaluator: ${esc(ev.evaluator)}</small>
                </div>
                <span class="eval-score-badge">${icon('star')} ${ev.averageScore} / 5.0</span>
              </div>
              <div class="eval-ratings-chips">
                <span class="eval-chip">Comm: ${ev.ratings?.communication || 5}/5</span>
                <span class="eval-chip">Engage: ${ev.ratings?.engagement || 4}/5</span>
                <span class="eval-chip">Punct: ${ev.ratings?.punctuality || 5}/5</span>
              </div>
              <p style="font-size:13px; color:#444746; margin:8px 0 0; line-height:1.4;">${esc(ev.notes)}</p>
              <div class="eval-card-actions">
                <md-outlined-button type="button" data-action="edit-hr-eval:${ev.id}" style="padding:4px 8px; font-size:12px;">${icon('edit', 'icon')}Edit</md-outlined-button>
                <md-outlined-button type="button" data-action="delete-hr-eval:${ev.id}" style="padding:4px 8px; font-size:12px; --md-outlined-button-label-text-color:#c5221f;">${icon('close', 'icon')}Delete</md-outlined-button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

/* ==========================================================================
   LOGISTICS DOOR CHECK-IN PORTAL (Live Roster & Unbroken Search Filter)
   ========================================================================== */

function getLogisticsRoster(sessionId) {
  const sessions = getAllManagedSessions();
  const currentSession = sessions.find(s => s.id === sessionId || s.historicalName === sessionId) || sessions[0];
  const sessionRegistrations = getSessionRegistrations(currentSession.id);

  const rosterMap = new Map();

  // 1. Add pre-registered attendees for this session
  for (const reg of sessionRegistrations) {
    rosterMap.set(reg.phone || reg.name, {
      id: reg.id,
      name: reg.name,
      phone: reg.phone,
      uni_id: reg.uni_id,
      national_id: reg.national_id,
      affiliation: reg.affiliation || 'AASTMT Student',
      checkedIn: reg.checkedIn,
      source: reg.source || 'portal'
    });
  }

  // 2. Add historical attendees if session matches historical name
  const histName = currentSession.historicalName || currentSession.title;
  for (const att of HISTORICAL_ATTENDEES) {
    if (att.sessions && att.sessions[histName] !== null && att.sessions[histName] !== undefined) {
      const key = att.phone || att.name;
      if (!rosterMap.has(key)) {
        rosterMap.set(key, {
          id: 'hist_' + key,
          name: att.name,
          phone: att.phone,
          uni_id: att.uni_id,
          national_id: att.national_id,
          affiliation: att.uni_id ? 'AASTMT Student' : 'External Guest',
          checkedIn: Boolean(att.sessions[histName]),
          source: 'historical'
        });
      }
    }
  }

  return { currentSession, attendees: Array.from(rosterMap.values()) };
}

function logisticsPortal(user) {
  const sessions = getAllManagedSessions();
  const { currentSession, attendees } = getLogisticsRoster(logisticsActiveSession);

  const query = logisticsSearchQuery.toLowerCase().trim();
  const filtered = attendees.filter(a => {
    if (!query) return true;
    return (a.name || '').toLowerCase().includes(query) ||
           (a.phone || '').includes(query) ||
           (a.uni_id || '').includes(query) ||
           (a.national_id || '').includes(query);
  });

  const checkedInCount = attendees.filter(a => a.checkedIn).length;
  const totalRegistered = attendees.length;
  const rate = totalRegistered > 0 ? Math.round((checkedInCount / totalRegistered) * 100) : 0;

  return `<div class="portal-container">
    <header class="portal-header">
      <div class="portal-header-info">
        <span class="eyebrow">Event Operations</span>
        <h1>Logistics Door Check-In Portal</h1>
        <p>Instant barcode/ID lookup, door verification, and on-spot walk-in registration.</p>
      </div>
    </header>

    <div class="logistics-stats-grid" id="logistics-stats-grid">
      <div class="logistics-stat-card">
        <h3>${totalRegistered}</h3>
        <p>Total Pre-Registered</p>
      </div>
      <div class="logistics-stat-card">
        <h3 style="color:#137333;">${checkedInCount}</h3>
        <p>Verified & Checked In</p>
      </div>
      <div class="logistics-stat-card">
        <h3 style="color:#b06000;">${Math.max(0, totalRegistered - checkedInCount)}</h3>
        <p>Pending Arrival</p>
      </div>
      <div class="logistics-stat-card">
        <h3>${rate}%</h3>
        <p>Door Attendance Rate</p>
      </div>
    </div>

    <div class="logistics-controls">
      <md-outlined-select id="logistics-session-select" label="Active Session" aria-label="Active Session">
        ${sessions.map(s => `<md-select-option value="${s.id}" ${s.id === currentSession.id ? 'selected' : ''}><div slot="headline">${esc(s.title)}</div></md-select-option>`).join('')}
      </md-outlined-select>

      <md-outlined-text-field class="logistics-search-field" id="logistics-search" placeholder="Search by Name, Uni ID, National ID, or Phone..." value="${esc(logisticsSearchQuery)}">
        <span slot="leading-icon">${icon('search')}</span>
      </md-outlined-text-field>

      <md-filled-button type="button" data-action="open-walkin-modal">${icon('plus', 'icon')}Walk-in Check-In</md-filled-button>
    </div>

    <div class="logistics-table-wrapper">
      <table class="logistics-table">
        <thead>
          <tr>
            <th>Attendee Name & Affiliation</th>
            <th>University / National ID</th>
            <th>Phone Number</th>
            <th>Registration Source</th>
            <th>Status</th>
            <th style="text-align: right;">Action</th>
          </tr>
        </thead>
        <tbody id="logistics-table-body">
          ${renderLogisticsTableRows(filtered, currentSession.id, query)}
        </tbody>
      </table>
    </div>
  </div>`;
}

function renderLogisticsTableRows(filtered, sessionId, query = '') {
  if (filtered.length === 0) {
    return `<tr><td colspan="6" style="text-align:center; padding:32px; color:#5e6266;">No attendees found matching "${esc(query)}". Use Walk-in button to register on spot.</td></tr>`;
  }
  return filtered.map(a => {
    const isChecked = Boolean(a.checkedIn);
    const affiliation = a.uni_id ? 'AASTMT Student' : (a.affiliation || 'External Guest');
    const idVal = a.uni_id || a.national_id || 'N/A';
    return `<tr>
      <td>
        <strong>${esc(a.name)}</strong>
        <div style="font-size:11px; color:#5e6266;">${esc(affiliation)}</div>
      </td>
      <td><code>${esc(idVal)}</code></td>
      <td>${esc(a.phone || 'N/A')}</td>
      <td><span class="track-chip">${esc(a.source)}</span></td>
      <td>
        <span class="logistics-status-tag ${isChecked ? 'checked-in' : 'pending'}">
          ${isChecked ? `${icon('check')} Checked In` : `${icon('clock')} Pending`}
        </span>
      </td>
      <td style="text-align: right;">
        <md-filled-button type="button" data-action="toggle-checkin:${sessionId}:${esc(a.id || a.phone)}" style="${isChecked ? '--md-filled-button-container-color:#444746;' : '--md-filled-button-container-color:#137333;'}">
          ${isChecked ? 'Undo' : 'Check In'}
        </md-filled-button>
      </td>
    </tr>`;
  }).join('');
}

/* ==========================================================================
   CORE RENDERING ENGINE
   ========================================================================== */

function render({ focus = false, focusSelector = '' } = {}) {
  stopWalkthrough();
  walkthroughStep = 0;
  document.body.classList.remove('menu-open');

  // 1. Public External Session Registration Route (#/register/<sessionId>)
  if (route === 'register') {
    app.innerHTML = publicRegistrationView(publicSessionId);
    return;
  }

  // 2. Dedicated Public Insights Route (#/insights)
  if (route === 'insights') {
    app.innerHTML = publicInsightsView();
    return;
  }

  // 3. Route Guard: If not authenticated, render dedicated Auth View
  if (!authSession) {
    app.innerHTML = authView();
    return;
  }

  const user = authSession.user || { role: 'learner' };
  const userRole = user.role || 'learner';

  // 4. Super Admin Console Views
  if (userRole === 'super_admin') {
    if (superAdminView === 'scheduler') {
      app.innerHTML = staffShell(user, superAdminSessionsManager(user));
    } else if (superAdminView === 'studio') {
      app.innerHTML = staffShell(user, trackLeadStudio(user));
    } else if (superAdminView === 'hr') {
      app.innerHTML = staffShell(user, hrPortal(user));
    } else if (superAdminView === 'logistics') {
      app.innerHTML = staffShell(user, logisticsPortal(user));
    } else if (superAdminView === 'insights') {
      app.innerHTML = staffShell(user, publicInsightsView());
    } else {
      // Super Admin viewing Learner Experience
      app.innerHTML = studentShell(renderStudentViewContent());
    }
    return;
  }

  // 5. Dedicated Staff / Team Roles
  if (userRole === 'track_lead') {
    app.innerHTML = staffShell(user, trackLeadStudio(user));
    return;
  }

  if (userRole === 'hr') {
    app.innerHTML = staffShell(user, hrPortal(user));
    return;
  }

  if (userRole === 'logistics') {
    app.innerHTML = staffShell(user, logisticsPortal(user));
    return;
  }

  // 6. Regular Learner (Student) View
  app.innerHTML = studentShell(renderStudentViewContent());
}

function renderStudentViewContent() {
  const views = {
    dashboard,
    tracks: learningTracks,
    sessions,
    tasks: taskPage,
    xp: xpPage,
    certificate
  };
  return (views[route] || dashboard)();
}

async function openDialog(headline, body, actions = '') {
  const dialog = document.querySelector('md-dialog');
  if (!dialog) return;
  dialog.querySelector('[slot="headline"]').innerHTML = headline;
  dialog.querySelector('[slot="content"]').innerHTML = body;
  dialog.querySelector('[slot="actions"]').innerHTML = actions;
  await dialog.show();
}

async function act(action) {
  const [type, ...parts] = action.split(':');
  const value = parts.join(':');

  // Password Visibility Toggle (Using official icons only: eye / lock)
  if (type === 'toggle-password') {
    const inputField = document.getElementById(value);
    const toggleBtn = document.querySelector(`[data-action="toggle-password:${value}"]`);
    if (inputField && toggleBtn) {
      const isPass = inputField.type === 'password';
      inputField.type = isPass ? 'text' : 'password';
      toggleBtn.innerHTML = isPass ? icon('lock') : icon('eye');
    }
    return;
  }

  // Auth Toggles & Handlers
  if (type === 'auth-tab') {
    authMode = value;
    authErrors = {};
    authGlobalError = '';
    render();
    return;
  }

  if (type === 'toggle-student') {
    isStudentChecked = !isStudentChecked;
    const checkbox = document.querySelector('#signup-is-student');
    if (checkbox) checkbox.checked = isStudentChecked;
    const uniField = document.querySelector('#uni-field-container');
    if (uniField) uniField.classList.toggle('auth-hidden', !isStudentChecked);
    return;
  }

  if (type === 'toggle-pub-student') {
    isStudentChecked = !isStudentChecked;
    const checkbox = document.querySelector('#pub-is-student');
    if (checkbox) checkbox.checked = isStudentChecked;
    const uniField = document.querySelector('#pub-uni-container');
    if (uniField) uniField.classList.toggle('auth-hidden', !isStudentChecked);
    return;
  }

  if (type === 'demo-login') {
    const res = signInDemo(value);
    if (res.success) {
      authSession = res.session;
      state = hydrateUser(state, authSession);
      superAdminView = 'scheduler';
      toast(`Signed in as ${authSession.user.fullName} (${authSession.user.role})`);
      render();
    } else {
      authGlobalError = res.error || 'Failed to sign in demo account.';
      render();
    }
    return;
  }

  if (type === 'open-insights-view') {
    location.hash = '/insights';
    return;
  }

  if (type === 'back-to-signin') {
    location.hash = '#/';
    authMode = 'signin';
    render();
    return;
  }

  if (type === 'submit-signup') {
    const nameEl = document.querySelector('#signup-name');
    const emailEl = document.querySelector('#signup-email');
    const phoneEl = document.querySelector('#signup-phone');
    const nidEl = document.querySelector('#signup-national-id');
    const uniEl = document.querySelector('#signup-uni-id');
    const trackEl = document.querySelector('#signup-track');
    const passEl = document.querySelector('#signup-password');

    const formData = {
      fullName: nameEl?.value,
      email: emailEl?.value,
      phone: phoneEl?.value,
      nationalId: nidEl?.value,
      isAastmtStudent: isStudentChecked,
      universityId: isStudentChecked ? uniEl?.value : null,
      primaryTrack: trackEl?.value || 'web-development',
      password: passEl?.value
    };

    const res = signUp(formData);
    if (!res.success) {
      authErrors = res.errors || {};
      authGlobalError = res.error || '';
      render();
      return;
    }

    authSession = res.session;
    state = hydrateUser(state, authSession);
    authErrors = {};
    authGlobalError = '';
    render();

    if (res.isMatched) {
      openDialog(
        'Historical Attendance Restored',
        `<div style="text-align:center; padding: 12px 0;">
          <img src="/assets/illustrations/certificate-hero.svg" alt="" width="180" style="margin-bottom:12px;">
          <p style="font-size:15px; color:#1f1f1f;">Welcome back, <strong>${esc(authSession.user.fullName)}</strong>.</p>
          <p style="font-size:13px; color:#444746;">We matched your identity across our past GDGoC workshop records. <strong>${res.restoredSessionsCount} previous sessions</strong> and <strong>+${res.restoredXp} XP</strong> have been automatically credited to your learning ledger.</p>
        </div>`,
        filled('Explore My Dashboard', 'dialog-close')
      );
    } else {
      toast(`Account created. Welcome to GDGoC Learn, ${authSession.user.firstName}.`);
    }
    return;
  }

  if (type === 'submit-signin') {
    const emailEl = document.querySelector('#signin-email');
    const passEl = document.querySelector('#signin-password');
    const res = signIn(emailEl?.value, passEl?.value);
    if (!res.success) {
      authGlobalError = res.error;
      render();
      return;
    }
    authSession = res.session;
    state = hydrateUser(state, authSession);
    authErrors = {};
    authGlobalError = '';
    toast(`Welcome back, ${authSession.user.firstName}.`);
    render();
    return;
  }

  if (type === 'signout') {
    signOut();
    authSession = null;
    state = loadState({ getItem: () => null });
    toast('Signed out successfully.');
    render();
    return;
  }

  if (type === 'dismiss-celebration') {
    dismissCelebration();
    if (state.recovery) state.recovery.celebrationDismissed = true;
    render();
    return;
  }

  // Super Admin view switching
  if (type === 'super-view') {
    superAdminView = value;
    render();
    return;
  }

  // Super Admin Sessions Manager Actions
  if (type === 'admin-create-session') {
    const title = document.querySelector('#admin-sess-title')?.value;
    const trackSlug = document.querySelector('#admin-sess-track')?.value || 'web-development';
    const rawDate = document.querySelector('#admin-sess-date-input')?.value;
    const rawTime = document.querySelector('#admin-sess-time-input')?.value;
    const room = document.querySelector('#admin-sess-room')?.value;
    const speaker = document.querySelector('#admin-sess-speaker')?.value;
    const published = document.querySelector('#admin-sess-publish')?.checked || false;

    if (!title || !rawDate) {
      toast('Please enter a session title and pick a date.');
      return;
    }

    const formattedDate = formatSessionDate(rawDate);
    const formattedTime = formatSessionTime(rawTime || '16:00');
    const newId = 'sess_' + Date.now().toString(36);

    saveManagedSession({
      id: newId,
      title,
      trackSlug,
      track: tracks.find(t => t.slug === trackSlug)?.name || 'Technical Track',
      date: formattedDate,
      time: formattedTime,
      rawDate,
      rawTime: rawTime || '16:00',
      room: room || 'Hall A204 - AASTMT Aswan',
      speaker: speaker || 'Track Lead',
      status: 'upcoming',
      publishedToStudents: published
    });

    toast(published ? 'Session scheduled and published to student catalog!' : 'Session saved in Draft mode.');
    render();
    return;
  }

  if (type === 'admin-delete-session') {
    deleteManagedSession(value);
    toast('Session deleted.');
    render();
    return;
  }

  if (type === 'admin-toggle-publish') {
    const res = toggleSessionPublish(value);
    if (res.success) {
      toast(res.session.publishedToStudents ? 'Session is now live on Student Dashboards.' : 'Session moved to Draft mode.');
      render();
    }
    return;
  }

  if (type === 'copy-whatsapp-link') {
    const publicUrl = `${window.location.origin}/#/register/${value}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast('WhatsApp registration link copied to clipboard!');
    } catch {
      prompt('Copy this WhatsApp registration link:', publicUrl);
    }
    return;
  }

  if (type === 'admin-open-checkin') {
    logisticsActiveSession = value;
    superAdminView = 'logistics';
    render();
    return;
  }

  // Student 1-Click Registration from Dashboard
  if (type === 'student-register-session') {
    if (!authSession || !authSession.user) {
      toast('Please sign in to register.');
      return;
    }
    const res = registerAttendeeForSession(value, {
      name: authSession.user.fullName,
      email: authSession.user.email,
      phone: authSession.user.phone,
      nationalId: authSession.user.nationalId,
      universityId: authSession.user.universityId,
      source: 'portal'
    });
    if (res.success) {
      toast('You are registered for this workshop! Check-in pass generated.');
      render();
    } else {
      toast(res.error || 'Could not register for this session.');
    }
    return;
  }

  // Public Session Registration Form Submit
  if (type === 'submit-public-reg') {
    const name = document.querySelector('#pub-name')?.value;
    const email = document.querySelector('#pub-email')?.value;
    const phone = document.querySelector('#pub-phone')?.value;
    const nid = document.querySelector('#pub-nid')?.value;
    const uni = document.querySelector('#pub-uni-id')?.value;

    const res = registerAttendeeForSession(value, {
      name,
      email,
      phone,
      nationalId: nid,
      universityId: isStudentChecked ? uni : null,
      source: 'public_link'
    });

    if (!res.success) {
      publicRegError = res.error || 'Registration failed. Check your information.';
      render();
      return;
    }

    publicRegError = '';
    publicRegSuccess = res.registration;
    render();
    return;
  }

  if (type === 'reset-public-reg') {
    publicRegSuccess = null;
    publicRegError = '';
    render();
    return;
  }

  // Studio tabs & actions
  if (type === 'studio-tab') {
    studioTab = value;
    render();
    return;
  }

  if (type === 'studio-publish-session') {
    const title = document.querySelector('#sess-title')?.value;
    const date = document.querySelector('#sess-date')?.value;
    const room = document.querySelector('#sess-room')?.value;
    const speaker = document.querySelector('#sess-speaker')?.value;
    if (!title || !date) { toast('Please provide a title and date.'); return; }
    saveManagedSession({
      id: 'sess_' + Date.now().toString(36),
      title,
      trackSlug: studioTrack,
      track: tracks.find(t => t.slug === studioTrack)?.name || 'Track',
      date,
      time: '4:00 PM - 6:30 PM',
      room: room || 'Hall A101 - AASTMT',
      capacity: 50,
      speaker: speaker || 'Track Lead',
      status: 'upcoming',
      publishedToStudents: true
    });
    toast('New session published to the track calendar!');
    render();
    return;
  }

  if (type === 'studio-publish-lesson') {
    const title = document.querySelector('#les-title')?.value;
    const heading = document.querySelector('#les-heading')?.value;
    const time = Number(document.querySelector('#les-time')?.value) || 8;
    const text = document.querySelector('#les-text')?.value;
    const code = document.querySelector('#les-code')?.value;
    const after = document.querySelector('#les-after')?.value;
    if (!title || !heading || !text) { toast('Please complete the lesson details.'); return; }
    saveCustomLesson({ title, heading, time, text, code: code || '', after: after || '' });
    toast('Lesson material saved and published live!');
    render();
    return;
  }

  if (type === 'studio-publish-task') {
    const title = document.querySelector('#task-title')?.value;
    const xp = Number(document.querySelector('#task-xp')?.value) || 80;
    const date = document.querySelector('#task-date')?.value;
    const desc = document.querySelector('#task-desc')?.value;
    const reqs = document.querySelector('#task-reqs')?.value;
    if (!title) { toast('Please provide a task title.'); return; }
    saveCustomTask({
      id: 'task_' + Date.now().toString(36),
      title,
      track: tracks.find(t => t.slug === studioTrack)?.name || 'Web Development',
      xp,
      status: 'todo',
      icon: 'list-check',
      color: 'blue',
      description: desc || 'Hands-on project assignment.',
      date: date || 'Due soon',
      requirements: reqs ? reqs.split('\n').filter(Boolean) : ['Complete all requirements.']
    });
    toast('Track task published to learners!');
    render();
    return;
  }

  // HR Portal Actions
  if (type === 'set-rating') {
    const [aspect, scoreStr] = parts;
    const score = Number(scoreStr);
    if (aspect === 'comm') hrRatingComm = score;
    if (aspect === 'engage') hrRatingEngage = score;
    if (aspect === 'punct') hrRatingPunct = score;
    render();
    return;
  }

  if (type === 'hr-submit-eval') {
    const sessName = document.querySelector('#hr-session-select')?.value;
    const speaker = document.querySelector('#hr-speaker')?.value;
    const notes = document.querySelector('#hr-notes')?.value;
    if (!notes) { toast('Please enter qualitative observations.'); return; }
    const avg = ((hrRatingComm + hrRatingClarity + hrRatingEngage + hrRatingPunct) / 4).toFixed(1);
    saveHrEvaluation({
      id: 'eval_' + Date.now().toString(36),
      sessionName: sessName || 'General Session',
      speaker: speaker || 'Speaker',
      evaluator: authSession.user.fullName || 'HR Evaluator',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      ratings: { communication: hrRatingComm, clarity: hrRatingClarity, engagement: hrRatingEngage, punctuality: hrRatingPunct },
      averageScore: Number(avg),
      notes
    });
    toast('Session evaluation recorded successfully!');
    render();
    return;
  }

  // Logistics Portal Actions
  if (type === 'toggle-checkin') {
    const [sessId, regId] = parts;
    const res = toggleSessionCheckIn(sessId, regId);
    if (res.success) {
      toast(res.checkedIn ? `Attendee verified and checked in: ${res.registration.name} (+60 XP)` : `Check-in reversed: ${res.registration.name}`);
      render();
    } else {
      // Toggle for historical attendee or search match
      const checkins = getLogisticsCheckins(sessId);
      const isCurrentlyChecked = checkins[regId] ?? false;
      checkins[regId] = !isCurrentlyChecked;
      saveLogisticsCheckins(sessId, checkins);
      toast(checkins[regId] ? `Verified and checked in: ${regId}` : `Check-in reversed: ${regId}`);
      render();
    }
    return;
  }

  if (type === 'open-walkin-modal') {
    openDialog(
      'Walk-in / On-Spot Check-In',
      `<form class="studio-form" id="walkin-form" novalidate onsubmit="return false;">
        <md-outlined-text-field id="walkin-name" label="Full Name" placeholder="e.g. Mostafa Ali" required></md-outlined-text-field>
        <md-outlined-text-field id="walkin-phone" type="tel" label="Phone Number" placeholder="01XXXXXXXXX" required></md-outlined-text-field>
        <md-outlined-text-field id="walkin-nid" label="National ID (14 digits)" placeholder="14-digit National ID"></md-outlined-text-field>
        <md-outlined-text-field id="walkin-uni" label="University ID (Optional)" placeholder="9-digit University ID"></md-outlined-text-field>
      </form>`,
      filled('Check In Immediately', 'submit-walkin')
    );
    return;
  }

  if (type === 'submit-walkin') {
    const name = document.querySelector('#walkin-name')?.value;
    const phone = document.querySelector('#walkin-phone')?.value;
    const nid = document.querySelector('#walkin-nid')?.value;
    const uni = document.querySelector('#walkin-uni')?.value;
    if (!name || !phone) { toast('Name and phone are required for walk-in check-in.'); return; }

    // Register attendee in session registrations and upsert into Master Members Registry
    const regRes = registerAttendeeForSession(logisticsActiveSession, {
      name,
      email: `${phone}@guest.gdgoc.edu.eg`,
      phone,
      nationalId: nid || '30000000000000',
      universityId: uni || null,
      source: 'walkin'
    });

    if (regRes.success) {
      toggleSessionCheckIn(logisticsActiveSession, regRes.registration.id);
    }

    await document.querySelector('md-dialog').close();
    toast(`Walk-in guest ${name} checked in and added to Master Members Registry.`);
    render();
    return;
  }

  // Student portal navigation
  if (type === 'dialog-close') { await document.querySelector('md-dialog').close(); return; }
  if (type === 'dialog-go') { await document.querySelector('md-dialog').close(); go(value); return; }
  if (type === 'dialog-resume') { await document.querySelector('md-dialog').close(); lessonTab = 0; go('sessions'); return; }
  if (type === 'go') return go(value);
  if (type === 'resume') { lessonTab = 0; return go('sessions'); }
  if (type === 'menu') { document.body.classList.toggle('menu-open'); document.querySelector('[data-action="menu"]')?.setAttribute('aria-expanded', document.body.classList.contains('menu-open') ? 'true' : 'false'); return; }
  if (type === 'close-menu') { closeMenu(); return; }
  if (type === 'lesson') { state.selectedLesson = Number(value); save(); render({ focusSelector: `[data-action="lesson:${value}"]` }); return; }
  if (type === 'previous-lesson' && state.selectedLesson > 0) { state.selectedLesson--; save(); render({ focusSelector: '#lesson-panel' }); return; }
  if (type === 'next-lesson') {
    const allL = getAllLessons();
    state = toggleLesson(state, state.selectedLesson, true);
    if (state.selectedLesson < allL.length - 1) { state.selectedLesson++; save(); render({ focusSelector: '#lesson-panel' }); }
    else {
      save(); render();
      const complete = state.completedLessons.length === allL.length;
      openDialog(complete ? `Milestone reached, ${esc(state.user?.firstName || 'Learner')}` : 'You’ve reached the final lesson', complete ? '<p>You’ve completed all lessons in this session.</p><p>Now turn what you’ve learned into something you can share. Your portfolio landing page is a great place to start.</p>' : `<p>You’ve completed ${state.completedLessons.length} of ${allL.length} lessons.</p>`, filled(complete ? 'Build your portfolio' : 'Continue learning', complete ? 'dialog-go:tasks' : 'dialog-resume'));
    }
    return;
  }
  if (type === 'copy-code') {
    const allL = getAllLessons();
    try { await navigator.clipboard.writeText((allL[state.selectedLesson] || allL[0]).code); toast('Code copied. Make it your own.'); } catch { toast('Select the code and use Ctrl+C to copy it.'); }
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
  if (type === 'run-practice') { practiceSource = document.querySelector('#practice-code').value; document.querySelector('#practice-preview').srcdoc = practiceSource; toast('Preview updated. Keep experimenting.'); return; }
  if (type === 'reset-practice') {
    const allL = getAllLessons();
    const lessonCode = (allL[state.selectedLesson] || allL[0]).code;
    practiceSource = [3, 4].includes(state.selectedLesson) ? `<style>body { font-family: sans-serif; padding: 24px; }\n${lessonCode}</style>\n<h1>Hello GDGoC!</h1>\n<p>My first webpage.</p>` : `<style>body { font-family: sans-serif; padding: 24px; } h1 { color: #1a73e8; }</style>\n${state.selectedLesson === 1 ? '<h1>My project is ready!</h1>\n<p>Let’s build something.</p>' : lessonCode}`;
    render(); return;
  }
  if (type === 'download-starter') {
    const blob = new Blob(['<!doctype html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>My first webpage</title>\n<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:48px auto;padding:24px;line-height:1.6}h1{color:#1a73e8}</style>\n</head>\n<body>\n<main>\n<h1>Hello GDGoC!</h1>\n<p>My first webpage. Make this space your own!</p>\n</main>\n</body>\n</html>'], { type: 'text/html' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'gdgoc-first-webpage.html'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Your starter file is ready. Happy building.'); return;
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
  if (type === 'profile') {
    const user = state.user || { fullName: 'Learner', firstName: 'Learner', email: 'learner@gdgoc.dev', phone: '01XXXXXXXXX', isAastmtStudent: true, universityId: '251009966', primaryTrack: 'web-development', role: 'learner' };
    const p = getProgress(state);
    const recovery = state.recovery;
    const affiliation = user.isAastmtStudent
      ? `AASTMT Student · ID: ${user.universityId || 'Enrolled'}`
      : `External Member · National ID: ${user.nationalId || 'Verified'}`;
    const trackName = tracks.find(t => t.slug === user.primaryTrack)?.name || user.primaryTrack || 'Web Development';

    const matchNotice = (recovery && recovery.isMatched)
      ? `<div class="dialog-callout">${icon('sparkles')}<span><strong>Identity Matched:</strong> ${recovery.restoredSessionsCount} past workshops restored (${(recovery.restoredSessions || []).join(', ')}). +${recovery.historicalXp} XP credited.</span></div>`
      : `<div class="dialog-callout">${icon('users')}<span>Welcome to GDGoC Learn. Attend upcoming community sessions and complete assignments to earn XP.</span></div>`;

    return openDialog('Your learning profile', `<div class="profile-overview"><img src="/assets/avatars/student-placeholder.svg" alt="" width="72" height="72"><div><h3>${esc(user.fullName)}</h3><p>${esc(affiliation)}</p><span class="track-chip">${esc(trackName)}</span><div style="margin-top:6px;">${roleBadge(user)}</div></div></div><div class="profile-stats"><div><strong>${p.xp}</strong><span>Total XP</span></div><div><strong>${p.attendance}</strong><span>Attendance XP</span></div><div><strong>${p.lessons}</strong><span>Lessons</span></div></div><p class="supporting-text">Email: ${esc(user.email)} · Phone: ${esc(user.phone)}</p>${matchNotice}<div style="margin-top: 18px;"><md-outlined-button type="button" class="signout-button" data-action="signout">${icon('logout', 'icon')}Sign Out</md-outlined-button></div>`);
  }
  if (type === 'help') return openDialog('We’re learning together', `<p>A few answers to keep you moving.</p><div class="help-answer"><h3>How do I earn XP?</h3><p>Attend community sessions, complete lessons, and have your assignments approved by your mentor.</p></div><div class="help-answer"><h3>Where do I submit my work?</h3><p>Open Tasks, choose View Details, and add a link to your project or GitHub repository.</p></div><div class="help-answer"><h3>When will my certificate be ready?</h3><p>Visit Certificate to see the requirements. Your certificate becomes available after your season progress is reviewed and approved.</p></div><div class="dialog-callout">${icon('users')}<span>Need a hand with a lesson? Reach out to your track mentor during your next community session.</span></div><p class="supporting-text">Your progress and submissions are saved in this browser session.</p>`);
}

document.addEventListener('click', event => {
  if (event.target.closest('.skip-link')) { event.preventDefault(); document.querySelector('#main')?.focus(); return; }
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
  if (event.target.matches('#lesson-completed')) { const checked = event.target.checked; state = toggleLesson(state, state.selectedLesson, checked); save(); render({ focusSelector: '#lesson-completed' }); toast(checked ? 'Lesson completed. Another step forward.' : 'Lesson marked as incomplete.'); }
  if (event.target.matches('.track-select')) { taskTrack = event.target.value; document.querySelector('#task-list').innerHTML = taskCards(); }
  if (event.target.matches('#super-track-select')) { studioTrack = event.target.value; render(); }
  if (event.target.matches('#logistics-session-select')) { logisticsActiveSession = event.target.value; render(); }
});

document.addEventListener('input', event => {
  if (event.target.id === 'practice-code') practiceSource = event.target.value;
  if (event.target.id === 'logistics-search') {
    logisticsSearchQuery = event.target.value;
    const user = authSession?.user || { role: 'logistics' };
    const container = document.querySelector('.portal-container');
    if (container) {
      container.outerHTML = logisticsPortal(user);
      const searchInput = document.querySelector('#logistics-search');
      if (searchInput) {
        searchInput.focus();
        searchInput.selectionStart = searchInput.selectionEnd = searchInput.value.length;
      }
    }
  }
});

function closeMenu() {
  document.body.classList.remove('menu-open');
  const button = document.querySelector('[data-action="menu"]');
  if (button) {
    button.setAttribute('aria-expanded', 'false');
    button.focus();
  }
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.body.classList.contains('menu-open')) closeMenu();
  if (event.key === 'Enter') {
    const signupForm = event.target.closest('#signup-form');
    if (signupForm) {
      act('submit-signup').catch(console.error);
    }
    const signinForm = event.target.closest('#signin-form');
    if (signinForm) {
      act('submit-signin').catch(console.error);
    }
    const pubForm = event.target.closest('#public-reg-form');
    if (pubForm) {
      act(`submit-public-reg:${publicSessionId}`).catch(console.error);
    }
  }
});

window.addEventListener('hashchange', () => {
  route = readRoute();
  publicSessionId = readPublicSessionId();
  render({ focus: true });
});

render();
