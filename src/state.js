import {
  getAllManagedSessions,
  saveManagedSession,
  deleteManagedSession,
  toggleSessionPublish,
  getSessionRegistrations,
  registerAttendeeForSession,
  toggleSessionCheckIn,
  getMasterMembers,
  upsertMasterMember,
  DEFAULT_MASTER_SESSIONS
} from './services/membersService.js';

export {
  getAllManagedSessions,
  saveManagedSession,
  deleteManagedSession,
  toggleSessionPublish,
  getSessionRegistrations,
  registerAttendeeForSession,
  toggleSessionCheckIn,
  getMasterMembers,
  upsertMasterMember
};

export const STORAGE_KEY = 'gdgoc-learn:v1';
export const routes = ['dashboard', 'tracks', 'sessions', 'tasks', 'xp', 'certificate', 'insights', 'register'];

export const tasks = [
  { id: 'portfolio', title: 'Build a Portfolio Landing Page', track: 'Web Development', xp: 100, status: 'todo', icon: 'monitor', color: 'purple', description: 'Create a responsive landing page to introduce yourself.', date: 'Due: Fri, Jan 24, 11:59 PM', requirements: ['Introduce yourself with a heading, short bio, and profile image.', 'Add a projects section with at least two project cards.', 'Style your page with CSS and make it work on mobile.', 'Include a contact link and publish your work on GitHub.'] },
  { id: 'git', title: 'Git & GitHub Fundamentals', track: 'Software Engineering', xp: 80, status: 'submitted', icon: 'github', color: 'slate', description: 'Practice basic Git commands and push your work to GitHub.', date: 'Submitted: Jan 20, 10:42 PM', requirements: ['Create a Git repository and add a README.', 'Make three meaningful commits.', 'Create a branch, make a change, and merge it.', 'Push the repository to GitHub.'] },
  { id: 'quiz', title: 'HTML Basics Quiz', track: 'Web Development', xp: 40, status: 'completed', icon: 'check-circle', color: 'green', description: 'A short quiz to check your understanding of HTML.', date: 'Completed: Jan 18, 7:20 PM', requirements: ['Identify the main parts of an HTML document.', 'Choose semantic HTML elements.', 'Understand links, images, and headings.'] },
];

export const lessons = [
  { title: 'Introduction', heading: 'Welcome to the web', time: 4, text: 'Every website starts with an idea. In this session, you’ll turn that idea into your first webpage using HTML for structure and CSS for style.', code: '<!-- Your journey starts here -->\n<h1>Hello, web!</h1>', after: 'By the end of this session, you’ll have a small webpage that is entirely your own.' },
  { title: 'Setting Up', heading: 'Set up your workspace', time: 6, text: 'Create a folder for your project and open it in your code editor. Add an index.html file for your content and a style.css file for your styles.', code: 'my-first-website/\n  index.html\n  style.css', after: 'Open index.html in your browser. Each time you save a change, refresh the page to see the result.' },
  { title: 'HTML Structure', heading: 'Understanding HTML Structure', time: 8, text: 'Every webpage begins with HTML. HTML defines the structure of the page using elements such as headings, paragraphs, and links.', code: '<h1>Hello GDGoC!</h1>\n<p>My first webpage.</p>', after: 'Next, we’ll use CSS to give these elements their own visual style.' },
  { title: 'CSS Basics', heading: 'Make it yours with CSS', time: 7, text: 'CSS controls how your HTML looks. Select an element, then add properties to change its color, size, spacing, and more.', code: 'h1 {\n  color: #1a73e8;\n  font-family: sans-serif;\n}\np { color: #52607a; }', after: 'Try changing the heading color in the Practice tab. Small changes can give your page a whole new personality.' },
  { title: 'Styling Your Page', heading: 'Give your content room to breathe', time: 10, text: 'Use spacing, a comfortable line height, and a simple layout to make your page easier to read. A centered container is a great place to start.', code: 'main {\n  max-width: 720px;\n  margin: 48px auto;\n  padding: 24px;\n  line-height: 1.6;\n}', after: 'Use a media query to adjust your layout for smaller screens. Keep your text readable and your links easy to tap.' },
  { title: 'Mini Practice', heading: 'Build your first introduction', time: 12, text: 'Bring everything together. Write a heading with your name, add a short introduction, and include a link to something you’ve made.', code: '<main>\n  <h1>Hi, I’m Ahmed</h1>\n  <p>I’m learning to build for the web.</p>\n  <a href="https://github.com">My projects</a>\n</main>', after: 'Ready for a bigger challenge? Open Tasks and start building your portfolio landing page.' },
];

/**
 * Official 4 GDGoC Technical Tracks (strictly 4)
 */
export const tracks = [
  { name: 'Web Development', slug: 'web-development', description: 'Build for the web, one line at a time.', tag: 'Core track', sessions: 8, progress: 38, color: 'blue' },
  { name: 'Software Engineering', slug: 'software-engineering', description: 'Turn good ideas into reliable software.', tag: 'Core track', sessions: 6, progress: 17, color: 'purple' },
  { name: 'AI & Machine Learning', slug: 'ai-ml', description: 'Explore the possibilities of intelligent systems.', tag: 'Core track', sessions: 8, progress: 0, color: 'green' },
  { name: 'Data Science', slug: 'data-science', description: 'Find the stories hidden in your data.', tag: 'Core track', sessions: 6, progress: 0, color: 'yellow' },
];

export const SESSIONS_LIST = [
  { id: 'web-dev-1', title: 'Web Dev 1 · Introduction to the Modern Web', trackSlug: 'web-development', track: 'Web Development', date: 'Completed', room: 'Hall 1', speaker: 'Ahmed Ibrahim (Lead)', status: 'completed' },
  { id: 'ai-session', title: 'AI Session · Foundations of Machine Learning', trackSlug: 'ai-ml', track: 'AI & Machine Learning', date: 'Completed', room: 'Hall 2', speaker: 'Dr. Kareem Tarek', status: 'completed' },
  { id: 'python-workshop', title: 'Python Workshop · Practical Scripting', trackSlug: 'data-science', track: 'Data Science', date: 'Completed', room: 'Lab 101', speaker: 'Sara Mostafa', status: 'completed' },
  { id: 'swe-1', title: 'SWE 1 · Git & Clean Architecture', trackSlug: 'software-engineering', track: 'Software Engineering', date: 'Completed', room: 'Hall 1', speaker: 'Mariam Hassan', status: 'completed' },
  { id: 'web-dev-2', title: 'Web Dev 2 · HTML & CSS Deep Dive', trackSlug: 'web-development', track: 'Web Development', date: 'Completed', room: 'Lab 203', speaker: 'Youssef Ali', status: 'completed' },
  { id: 'web-dev-3', title: 'Web Dev 3 · Responsive Layouts & Components', trackSlug: 'web-development', track: 'Web Development', date: 'Sat, Nov 22 · 4:00 PM', room: 'Lab 301', speaker: 'Youssef Ali', status: 'active' },
  { id: 'swe-2', title: 'SWE 2 · Design Patterns & Testing in Production', trackSlug: 'software-engineering', track: 'Software Engineering', date: 'Mon, Nov 24 · 5:00 PM', room: 'Hall 2', speaker: 'Mariam Hassan', status: 'upcoming' },
  { id: 'ai-2', title: 'AI 2 · Neural Networks with PyTorch', trackSlug: 'ai-ml', track: 'AI & Machine Learning', date: 'Wed, Nov 26 · 4:00 PM', room: 'Lab 102', speaker: 'Dr. Kareem Tarek', status: 'upcoming' },
  { id: 'ds-2', title: 'DS 2 · Exploratory Data Analysis & Pandas', trackSlug: 'data-science', track: 'Data Science', date: 'Sat, Nov 29 · 3:00 PM', room: 'Lab 101', speaker: 'Sara Mostafa', status: 'upcoming' },
];

export function initialState(authSession = null) {
  const base = {
    completedLessons: [0, 1, 2],
    selectedLesson: 2,
    submissions: {},
    joinedTracks: ['web-development', 'software-engineering'],
    user: null,
    recovery: null
  };
  if (authSession && authSession.user) {
    base.user = authSession.user;
    base.recovery = authSession.recovery || null;
    if (authSession.user.primaryTrack && !base.joinedTracks.includes(authSession.user.primaryTrack)) {
      base.joinedTracks.unshift(authSession.user.primaryTrack);
    }
  }
  return base;
}

export function loadState(storage, authSession = null) {
  const state = initialState(authSession);
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== 'object') return state;
    if (Array.isArray(saved.completedLessons)) state.completedLessons = [...new Set(saved.completedLessons.filter(n => Number.isInteger(n) && n >= 0 && n < lessons.length))];
    if (Number.isInteger(saved.selectedLesson) && saved.selectedLesson >= 0 && saved.selectedLesson < lessons.length) state.selectedLesson = saved.selectedLesson;
    if (saved.submissions && typeof saved.submissions === 'object') {
      for (const task of tasks.filter(t => t.status === 'todo')) {
        const entry = saved.submissions[task.id];
        if (!entry || typeof entry.url !== 'string' || typeof entry.date !== 'string') continue;
        try {
          const url = new URL(entry.url);
          if (['http:', 'https:'].includes(url.protocol)) state.submissions[task.id] = { url: url.href, date: entry.date.slice(0, 50) };
        } catch { /* Ignore malformed stored submissions. */ }
      }
    }
    if (Array.isArray(saved.joinedTracks)) state.joinedTracks = [...new Set([...state.joinedTracks, ...saved.joinedTracks.filter(slug => tracks.some(t => t.slug === slug))])];
  } catch { /* The portal also works when browser storage is unavailable. */ }
  return state;
}

export function getProgress(state) {
  const activity = 160 + (state.completedLessons.length - 3) * 20;
  if (state.user) {
    const attendance = state.recovery && typeof state.recovery.historicalXp === 'number'
      ? state.recovery.historicalXp
      : 0;
    const tasksXp = 220;
    const xp = attendance + activity + tasksXp;
    return {
      attendance,
      activity,
      tasks: tasksXp,
      xp,
      percent: Math.min(100, Math.round(xp / 10)),
      lessons: state.completedLessons.length
    };
  }
  return { attendance: 240, activity, tasks: 220, xp: 460 + activity, percent: Math.round((460 + activity) / 10), lessons: state.completedLessons.length };
}

export function hydrateUser(state, authSession) {
  if (!authSession || !authSession.user) {
    return { ...state, user: null, recovery: null };
  }
  const trackSlug = authSession.user.primaryTrack || 'web-development';
  return {
    ...state,
    user: authSession.user,
    recovery: authSession.recovery || null,
    joinedTracks: [...new Set([trackSlug, ...state.joinedTracks])]
  };
}

const stateMemoryStore = new Map();

function storageGet(key) {
  if (typeof localStorage !== 'undefined') {
    try { return localStorage.getItem(key); } catch {}
  }
  return stateMemoryStore.get(key) || null;
}

function storageSet(key, value) {
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem(key, value); } catch {}
  }
  stateMemoryStore.set(key, value);
}

/* ==========================================================================
   TRACK-SPECIFIC CURRICULUM & LESSONS (Full Track Lead CRUD)
   ========================================================================== */

export const DEFAULT_TRACK_LESSONS = [
  // Web Development
  { id: 'les-web-1', trackSlug: 'web-development', track: 'Web Development', title: 'Introduction', heading: 'Welcome to the web', time: 4, text: 'Every website starts with an idea. In this session, you’ll turn that idea into your first webpage using HTML for structure and CSS for style.', code: '<!-- Your journey starts here -->\n<h1>Hello, web!</h1>', after: 'By the end of this session, you’ll have a small webpage that is entirely your own.', hidden: false },
  { id: 'les-web-2', trackSlug: 'web-development', track: 'Web Development', title: 'Setting Up', heading: 'Set up your workspace', time: 6, text: 'Create a folder for your project and open it in your code editor. Add an index.html file for your content and a style.css file for your styles.', code: 'my-first-website/\n  index.html\n  style.css', after: 'Open index.html in your browser. Each time you save a change, refresh the page to see the result.', hidden: false },
  { id: 'les-web-3', trackSlug: 'web-development', track: 'Web Development', title: 'HTML Structure', heading: 'Understanding HTML Structure', time: 8, text: 'Every webpage begins with HTML. HTML defines the structure of the page using elements such as headings, paragraphs, and links.', code: '<h1>Hello GDGoC!</h1>\n<p>My first webpage.</p>', after: 'Next, we’ll use CSS to give these elements their own visual style.', hidden: false },
  { id: 'les-web-4', trackSlug: 'web-development', track: 'Web Development', title: 'CSS Basics', heading: 'Make it yours with CSS', time: 7, text: 'CSS controls how your HTML looks. Select an element, then add properties to change its color, size, spacing, and more.', code: 'h1 {\n  color: #1a73e8;\n  font-family: sans-serif;\n}\np { color: #52607a; }', after: 'Try changing the heading color in the Practice tab. Small changes can give your page a whole new personality.', hidden: false },
  { id: 'les-web-5', trackSlug: 'web-development', track: 'Web Development', title: 'Styling Your Page', heading: 'Give your content room to breathe', time: 10, text: 'Use spacing, a comfortable line height, and a simple layout to make your page easier to read. A centered container is a great place to start.', code: 'main {\n  max-width: 720px;\n  margin: 48px auto;\n  padding: 24px;\n  line-height: 1.6;\n}', after: 'Use a media query to adjust your layout for smaller screens. Keep your text readable and your links easy to tap.', hidden: false },
  { id: 'les-web-6', trackSlug: 'web-development', track: 'Web Development', title: 'Mini Practice', heading: 'Build your first introduction', time: 12, text: 'Bring everything together. Write a heading with your name, add a short introduction, and include a link to something you’ve made.', code: '<main>\n  <h1>Hi, I’m Ahmed</h1>\n  <p>I’m learning to build for the web.</p>\n  <a href="https://github.com">My projects</a>\n</main>', after: 'Ready for a bigger challenge? Open Tasks and start building your portfolio landing page.', hidden: false },

  // Software Engineering
  { id: 'les-swe-1', trackSlug: 'software-engineering', track: 'Software Engineering', title: 'Git & GitHub Pro', heading: 'Modern Version Control Workflows', time: 8, text: 'Learn trunk-based development, atomic commits, interactive rebasing, and clean pull request workflows.', code: 'git checkout -b feat/user-auth\ngit add -A\ngit commit -m "feat(auth): add token refresh"\ngit push -u origin feat/user-auth', after: 'Always write declarative conventional commit messages.', hidden: false },
  { id: 'les-swe-2', trackSlug: 'software-engineering', track: 'Software Engineering', title: 'Clean Architecture', heading: 'Decoupling Core Logic from Frameworks', time: 10, text: 'Structure your services so business rules remain independent from external databases or transport protocols.', code: 'export class OrderService {\n  constructor(private repo: OrderRepository) {}\n  async placeOrder(order: Order): Promise<Result> {\n    return this.repo.save(order);\n  }\n}', after: 'High cohesion and loose coupling make code testable and resilient.', hidden: false },

  // AI & Machine Learning
  { id: 'les-ai-1', trackSlug: 'ai-ml', track: 'AI & Machine Learning', title: 'ML Foundations', heading: 'Gradient Descent & Cost Functions', time: 9, text: 'Understand how mathematical optimization guides neural weights toward minimal loss.', code: 'import numpy as np\n# Compute MSE Loss\ndef compute_loss(y_true, y_pred):\n  return np.mean((y_true - y_pred) ** 2)', after: 'Always check data scaling and normalization before model training.', hidden: false },

  // Data Science
  { id: 'les-ds-1', trackSlug: 'data-science', track: 'Data Science', title: 'EDA & Pandas', heading: 'Practical Exploratory Data Analysis', time: 9, text: 'Inspect missing values, handle categorical features, and extract actionable insights from raw CSV tables.', code: 'import pandas as pd\ndf = pd.read_csv("attendees.csv")\nprint(df.isnull().sum())\nprint(df.describe())', after: 'Visualizing distributions reveals hidden skew and outliers.', hidden: false }
];

export function getTrackLessons(trackSlug = null, includeHidden = true) {
  let all = DEFAULT_TRACK_LESSONS;
  try {
    const raw = storageGet('gdgoc_master_lessons');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) all = parsed;
    }
  } catch {}
  return all.filter(l => {
    if (!includeHidden && l.hidden) return false;
    if (trackSlug && l.trackSlug !== trackSlug) return false;
    return true;
  });
}

export function saveLesson(lessonData) {
  const all = getTrackLessons(null, true);
  const id = lessonData.id || ('les_' + Date.now().toString(36));
  const record = { ...lessonData, id, hidden: Boolean(lessonData.hidden) };
  const idx = all.findIndex(l => l.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...record };
  } else {
    all.push(record);
  }
  storageSet('gdgoc_master_lessons', JSON.stringify(all));
  return all;
}

export function deleteLesson(lessonId) {
  const all = getTrackLessons(null, true).filter(l => l.id !== lessonId);
  storageSet('gdgoc_master_lessons', JSON.stringify(all));
  return all;
}

export function toggleLessonVisibility(lessonId) {
  const all = getTrackLessons(null, true);
  const target = all.find(l => l.id === lessonId);
  if (target) {
    target.hidden = !target.hidden;
    storageSet('gdgoc_master_lessons', JSON.stringify(all));
  }
  return all;
}

export function getCustomLessons() {
  return getTrackLessons('web-development', false).slice(6);
}

export function saveCustomLesson(newLesson) {
  return saveLesson({ ...newLesson, trackSlug: 'web-development', track: 'Web Development' });
}

export function getAllLessons() {
  return [...lessons, ...getCustomLessons()];
}

/* ==========================================================================
   TRACK-SPECIFIC TASKS & REVIEW (Full Track Lead CRUD)
   ========================================================================== */

export const DEFAULT_TRACK_TASKS = [
  { id: 'portfolio', trackSlug: 'web-development', track: 'Web Development', title: 'Build a Portfolio Landing Page', xp: 100, status: 'todo', icon: 'monitor', color: 'purple', description: 'Create a responsive landing page to introduce yourself.', date: 'Due: Fri, Jan 24, 11:59 PM', requirements: ['Introduce yourself with a heading, short bio, and profile image.', 'Add a projects section with at least two project cards.', 'Style your page with CSS and make it work on mobile.', 'Include a contact link and publish your work on GitHub.'], hidden: false },
  { id: 'quiz', trackSlug: 'web-development', track: 'Web Development', title: 'HTML Basics Quiz', xp: 40, status: 'completed', icon: 'check-circle', color: 'green', description: 'A short quiz to check your understanding of HTML.', date: 'Completed: Jan 18, 7:20 PM', requirements: ['Identify the main parts of an HTML document.', 'Choose semantic HTML elements.', 'Understand links, images, and headings.'], hidden: false },
  { id: 'git', trackSlug: 'software-engineering', track: 'Software Engineering', title: 'Git & GitHub Fundamentals', xp: 80, status: 'submitted', icon: 'github', color: 'slate', description: 'Practice basic Git commands and push your work to GitHub.', date: 'Submitted: Jan 20, 10:42 PM', requirements: ['Create a Git repository and add a README.', 'Make three meaningful commits.', 'Create a branch, make a change, and merge it.', 'Push the repository to GitHub.'], hidden: false },
  { id: 'swe-clean-api', trackSlug: 'software-engineering', track: 'Software Engineering', title: 'REST API & Unit Testing', xp: 90, status: 'todo', icon: 'code', color: 'blue', description: 'Design a modular API router with unit test assertions.', date: 'Due: Mon, Feb 02, 11:59 PM', requirements: ['Create endpoints for CRUD resources.', 'Write unit test assertions with mocks.', 'Enforce status code conventions.'], hidden: false },
  { id: 'ai-reg-model', trackSlug: 'ai-ml', track: 'AI & Machine Learning', title: 'Linear Regression from Scratch', xp: 90, status: 'todo', icon: 'sparkles', color: 'green', description: 'Implement forward pass and gradient calculation using NumPy.', date: 'Due: Wed, Feb 04, 11:59 PM', requirements: ['Generate synthetic regression data.', 'Compute gradient steps.', 'Plot loss convergence over epochs.'], hidden: false },
  { id: 'ds-churn-eda', trackSlug: 'data-science', track: 'Data Science', title: 'Customer Churn EDA Notebook', xp: 85, status: 'todo', icon: 'chart', color: 'yellow', description: 'Analyze customer churn patterns with pandas and matplotlib.', date: 'Due: Sat, Feb 07, 11:59 PM', requirements: ['Load and clean customer records.', 'Generate correlation matrix.', 'Summarize key risk factors.'], hidden: false }
];

export function getTrackTasks(trackSlug = null, includeHidden = true) {
  let all = DEFAULT_TRACK_TASKS;
  try {
    const raw = storageGet('gdgoc_master_tasks');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) all = parsed;
    }
  } catch {}
  return all.filter(t => {
    if (!includeHidden && t.hidden) return false;
    if (trackSlug && t.trackSlug !== trackSlug) return false;
    return true;
  });
}

export function saveTrackTask(taskData) {
  const all = getTrackTasks(null, true);
  const id = taskData.id || ('task_' + Date.now().toString(36));
  const record = { ...taskData, id, hidden: Boolean(taskData.hidden) };
  const idx = all.findIndex(t => t.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...record };
  } else {
    all.push(record);
  }
  storageSet('gdgoc_master_tasks', JSON.stringify(all));
  return all;
}

export function deleteTrackTask(taskId) {
  const all = getTrackTasks(null, true).filter(t => t.id !== taskId);
  storageSet('gdgoc_master_tasks', JSON.stringify(all));
  return all;
}

export function toggleTaskVisibility(taskId) {
  const all = getTrackTasks(null, true);
  const target = all.find(t => t.id === taskId);
  if (target) {
    target.hidden = !target.hidden;
    storageSet('gdgoc_master_tasks', JSON.stringify(all));
  }
  return all;
}

export function getCustomTasks() {
  if (typeof localStorage === 'undefined') {
    const raw = storageGet('gdgoc_custom_tasks');
    return raw ? JSON.parse(raw) : [];
  }
  try {
    const raw = localStorage.getItem('gdgoc_custom_tasks');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomTask(newTask) {
  const current = getCustomTasks();
  current.push(newTask);
  storageSet('gdgoc_custom_tasks', JSON.stringify(current));
  saveTrackTask(newTask);
  return current;
}

/* ==========================================================================
   STUDENT TASK SUBMISSIONS REVIEW (Track Lead Grading & Feedback)
   ========================================================================== */

export const DEFAULT_SUBMISSIONS = [
  { id: 'sub_1', taskId: 'git', taskTitle: 'Git & GitHub Fundamentals', trackSlug: 'software-engineering', studentName: 'Omar Hassan', studentEmail: 'omar.hassan@gdgoc.edu.eg', url: 'https://github.com/omar-hassan/git-fundamentals', date: 'Nov 16, 2026', status: 'pending', xp: 80, feedback: '' },
  { id: 'sub_2', taskId: 'portfolio', taskTitle: 'Build a Portfolio Landing Page', trackSlug: 'web-development', studentName: 'Farah Mostafa', studentEmail: 'farah.m@gdgoc.edu.eg', url: 'https://github.com/farah-dev/my-first-portfolio', date: 'Nov 17, 2026', status: 'pending', xp: 100, feedback: '' },
  { id: 'sub_3', taskId: 'ai-reg-model', taskTitle: 'Linear Regression from Scratch', trackSlug: 'ai-ml', studentName: 'Ziad Ahmed', studentEmail: 'ziad.ahmed@gdgoc.edu.eg', url: 'https://github.com/ziad-ai/regression-scratch', date: 'Nov 15, 2026', status: 'pending', xp: 90, feedback: '' },
  { id: 'sub_4', taskId: 'ds-churn-eda', taskTitle: 'Customer Churn EDA Notebook', trackSlug: 'data-science', studentName: 'Mona Tarek', studentEmail: 'mona.tarek@gdgoc.edu.eg', url: 'https://github.com/mona-ds/churn-eda-notebook', date: 'Nov 16, 2026', status: 'pending', xp: 85, feedback: '' }
];

export function getTrackSubmissions(trackSlug = null) {
  let all = DEFAULT_SUBMISSIONS;
  try {
    const raw = storageGet('gdgoc_task_submissions');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) all = parsed;
    }
  } catch {}
  return all.filter(s => !trackSlug || s.trackSlug === trackSlug);
}

export function reviewSubmission(submissionId, { status, feedback, reviewer = 'Track Lead' }) {
  let all = getTrackSubmissions(null);
  const idx = all.findIndex(s => s.id === submissionId);
  if (idx >= 0) {
    all[idx] = {
      ...all[idx],
      status, // 'approved' | 'rejected'
      feedback: feedback || '',
      reviewer,
      reviewedAt: new Date().toISOString()
    };
    storageSet('gdgoc_task_submissions', JSON.stringify(all));
    return { success: true, submission: all[idx] };
  }
  return { success: false, error: 'Submission not found.' };
}

/* ==========================================================================
   HR SESSION EVALUATIONS (Full Audit, Edit, Delete & Live KPIs)
   ========================================================================== */

export function getHrEvaluations() {
  const defaultEvals = [
    {
      id: 'eval_seed_1',
      sessionName: 'Web Dev 2 · HTML & CSS Deep Dive',
      speaker: 'Youssef Ali (Web Lead)',
      evaluator: 'Nouran Mahmoud (HR)',
      date: 'Nov 12, 2026',
      ratings: { communication: 5, clarity: 5, engagement: 4, punctuality: 5 },
      averageScore: 4.75,
      notes: 'Exceptional pacing and great live coding demonstration. Learners remained highly engaged throughout the exercise.'
    },
    {
      id: 'eval_seed_2',
      sessionName: 'AI Session · Foundations of Machine Learning',
      speaker: 'Dr. Kareem Tarek',
      evaluator: 'Nouran Mahmoud (HR)',
      date: 'Nov 05, 2026',
      ratings: { communication: 4, clarity: 5, engagement: 5, punctuality: 4 },
      averageScore: 4.5,
      notes: 'Strong audience rapport and intuitive visual explanations of gradient descent. Recommended allocating 10 minutes at the end for Q&A.'
    }
  ];
  try {
    const raw = storageGet('gdgoc_hr_evaluations');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  storageSet('gdgoc_hr_evaluations', JSON.stringify(defaultEvals));
  return defaultEvals;
}

export function saveHrEvaluation(evalData) {
  const current = getHrEvaluations();
  const id = evalData.id || ('eval_' + Date.now().toString(36));
  const record = { ...evalData, id };
  const idx = current.findIndex(e => e.id === id);
  if (idx >= 0) {
    current[idx] = { ...current[idx], ...record };
  } else {
    current.unshift(record);
  }
  storageSet('gdgoc_hr_evaluations', JSON.stringify(current));
  return current;
}

export function deleteHrEvaluation(evalId) {
  const current = getHrEvaluations().filter(e => e.id !== evalId);
  storageSet('gdgoc_hr_evaluations', JSON.stringify(current));
  return current;
}

export function getCustomSessions() {
  return [];
}

export function saveCustomSession(newSession) {
  return saveManagedSession(newSession);
}

export function getAllSessions() {
  return getAllManagedSessions();
}

export function getLogisticsCheckins(sessionId = 'sess-web-dev-1') {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`gdgoc_checkins_${sessionId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLogisticsCheckins(sessionId, checkinMap) {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`gdgoc_checkins_${sessionId}`, JSON.stringify(checkinMap));
    } catch {}
  }
  return checkinMap;
}

export function getTasks(state, status = 'all', track = 'all') {
  const all = [...tasks, ...getCustomTasks()];
  return all.map(task => ({
    ...task,
    status: state.submissions[task.id] ? 'submitted' : task.status,
    submission: state.submissions[task.id]
  })).filter(task => (status === 'all' || task.status === status) && (track === 'all' || task.track === track));
}

export function toggleLesson(state, index, completed) {
  const allL = getAllLessons();
  if (!Number.isInteger(index) || index < 0 || index >= allL.length) return state;
  const values = new Set(state.completedLessons);
  completed ? values.add(index) : values.delete(index);
  return { ...state, completedLessons: [...values].sort((a, b) => a - b) };
}
