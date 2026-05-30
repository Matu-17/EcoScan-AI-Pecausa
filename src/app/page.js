'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createThumbnail(base64Image) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 96, 96);
      resolve(canvas.toDataURL('image/jpeg', 0.55));
    };
    img.onerror = () => resolve(null);
    img.src = base64Image;
  });
}

function getHistoryKey(email) {
  return `nutricam_history_${email.toLowerCase().trim()}`;
}
function loadHistory(email) {
  try {
    const raw = localStorage.getItem(getHistoryKey(email));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveHistory(email, entries) {
  localStorage.setItem(getHistoryKey(email), JSON.stringify(entries));
}

// ─── AUTH MODAL ─────────────────────────────────────────────────────────────

function AuthModal({ mode, onClose, onSubmit, error }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div style={styles.overlay}>
      <div style={styles.overlayBg} onClick={onClose} />
      <div style={styles.modalCard}>
        <div style={styles.modalHeader}>
          <div style={styles.modalIcon}>
            <span style={{ fontSize: 28 }}>{mode === 'register' ? '🌱' : '🔐'}</span>
          </div>
          <h2 style={styles.modalTitle}>
            {mode === 'register' ? 'Crear cuenta' : 'Bienvenido de vuelta'}
          </h2>
          <p style={styles.modalSubtitle}>
            {mode === 'register' ? 'Únete a EcoScan AI' : 'Inicia sesión en tu cuenta'}
          </p>
        </div>

        <div style={styles.modalBody}>
          {mode === 'register' && (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Nombre completo</label>
              <input
                type="text"
                placeholder="Tu nombre"
                value={name}
                onChange={e => setName(e.target.value)}
                style={styles.input}
                onFocus={e => e.target.style.borderColor = '#16A34A'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>
          )}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Correo electrónico</label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              onFocus={e => e.target.style.borderColor = '#16A34A'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              onFocus={e => e.target.style.borderColor = '#16A34A'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>

          {error && (
            <div style={styles.errorBox}>{error}</div>
          )}

          <button
            onClick={() => onSubmit(email, password, name)}
            style={styles.btnPrimary}
            onMouseEnter={e => e.target.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
          >
            {mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── HISTORY PANEL ──────────────────────────────────────────────────────────

function HistoryPanel({ history, onSelect, onClose, onDelete }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.overlayBg} onClick={onClose} />
      <div style={{ ...styles.drawerCard }}>
        <div style={styles.drawerHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🗂️</span>
            <h2 style={styles.drawerTitle}>Historial de análisis</h2>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.drawerBody}>
          {history.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>📭</span>
              <p style={{ color: '#9CA3AF', fontSize: 14 }}>No hay análisis guardados aún.</p>
            </div>
          ) : (
            history.map(item => (
              <div
                key={item.id}
                style={styles.historyItem}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                onClick={() => { onSelect(item); onClose(); }}
              >
                <div style={styles.historyThumb}>
                  {item.thumbnail
                    ? <img src={item.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 24 }}>🌿</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={styles.historyDate}>{item.date} · {item.time}</p>
                  <p style={styles.historyPreview}>{item.preview}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(item.id); }}
                  style={styles.deleteBtn}
                  onMouseEnter={e => e.target.style.color = '#EF4444'}
                  onMouseLeave={e => e.target.style.color = '#D1D5DB'}
                >
                  🗑
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PLAN MODAL ─────────────────────────────────────────────────────────────

function PlanModal({ onClose, onBuy, isPremium }) {
  const features = [
    { label: 'Consultas por foto', free: 'Limitadas', premium: 'Ilimitadas' },
    { label: 'Detección de enfermedades', free: true, premium: true },
    { label: 'Recomendaciones básicas', free: true, premium: true },
    { label: 'Recomendaciones precisas IA', free: false, premium: true },
    { label: 'Consejos de cuidado', free: false, premium: true },
    { label: 'Registro por etapas', free: false, premium: true },
    { label: 'Seguimiento avanzado', free: false, premium: true },
  ];

  return (
    <div style={styles.overlay}>
      <div style={styles.overlayBg} onClick={onClose} />
      <div style={styles.planModal}>
        <div style={styles.planHeader}>
          <div>
            <h2 style={styles.planTitle}>Elige tu plan</h2>
            <p style={styles.planSubtitle}>Comienza gratis. Actualiza cuando lo necesites.</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.planGrid}>
          {/* Free */}
          <div style={styles.planCard}>
            <div style={styles.planCardHeader}>
              <span style={{ fontSize: 32 }}>🌱</span>
              <h3 style={styles.planName}>Gratuito</h3>
              <div style={styles.planPrice}>
                <span style={styles.planAmount}>$0</span>
                <span style={styles.planPer}>/mes</span>
              </div>
            </div>
            <ul style={styles.planFeatures}>
              <li style={styles.planFeatureItem}><span style={styles.check}>✓</span> Consultas limitadas por foto</li>
              <li style={styles.planFeatureItem}><span style={styles.check}>✓</span> Detección de enfermedades</li>
              <li style={styles.planFeatureItem}><span style={styles.check}>✓</span> Recomendaciones básicas</li>
              <li style={{ ...styles.planFeatureItem, opacity: 0.4 }}><span>✗</span> Recomendaciones precisas IA</li>
              <li style={{ ...styles.planFeatureItem, opacity: 0.4 }}><span>✗</span> Seguimiento avanzado</li>
            </ul>
            <button disabled style={{ ...styles.btnOutline, opacity: 0.5, cursor: 'not-allowed' }}>
              Plan actual
            </button>
          </div>

          {/* Premium */}
          <div style={styles.planCardPremium}>
            <div style={styles.popularBadge}>⭐ Más popular</div>
            <div style={styles.planCardHeader}>
              <span style={{ fontSize: 32 }}>🚜</span>
              <h3 style={{ ...styles.planName, color: '#fff' }}>Premium</h3>
              <div style={styles.planPrice}>
                <span style={{ ...styles.planAmount, color: '#86EFAC' }}>$9.99</span>
                <span style={{ ...styles.planPer, color: '#BBF7D0' }}>/mes</span>
              </div>
            </div>
            <ul style={{ ...styles.planFeatures }}>
              <li style={{ ...styles.planFeatureItem, color: '#E5E7EB' }}><span style={{ color: '#4ADE80' }}>✓</span> Todo lo del plan gratuito</li>
              <li style={{ ...styles.planFeatureItem, color: '#E5E7EB' }}><span style={{ color: '#4ADE80' }}>✓</span> Recomendaciones precisas IA</li>
              <li style={{ ...styles.planFeatureItem, color: '#E5E7EB' }}><span style={{ color: '#4ADE80' }}>✓</span> Consejos de cuidado</li>
              <li style={{ ...styles.planFeatureItem, color: '#E5E7EB' }}><span style={{ color: '#4ADE80' }}>✓</span> Registro por etapas</li>
              <li style={{ ...styles.planFeatureItem, color: '#E5E7EB' }}><span style={{ color: '#4ADE80' }}>✓</span> Seguimiento avanzado</li>
            </ul>
            {isPremium ? (
              <button disabled style={{ ...styles.btnWhite, opacity: 0.7, cursor: 'not-allowed' }}>
                ✅ Premium activo
              </button>
            ) : (
              <button
                onClick={onBuy}
                style={styles.btnWhite}
                onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
              >
                Activar Premium
              </button>
            )}
          </div>
        </div>

        {/* Comparison table */}
        <div style={styles.compareTable}>
          <h3 style={styles.compareTitle}>Comparación completa</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...styles.th, textAlign: 'left' }}>Característica</th>
                <th style={styles.th}>Gratuito</th>
                <th style={{ ...styles.th, color: '#16A34A' }}>Premium</th>
              </tr>
            </thead>
            <tbody>
              {features.map((f, i) => (
                <tr key={i} style={{ borderTop: '1px solid #F3F4F6' }}>
                  <td style={styles.td}>{f.label}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    {typeof f.free === 'boolean' ? (f.free ? '✅' : '—') : f.free}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center', color: '#16A34A', fontWeight: 600 }}>
                    {typeof f.premium === 'boolean' ? (f.premium ? '✅' : '—') : f.premium}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── RESULT CARD ─────────────────────────────────────────────────────────────

function ResultCard({ result }) {
  const lines = result.split('\n').filter(l => l.trim());

  return (
    <div style={styles.resultWrapper}>
      <div style={styles.resultHeader}>
        <div style={styles.resultBadge}>
          <span style={{ fontSize: 14 }}>✅</span>
          <span style={styles.resultBadgeText}>Análisis completado</span>
        </div>
        <h2 style={styles.resultTitle}>Reporte de cultivo</h2>
      </div>

      <div style={styles.resultBody}>
        {lines.map((line, i) => {
          const isBold = line.startsWith('**') || line.startsWith('##') || line.startsWith('*');
          const isEmoji = /^[\p{Emoji}]/u.test(line);
          const clean = line.replace(/^[\*#]+\s?/, '').replace(/\*\*/g, '');

          return (
            <div key={i} style={{
              ...styles.resultLine,
              ...(isBold ? styles.resultLineHeading : {}),
              ...(isEmoji ? styles.resultLineEmoji : {}),
            }}>
              {clean}
            </div>
          );
        })}
      </div>

      <div style={styles.disclaimer}>
        ⚠️ <strong>Aviso médico:</strong> Las estimaciones nutricionales son aproximadas e informativas. Consulta con un profesional antes de realizar cambios en tu cultivo o alimentación.
      </div>
    </div>
  );
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

export default function Home() {
  const [ready, setReady] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [user, setUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [authError, setAuthError] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const analysisRef = useRef(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const email = session.user.email;
        const name = session.user.user_metadata?.name || email;
        setUser({ email, name });
        const { data: profile } = await supabase.from('profiles').select('premium_until').eq('id', session.user.id).single();
        setIsPremium(profile?.premium_until && new Date(profile.premium_until) > new Date());
        setHistory(loadHistory(email));
      }
      setReady(true);
    };
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const email = session.user.email;
        const name = session.user.user_metadata?.name || email;
        setUser({ email, name });
        const { data: profile } = await supabase.from('profiles').select('premium_until').eq('id', session.user.id).single();
        setIsPremium(profile?.premium_until && new Date(profile.premium_until) > new Date());
        setHistory(loadHistory(email));
      } else {
        setUser(null);
        setHistory([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleRegister = async (email, password, name) => {
    if (!email || !password || !name) { setAuthError('Completa todos los campos'); return; }
    if (!email.includes('@')) { setAuthError('Correo electrónico inválido'); return; }
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) {
      setAuthError(error.message.includes('User already registered') ? 'Este correo ya está registrado' : error.message);
      return;
    }
    if (data?.user) {
      await supabase.from('profiles').insert({ id: data.user.id, premium_until: null });
      setUser({ email: data.user.email, name: data.user.user_metadata?.name || name });
      setHistory(loadHistory(data.user.email));
    }
    setShowRegister(false);
    setAuthError('');
  };

  const handleLogin = async (email, password) => {
    if (!email || !password) { setAuthError('Completa todos los campos'); return; }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setAuthError('Correo o contraseña incorrectos'); return; }
    if (data?.user) {
      setUser({ email: data.user.email, name: data.user.user_metadata?.name || data.user.email });
      setHistory(loadHistory(data.user.email));
    }
    setShowLogin(false);
    setAuthError('');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setHistory([]); setResult(''); setImage(null);
  };

  const activatePremium = async () => {
    if (!user) { alert('Debes iniciar sesión'); return; }
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { alert('Usuario no encontrado'); return; }
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const { error } = await supabase.from('profiles').update({ premium_until: nextMonth.toISOString() }).eq('id', currentUser.id);
      if (error) { alert('Error al activar Premium'); return; }
      setIsPremium(true);
      alert(`Premium activado hasta ${nextMonth.toLocaleDateString()}`);
    } catch (err) { alert('Ocurrió un error'); }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Máximo 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Máximo 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const analyzeFood = async () => {
    if (!image) return;
    setLoading(true);
    setResult('');
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      });
      if (!response.ok) throw new Error('Error del servidor');
      const data = await response.json();
      if (data.error) {
        setResult(data.error);
      } else {
        setResult(data.result);
        if (user) {
          const thumbnail = await createThumbnail(image);
          const entry = {
            id: Date.now(),
            image,
            thumbnail,
            result: data.result,
            date: new Date().toLocaleDateString('es-ES'),
            time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            preview: data.result.replace(/\n/g, ' ').substring(0, 120) + '…',
          };
          const updated = [entry, ...history].slice(0, 30);
          setHistory(updated);
          saveHistory(user.email, updated);
        }
        setTimeout(() => analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    } catch {
      setResult('Hubo un error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = (id) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    if (user) saveHistory(user.email, updated);
  };

  const handleSelectHistory = (item) => {
    setResult(item.result);
    setImage(item.image);
  };

  if (!ready) return null;

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        ::selection { background: #BBF7D0; color: #14532D; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 3px; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .fade-up { animation: fadeUp 0.6s ease forwards; }
        .fade-up-1 { animation: fadeUp 0.6s 0.1s ease both; }
        .fade-up-2 { animation: fadeUp 0.6s 0.2s ease both; }
        .fade-up-3 { animation: fadeUp 0.6s 0.3s ease both; }
        .fade-up-4 { animation: fadeUp 0.6s 0.4s ease both; }

        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(22,163,74,0.35) !important; }
        .btn-primary:active { transform: translateY(0); }
        .btn-outline:hover { background: #F0FDF4 !important; border-color: #16A34A !important; }
        .upload-zone:hover { border-color: #16A34A !important; background: #F0FDF4 !important; }
        .nav-link:hover { color: #16A34A !important; }
        .upgrade-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(22,163,74,0.25) !important; }
      `}</style>

      {/* Modals */}
      {showRegister && <AuthModal mode="register" onClose={() => { setShowRegister(false); setAuthError(''); }} onSubmit={handleRegister} error={authError} />}
      {showLogin && <AuthModal mode="login" onClose={() => { setShowLogin(false); setAuthError(''); }} onSubmit={handleLogin} error={authError} />}
      {showHistory && <HistoryPanel history={history} onSelect={handleSelectHistory} onClose={() => setShowHistory(false)} onDelete={handleDeleteEntry} />}
      {showPlan && <PlanModal onClose={() => setShowPlan(false)} onBuy={activatePremium} isPremium={isPremium} />}

      {/* ── NAVBAR ── */}
      <nav style={styles.navbar}>
        <div style={styles.navInner}>
          <div style={styles.navLogo}>
            <div style={styles.logoIcon}>🌿</div>
            <span style={styles.logoText}>EcoScan<span style={{ color: '#16A34A' }}>AI</span></span>
          </div>

          <div style={styles.navLinks}>
            <a href="#analisis" style={styles.navLink} className="nav-link">Analizar</a>
            <a href="#" style={styles.navLink} className="nav-link">Cómo funciona</a>
            <button onClick={() => setShowPlan(true)} style={styles.navLink} className="nav-link">Precios</button>
          </div>

          <div style={styles.navActions}>
            <button
              onClick={() => setShowPlan(true)}
              style={styles.upgradeBtn}
              className="upgrade-btn"
            >
              🚀 Premium
            </button>

            {user ? (
              <div style={styles.userPill}>
                <div style={styles.userAvatar}>{user.name.charAt(0).toUpperCase()}</div>
                <span style={styles.userName}>{user.name}</span>
                {isPremium && <span style={styles.premiumBadge}>👑</span>}
                <button onClick={() => setShowHistory(true)} style={styles.pillBtn}>Historial</button>
                <span style={{ color: '#E5E7EB' }}>|</span>
                <button onClick={handleLogout} style={{ ...styles.pillBtn, color: '#9CA3AF' }}>Salir</button>
              </div>
            ) : (
              <>
                <button onClick={() => setShowLogin(true)} style={styles.btnGhost} className="btn-outline">
                  Iniciar sesión
                </button>
                <button onClick={() => setShowRegister(true)} style={styles.btnNavPrimary} className="btn-primary">
                  Registrarse
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={styles.hero}>
        <div style={styles.heroDecorLeft} />
        <div style={styles.heroDecorRight} />

        <div style={styles.heroContent}>
          <div className="fade-up" style={styles.heroBadge}>
            <span style={{ fontSize: 14 }}>🌾</span>
            <span>Agricultura inteligente con IA</span>
          </div>

          <h1 className="fade-up-1" style={styles.heroTitle}>
            Detecta enfermedades y mejora{' '}
            <span style={styles.heroTitleAccent}>tus cultivos</span>
            {' '}con IA
          </h1>

          <p className="fade-up-2" style={styles.heroSubtitle}>
            Analiza imágenes de tus plantas y recibe diagnósticos, recomendaciones y seguimiento inteligente en segundos.
          </p>

          <div className="fade-up-3" style={styles.heroCtas}>
            <a
              href="#analisis"
              style={styles.btnHeroPrimary}
              className="btn-primary"
              onClick={e => { e.preventDefault(); document.getElementById('analisis')?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              🌿 Analizar cultivo
            </a>
            <button style={styles.btnHeroGhost} className="btn-outline">
              Ver demo →
            </button>
          </div>

          <div className="fade-up-4" style={styles.heroStats}>
            {[['10k+', 'Cultivos analizados'], ['98%', 'Precisión IA'], ['< 5s', 'Tiempo de respuesta']].map(([val, label]) => (
              <div key={label} style={styles.heroStat}>
                <span style={styles.heroStatVal}>{val}</span>
                <span style={styles.heroStatLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero illustration */}
        <div style={styles.heroIllustration}>
          <div style={styles.heroCard}>
            <div style={styles.heroCardImg}>🌱</div>
            <div style={styles.heroCardContent}>
              <div style={styles.heroCardBadge}>Análisis completo</div>
              <p style={styles.heroCardTitle}>Tomate Cherry</p>
              <p style={styles.heroCardSub}>Sin enfermedades detectadas</p>
              <div style={styles.heroCardBar}>
                <div style={styles.heroCardBarFill} />
              </div>
              <p style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Salud: 94%</p>
            </div>
          </div>
          <div style={styles.heroFloatBadge1}>🔬 IA activa</div>
          <div style={styles.heroFloatBadge2}>✅ Diagnóstico listo</div>
        </div>
      </section>

      {/* ── ANALYSIS SECTION ── */}
      <section id="analisis" style={styles.analysisSec} ref={analysisRef}>
        <div style={styles.sectionInner}>
          <div style={styles.sectionLabel}>Análisis de cultivos</div>
          <h2 style={styles.sectionTitle}>Sube una imagen y obtén resultados al instante</h2>
          <p style={styles.sectionSub}>Nuestro modelo de IA analiza tu cultivo, detecta enfermedades, y entrega recomendaciones personalizadas.</p>

          <div style={styles.analysisGrid}>
            {/* Upload card */}
            <div style={styles.uploadCard}>
              <div
                style={{
                  ...styles.dropZone,
                  ...(dragOver ? styles.dropZoneActive : {}),
                }}
                className="upload-zone"
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                {image ? (
                  <div style={{ position: 'relative', width: '100%' }}>
                    <img src={image} alt="Cultivo seleccionado" style={styles.previewImg} />
                    <div style={styles.previewOverlay}>
                      <span style={styles.previewOverlayText}>Cambiar imagen</span>
                    </div>
                  </div>
                ) : (
                  <div style={styles.dropPlaceholder}>
                    <div style={styles.dropIcon}>📷</div>
                    <p style={styles.dropTitle}>Arrastra tu imagen aquí</p>
                    <p style={styles.dropSub}>o haz clic para seleccionar</p>
                    <p style={styles.dropFormats}>JPG, PNG o HEIC · Máx. 5MB</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                />
              </div>

              <button
                onClick={analyzeFood}
                disabled={!image || loading}
                style={{ ...styles.btnAnalyze, ...(!image || loading ? { opacity: 0.4, cursor: 'not-allowed', transform: 'none' } : {}) }}
                className={image && !loading ? 'btn-primary' : ''}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                    <span style={styles.spinner} />
                    Analizando cultivo...
                  </span>
                ) : (
                  '✨ Analizar cultivo'
                )}
              </button>

              {!user && (
                <p style={styles.loginHint}>
                  <a onClick={() => setShowLogin(true)} style={{ color: '#16A34A', cursor: 'pointer', textDecoration: 'underline' }}>
                    Inicia sesión
                  </a>{' '}para guardar tu historial de análisis
                </p>
              )}
            </div>

            {/* Result card */}
            <div style={styles.resultSection}>
              {result ? (
                <ResultCard result={result} />
              ) : (
                <div style={styles.resultPlaceholder}>
                  <div style={styles.placeholderIcon}>🪴</div>
                  <h3 style={styles.placeholderTitle}>Esperando análisis</h3>
                  <p style={styles.placeholderSub}>Sube una imagen de tu cultivo y presiona analizar para obtener un diagnóstico completo con recomendaciones.</p>

                  <div style={styles.featureList}>
                    {['Detección de enfermedades', 'Evaluación de salud', 'Recomendaciones de cuidado', 'Identificación de especie'].map(f => (
                      <div key={f} style={styles.featureItem}>
                        <span style={styles.featureDot} />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerLogo}>
            <span style={{ fontSize: 18 }}>🌿</span>
            <span style={{ fontWeight: 700, color: '#1F2937' }}>EcoScan<span style={{ color: '#16A34A' }}>AI</span></span>
          </div>
          <p style={styles.footerText}>© 2026 EcoScan AI · Hackathon Project Build With AI</p>
          <div style={styles.footerLinks}>
            <a href="#" style={styles.footerLink}>Privacidad</a>
            <a href="#" style={styles.footerLink}>Términos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = {
  page: {
    fontFamily: "'DM Sans', sans-serif",
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    minHeight: '100vh',
  },

  // Overlay
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  overlayBg: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(6px)',
  },

  // Auth modal
  modalCard: {
    position: 'relative', zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: '36px 32px',
    width: '100%', maxWidth: 420,
    boxShadow: '0 24px 60px rgba(0,0,0,0.12)',
  },
  modalHeader: { textAlign: 'center', marginBottom: 28 },
  modalIcon: {
    width: 72, height: 72,
    borderRadius: '50%',
    backgroundColor: '#F0FDF4',
    border: '2px solid #BBF7D0',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
  },
  modalTitle: { fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 6 },
  modalSubtitle: { fontSize: 14, color: '#6B7280' },
  modalBody: { display: 'flex', flexDirection: 'column', gap: 16 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: '#374151' },
  input: {
    padding: '10px 14px',
    borderRadius: 12,
    border: '1.5px solid #E5E7EB',
    fontSize: 14,
    color: '#111827',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: '#FAFAFA',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    color: '#B91C1C',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
  },
  btnPrimary: {
    backgroundColor: '#16A34A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 12,
    padding: '12px 20px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 14px rgba(22,163,74,0.25)',
  },

  // Drawer / History
  drawerCard: {
    position: 'relative', zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%', maxWidth: 520,
    boxShadow: '0 24px 60px rgba(0,0,0,0.12)',
    overflow: 'hidden',
    maxHeight: '85vh',
    display: 'flex', flexDirection: 'column',
  },
  drawerHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #F3F4F6',
  },
  drawerTitle: { fontSize: 16, fontWeight: 700, color: '#111827' },
  drawerBody: { overflowY: 'auto', flex: 1 },
  closeBtn: {
    background: 'none', border: 'none',
    fontSize: 16, color: '#9CA3AF',
    cursor: 'pointer', padding: '4px 8px',
    borderRadius: 8,
    transition: 'color 0.2s',
  },
  emptyState: { padding: 48, textAlign: 'center' },
  historyItem: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 24px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  historyThumb: {
    width: 52, height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F0FDF4',
    border: '1px solid #BBF7D0',
    flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  historyDate: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  historyPreview: {
    fontSize: 13, color: '#374151',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  deleteBtn: {
    background: 'none', border: 'none',
    color: '#D1D5DB', cursor: 'pointer',
    fontSize: 16, flexShrink: 0,
    transition: 'color 0.2s',
  },

  // Plan modal
  planModal: {
    position: 'relative', zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%', maxWidth: 760,
    boxShadow: '0 24px 80px rgba(0,0,0,0.14)',
    overflow: 'hidden',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '36px 32px',
  },
  planHeader: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: 32,
  },
  planTitle: { fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 6 },
  planSubtitle: { fontSize: 14, color: '#6B7280' },
  planGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 36 },
  planCard: {
    border: '1.5px solid #E5E7EB',
    borderRadius: 20, padding: 28,
    display: 'flex', flexDirection: 'column', gap: 20,
  },
  planCardPremium: {
    background: 'linear-gradient(135deg, #15803D 0%, #16A34A 50%, #22C55E 100%)',
    borderRadius: 20, padding: 28,
    display: 'flex', flexDirection: 'column', gap: 20,
    position: 'relative', overflow: 'hidden',
    color: '#fff',
  },
  popularBadge: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: '#FDE68A',
    color: '#92400E',
    fontSize: 11, fontWeight: 700,
    padding: '4px 10px', borderRadius: 20,
  },
  planCardHeader: { display: 'flex', flexDirection: 'column', gap: 8 },
  planName: { fontSize: 20, fontWeight: 700, color: '#111827' },
  planPrice: { display: 'flex', alignItems: 'baseline', gap: 4 },
  planAmount: { fontSize: 32, fontWeight: 800, color: '#111827' },
  planPer: { fontSize: 14, color: '#6B7280' },
  planFeatures: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 },
  planFeatureItem: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#374151' },
  check: { color: '#16A34A', fontWeight: 700 },
  btnOutline: {
    border: '1.5px solid #E5E7EB',
    background: 'transparent',
    color: '#374151',
    borderRadius: 12, padding: '11px 20px',
    fontSize: 14, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.2s',
  },
  btnWhite: {
    backgroundColor: '#FFFFFF',
    color: '#15803D',
    border: 'none',
    borderRadius: 12, padding: '11px 20px',
    fontSize: 14, fontWeight: 700,
    cursor: 'pointer', transition: 'all 0.2s',
    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
  },
  compareTable: { borderTop: '1px solid #F3F4F6', paddingTop: 28 },
  compareTitle: { fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 },
  th: {
    padding: '10px 16px', fontSize: 12,
    fontWeight: 600, color: '#6B7280',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    textAlign: 'center',
  },
  td: { padding: '12px 16px', fontSize: 14, color: '#374151' },

  // Result
  resultWrapper: { backgroundColor: '#FFFFFF', borderRadius: 20, border: '1.5px solid #E5E7EB', overflow: 'hidden' },
  resultHeader: { padding: '20px 24px', borderBottom: '1px solid #F3F4F6' },
  resultBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0',
    borderRadius: 20, padding: '4px 12px',
    marginBottom: 10,
  },
  resultBadgeText: { fontSize: 12, fontWeight: 600, color: '#15803D' },
  resultTitle: { fontSize: 20, fontWeight: 700, color: '#111827' },
  resultBody: {
    padding: '20px 24px',
    maxHeight: 420, overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  resultLine: { fontSize: 14, color: '#374151', lineHeight: 1.7, paddingLeft: 0 },
  resultLineHeading: { fontWeight: 700, color: '#111827', fontSize: 15, marginTop: 8 },
  resultLineEmoji: { fontSize: 14 },
  disclaimer: {
    margin: '0 24px 20px',
    backgroundColor: '#FFFBEB',
    border: '1px solid #FDE68A',
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: 12,
    color: '#92400E',
    lineHeight: 1.6,
  },

  // NAVBAR
  navbar: {
    position: 'sticky', top: 0, zIndex: 100,
    backgroundColor: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #F3F4F6',
    padding: '0 24px',
  },
  navInner: {
    maxWidth: 1200, margin: '0 auto',
    display: 'flex', alignItems: 'center',
    height: 64, gap: 32,
  },
  navLogo: { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' },
  logoIcon: {
    width: 36, height: 36,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18,
    border: '1px solid #BBF7D0',
  },
  logoText: { fontSize: 18, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' },
  navLinks: { display: 'flex', gap: 4, flex: 1 },
  navLink: {
    fontSize: 14, fontWeight: 500, color: '#6B7280',
    padding: '6px 12px', borderRadius: 8,
    cursor: 'pointer', border: 'none', background: 'none',
    transition: 'color 0.15s', textDecoration: 'none',
  },
  navActions: { display: 'flex', alignItems: 'center', gap: 10 },
  upgradeBtn: {
    backgroundColor: '#F0FDF4',
    color: '#16A34A',
    border: '1.5px solid #BBF7D0',
    borderRadius: 20,
    padding: '6px 16px',
    fontSize: 13, fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  userPill: {
    display: 'flex', alignItems: 'center', gap: 10,
    backgroundColor: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: 24, padding: '6px 14px',
  },
  userAvatar: {
    width: 28, height: 28,
    borderRadius: '50%',
    backgroundColor: '#16A34A',
    color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700,
  },
  userName: { fontSize: 13, fontWeight: 600, color: '#111827', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  premiumBadge: { fontSize: 14 },
  pillBtn: {
    fontSize: 12, fontWeight: 600, color: '#16A34A',
    background: 'none', border: 'none',
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  btnGhost: {
    backgroundColor: 'transparent',
    color: '#374151',
    border: '1.5px solid #E5E7EB',
    borderRadius: 10,
    padding: '7px 16px',
    fontSize: 13, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.2s',
  },
  btnNavPrimary: {
    backgroundColor: '#16A34A',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '8px 18px',
    fontSize: 13, fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
  },

  // HERO
  hero: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#F8F7F2',
    padding: '80px 24px 100px',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 80,
    flexWrap: 'wrap',
  },
  heroDecorLeft: {
    position: 'absolute', top: -120, left: -120,
    width: 500, height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(22,163,74,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  heroDecorRight: {
    position: 'absolute', bottom: -80, right: -60,
    width: 400, height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  heroContent: { maxWidth: 580, flex: '1 1 340px' },
  heroBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    backgroundColor: '#F0FDF4',
    border: '1px solid #BBF7D0',
    color: '#16A34A',
    fontSize: 13, fontWeight: 600,
    padding: '6px 14px', borderRadius: 20,
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 'clamp(32px, 5vw, 54px)',
    fontWeight: 800,
    color: '#111827',
    lineHeight: 1.15,
    letterSpacing: '-0.03em',
    marginBottom: 20,
    fontFamily: "'DM Serif Display', serif",
  },
  heroTitleAccent: { color: '#16A34A' },
  heroSubtitle: {
    fontSize: 18, color: '#6B7280',
    lineHeight: 1.7, marginBottom: 36,
    maxWidth: 500,
  },
  heroCtas: { display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 48 },
  btnHeroPrimary: {
    backgroundColor: '#16A34A',
    color: '#fff', border: 'none',
    borderRadius: 14, padding: '14px 28px',
    fontSize: 16, fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 20px rgba(22,163,74,0.3)',
    textDecoration: 'none', display: 'inline-block',
  },
  btnHeroGhost: {
    backgroundColor: '#FFFFFF',
    color: '#374151',
    border: '1.5px solid #D1D5DB',
    borderRadius: 14, padding: '14px 28px',
    fontSize: 16, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.2s',
  },
  heroStats: { display: 'flex', gap: 40 },
  heroStat: { display: 'flex', flexDirection: 'column', gap: 2 },
  heroStatVal: { fontSize: 24, fontWeight: 800, color: '#111827' },
  heroStatLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: 500 },

  // Hero illustration
  heroIllustration: {
    position: 'relative', flex: '0 0 auto',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24, padding: '20px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
    border: '1px solid #E5E7EB',
    display: 'flex', gap: 14, alignItems: 'center',
    width: 280,
  },
  heroCardImg: {
    width: 72, height: 72,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 36, flexShrink: 0,
    border: '1px solid #BBF7D0',
  },
  heroCardContent: { flex: 1 },
  heroCardBadge: {
    fontSize: 10, fontWeight: 700,
    backgroundColor: '#F0FDF4', color: '#16A34A',
    padding: '2px 8px', borderRadius: 20,
    display: 'inline-block', marginBottom: 6,
  },
  heroCardTitle: { fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2 },
  heroCardSub: { fontSize: 12, color: '#6B7280', marginBottom: 10 },
  heroCardBar: {
    height: 6, backgroundColor: '#E5E7EB',
    borderRadius: 3, overflow: 'hidden',
  },
  heroCardBarFill: {
    height: '100%', width: '94%',
    backgroundColor: '#16A34A', borderRadius: 3,
    background: 'linear-gradient(90deg, #16A34A, #22C55E)',
  },
  heroFloatBadge1: {
    position: 'absolute', top: -20, right: -30,
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 12, padding: '8px 14px',
    fontSize: 12, fontWeight: 600,
    color: '#374151',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    whiteSpace: 'nowrap',
  },
  heroFloatBadge2: {
    position: 'absolute', bottom: -20, left: -20,
    backgroundColor: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: 12, padding: '8px 14px',
    fontSize: 12, fontWeight: 600,
    color: '#16A34A',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    whiteSpace: 'nowrap',
  },

  // Analysis section
  analysisSec: {
    padding: '80px 24px',
    backgroundColor: '#FFFFFF',
  },
  sectionInner: { maxWidth: 1100, margin: '0 auto' },
  sectionLabel: {
    fontSize: 12, fontWeight: 700,
    color: '#16A34A',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 'clamp(26px, 4vw, 38px)',
    fontWeight: 800,
    color: '#111827',
    letterSpacing: '-0.02em',
    marginBottom: 14,
    maxWidth: 600,
    fontFamily: "'DM Serif Display', serif",
  },
  sectionSub: {
    fontSize: 16, color: '#6B7280',
    lineHeight: 1.7, marginBottom: 52,
    maxWidth: 540,
  },
  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.4fr',
    gap: 28,
    alignItems: 'start',
  },

  // Upload
  uploadCard: { display: 'flex', flexDirection: 'column', gap: 16 },
  dropZone: {
    position: 'relative',
    border: '2px dashed #D1D5DB',
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 280,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s',
    backgroundColor: '#FAFAFA',
    cursor: 'pointer',
  },
  dropZoneActive: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  dropPlaceholder: { textAlign: 'center', padding: 40 },
  dropIcon: {
    fontSize: 48, marginBottom: 16,
    display: 'block',
  },
  dropTitle: { fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 },
  dropSub: { fontSize: 14, color: '#9CA3AF', marginBottom: 12 },
  dropFormats: {
    fontSize: 12, color: '#D1D5DB',
    backgroundColor: '#F3F4F6',
    display: 'inline-block', padding: '4px 12px', borderRadius: 20,
  },
  previewImg: {
    width: '100%', maxHeight: 320,
    objectFit: 'contain', display: 'block',
  },
  previewOverlay: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(0,0,0,0)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.2s',
    ':hover': { backgroundColor: 'rgba(0,0,0,0.3)' },
  },
  previewOverlayText: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff', fontSize: 13, fontWeight: 600,
    padding: '8px 16px', borderRadius: 20,
    opacity: 0,
  },
  btnAnalyze: {
    backgroundColor: '#16A34A',
    color: '#fff', border: 'none',
    borderRadius: 14, padding: '15px 24px',
    fontSize: 16, fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 16px rgba(22,163,74,0.3)',
    width: '100%',
  },
  spinner: {
    width: 18, height: 18,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
  },
  loginHint: {
    fontSize: 13, color: '#9CA3AF',
    textAlign: 'center',
  },

  // Result placeholder
  resultSection: {},
  resultPlaceholder: {
    border: '1.5px solid #F3F4F6',
    borderRadius: 20,
    padding: '48px 32px',
    textAlign: 'center',
    backgroundColor: '#FAFAFA',
    minHeight: 380,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 56, marginBottom: 20,
    display: 'block',
  },
  placeholderTitle: { fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 10 },
  placeholderSub: { fontSize: 14, color: '#9CA3AF', lineHeight: 1.7, marginBottom: 28, maxWidth: 360 },
  featureList: { display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', width: '100%', maxWidth: 280 },
  featureItem: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#6B7280' },
  featureDot: {
    width: 8, height: 8, borderRadius: '50%',
    backgroundColor: '#16A34A', flexShrink: 0,
  },

  // Footer
  footer: {
    borderTop: '1px solid #F3F4F6',
    padding: '28px 24px',
  },
  footerInner: {
    maxWidth: 1100, margin: '0 auto',
    display: 'flex', alignItems: 'center',
    gap: 24, flexWrap: 'wrap',
  },
  footerLogo: { display: 'flex', alignItems: 'center', gap: 6, flex: 1 },
  footerText: { fontSize: 13, color: '#9CA3AF', flex: 2, textAlign: 'center' },
  footerLinks: { display: 'flex', gap: 16, flex: 1, justifyContent: 'flex-end' },
  footerLink: { fontSize: 13, color: '#9CA3AF', textDecoration: 'none' },
};