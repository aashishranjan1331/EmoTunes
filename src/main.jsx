import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Music2, Headphones, Heart, ArrowRight, Mail, LockKeyhole, Eye, EyeOff, Menu, X, Github, Linkedin } from 'lucide-react';
import './style.css';

const developers = [
  { name: 'Karina Vaishali Mehta', role: 'Front-End Web Developer', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' },
  { name: 'Krisha Sunilkumar Patel', role: 'Front-End Web Developer', photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80' },
  { name: 'Seliy SudhirKumar Mitra', role: 'Back-End Web Developer', photo: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=400&q=80' },
  { name: 'Vishva Pankajkumar Patel', role: 'Back-End Web Developer', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80' },
];

function App() {
  const [page, setPage] = useState('home');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [emotionResult, setEmotionResult] = useState(null);
  const [musicMode, setMusicMode] = useState('match');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = (next) => { setPage(next); setNotice(''); setMobileMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const navItems = [['home','Home'], ['developers','About Us'], ['contact','Contact'], ['login','Login'], ['signup','Sign Up']];

  useEffect(() => {
    if (page !== 'player' || !localStorage.getItem('emotunesToken')) return undefined;
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
  }, [page]);

  const logout = () => {
    localStorage.removeItem('emotunesToken');
    localStorage.removeItem('emotunesUser');
    setEmotionResult(null);
    setCameraError('');
    navigate('home');
  };

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
    } catch (error) {
      setCameraError(error.message || 'Cannot connect to Flask. Make sure app.py is running.');
    } finally { setAnalyzing(false); }
  };

  const handleAuth = async (e, type) => {
    e.preventDefault();
    setNotice('');
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');

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
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to authenticate. Please try again.');

      localStorage.setItem('emotunesToken', data.token);
      localStorage.setItem('emotunesUser', JSON.stringify(data.user));
      setNotice(type === 'login' ? 'Login successful! Welcome back.' : 'Account created successfully! You are now signed in.');
      formElement.reset();
      if (type === 'signup') setSignupModalOpen(false);
      setEmotionResult(null);
      navigate('player');
    } catch (error) {
      setNotice(error.message || 'Cannot connect to the server. Make sure the backend is running.');
    }
  };

  return <div className="site-shell">
    <header className="topbar">
      <button className="brand" onClick={() => navigate('home')} aria-label="EmoTunes home"><span className="brand-icon"><Music2 size={20}/></span>EmoTunes</button>
      <button className="menu-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation">{mobileMenu ? <X/> : <Menu/>}</button>
      <nav className={mobileMenu ? 'nav-links open' : 'nav-links'}>
        {navItems.map(([id, label]) => <button key={id} className={page === id ? 'nav-link active' : 'nav-link'} onClick={() => navigate(id)}>{label}</button>)}
      </nav>
    </header>

    {page === 'home' && <main className="hero gradient-panel">
      <div className="hero-copy">
        <span className="eyebrow"><span className="pulse-dot"/> MUSIC THAT GETS YOU</span>
        <h1>Your mood.<br/><span>Your music.</span></h1>
        <p className="hero-description">Meet <strong>EmoTunes</strong> — a music experience that understands how you feel. Discover songs that match your emotions and make every moment sound better.</p>
        <div className="hero-actions"><button className="button button-dark" onClick={() => navigate('login')}>Get started <ArrowRight size={18}/></button><button className="button button-glass" onClick={() => navigate('about')}>Explore the project</button></div>
        <div className="hero-stats"><div><strong>6+</strong><span>moods to explore</span></div><div><strong>1</strong><span>personal soundtrack</span></div><div><strong>∞</strong><span>ways to feel</span></div></div>
      </div>
      <div className="hero-art" aria-label="Music player illustration"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="music-disc"><div className="disc-center"><Headphones size={50}/></div></div><div className="floating-note note-one">♫</div><div className="floating-note note-two">♪</div><div className="mood-chip mood-happy"><span>☀️</span><div><b>Feeling happy?</b><small>Play something bright</small></div></div><div className="mood-chip mood-calm"><span>🌙</span><div><b>Need a moment?</b><small>Find your calm</small></div></div><div className="mini-player"><div className="album-art"><Heart size={22} fill="currentColor"/></div><div className="track-info"><b>Your mood mix</b><small>A soundtrack for you</small><div className="sound-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div><span className="play-button">▶</span></div></div>
      <div className="hero-bottom"><span>MADE FOR EVERY MOOD</span><span className="bottom-line"/><span>FEEL IT. PLAY IT.</span></div>
    </main>}

    {page === 'developers' && <main className="content-panel gradient-panel developers-page"><div className="section-heading"><span className="eyebrow">THE PEOPLE BEHIND THE PLAYLIST</span><h1>Meet our <span>developers.</span></h1><p>A team bringing emotion and technology together, one track at a time.</p></div><div className="developer-grid">{developers.map((person, i) => <article className="developer-card" key={person.name}><div className="developer-number">0{i+1}</div><img src={person.photo} alt={`${person.name} profile`} className="developer-photo"/><h2>{person.name}</h2><p>{person.role}</p><div className="social-links"><button aria-label="GitHub profile"><Github size={17}/></button><button aria-label="LinkedIn profile"><Linkedin size={17}/></button></div></article>)}</div></main>}

    {page === 'about' && <main className="content-panel gradient-panel about-page"><div className="about-heading"><span className="eyebrow">A LITTLE ABOUT US</span><h1>Music meets <span>emotion.</span></h1><p>Because the right song can change the way a moment feels.</p></div><article className="about-card"><div className="about-icon"><Headphones size={32}/></div><div><h2>Emotion Based Music Player</h2><p>EmoTunes is designed to make music discovery feel more personal. Instead of manually searching through playlists, users can explore music that reflects their current mood.</p><p>Using facial-expression emotion recognition, the project aims to identify a user's emotional state and suggest suitable music. Whether you're feeling joyful, relaxed, sad, surprised, or thoughtful, EmoTunes helps you find a soundtrack for the moment.</p><p>Our goal is to bring together technology and music to create a simple, engaging, and mood-aware listening experience.</p></div></article><div className="feature-row"><div><span>01</span><b>Detect emotion</b><small>Read facial expressions with care.</small></div><div><span>02</span><b>Find your vibe</b><small>Match a mood with a music category.</small></div><div><span>03</span><b>Press play</b><small>Explore music that fits the moment.</small></div></div></main>}

    {page === 'contact' && <main className="content-panel gradient-panel contact-page"><div className="section-heading"><span className="eyebrow">LET'S TALK MUSIC</span><h1>Get in <span>touch.</span></h1><p>Have a question or idea for EmoTunes? Send us a message.</p></div><form className="contact-card" onSubmit={(e)=>{e.preventDefault();setNotice('Thanks! Connect this form to a backend to receive messages.')}}><label>Your name<input required placeholder="Enter your name"/></label><label>Email address<input required type="email" placeholder="you@example.com"/></label><label>Message<textarea required rows="4" placeholder="Write your message..."/></label><button className="button button-green" type="submit">Send message <ArrowRight size={17}/></button>{notice && <p className="form-notice">{notice}</p>}</form></main>}

    {(page === 'login' || page === 'signup') && <main className="auth-stage"><div className="auth-decoration decor-one"/><div className="auth-decoration decor-two"/><section className="auth-card"><button className="auth-brand" onClick={() => navigate('home')}><span className="brand-icon"><Music2 size={19}/></span>EmoTunes</button><div className="auth-heading"><h1>{page === 'login' ? 'Welcome back' : 'Create account'}</h1><p>{page === 'login' ? 'Your next favorite song is waiting.' : 'Start your own mood soundtrack.'}</p></div><form onSubmit={(e) => handleAuth(e, page)}>
      <label className="input-wrap"><Mail size={18}/><input name="email" type="email" placeholder="Enter your email" required/></label>
      <label className="input-wrap"><LockKeyhole size={18}/><input name="password" type={showPassword ? 'text' : 'password'} placeholder={page === 'login' ? 'Enter your password' : 'Create a password'} minLength="8" required/><button type="button" className="show-password" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></label>
      {page === 'signup' && <label className="input-wrap"><LockKeyhole size={18}/><input name="confirmPassword" type="password" placeholder="Confirm your password" minLength="8" required/></label>}
      {page === 'login' && <button type="button" className="forgot-link" onClick={() => setNotice('Password reset needs to be connected to your backend.')}>Forgot password?</button>}
      <button className="button button-green auth-submit" type="submit">{page === 'login' ? 'Login' : 'Sign up'} <ArrowRight size={17}/></button>
      {notice && <p className="form-notice">{notice}</p>}
    </form><p className="auth-switch">{page === 'login' ? "Don't have an account?" : 'Already have an account?'} <button type="button" onClick={() => page === 'login' ? (setNotice(''), setSignupModalOpen(true)) : navigate('login')}>{page === 'login' ? 'Sign up' : 'Login'}</button></p></section><div className="auth-caption"><span>♫</span> Let your feelings find their rhythm.</div></main>}

    {page === 'login' && signupModalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setSignupModalOpen(false); }}><section className="signup-modal" role="dialog" aria-modal="true" aria-labelledby="signup-modal-title"><button className="modal-close" type="button" onClick={() => { setSignupModalOpen(false); setNotice(''); }} aria-label="Close sign up"><X size={20}/></button><div className="auth-heading"><span className="eyebrow">JOIN EMOTUNES</span><h1 id="signup-modal-title">Create account</h1><p>Start your own mood soundtrack.</p></div><form onSubmit={(e) => handleAuth(e, 'signup')}><label className="input-wrap"><Mail size={18}/><input name="email" type="email" placeholder="Enter your email" autoComplete="email" required/></label><label className="input-wrap"><LockKeyhole size={18}/><input name="password" type={showPassword ? 'text' : 'password'} placeholder="Create a password (8+ characters)" autoComplete="new-password" minLength="8" required/><button type="button" className="show-password" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></label><label className="input-wrap"><LockKeyhole size={18}/><input name="confirmPassword" type="password" placeholder="Confirm your password" autoComplete="new-password" minLength="8" required/></label><button className="button button-green auth-submit" type="submit">Create account <ArrowRight size={17}/></button>{notice && <p className="form-notice" role="status">{notice}</p>}</form><p className="auth-switch">Already have an account? <button type="button" onClick={() => { setSignupModalOpen(false); setNotice(''); }}>Login</button></p></section></div>}

    {page === 'player' && <main className="content-panel gradient-panel mood-player-page">
      <div className="section-heading"><span className="eyebrow">YOUR PERSONAL MOOD SOUNDTRACK</span><h1>How are you <span>feeling?</span></h1><p>Allow camera access, capture a frame, and get music recommendations based on your expression.</p></div>
      {!localStorage.getItem('emotunesToken') ? <section className="player-message"><h2>Please log in first</h2><p>Your music experience is available after you sign in.</p><button className="button button-green" onClick={() => navigate('login')}>Go to login <ArrowRight size={17}/></button></section> : <div className="mood-player-layout">
        <section className="camera-card"><div className="camera-frame"><video ref={videoRef} autoPlay muted playsInline aria-label="Webcam preview"/><canvas ref={canvasRef} className="hidden-canvas"/><span className="camera-live"><i/> CAMERA PREVIEW</span></div>
          <label className="mode-label">Music recommendation mode<select value={musicMode} onChange={(e) => setMusicMode(e.target.value)}><option value="match">Match my current mood</option><option value="lift">Lift my mood</option></select></label>
          <button className="button button-green analyze-button" onClick={analyzeCurrentMood} disabled={analyzing}>{analyzing ? 'Analyzing your mood…' : 'Detect emotion & find music'} <ArrowRight size={17}/></button>
          {cameraError && <p className="form-notice" role="alert">{cameraError}</p>}<p className="privacy-note">Your webcam frame is sent to the Flask emotion service for analysis. This app does not save the image.</p>
        </section>
        <section className="tracks-panel">{!emotionResult ? <div className="empty-tracks"><div className="empty-note">♫</div><h2>Your mood mix awaits</h2><p>Your detected emotion and recommended tracks will appear here.</p></div> : <>
          <div className="result-heading"><span className="eyebrow">YOUR RESULT · {emotionResult.source}</span><h2>Feeling <span>{emotionResult.emotion}</span></h2><p>Search: “{emotionResult.query}”</p></div>
          <div className="track-list">{emotionResult.tracks.map((track) => <article className="track-card" key={`${emotionResult.source}-${track.id}`}>{track.image ? <img src={track.image} alt="" className="track-image"/> : <div className="track-image track-placeholder">♫</div>}<div className="track-copy"><strong>{track.name}</strong><span>{track.artists}</span>{track.preview && <audio controls preload="none" src={track.preview}>Your browser does not support audio playback.</audio>}</div>{track.url && <a className="track-open" href={track.url} target="_blank" rel="noreferrer">Open ↗</a>}</article>)}</div>
          <button className="button button-dark" onClick={analyzeCurrentMood} disabled={analyzing}>{analyzing ? 'Finding tracks…' : 'Analyze again'} <ArrowRight size={17}/></button>
        </>}</section>
      </div>}
      <div className="player-footer-actions"><button className="button button-glass" onClick={() => navigate('home')}>Back to home</button><button className="button button-dark" onClick={logout}>Log out</button></div>
    </main>}

    <footer className="footer"><button onClick={() => navigate('home')} className="footer-brand">♫ EmoTunes</button><span>Music for every mood.</span><span>© 2026 EmoTunes</span></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
