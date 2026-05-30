'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; // Ruta corregida a tu carpeta lib de la raíz

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
  } catch {
    return [];
  }
}

function deleteHistory(email) {
  localStorage.removeItem(getHistoryKey(email));
}

function saveHistory(email, entries) {
  localStorage.setItem(getHistoryKey(email), JSON.stringify(entries));
}

// ─── AUTH MODAL ─────────────────────────────────────────────────────────────

function AuthModal({
  mode,
  onClose,
  onSubmit,
  error
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">

      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-sm px-5">

        <div className="bg-[#080f22] border border-white/10 rounded-3xl p-7 shadow-2xl">

          <div className="text-center mb-6">

            <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">
                {mode === 'register' ? '📝' : '🔐'}
              </span>
            </div>

            <h2 className="text-2xl font-black bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-500 bg-clip-text text-transparent">
              {mode === 'register'
                ? 'Crear Cuenta'
                : 'Iniciar Sesión'}
            </h2>

          </div>

          <div className="space-y-4">

            {/* Campo Nombre: Solo se muestra en modo Registro */}
            {mode === 'register' && (
              <input
                type="text"
                placeholder="Nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 focus:border-cyan-400/50 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none text-sm"
              />
            )}

            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 focus:border-cyan-400/50 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none text-sm"
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 focus:border-cyan-400/50 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none text-sm"
            />

            {error && (
              <div className="bg-red-500/10 border border-red-400/20 text-red-300 rounded-2xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={() => onSubmit(email, password, name)}
              className="w-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-700 text-white font-bold py-3 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {mode === 'register'
                ? 'Crear Cuenta'
                : 'Entrar'}
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

// ─── HISTORY PANEL ──────────────────────────────────────────────────────────

function HistoryPanel({
  history,
  onSelect,
  onClose,
  onDelete
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">

      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg mx-4 mb-4 sm:mb-0">

        <div className="bg-[#080f22] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">

          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">

            <h2 className="text-base font-bold text-white flex items-center gap-2">
              🗂️ Historial
            </h2>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition text-xl"
            >
              ×
            </button>

          </div>

          <div className="max-h-[420px] overflow-y-auto divide-y divide-white/5">

            {history.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-sm">
                No hay análisis guardados.
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-white/5 transition cursor-pointer group"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                >

                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 border border-white/10">

                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🍽️
                      </div>
                    )}

                  </div>

                  <div className="flex-1">

                    <p className="text-xs text-slate-400 mb-1">
                      {item.date} · {item.time}
                    </p>

                    <p className="text-sm text-slate-200 line-clamp-2">
                      {item.preview}
                    </p>

                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition"
                  >
                    🗑
                  </button>

                </div>
              ))
            )}

          </div>

        </div>

      </div>

    </div>
  );
}

function PlanModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">

      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">

        <div className="
  bg-[#080f22] border border-white/10 rounded-3xl p-8 shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">

          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-500 bg-clip-text text-transparent">
              🚀 Mejora tu Plan
            </h2>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          <p className="text-slate-400 mb-8 text-center">
            Desbloquea herramientas avanzadas para mejorar el seguimiento de tus cultivos y detectar problemas con mayor precisión.
          </p>

          {/* TARJETAS */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h3 className="text-2xl font-bold text-white mb-4">
                🌱 Plan Gratuito
              </h3>

              <ul className="space-y-3 text-slate-200">
                <li>✅ Consultas por fotos limitadas</li>
                <li>✅ Detección de enfermedades</li>
                <li>✅ Recomendaciones básicas</li>
              </ul>

              <button
                disabled
                className="mt-6 w-full bg-white/10 py-3 rounded-2xl font-bold text-slate-300"
              >
                Plan Actual
              </button>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-700/10 border border-cyan-400/30 rounded-3xl p-6">

              <div className="inline-block bg-cyan-500 text-white text-xs px-3 py-1 rounded-full mb-4">
                RECOMENDADO
              </div>

              <h3 className="text-2xl font-bold text-cyan-300 mb-4">
                🚜 Plan Premium
              </h3>

              <ul className="space-y-3 text-white">
                <li>✅ Todo lo del plan gratuito</li>
                <li>⭐ Recomendaciones precisas</li>
                <li>⭐ Consejos de cuidado</li>
                <li>⭐ Registro de cada cultivo por etapas</li>
                <li>⭐ Seguimiento avanzado</li>
              </ul>

              <button
                className="mt-6 w-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-700 py-3 rounded-2xl font-bold hover:scale-[1.02] transition"
              >
                Comprar Premium
              </button>

            </div>

          </div>

          {/* TABLA COMPARATIVA */}

          <div className="overflow-x-auto">

            <table className="w-full border-collapse overflow-hidden rounded-2xl">

              <thead>
                <tr className="bg-white/10">
                  <th className="text-left p-4">Características</th>
                  <th className="p-4 text-center">
                    Gratis
                  </th>
                  <th className="p-4 text-center text-cyan-300">
                    Premium
                  </th>
                </tr>
              </thead>

              <tbody>

                <tr className="border-t border-white/10">
                  <td className="p-4">Consultas por foto</td>
                  <td className="text-center">Limitadas</td>
                  <td className="text-center text-cyan-300">
                    Ilimitadas
                  </td>
                </tr>

                <tr className="border-t border-white/10">
                  <td className="p-4">Detección de enfermedades</td>
                  <td className="text-center">✅</td>
                  <td className="text-center">✅</td>
                </tr>

                <tr className="border-t border-white/10">
                  <td className="p-4">Recomendaciones básicas</td>
                  <td className="text-center">✅</td>
                  <td className="text-center">✅</td>
                </tr>

                <tr className="border-t border-white/10">
                  <td className="p-4">
                    Recomendaciones precisas IA
                  </td>
                  <td className="text-center">❌</td>
                  <td className="text-center">✅</td>
                </tr>

                <tr className="border-t border-white/10">
                  <td className="p-4">
                    Consejos de cuidado
                  </td>
                  <td className="text-center">❌</td>
                  <td className="text-center">✅</td>
                </tr>

                <tr className="border-t border-white/10">
                  <td className="p-4">
                    Registro por etapas
                  </td>
                  <td className="text-center">❌</td>
                  <td className="text-center">✅</td>
                </tr>

                <tr className="border-t border-white/10">
                  <td className="p-4">
                    Seguimiento avanzado
                  </td>
                  <td className="text-center">❌</td>
                  <td className="text-center">✅</td>
                </tr>

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </div>
  );
}  
// ─── MAIN ───────────────────────────────────────────────────────────────────

export default function Home() {

  const [ready, setReady] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  // Ahora 'user' almacena un objeto { email, name } o null
  const [user, setUser] = useState(null);

  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const [authError, setAuthError] = useState('');

  const [image, setImage] = useState(null);

  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState('');

  const [history, setHistory] = useState([]);

  const [showHistory, setShowHistory] = useState(false);

  // ─── SUPABASE SESSION INITIALIZATION & LISTENER ─────────────────────────────

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const email = session.user.email;
        const name = session.user.user_metadata?.name || email;
        setUser({ email, name });
        setHistory(loadHistory(email));
      }
      setReady(true);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const email = session.user.email;
        const name = session.user.user_metadata?.name || email;
        setUser({ email, name });
        setHistory(loadHistory(email));
      } else {
        setUser(null);
        setHistory([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── REGISTER WITH SUPABASE ────────────────────────────────────────────────

  const handleRegister = async (email, password, name) => {
    if (!email || !password || !name) {
      setAuthError('Completa todos los campos, incluido tu nombre');
      return;
    }

    if (!email.includes('@')) {
      setAuthError('Ingresa un correo electrónico válido');
      return;
    }

    // Pasamos el nombre dentro del objeto 'options.data' para que Supabase lo guarde en metadatos
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name
        }
      }
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        setAuthError('Este correo electrónico ya está registrado');
      } else if (error.message.includes('Password should be')) {
        setAuthError('La contraseña debe tener al menos 6 caracteres');
      } else {
        setAuthError(error.message);
      }
      return;
    }

    if (data?.user) {
      const uEmail = data.user.email;
      const uName = data.user.user_metadata?.name || name || uEmail;
      setUser({ email: uEmail, name: uName });
      setHistory(loadHistory(uEmail));
    }
    
    setShowRegister(false);
    setAuthError('');
  };

  // ─── LOGIN WITH SUPABASE ───────────────────────────────────────────────────

  const handleLogin = async (email, password) => {
    if (!email || !password) {
      setAuthError('Completa todos los campos');
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setAuthError('Correo electrónico o contraseña incorrectos');
      return;
    }

    if (data?.user) {
      const uEmail = data.user.email;
      const uName = data.user.user_metadata?.name || uEmail;
      setUser({ email: uEmail, name: uName });
      setHistory(loadHistory(uEmail));
    }

    setShowLogin(false);
    setAuthError('');
  };

  // ─── LOGOUT FROM SUPABASE ──────────────────────────────────────────────────

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setHistory([]);
    setResult('');
    setImage(null);
  };

  // ─── IMAGE ────────────────────────────────────────────────────────────────

  const handleImageChange = (e) => {

    const file = e.target.files[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Máximo 5MB');
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => setImage(reader.result);

    reader.readAsDataURL(file);
  };

  // ─── ANALYZE ──────────────────────────────────────────────────────────────

  const analyzeFood = async () => {

    if (!image) return;

    setLoading(true);

    setResult('');

    try {

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image }),
      });

      if (!response.ok) {
        throw new Error('Error del servidor');
      }

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
            time: new Date().toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            preview:
              data.result.replace(/\n/g, ' ').substring(0, 120) + '…',
          };

          const updated = [entry, ...history].slice(0, 30);

          setHistory(updated);

          saveHistory(user.email, updated);
        }
      }

    } catch {

      setResult(
        'Hubo un error al conectar con el servidor.'
      );

    } finally {

      setLoading(false);

    }
  };

  // ─── HISTORY ──────────────────────────────────────────────────────────────

  const handleDeleteEntry = (id) => {

    const updated = history.filter((h) => h.id !== id);

    setHistory(updated);

    if (user) {
      saveHistory(user.email, updated);
    }
  };

  const handleSelectHistory = (item) => {

    setResult(item.result);

    setImage(item.image);
  };

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-[#050816] text-white overflow-hidden relative">

      {/* Glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] bg-cyan-500/20 blur-[120px] rounded-full top-[-150px] left-[-100px]" />
        <div className="absolute w-[400px] h-[400px] bg-blue-700/20 blur-[120px] rounded-full bottom-[-120px] right-[-80px]" />
      </div>

      {/* AUTH */}

      {showRegister && (
        <AuthModal
          mode="register"
          onClose={() => {
            setShowRegister(false);
            setAuthError('');
          }}
          onSubmit={handleRegister}
          error={authError}
        />
      )}

      {showLogin && (
        <AuthModal
          mode="login"
          onClose={() => {
            setShowLogin(false);
            setAuthError('');
          }}
          onSubmit={handleLogin}
          error={authError}
        />
      )}

      {/* HISTORY */}

      {showHistory && (
        <HistoryPanel
          history={history}
          onSelect={handleSelectHistory}
          onClose={() => setShowHistory(false)}
          onDelete={handleDeleteEntry}
        />
         
      )}

      {showPlan && (
        <PlanModal
          onClose={() => setShowPlan(false)}
        />
      )}

      {/* TOP RIGHT */}

<div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-40">

  <div className="flex items-center gap-3">

    {/* BOTÓN PREMIUM SIEMPRE VISIBLE */}
    <button
      onClick={() => setShowPlan(true)}
      className="bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 text-black text-sm font-bold px-5 py-2.5 rounded-full shadow-lg hover:scale-[1.03] transition"
    >
      🚀 Mejorar el plan
    </button>

    {user ? (

      <div className="flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-md rounded-full px-4 py-2">

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-md shadow-cyan-400/20">
          {user.name.charAt(0).toUpperCase()}
        </div>

        <span className="text-sm text-slate-200 font-medium max-w-[120px] truncate">
          {user.name}
        </span>

        <button
          onClick={() => setShowHistory(true)}
          className="text-cyan-300 hover:text-cyan-100 text-xs font-semibold whitespace-nowrap"
        >
          🗂️ Historial
        </button>

        <button
          onClick={handleLogout}
          className="text-slate-400 hover:text-white text-xs"
        >
          ↩ Salir
        </button>

      </div>

    ) : (

      <>
        <button
          onClick={() => setShowRegister(true)}
          className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-lg shadow-cyan-500/20 hover:scale-[1.03] transition"
        >
          Registrarse
        </button>

        <button
          onClick={() => setShowLogin(true)}
          className="bg-white/5 border border-white/10 backdrop-blur-md text-slate-200 text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-white/10 transition"
        >
          Iniciar sesión
        </button>
      </>

    )}

  </div>

</div>
      {/* CONTENT */}

      <div className="relative z-10 max-w-7xl mx-auto px-5 pt-32 pb-10 sm:pt-14 sm:pb-14">

        {/* HEADER */}

        <header className="text-center mb-14">

          

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-500 bg-clip-text text-transparent">
            EcoScan AI
          </h1>

          <p className="text-slate-400 mt-5 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Escanea tu imagen y obtén análisis nutricionales inteligentes usando IA.
          </p>

        </header>

        {/* GRID */}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

          {/* LEFT PANEL */}
          <section className="lg:col-span-2 relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-700/10 rounded-3xl blur-xl opacity-70 group-hover:opacity-100 transition duration-500" />

            <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl">

              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  📸 Capturar Imagen
                </h2>
                <span className="text-[10px] uppercase tracking-widest bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-full border border-cyan-400/20">
                  AI Vision
                </span>
              </div>

              {/* Upload Area */}
              <div className="relative overflow-hidden border border-dashed border-cyan-400/20 hover:border-cyan-400/60 transition-all duration-300 rounded-3xl bg-[#0b1225]/80 w-full flex flex-col items-center justify-center p-3 group/upload">
                {image ? (
                  <>
                    <img
                      src={image}
                      alt="Comida seleccionada"
                      className="w-full max-h-80 object-contain rounded-2xl"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/upload:opacity-100 transition duration-300 flex items-center justify-center rounded-2xl">
                      <div className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-sm font-semibold text-white">
                        Cambiar Imagen
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16 space-y-4 pointer-events-none">
                    <div className="mx-auto w-24 h-24 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-400/20 shadow-inner shadow-cyan-500/10">
                      <span className="text-5xl">🌱</span>
                    </div>
                    <div>
                      <p className="text-cyan-200 font-semibold text-sm">
                        Arrastra una imagen o toma una foto
                      </p>
                      <p className="text-slate-500 text-xs mt-1">
                        JPG, PNG o HEIC compatibles
                      </p>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              {/* BUTTON */}
              <button
                onClick={analyzeFood}
                disabled={!image || loading}
                className="mt-6 relative w-full overflow-hidden bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-700 hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 text-white font-bold py-4 rounded-2xl shadow-2xl shadow-cyan-500/20 disabled:opacity-40 disabled:pointer-events-none"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Procesando Imagen...
                    </>
                  ) : (
                    <>✨ Analizar Alimentos</>
                  )}
                </span>
                <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition" />
              </button>

            </div>
          </section>

          {/* RIGHT PANEL */}
          <section className="lg:col-span-3 relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-3xl blur-xl opacity-60 group-hover:opacity-90 transition duration-500" />

            {result ? (
              <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-7 shadow-2xl">

                <div className="flex items-center justify-between border-b border-white/10 pb-5 mb-6">
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    📋 Reporte Nutricional
                  </h2>
                  <span className="bg-emerald-500/15 border border-emerald-400/20 text-emerald-300 text-xs px-3 py-1 rounded-full font-semibold">
                    COMPLETADO
                  </span>
                </div>

                <div className="whitespace-pre-line text-sm sm:text-[15px] leading-8 text-slate-200 bg-[#0b1225]/70 rounded-3xl p-6 border border-white/5 max-h-[550px] overflow-y-auto shadow-inner shadow-cyan-500/5">
                  {result}
                </div>

                <div className="mt-6 bg-amber-500/10 border border-amber-400/20 rounded-2xl p-4 text-sm text-amber-200 leading-relaxed backdrop-blur-md">
                  ⚠️ <strong>Descargo de responsabilidad médica:</strong>{' '}
                  Las estimaciones nutritional mostrado son aproximadas y únicamente informativas.
                  Consulta siempre con un nutricionista profesional antes de realizar cambios importantes en tu alimentación.
                </div>

              </div>
            ) : (
              <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl min-h-[420px] flex flex-col items-center justify-center text-center p-10 shadow-2xl">
                <div className="w-32 h-32 rounded-full bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center mb-6 shadow-inner shadow-cyan-500/10">
                  <span className="text-6xl">🪴</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Esperando análisis
                </h3>
                <p className="text-slate-400 text-sm max-w-md leading-relaxed">
                  Sube una fotografía y presiona el botón de análisis para generar un reporte.
                </p>
              </div>
            )}
          </section>

        </div>

        {/* FOOTER */}
        <footer className="mt-20 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-slate-500 border border-white/5 bg-white/5 backdrop-blur-md px-5 py-2 rounded-full">
            © 2026 EcoScan AI • Hackathon Project BUild With AI
          </div>
        </footer>

      </div>
    </main>
  );
}