export const STORAGE_KEY = 'gdgoc-learn:v1';
export const routes = ['dashboard', 'tracks', 'sessions', 'tasks', 'xp', 'certificate'];

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
  { title: 'Mini Practice', heading: 'Build your first introduction', time: 12, text: 'Bring everything together. Write a heading with your name, add a short introduction, and include a link to something you’ve made.', code: '<main>\n  <h1>Hi, I’m Ahmed 👋</h1>\n  <p>I’m learning to build for the web.</p>\n  <a href="https://github.com">My projects</a>\n</main>', after: 'Ready for a bigger challenge? Open Tasks and start building your portfolio landing page.' },
];

export const tracks = [
  { name: 'Web Development', slug: 'web-development', description: 'Build for the web, one line at a time.', tag: 'Your active track', sessions: 8, progress: 38, color: 'blue' },
  { name: 'Software Engineering', slug: 'software-engineering', description: 'Turn good ideas into reliable software.', tag: 'Keep exploring', sessions: 6, progress: 17, color: 'purple' },
  { name: 'Artificial Intelligence', slug: 'artificial-intelligence', description: 'Explore the possibilities of intelligent systems.', tag: 'Explore a new skill', sessions: 8, progress: 0, color: 'green' },
  { name: 'Data Science', slug: 'data-science', description: 'Find the stories hidden in your data.', tag: 'Explore a new skill', sessions: 6, progress: 0, color: 'yellow' },
  { name: 'Cybersecurity', slug: 'cybersecurity', description: 'Learn to build a safer digital world.', tag: 'Explore a new skill', sessions: 6, progress: 0, color: 'red' },
];

export function initialState() {
  return { completedLessons: [0, 1, 2], selectedLesson: 2, submissions: {}, joinedTracks: ['web-development', 'software-engineering'] };
}

export function loadState(storage) {
  const state = initialState();
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
  return { attendance: 240, activity, tasks: 220, xp: 460 + activity, percent: Math.round((460 + activity) / 10), lessons: state.completedLessons.length };
}

export function getTasks(state, status = 'all', track = 'all') {
  return tasks.map(task => ({ ...task, status: state.submissions[task.id] ? 'submitted' : task.status, submission: state.submissions[task.id] })).filter(task => (status === 'all' || task.status === status) && (track === 'all' || task.track === track));
}

export function toggleLesson(state, index, completed) {
  if (!Number.isInteger(index) || index < 0 || index >= lessons.length) return state;
  const values = new Set(state.completedLessons);
  completed ? values.add(index) : values.delete(index);
  return { ...state, completedLessons: [...values].sort((a, b) => a - b) };
}
