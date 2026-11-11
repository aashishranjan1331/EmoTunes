import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Music2, Headphones, Heart, ArrowRight, Mail, LockKeyhole, Eye, EyeOff, Menu, X, Github, Linkedin, User, ChevronUp, ChevronDown, Home, History, LogOut, Smile, Flame, CalendarDays, ListX, Sun, Moon } from 'lucide-react';
import './style.css';
import './history.css';
import './welcome.css';
import './profile.css';
import './theme.css';
import aashishPhoto from './photo/aashish.jpeg';
import yashwantPhoto from './photo/yashwant.jpeg';
import dikshitPhoto from './photo/dikshit.jpeg';

const EMOTION_COLORS = {
  happy: '#facc15', sad: '#60a5fa', angry: '#ef4444', fear: '#a78bfa',
  surprise: '#fb923c', disgust: '#84cc16', neutral: '#94a3b8',
};

const EMOTION_EMOJI = {
  happy: '😄', sad: '😢', angry: '😠', fear: '😨',
  surprise: '😮', disgust: '🤢', neutral: '😐',
};

const developers = [
  { name: 'Aashish Ranjan', role: 'Front-End Web Developer', photo: aashishPhoto },
  { name: 'Yashwant Singh', role: 'Front-End Web Developer', photo: yashwantPhoto },
  { name: 'Dikshit Goyal', role: 'Back-End Web Developer', photo: dikshitPhoto },
];

function App() {
  const resetToken = new URLSearchParams(window.location.search).get('reset') || '';
  const [page, setPage] = useState(resetToken ? 'reset' : 'home');
  const [noticeOk, setNoticeOk] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [emotionResult, setEmotionResult] = useState(null);
  const [musicMode, setMusicMode] = useState('match');
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [cameraOn, setCameraOn] = useState(true);
  const [snapshot, setSnapshot] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const accountRef = useRef(null);
  const [theme, setTheme] = useState(() => {
    try { const saved = localStorage.getItem('emotunesTheme'); if (saved === 'light' || saved === 'dark') return saved; } catch { /* ignore */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('emotunesTheme', theme); } catch { /* ignore */ }
  }, [theme]);
  const themeBtn = (
    <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
      {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
    </button>
  );
const navigate = (next, { replace = false } = {}) => {
  if (next === 'player') { setCameraOn(true); setSnapshot(''); }
  setPage(next); setNotice(''); setNoticeOk(false); setMobileMenu(false); setAccountOpen(false);
  const url = `${window.location.pathname}${next === 'reset' ? window.location.search : ''}#/${next}`;
  if (window.location.hash !== `#/${next}`) {
    window.history[replace ? 'replaceState' : 'pushState']({ page: next }, '', url);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
               };
  const savedUser = (() => { try { return JSON.parse(localStorage.getItem('emotunesUser') || 'null'); } catch { return null; } })();
  const loggedIn = Boolean(localStorage.getItem('emotunesToken'));
  const firstName = savedUser?.name ? savedUser.name.split(' ')[0] : '';
  // Close the account dropdown when clicking outside it or pressing Escape
  useEffect(() => {
    if (!accountOpen) return undefined;
    const onClick = (e) => { if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setAccountOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [accountOpen]);

  useEffect(() => {
    if (page !== 'player' || !cameraOn || !localStorage.getItem('emotunesToken')) return undefined;
    let stream;
    let cancelled = false;
    const startCamera = async () => {
      try {
        setCameraError('');
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not supported. Use localhost or HTTPS.');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      } catch (error) { setCameraError(error.message || 'Could not access webcam. Check browser permissions.'); }
    };
    startCamera();
    return () => { cancelled = true; if (stream) stream.getTracks().forEach((track) => track.stop()); };
  }, [page, cameraOn]);

  const logout = () => {
    localStorage.removeItem('emotunesToken');
    localStorage.removeItem('emotunesUser');
    setEmotionResult(null);
    setCameraError('');
    navigate('home');
  };

  const authApi = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
  const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('emotunesToken')}` });

  // Save detected emotion after successful analysis (failure never blocks the player)
  const saveMood = async (data) => {
    try {
      const response = await fetch(`${authApi}/api/moods`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          emotion: String(data.emotion || '').toLowerCase(),
          query: data.query || '',
          mode: musicMode,
          source: data.source || 'Deezer',
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Failed to save mood');
      return result;
    } catch (error) {
      console.error('Mood saving error:', error.message);
      setCameraError(`Mood not saved to history: ${error.message}`);
      return null;
    }
  };

  // Load the last 7 days for the "Your week in moods" page
  const loadHistory = async () => {
    setHistoryLoading(true); setHistoryError('');
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const response = await fetch(`${authApi}/api/moods/week?tz=${encodeURIComponent(tz)}`, { headers: authHeaders() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not load your mood history.');
      setHistory(data);
    } catch (error) {
      setHistoryError(error.message || 'Cannot connect to the server. Make sure the backend is running.');
    } finally { setHistoryLoading(false); }
  };

  useEffect(() => {
    if (page === 'profile' && localStorage.getItem('emotunesToken')) loadHistory();
  }, [page]);

  // Delete one mood from the history
  const deleteMood = async (id) => {
    try {
      const response = await fetch(`${authApi}/api/moods/${id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not delete this mood.');
      await loadHistory();
    } catch (error) { setHistoryError(error.message); }
  };

  // Clear the whole mood history
  const clearHistory = async () => {
    if (!window.confirm('Delete your entire mood history? This cannot be undone.')) return;
    try {
      const response = await fetch(`${authApi}/api/moods`, { method: 'DELETE', headers: authHeaders() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not clear your history.');
      await loadHistory();
    } catch (error) { setHistoryError(error.message); }
  };

  // Turn the camera back on for another scan
  const restartCamera = () => { setSnapshot(''); setEmotionResult(null); setCameraError(''); setCameraOn(true); };

  const analyzeCurrentMood = async () => {
    if (!localStorage.getItem('emotunesToken')) { navigate('login'); return; }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setCameraError('Camera is not ready yet. Allow camera access and try again.'); return;
    }
    setAnalyzing(true); setCameraError(''); setEmotionResult(null);
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/jpeg', 0.85);
    try {
      const emotionApi = (import.meta.env.VITE_EMOTION_API_URL || 'http://localhost:5001').replace(/\/$/, '');
      const response = await fetch(`${emotionApi}/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, mode: musicMode }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not analyze your emotion. Please try again.');
      setEmotionResult(data);
      setSnapshot(image);   // keep the captured frame on screen
      setCameraOn(false);   // detection done: stop the camera
      await saveMood(data);
    } catch (error) {
      setCameraError(error.message || 'Cannot connect to Flask. Make sure app.py is running.');
    } finally { setAnalyzing(false); }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setNotice(''); setNoticeOk(false);
    const email = String(new FormData(e.currentTarget).get('email') || '').trim();
    try {
      const response = await fetch(`${authApi}/api/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not send the reset link. Please try again.');
      setNoticeOk(true);
      setNotice(data.message || 'If that email is registered, a reset link has been sent.');
    } catch (error) {
      setNotice(error.message || 'Cannot connect to the server. Make sure the backend is running.');
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setNotice(''); setNoticeOk(false);
    const form = new FormData(e.currentTarget);
    const password = String(form.get('password') || '');
    if (password.length < 8) { setNotice('Password must be at least 8 characters long.'); return; }
    if (password !== form.get('confirmPassword')) { setNotice('Passwords do not match. Please try again.'); return; }
    try {
      const response = await fetch(`${authApi}/api/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: resetToken, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'This reset link is invalid or has expired.');
      window.history.replaceState({}, '', window.location.pathname);
      navigate('login');
      setNoticeOk(true);
      setNotice('Password updated! Please log in with your new password.');
    } catch (error) {
      setNotice(error.message || 'Cannot connect to the server. Make sure the backend is running.');
    }
  };

  const handleAuth = async (e, type) => {
    e.preventDefault();
    setNotice('');
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');

    if (type === 'signup' && name.length < 2) {
      setNotice('Please enter your name (at least 2 characters).');
      return;
    }
    if (type === 'signup' && password !== form.get('confirmPassword')) {
      setNotice('Passwords do not match. Please try again.');
      return;
    }
    if (type === 'signup' && password.length < 8) {
      setNotice('Password must be at least 8 characters long.');
      return;
    }

    try {
      const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
      const response = await fetch(`${apiBase}/api/auth/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type === 'signup' ? { name, email, password } : { email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to authenticate. Please try again.');

      localStorage.setItem('emotunesToken', data.token);
      localStorage.setItem('emotunesUser', JSON.stringify(data.user));
      setNotice(type === 'login' ? 'Login successful! Welcome back.' : 'Account created successfully! You are now signed in.');
      formElement.reset();
      if (type === 'signup') setSignupModalOpen(false);
      setEmotionResult(null);
      navigate('welcome');
    } catch (error) {
      setNotice(error.message || 'Cannot connect to the server. Make sure the backend is running.');
    }
  };

  // Footer link button (highlights the current page)
  const footLink = (id, label) => (
    <button key={id} className={page === id ? 'footer-link active' : 'footer-link'} onClick={() => navigate(id)}>{label}</button>
  );

  return <div className="site-shell">
    <header className="topbar">
      <button className="brand" onClick={() => navigate('home')} aria-label="EmoTunes home"><span className="brand-icon"><Music2 size={20}/></span>EmoTunes</button>
      {!loggedIn && themeBtn}
      {loggedIn && <>
        <button className="menu-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation">{mobileMenu ? <X/> : <Menu/>}</button>
        <nav className={mobileMenu ? 'nav-links open' : 'nav-links'}>
          <button className={page === 'welcome' ? 'nav-link active' : 'nav-link'} onClick={() => navigate('welcome')}><Home size={16}/> Home</button>
          <button className={page === 'player' ? 'nav-link active' : 'nav-link'} onClick={() => navigate('player')}><Headphones size={16}/> Mood Player</button>
          <div className="account-menu" ref={accountRef}>
            <button className={accountOpen || page === 'profile' ? 'account-btn open' : 'account-btn'} onClick={() => setAccountOpen(!accountOpen)} aria-haspopup="menu" aria-expanded={accountOpen}>
              <User size={16}/> {firstName || 'Account'} <ChevronDown size={15} className="account-chevron"/>
            </button>
            {accountOpen && <div className="account-dropdown" role="menu">
              <div className="account-info"><b>{savedUser?.name || 'Account'}</b><small>{savedUser?.email || ''}</small></div>
              <button role="menuitem" onClick={() => navigate('profile')}><User size={16}/> Profile</button>
              <button role="menuitem" onClick={() => navigate('profile')}><History size={16}/> My Mood History</button>
              <button role="menuitem" className="danger" onClick={logout}><LogOut size={16}/> Log out</button>
            </div>}
          </div>
          {themeBtn}
        </nav>
      </>}
    </header>

    {page === 'home' && <main className="hero gradient-panel">
      <div className="hero-copy">
        <span className="eyebrow"><span className="pulse-dot"/> MUSIC THAT GETS YOU</span>
        <h1>Your mood.<br/><span>Your music.</span></h1>
        <p className="hero-description">Meet <strong>EmoTunes</strong> — a music experience that understands how you feel. Discover songs that match your emotions and make every moment sound better.</p>
        <div className="hero-actions"><button className="button button-dark" onClick={() => navigate(loggedIn ? 'welcome' : 'login')}>Get started <ArrowRight size={18}/></button><button className="button button-glass" onClick={() => navigate('about')}>Explore the project</button></div>
        <div className="hero-stats"><div><strong>6+</strong><span>moods to explore</span></div><div><strong>1</strong><span>personal soundtrack</span></div><div><strong>∞</strong><span>ways to feel</span></div></div>
      </div>
      <div className="hero-art" aria-label="Music player illustration"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="music-disc"><div className="disc-center"><Headphones size={50}/></div></div><div className="floating-note note-one">♫</div><div className="floating-note note-two">♪</div><div className="mood-chip mood-happy"><span>☀️</span><div><b>Feeling happy?</b><small>Play something bright</small></div></div><div className="mood-chip mood-calm"><span>🌙</span><div><b>Need a moment?</b><small>Find your calm</small></div></div><div className="mini-player"><div className="album-art"><Heart size={22} fill="currentColor"/></div><div className="track-info"><b>Your mood mix</b><small>A soundtrack for you</small><div className="sound-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div><span className="play-button">▶</span></div></div>
      <div className="hero-bottom"><span>MADE FOR EVERY MOOD</span><span className="bottom-line"/><span>FEEL IT. PLAY IT.</span></div>
    </main>}

    {page === 'developers' && <main className="content-panel gradient-panel developers-page"><div className="section-heading"><span className="eyebrow">THE PEOPLE BEHIND THE PLAYLIST</span><h1>Meet our <span>developers.</span></h1><p>A team bringing emotion and technology together, one track at a time.</p></div><div className="developer-grid">{developers.map((person, i) => <article className="developer-card" key={person.name}><div className="developer-number">0{i+1}</div><img src={person.photo} alt={`${person.name} profile`} className="developer-photo"/><h2>{person.name}</h2><p>{person.role}</p><div className="social-links"><button aria-label="GitHub profile"><Github size={17}/></button><button aria-label="LinkedIn profile"><Linkedin size={17}/></button></div></article>)}</div></main>}

    {page === 'about' && <main className="content-panel gradient-panel about-page"><div className="about-heading"><span className="eyebrow">A LITTLE ABOUT US</span><h1>Music meets <span>emotion.</span></h1><p>Because the right song can change the way a moment feels.</p></div><article className="about-card"><div className="about-icon"><Headphones size={32}/></div><div><h2>Emotion Based Music Player</h2><p>EmoTunes is designed to make music discovery feel more personal. Instead of manually searching through playlists, users can explore music that reflects their current mood.</p><p>Using facial-expression emotion recognition, the project aims to identify a user's emotional state and suggest suitable music. Whether you're feeling joyful, relaxed, sad, surprised, or thoughtful, EmoTunes helps you find a soundtrack for the moment.</p><p>Our goal is to bring together technology and music to create a simple, engaging, and mood-aware listening experience.</p></div></article><div className="feature-row"><div><span>01</span><b>Detect emotion</b><small>Read facial expressions with care.</small></div><div><span>02</span><b>Find your vibe</b><small>Match a mood with a music category.</small></div><div><span>03</span><b>Press play</b><small>Explore music that fits the moment.</small></div></div></main>}


{page === 'contact' && (
  <main className="content-panel gradient-panel contact-page">
    <div className="section-heading">
      <span className="eyebrow">LET'S TALK MUSIC</span>
      <h1>Get in <span>touch.</span></h1>
      <p>Have a question or idea for EmoTunes? Send us a message.</p>
    </div>

    
<form
  className="contact-card"
  onSubmit={async (e) => {
    e.preventDefault();

    const formElement = e.currentTarget;

    setNotice('');
    setNoticeOk(false);

    const form = new FormData(formElement);

    const contactData = {
      yourName: form.get('yourName').trim(),
      yourEmail: form.get('yourEmail').trim(),
      message: form.get('message').trim()
    };

    try {
      const response = await fetch(
        `${authApi}/api/contact/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(contactData)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message');
      }

      setNoticeOk(true);
      setNotice('Thank you! Your message has been sent successfully.');

      formElement.reset();

    } catch (error) {
      console.error('Contact form error:', error);
      setNoticeOk(false);
      setNotice(error.message || 'Unable to connect to server.');
    }
  }}
>


      <label>
        Your name
        <input
          name="yourName"
          type="text"
          placeholder="Enter your name"
          required
        />
      </label>

      <label>
        Email address
        <input
          name="yourEmail"
          type="email"
          placeholder="you@example.com"
          required
        />
      </label>

      <label>
        Message
        <textarea
          name="message"
          rows="4"
          placeholder="Write your message..."
          required
        />
      </label>

      <button className="button button-green" type="submit">
        Send message <ArrowRight size={17} />
      </button>

      {notice && (
        <p className={noticeOk ? 'form-notice success' : 'form-notice'}>
          {notice}
        </p>
      )}

    </form>
  </main>
)}

    {(page === 'login' || page === 'signup') && <main className="auth-stage"><div className="auth-decoration decor-one"/><div className="auth-decoration decor-two"/><section className="auth-card"><button className="auth-brand" onClick={() => navigate('home')}><span className="brand-icon"><Music2 size={19}/></span>EmoTunes</button><div className="auth-heading"><h1>{page === 'login' ? 'Welcome back' : 'Create account'}</h1><p>{page === 'login' ? 'Your next favorite song is waiting.' : 'Start your own mood soundtrack.'}</p></div><form onSubmit={(e) => handleAuth(e, page)}>
      {page === 'signup' && <label className="input-wrap"><User size={18}/><input name="name" type="text" placeholder="Enter your full name" autoComplete="name" minLength="2" required/></label>}
      <label className="input-wrap"><Mail size={18}/><input name="email" type="email" placeholder="Enter your email" required/></label>
      <label className="input-wrap"><LockKeyhole size={18}/><input name="password" type={showPassword ? 'text' : 'password'} placeholder={page === 'login' ? 'Enter your password' : 'Create a password'} minLength="8" required/><button type="button" className="show-password" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></label>
      {page === 'signup' && <label className="input-wrap"><LockKeyhole size={18}/><input name="confirmPassword" type="password" placeholder="Confirm your password" minLength="8" required/></label>}
      {page === 'login' && <button type="button" className="forgot-link" onClick={() => navigate('forgot')}>Forgot password?</button>}
      <button className="button button-green auth-submit" type="submit">{page === 'login' ? 'Login' : 'Sign up'} <ArrowRight size={17}/></button>
      {notice && <p className={noticeOk ? 'form-notice success' : 'form-notice'}>{notice}</p>}
    </form><p className="auth-switch">{page === 'login' ? "Don't have an account?" : 'Already have an account?'} <button type="button" onClick={() => page === 'login' ? (setNotice(''), setSignupModalOpen(true)) : navigate('login')}>{page === 'login' ? 'Sign up' : 'Login'}</button></p></section><div className="auth-caption"><span>♫</span> Let your feelings find their rhythm.</div></main>}

    {(page === 'forgot' || page === 'reset') && <main className="auth-stage"><div className="auth-decoration decor-one"/><div className="auth-decoration decor-two"/><section className="auth-card"><button className="auth-brand" onClick={() => navigate('home')}><span className="brand-icon"><Music2 size={19}/></span>EmoTunes</button><div className="auth-heading"><h1>{page === 'forgot' ? 'Forgot password?' : 'Set a new password'}</h1><p>{page === 'forgot' ? "Enter your email and we'll send you a reset link." : 'Choose a new password for your account.'}</p></div>
      {page === 'forgot'
        ? <form onSubmit={handleForgot}>
            <label className="input-wrap"><Mail size={18}/><input name="email" type="email" placeholder="Enter your email" autoComplete="email" required/></label>
            <button className="button button-green auth-submit" type="submit">Send reset link <ArrowRight size={17}/></button>
            {notice && <p className={noticeOk ? 'form-notice success' : 'form-notice'} role="status">{notice}</p>}
          </form>
        : <form onSubmit={handleReset}>
            <label className="input-wrap"><LockKeyhole size={18}/><input name="password" type={showPassword ? 'text' : 'password'} placeholder="New password (8+ characters)" autoComplete="new-password" minLength="8" required/><button type="button" className="show-password" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></label>
            <label className="input-wrap"><LockKeyhole size={18}/><input name="confirmPassword" type="password" placeholder="Confirm new password" autoComplete="new-password" minLength="8" required/></label>
            <button className="button button-green auth-submit" type="submit">Update password <ArrowRight size={17}/></button>
            {notice && <p className={noticeOk ? 'form-notice success' : 'form-notice'} role="alert">{notice}</p>}
          </form>}
      <p className="auth-switch">Remembered it? <button type="button" onClick={() => navigate('login')}>Back to login</button></p>
    </section><div className="auth-caption"><span>♫</span> Let your feelings find their rhythm.</div></main>}

    {page === 'login' && signupModalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setSignupModalOpen(false); }}><section className="signup-modal" role="dialog" aria-modal="true" aria-labelledby="signup-modal-title"><button className="modal-close" type="button" onClick={() => { setSignupModalOpen(false); setNotice(''); }} aria-label="Close sign up"><X size={20}/></button><div className="auth-heading"><span className="eyebrow">JOIN EMOTUNES</span><h1 id="signup-modal-title">Create account</h1><p>Start your own mood soundtrack.</p></div><form onSubmit={(e) => handleAuth(e, 'signup')}><label className="input-wrap"><User size={18}/><input name="name" type="text" placeholder="Enter your full name" autoComplete="name" minLength="2" required/></label><label className="input-wrap"><Mail size={18}/><input name="email" type="email" placeholder="Enter your email" autoComplete="email" required/></label><label className="input-wrap"><LockKeyhole size={18}/><input name="password" type={showPassword ? 'text' : 'password'} placeholder="Create a password (8+ characters)" autoComplete="new-password" minLength="8" required/><button type="button" className="show-password" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></label><label className="input-wrap"><LockKeyhole size={18}/><input name="confirmPassword" type="password" placeholder="Confirm your password" autoComplete="new-password" minLength="8" required/></label><button className="button button-green auth-submit" type="submit">Create account <ArrowRight size={17}/></button>{notice && <p className="form-notice" role="status">{notice}</p>}</form><p className="auth-switch">Already have an account? <button type="button" onClick={() => { setSignupModalOpen(false); setNotice(''); }}>Login</button></p></section></div>}

    {page === 'profile' && <main className="content-panel gradient-panel profile-page">
      {!loggedIn ? <section className="player-message"><h2>Please log in first</h2><p>Sign in to see your profile and mood history.</p><button className="button button-green" onClick={() => navigate('login')}>Go to login <ArrowRight size={17}/></button></section>
      : <>
        <section className="profile-hero">
          <div className="profile-avatar-lg">{(savedUser?.name || savedUser?.email || 'U').charAt(0).toUpperCase()}</div>
          <div className="profile-hero-copy">
            <span className="eyebrow">YOUR PROFILE</span>
            <h1>Welcome, {savedUser?.name || savedUser?.email || 'friend'}!</h1>
            <p>Your moods, your music, your history - all in one place.</p>
          </div>
          <div className="profile-stats">
            <div className="stat-card"><i className="stat-icon stat-a"><Smile size={22}/></i><div><b>{history?.total ?? 0}</b><small>Mood detections</small></div></div>
            <div className="stat-card"><i className="stat-icon stat-b"><Flame size={22}/></i><div><b>{history?.topEmotion && history.topEmotion !== 'None' ? history.topEmotion : '—'}</b><small>Most felt mood</small></div></div>
            <div className="stat-card"><i className="stat-icon stat-c"><CalendarDays size={22}/></i><div><b>{history?.days ? history.days.filter((d) => d.total > 0).length : 0}</b><small>Active days</small></div></div>
          </div>
        </section>

        <section className="history-panel">
          <div className="history-panel-head">
            <div className="history-panel-title">
              <span className="history-panel-icon"><Smile size={22}/></span>
              <div><h2>Your mood history</h2><p>Every emotion you detect in the last 7 days.</p></div>
            </div>
            {history && history.total > 0 && <button className="clear-all" onClick={clearHistory}><ListX size={16}/> Clear all</button>}
          </div>

          {historyLoading ? <p className="history-status">Loading your moods…</p>
          : historyError ? <p className="form-notice" role="alert">{historyError}</p>
          : !history || history.total === 0 ? <div className="history-empty"><p>No moods yet. Detect your emotion on the player and it will show up here.</p><button className="button button-green" onClick={() => navigate('player')}>Detect my mood <ArrowRight size={17}/></button></div>
          : <>
            <div className="mood-chips">{Object.entries(history.totals).sort((a, b) => b[1] - a[1]).map(([emotion, count]) => <span className="mood-chip-pill" key={emotion} style={{ borderColor: EMOTION_COLORS[emotion] || '#94a3b8' }}><span>{EMOTION_EMOJI[emotion] || '🎵'}</span><b>{emotion}</b><small>×{count}</small></span>)}</div>

            <div className="week-chart">{history.days.map((day) => <div className="week-col" key={day.date}>
              <div className="week-bar">{Object.entries(day.counts).map(([emotion, count]) => <span key={emotion} className="week-seg" title={`${emotion}: ${count}`} style={{ height: `${(count / history.maxDay) * 100}%`, background: EMOTION_COLORS[emotion] || '#94a3b8' }}/>)}</div>
              <b>{day.total || ''}</b><small>{day.label}</small>
            </div>)}</div>

            <h3 className="recent-heading">Recent detections</h3>
            <ul className="recent-list">{history.recent.map((item) => <li className="recent-item" key={item.id}>
              <i className="legend-dot" style={{ background: EMOTION_COLORS[item.emotion] || '#94a3b8' }}/>
              <strong>{item.emotion}</strong>
              <span>{item.query ? `“${item.query}”` : ''}</span>
              <span className="recent-time">{new Date(item.createdAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              <button className="recent-del" aria-label={`Delete ${item.emotion} mood`} onClick={() => deleteMood(item.id)}><X size={14}/></button>
            </li>)}</ul>
          </>}
        </section>

        <div className="player-footer-actions">
          <button className="button button-green profile-cta" onClick={() => navigate('player')}>Detect my mood <ArrowRight size={17}/></button>
          <button className="button button-dark" onClick={logout}>Log out</button>
        </div>
      </>}
    </main>}

    {page === 'welcome' && <main className="content-panel gradient-panel welcome-page">
      {!loggedIn ? <section className="player-message"><h2>Please log in first</h2><p>Sign in to start your mood soundtrack.</p><button className="button button-green" onClick={() => navigate('login')}>Go to login <ArrowRight size={17}/></button></section>
      : <section className="welcome-card">
        <div className="welcome-icon"><Headphones size={34}/></div>
        <span className="eyebrow">YOU'RE IN</span>
        <h1>Welcome, <span>{savedUser?.name || 'friend'}!</span></h1>
        <p>Ready for music that matches your mood? Press start and allow camera access. We scan your expression once, pick your soundtrack, and then switch the camera off.</p>
        <div className="welcome-actions">
          <button className="button button-green" onClick={() => navigate('player')}>Start emotion based music player <ArrowRight size={17}/></button>
          <button className="button button-glass" onClick={() => navigate('profile')}><User size={16}/> My profile</button>
        </div>
      </section>}
    </main>}

    {page === 'player' && <main className="content-panel gradient-panel mood-player-page">
      <div className="section-heading"><span className="eyebrow">YOUR PERSONAL MOOD SOUNDTRACK</span><h1>How are you <span>feeling{firstName ? `, ${firstName}` : ''}?</span></h1><p>Allow camera access, capture a frame, and get music recommendations based on your expression.</p></div>
      {!localStorage.getItem('emotunesToken') ? <section className="player-message"><h2>Please log in first</h2><p>Your music experience is available after you sign in.</p><button className="button button-green" onClick={() => navigate('login')}>Go to login <ArrowRight size={17}/></button></section> : <div className="mood-player-layout">
        <section className="camera-card"><div className="camera-frame"><video ref={videoRef} autoPlay muted playsInline aria-label="Webcam preview" style={cameraOn ? undefined : { display: 'none' }}/>{!cameraOn && snapshot && <img src={snapshot} alt="Captured frame" className="camera-snapshot"/>}<canvas ref={canvasRef} className="hidden-canvas"/><span className="camera-live"><i/> {cameraOn ? 'CAMERA PREVIEW' : 'CAMERA OFF'}</span></div>
          <label className="mode-label">Music recommendation mode<select value={musicMode} onChange={(e) => setMusicMode(e.target.value)}><option value="match">Match my current mood</option><option value="lift">Lift my mood</option></select></label>
          <button className="button button-green analyze-button" onClick={cameraOn ? analyzeCurrentMood : restartCamera} disabled={analyzing}>{analyzing ? 'Analyzing your mood…' : cameraOn ? 'Detect emotion & find music' : 'Scan again (turn camera on)'} <ArrowRight size={17}/></button>
          {cameraError && <p className="form-notice" role="alert">{cameraError}</p>}<p className="privacy-note">Your webcam frame is sent to the Flask emotion service for analysis. This app does not save the image.</p>
        </section>
        <section className="tracks-panel">{!emotionResult ? <div className="empty-tracks"><div className="empty-note">♫</div><h2>Your mood mix awaits</h2><p>Your detected emotion and recommended tracks will appear here.</p></div> : <>
          <div className="result-heading"><span className="eyebrow">YOUR RESULT · {emotionResult.source}</span><h2>Feeling <span>{emotionResult.emotion}</span></h2><p>Search: “{emotionResult.query}”</p></div>
          <div className="track-list">{emotionResult.tracks.map((track) => <article className="track-card" key={`${emotionResult.source}-${track.id}`}>{track.image ? <img src={track.image} alt="" className="track-image"/> : <div className="track-image track-placeholder">♫</div>}<div className="track-copy"><strong>{track.name}</strong><span>{track.artists}</span>{track.preview && <audio controls preload="none" src={track.preview}>Your browser does not support audio playback.</audio>}</div>{track.url && <a className="track-open" href={track.url} target="_blank" rel="noreferrer">Open ↗</a>}</article>)}</div>
          <button className="button button-dark" onClick={cameraOn ? analyzeCurrentMood : restartCamera} disabled={analyzing}>{analyzing ? 'Finding tracks…' : cameraOn ? 'Analyze again' : 'Scan again'} <ArrowRight size={17}/></button>
        </>}</section>
      </div>}
      <div className="player-footer-actions"><button className="button button-glass" onClick={() => navigate('home')}>Back to home</button><button className="button button-glass" onClick={() => navigate('profile')}>My mood history</button><button className="button button-dark" onClick={logout}>Log out</button></div>
    </main>}

    <footer className="footer">
      <div className="footer-top">
        <div>
          <button className="footer-brand" onClick={() => navigate('home')}><Music2 size={22}/> EmoTunes</button>
          <p className="footer-tagline">Music that matches your mood, from a single expression.</p>
        </div>
        <button className="footer-top-btn" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><ChevronUp size={18}/></button>
      </div>

      <div className="footer-cols">
        <div className="footer-col">
          <h3>Product</h3>
          {footLink('home', 'Home')}
          {footLink('player', 'Mood Player')}
          {footLink('profile', 'My Moods')}
          {footLink('about', 'About the Project')}
        </div>
        <div className="footer-col">
          <h3>Account</h3>
          {loggedIn
            ? <><button className="footer-link" onClick={() => navigate('welcome')}>Dashboard</button><button className="footer-link" onClick={logout}>Log out</button></>
            : <>{footLink('login', 'Login')}{footLink('signup', 'Sign Up')}</>}
        </div>
        <div className="footer-col">
          <h3>Company</h3>
          {footLink('developers', 'About Us')}
          {footLink('contact', 'Contact')}
        </div>
        <div className="footer-col">
          <h3>Connect</h3>
          <div className="footer-social">
            <a href="https://github.com/" target="_blank" rel="noreferrer" aria-label="GitHub"><Github size={18}/></a>
            <a href="https://linkedin.com/" target="_blank" rel="noreferrer" aria-label="LinkedIn"><Linkedin size={18}/></a>
            <a href="mailto:you@example.com" aria-label="Email"><Mail size={18}/></a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 EmoTunes. All rights reserved.</span>
        <span>Made with <Heart size={12} fill="currentColor"/> by the EmoTunes team</span>
      </div>
    </footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
