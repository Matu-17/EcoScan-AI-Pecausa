'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const VIEWS = { DASHBOARD: 'dashboard', MY_PLANTS: 'my_plants', PLANT_DETAIL: 'plant_detail', ADD_PLANT: 'add_plant' };
const HEALTH_COLORS = { excellent: '#16A34A', good: '#65A30D', fair: '#D97706', poor: '#DC2626' };
const HEALTH_LABELS = { excellent: 'Excelente', good: 'Buena', fair: 'Regular', poor: 'Crítica' };

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function createThumbnail(base64Image) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 120; canvas.height = 120;
      const ctx = canvas.getContext('2d');
      const size = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 120, 120);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(null);
    img.src = base64Image;
  });
}

function getPlantsKey(email) { return `ecoscan_plants_${email.toLowerCase().trim()}`; }
function loadPlants(email) {
  try { const r = localStorage.getItem(getPlantsKey(email)); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function savePlants(email, plants) { localStorage.setItem(getPlantsKey(email), JSON.stringify(plants)); }

function daysBetween(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function nextDate(dateStr, intervalDays) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setDate(d.getDate() + intervalDays);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getHealthStatus(plant) {
  const waterDays = daysBetween(plant.lastWatered);
  const interval = plant.waterInterval || 3;
  if (waterDays === null) return 'fair';
  if (waterDays > interval * 2) return 'poor';
  if (waterDays > interval * 1.5) return 'fair';
  if (waterDays <= interval) return 'excellent';
  return 'good';
}

function getAlerts(plant) {
  const alerts = [];
  const waterDays = daysBetween(plant.lastWatered);
  const fertDays = daysBetween(plant.lastFertilized);
  const photoDays = daysBetween(plant.lastPhotoDate);
  if (waterDays !== null && waterDays >= (plant.waterInterval || 3)) alerts.push({ type: 'water', msg: 'Necesita agua pronto', icon: '💧', level: waterDays > (plant.waterInterval || 3) * 1.5 ? 'high' : 'medium' });
  if (fertDays !== null && fertDays >= (plant.fertInterval || 30)) alerts.push({ type: 'fert', msg: 'Fertilización pendiente', icon: '🌿', level: 'medium' });
  if (photoDays !== null && photoDays > 14) alerts.push({ type: 'photo', msg: 'Sin actualización reciente', icon: '📷', level: 'low' });
  if (!waterDays && !plant.lastWatered) alerts.push({ type: 'water', msg: 'Registra tu primer riego', icon: '💧', level: 'low' });
  return alerts;
}

function getAchievements(plant) {
  const achievements = [];
  const updates = plant.updates?.length || 0;
  const waterDays = plant.waterStreak || 0;
  if (updates >= 1) achievements.push({ icon: '🌱', label: 'Primera foto', unlocked: true });
  if (updates >= 5) achievements.push({ icon: '📸', label: '5 actualizaciones', unlocked: true });
  else achievements.push({ icon: '📸', label: '5 actualizaciones', unlocked: false, progress: updates, total: 5 });
  if (waterDays >= 7) achievements.push({ icon: '💧', label: 'Racha 7 días', unlocked: true });
  else achievements.push({ icon: '💧', label: 'Racha 7 días', unlocked: false, progress: waterDays, total: 7 });
  if (plant.registeredAt && daysBetween(plant.registeredAt) >= 30) achievements.push({ icon: '🏆', label: '1 mes juntos', unlocked: true });
  else achievements.push({ icon: '🏆', label: '1 mes juntos', unlocked: false, progress: daysBetween(plant.registeredAt) || 0, total: 30 });
  return achievements;
}

// ─── AUTH MODAL ──────────────────────────────────────────────────────────────

function AuthModal({ mode, onClose, onSubmit, error }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div style={S.overlay}>
      <div style={S.overlayBg} onClick={onClose} />
      <div style={S.modalCard}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={S.modalIcon}>{mode === 'register' ? '🌱' : '🔐'}</div>
          <h2 style={S.modalTitle}>{mode === 'register' ? 'Crear cuenta' : 'Bienvenido de vuelta'}</h2>
          <p style={S.modalSub}>{mode === 'register' ? 'Únete a EcoScan AI' : 'Inicia sesión en tu cuenta'}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <div style={S.fieldGroup}>
              <label style={S.label}>Nombre completo</label>
              <input type="text" placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} style={S.input} />
            </div>
          )}
          <div style={S.fieldGroup}>
            <label style={S.label}>Correo electrónico</label>
            <input type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} style={S.input} />
          </div>
          <div style={S.fieldGroup}>
            <label style={S.label}>Contraseña</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={S.input} />
          </div>
          {error && <div style={S.errorBox}>{error}</div>}
          <button onClick={() => onSubmit(email, password, name)} style={S.btnPrimary}>
            {mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ADD PLANT FLOW ───────────────────────────────────────────────────────────

function AddPlantFlow({ onClose, onSave, user }) {
  const [step, setStep] = useState(1); // 1=upload, 2=species, 3=name, 4=care
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suggestedSpecies, setSuggestedSpecies] = useState([]);
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [plantName, setPlantName] = useState('');
  const [waterInterval, setWaterInterval] = useState(3);
  const [fertInterval, setFertInterval] = useState(30);
  const [dragOver, setDragOver] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file || file.size > 5 * 1024 * 1024) { alert('Máximo 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file || file.size > 5 * 1024 * 1024) { alert('Máximo 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const analyzeForSpecies = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          prompt: `Identifica la planta en esta imagen. Responde SOLO con un JSON válido con este formato exacto:
{"species": ["Nombre común 1 (nombre científico)", "Nombre común 2 (nombre científico)", "Nombre común 3 (nombre científico)"], "initial_analysis": "2-3 oraciones describiendo el estado visible de la planta"}
No incluyas markdown, backticks ni texto adicional.`
        }),
      });
      const data = await response.json();
      const text = (data.result || '').replace(/```json|```/g, '').trim();
      try {
        const parsed = JSON.parse(text);
        setSuggestedSpecies(parsed.species || []);
        setAnalysisResult(parsed.initial_analysis || '');
        if (parsed.species?.length > 0) setSelectedSpecies(parsed.species[0]);
      } catch {
        setSuggestedSpecies(['Especie no identificada']);
        setSelectedSpecies('Especie no identificada');
      }
      setStep(2);
    } catch { alert('Error al analizar la imagen'); }
    finally { setLoading(false); }
  };

  const savePlant = async () => {
    if (!plantName.trim()) return;
    const thumbnail = await createThumbnail(image);
    const now = new Date().toISOString();
    const newPlant = {
      id: Date.now().toString(),
      name: plantName.trim(),
      species: selectedSpecies,
      thumbnail,
      mainImage: image,
      registeredAt: now,
      lastPhotoDate: now,
      lastWatered: null,
      lastFertilized: null,
      waterInterval,
      fertInterval,
      waterStreak: 0,
      updates: [{
        id: Date.now(),
        date: now,
        image,
        thumbnail,
        analysis: analysisResult || 'Planta recién registrada.',
        type: 'initial',
      }],
      chatHistory: [],
      notes: '',
    };
    onSave(newPlant);
  };

  const steps = ['Foto', 'Especie', 'Nombre', 'Cuidados'];

  return (
    <div style={S.overlay}>
      <div style={S.overlayBg} onClick={onClose} />
      <div style={{ ...S.modalCard, maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Agregar planta</h2>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>Paso {step} de 4: {steps[step - 1]}</p>
          </div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < step ? '#16A34A' : '#E5E7EB', transition: 'background 0.3s' }} />
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>Sube una foto clara de tu planta para que la IA pueda identificarla.</p>
            <div
              style={{ ...S.dropZone, ...(dragOver ? S.dropZoneActive : {}), minHeight: 220 }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {image ? (
                <img src={image} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', display: 'block' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
                  <p style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>Arrastra o haz clic</p>
                  <p style={{ fontSize: 13, color: '#9CA3AF' }}>JPG, PNG · Máx. 5MB</p>
                </div>
              )}
              <input type="file" accept="image/*" capture="environment" onChange={handleImageChange}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
            </div>
            <button onClick={analyzeForSpecies} disabled={!image || loading} style={{ ...S.btnPrimary, marginTop: 16, width: '100%', opacity: (!image || loading) ? 0.5 : 1 }}>
              {loading ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><span style={S.spinner} />Identificando especie...</span> : '🔍 Identificar planta'}
            </button>
          </div>
        )}

        {/* Step 2: Species */}
        {step === 2 && (
          <div>
            {image && <img src={image} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 12, marginBottom: 16, backgroundColor: '#F9FAFB' }} />}
            {analysisResult && <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#15803D', marginBottom: 16 }}>{analysisResult}</div>}
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 12 }}>¿Cuál es tu planta?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {suggestedSpecies.map(sp => (
                <button key={sp} onClick={() => setSelectedSpecies(sp)} style={{
                  padding: '12px 16px', borderRadius: 10, border: `2px solid ${selectedSpecies === sp ? '#16A34A' : '#E5E7EB'}`,
                  backgroundColor: selectedSpecies === sp ? '#F0FDF4' : '#FFFFFF',
                  color: selectedSpecies === sp ? '#15803D' : '#374151',
                  fontWeight: selectedSpecies === sp ? 600 : 400, fontSize: 14,
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}>
                  {selectedSpecies === sp ? '✓ ' : ''}{sp}
                </button>
              ))}
              <button onClick={() => setSelectedSpecies('Otra especie')} style={{
                padding: '12px 16px', borderRadius: 10, border: `2px solid ${selectedSpecies === 'Otra especie' ? '#16A34A' : '#E5E7EB'}`,
                backgroundColor: '#FAFAFA', color: '#9CA3AF', fontSize: 14, cursor: 'pointer', textAlign: 'left',
              }}>
                + No está en la lista
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep(1)} style={{ ...S.btnOutline, flex: 1 }}>← Atrás</button>
              <button onClick={() => setStep(3)} disabled={!selectedSpecies} style={{ ...S.btnPrimary, flex: 2, opacity: !selectedSpecies ? 0.5 : 1 }}>Continuar →</button>
            </div>
          </div>
        )}

        {/* Step 3: Name */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>Dale un nombre personalizado a tu planta.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: 16, backgroundColor: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB' }}>
              {image && <img src={image} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover' }} />}
              <div>
                <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>Especie</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{selectedSpecies}</p>
              </div>
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>Nombre de tu planta</label>
              <input type="text" placeholder='Ej: "Mi Monstera", "Plantita del balcón"'
                value={plantName} onChange={e => setPlantName(e.target.value)}
                style={{ ...S.input, fontSize: 16, padding: '12px 16px' }}
                onKeyDown={e => e.key === 'Enter' && plantName.trim() && setStep(4)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep(2)} style={{ ...S.btnOutline, flex: 1 }}>← Atrás</button>
              <button onClick={() => setStep(4)} disabled={!plantName.trim()} style={{ ...S.btnPrimary, flex: 2, opacity: !plantName.trim() ? 0.5 : 1 }}>Continuar →</button>
            </div>
          </div>
        )}

        {/* Step 4: Care schedule */}
        {step === 4 && (
          <div>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>Configura la frecuencia de cuidados para recibir alertas.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 16, backgroundColor: '#EFF6FF', borderRadius: 12, border: '1px solid #DBEAFE' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>💧</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1E40AF' }}>Riego</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1E40AF' }}>cada {waterInterval} día{waterInterval > 1 ? 's' : ''}</span>
                </div>
                <input type="range" min={1} max={14} value={waterInterval} onChange={e => setWaterInterval(Number(e.target.value))}
                  style={{ width: '100%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#93C5FD', marginTop: 4 }}>
                  <span>1 día</span><span>7 días</span><span>14 días</span>
                </div>
              </div>
              <div style={{ padding: 16, backgroundColor: '#F0FDF4', borderRadius: 12, border: '1px solid #BBF7D0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🌿</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#15803D' }}>Fertilización</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#15803D' }}>cada {fertInterval} días</span>
                </div>
                <input type="range" min={7} max={90} step={7} value={fertInterval} onChange={e => setFertInterval(Number(e.target.value))}
                  style={{ width: '100%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#86EFAC', marginTop: 4 }}>
                  <span>1 sem</span><span>1 mes</span><span>3 meses</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setStep(3)} style={{ ...S.btnOutline, flex: 1 }}>← Atrás</button>
              <button onClick={savePlant} style={{ ...S.btnPrimary, flex: 2 }}>🌱 Registrar planta</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PLANT CARD ────────────────────────────────────────────────────────────

function PlantCard({ plant, onClick }) {
  const health = getHealthStatus(plant);
  const alerts = getAlerts(plant);
  const waterDays = daysBetween(plant.lastWatered);

  return (
    <div onClick={onClick} style={S.plantCard}>
      <div style={{ position: 'relative' }}>
        {plant.thumbnail || plant.mainImage ? (
          <img src={plant.thumbnail || plant.mainImage} alt={plant.name}
            style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: '16px 16px 0 0', display: 'block' }} />
        ) : (
          <div style={{ height: 160, backgroundColor: '#F0FDF4', borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🌿</div>
        )}
        {alerts.length > 0 && (
          <div style={{ position: 'absolute', top: 10, right: 10, backgroundColor: alerts[0].level === 'high' ? '#EF4444' : '#F59E0B', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
            {alerts.length}
          </div>
        )}
      </div>
      <div style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{plant.name}</p>
        <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>{plant.species}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: HEALTH_COLORS[health] }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: HEALTH_COLORS[health] }}>{HEALTH_LABELS[health]}</span>
          </div>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>
            {waterDays === null ? 'Sin riego registrado' : waterDays === 0 ? 'Regada hoy' : `Hace ${waterDays}d`}
          </span>
        </div>
        <div style={{ marginTop: 10, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 2, backgroundColor: HEALTH_COLORS[health], width: health === 'excellent' ? '95%' : health === 'good' ? '75%' : health === 'fair' ? '50%' : '25%', transition: 'width 0.5s' }} />
        </div>
      </div>
    </div>
  );
}

// ─── PLANT DETAIL ─────────────────────────────────────────────────────────────

function PlantDetail({ plant: initialPlant, onBack, onUpdate }) {
  const [plant, setPlant] = useState(initialPlant);
  const [activeTab, setActiveTab] = useState('overview');
  const [uploading, setUploading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [newPhoto, setNewPhoto] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [plant.chatHistory]);

  const update = (changes) => {
    const updated = { ...plant, ...changes };
    setPlant(updated);
    onUpdate(updated);
  };

  const markWatered = () => {
    const now = new Date().toISOString();
    const streak = (plant.waterStreak || 0) + 1;
    update({ lastWatered: now, waterStreak: streak });
  };

  const markFertilized = () => update({ lastFertilized: new Date().toISOString() });

  const handleNewPhoto = (e) => {
    const file = e.target.files[0];
    if (!file || file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onloadend = () => setNewPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const analyzeNewPhoto = async () => {
    if (!newPhoto) return;
    setAnalyzing(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: newPhoto,
          prompt: `Analiza el estado actual de esta ${plant.species} llamada "${plant.name}". 
Evalúa: salud general, color de hojas, posibles enfermedades, signos de estrés hídrico o carencias nutricionales.
Compara con el estado ideal de esta especie y da recomendaciones específicas de cuidado.
Responde en español de forma clara y directa.`,
        }),
      });
      const data = await response.json();
      const thumb = await createThumbnail(newPhoto);
      const entry = {
        id: Date.now(),
        date: new Date().toISOString(),
        image: newPhoto,
        thumbnail: thumb,
        analysis: data.result || 'Análisis completado.',
        type: 'update',
      };
      update({
        mainImage: newPhoto,
        thumbnail: thumb,
        lastPhotoDate: new Date().toISOString(),
        updates: [entry, ...(plant.updates || [])],
      });
      setNewPhoto(null);
    } catch { alert('Error al analizar'); }
    finally { setAnalyzing(false); }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: 'user', content: chatInput.trim(), date: new Date().toISOString() };
    const history = [...(plant.chatHistory || []), userMsg];
    update({ chatHistory: history });
    setChatInput('');
    setChatLoading(true);
    try {
      const context = `Eres un experto en botánica y cuidado de plantas. Estás hablando sobre una planta específica con estos datos:
- Nombre: ${plant.name}
- Especie: ${plant.species}
- Registrada: ${formatDate(plant.registeredAt)}
- Último riego: ${plant.lastWatered ? formatDate(plant.lastWatered) + ` (hace ${daysBetween(plant.lastWatered)} días)` : 'No registrado'}
- Última fertilización: ${plant.lastFertilized ? formatDate(plant.lastFertilized) : 'No registrada'}
- Frecuencia de riego configurada: cada ${plant.waterInterval} días
- Última foto: ${plant.lastPhotoDate ? formatDate(plant.lastPhotoDate) : 'No disponible'}
- Número de actualizaciones registradas: ${(plant.updates || []).length}
${plant.updates?.[0]?.analysis ? `- Último análisis: "${plant.updates[0].analysis}"` : ''}

Responde de forma concisa, práctica y personalizada para esta planta específica. Si no tienes información suficiente, pídela.`;
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: context,
          message: chatInput.trim(),
          chatHistory: plant.chatHistory?.slice(-6) || [],
        }),
      });
      const data = await response.json();
      const aiMsg = { role: 'assistant', content: data.result || 'No pude obtener respuesta.', date: new Date().toISOString() };
      update({ chatHistory: [...history, aiMsg] });
    } catch { }
    finally { setChatLoading(false); }
  };

  const health = getHealthStatus(plant);
  const alerts = getAlerts(plant);
  const achievements = getAchievements(plant);
  const waterDays = daysBetween(plant.lastWatered);
  const fertDays = daysBetween(plant.lastFertilized);
  const tabs = [{ id: 'overview', label: '📊 Resumen' }, { id: 'care', label: '💧 Cuidados' }, { id: 'updates', label: '📸 Historial' }, { id: 'ai', label: '🤖 IA' }];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      {/* Back + header */}
      <button onClick={onBack} style={{ ...S.btnOutline, marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        ← Mis Plantas
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 28 }}>
        <div style={{ width: 90, height: 90, borderRadius: 18, overflow: 'hidden', flexShrink: 0, border: '2px solid #E5E7EB' }}>
          {(plant.thumbnail || plant.mainImage)
            ? <img src={plant.thumbnail || plant.mainImage} alt={plant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🌿</div>
          }
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 4 }}>{plant.name}</h1>
          <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 10 }}>{plant.species}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 20, padding: '4px 12px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: HEALTH_COLORS[health] }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: HEALTH_COLORS[health] }}>{HEALTH_LABELS[health]}</span>
            </div>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>Registrada {formatDate(plant.registeredAt)}</span>
            {plant.waterStreak > 0 && (
              <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>
                🔥 Racha {plant.waterStreak} riegos
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', borderRadius: 10,
              backgroundColor: a.level === 'high' ? '#FEF2F2' : a.level === 'medium' ? '#FFFBEB' : '#F9FAFB',
              border: `1px solid ${a.level === 'high' ? '#FECACA' : a.level === 'medium' ? '#FDE68A' : '#E5E7EB'}`,
            }}>
              <span style={{ fontSize: 16 }}>{a.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: a.level === 'high' ? '#B91C1C' : a.level === 'medium' ? '#92400E' : '#6B7280' }}>{a.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, backgroundColor: '#F9FAFB', padding: 4, borderRadius: 12, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
            backgroundColor: activeTab === t.id ? '#FFFFFF' : 'transparent',
            color: activeTab === t.id ? '#111827' : '#9CA3AF',
            fontWeight: activeTab === t.id ? 700 : 400,
            fontSize: 13, whiteSpace: 'nowrap',
            boxShadow: activeTab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Overview */}
      {activeTab === 'overview' && (
        <div>
          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { icon: '💧', label: 'Último riego', value: waterDays === null ? '—' : waterDays === 0 ? 'Hoy' : `Hace ${waterDays}d` },
              { icon: '🌿', label: 'Fertilización', value: fertDays === null ? '—' : fertDays === 0 ? 'Hoy' : `Hace ${fertDays}d` },
              { icon: '📸', label: 'Actualizaciones', value: (plant.updates?.length || 0).toString() },
              { icon: '📅', label: 'Días registrada', value: `${daysBetween(plant.registeredAt) || 0}d` },
            ].map(s => (
              <div key={s.label} style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Latest analysis */}
          {plant.updates?.[0]?.analysis && (
            <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 14, padding: '16px 18px', marginBottom: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#15803D', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Último análisis IA</p>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>{plant.updates[0].analysis}</p>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>{formatDate(plant.updates[0].date)}</p>
            </div>
          )}

          {/* Achievements */}
          <div style={{ border: '1px solid #E5E7EB', borderRadius: 14, padding: '16px 18px' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 14 }}>🏆 Logros</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
              {achievements.map((a, i) => (
                <div key={i} style={{ backgroundColor: a.unlocked ? '#F0FDF4' : '#F9FAFB', border: `1px solid ${a.unlocked ? '#BBF7D0' : '#E5E7EB'}`, borderRadius: 10, padding: 12, textAlign: 'center', opacity: a.unlocked ? 1 : 0.6 }}>
                  <div style={{ fontSize: 24, marginBottom: 4, filter: a.unlocked ? 'none' : 'grayscale(100%)' }}>{a.icon}</div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: a.unlocked ? '#15803D' : '#9CA3AF' }}>{a.label}</p>
                  {!a.unlocked && a.progress !== undefined && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ height: 3, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', backgroundColor: '#16A34A', width: `${(a.progress / a.total) * 100}%` }} />
                      </div>
                      <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{a.progress}/{a.total}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Care */}
      {activeTab === 'care' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Water card */}
          <div style={{ border: '1px solid #DBEAFE', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#EFF6FF', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>💧</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, color: '#1E40AF', marginBottom: 2 }}>Riego</p>
                <p style={{ fontSize: 12, color: '#93C5FD' }}>Cada {plant.waterInterval} día{plant.waterInterval > 1 ? 's' : ''}</p>
              </div>
              {waterDays !== null && waterDays >= (plant.waterInterval || 3) && (
                <div style={{ backgroundColor: '#EF4444', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>¡Necesita agua!</div>
              )}
            </div>
            <div style={{ padding: '14px 18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Último riego</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{plant.lastWatered ? formatDate(plant.lastWatered) : '—'}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Próximo riego</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{plant.lastWatered ? nextDate(plant.lastWatered, plant.waterInterval || 3) : '—'}</p>
                </div>
              </div>
              <button onClick={markWatered} style={{ ...S.btnPrimary, width: '100%', backgroundColor: '#1D4ED8' }}>
                💧 Ya regué — {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </button>
            </div>
          </div>

          {/* Fertilizer card */}
          <div style={{ border: '1px solid #BBF7D0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#F0FDF4', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>🌿</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, color: '#15803D', marginBottom: 2 }}>Fertilización</p>
                <p style={{ fontSize: 12, color: '#86EFAC' }}>Cada {plant.fertInterval} días</p>
              </div>
            </div>
            <div style={{ padding: '14px 18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Última fertilización</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{plant.lastFertilized ? formatDate(plant.lastFertilized) : '—'}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Próxima</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{plant.lastFertilized ? nextDate(plant.lastFertilized, plant.fertInterval || 30) : '—'}</p>
                </div>
              </div>
              <button onClick={markFertilized} style={{ ...S.btnPrimary, width: '100%' }}>
                🌿 Ya fertilicé
              </button>
            </div>
          </div>

          {/* New photo + reanalysis */}
          <div style={{ border: '1px solid #E5E7EB', borderRadius: 16, padding: '16px 18px' }}>
            <p style={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}>📸 Nueva actualización</p>
            <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 14 }}>Sube una foto para reanálisis con IA</p>
            {newPhoto ? (
              <div style={{ marginBottom: 12 }}>
                <img src={newPhoto} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 10, backgroundColor: '#F9FAFB' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => setNewPhoto(null)} style={{ ...S.btnOutline, flex: 1 }}>Cambiar</button>
                  <button onClick={analyzeNewPhoto} disabled={analyzing} style={{ ...S.btnPrimary, flex: 2, opacity: analyzing ? 0.5 : 1 }}>
                    {analyzing ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><span style={S.spinner} />Analizando...</span> : '✨ Analizar'}
                  </button>
                </div>
              </div>
            ) : (
              <label style={{ ...S.btnOutline, display: 'block', textAlign: 'center', cursor: 'pointer' }}>
                📷 Subir foto
                <input type="file" accept="image/*" capture="environment" onChange={handleNewPhoto} style={{ display: 'none' }} />
              </label>
            )}
          </div>
        </div>
      )}

      {/* TAB: Updates history */}
      {activeTab === 'updates' && (
        <div>
          {(!plant.updates || plant.updates.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9CA3AF' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <p>Aún no hay actualizaciones registradas.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {plant.updates.map((u, i) => (
                <div key={u.id} style={{ border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', gap: 14, padding: 14 }}>
                    {u.thumbnail && <img src={u.thumbnail} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: i === 0 ? '#F0FDF4' : '#F9FAFB', color: i === 0 ? '#15803D' : '#9CA3AF', padding: '2px 8px', borderRadius: 20, border: `1px solid ${i === 0 ? '#BBF7D0' : '#E5E7EB'}` }}>
                          {i === 0 ? 'Más reciente' : u.type === 'initial' ? 'Registro inicial' : `Actualización #${plant.updates.length - i}`}
                        </span>
                        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{formatDate(u.date)}</span>
                      </div>
                      <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{u.analysis}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: AI Chat */}
      {activeTab === 'ai' && (
        <div>
          <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#15803D' }}>
            🤖 Asistente IA especializado en <strong>{plant.name}</strong> ({plant.species})
          </div>
          <div style={{ border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ minHeight: 320, maxHeight: 400, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(!plant.chatHistory || plant.chatHistory.length === 0) && (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#9CA3AF' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                  <p style={{ fontSize: 14, marginBottom: 16 }}>Pregúntame cualquier cosa sobre {plant.name}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {['¿Cuándo debo regar mi planta?', '¿Por qué las hojas se ponen amarillas?', '¿Qué fertilizante recomiendas?'].map(q => (
                      <button key={q} onClick={() => setChatInput(q)} style={{ padding: '8px 14px', borderRadius: 20, border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', fontSize: 13, color: '#374151', cursor: 'pointer', textAlign: 'left' }}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(plant.chatHistory || []).map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    backgroundColor: msg.role === 'user' ? '#16A34A' : '#F9FAFB',
                    border: msg.role === 'assistant' ? '1px solid #E5E7EB' : 'none',
                    fontSize: 14, color: msg.role === 'user' ? '#FFFFFF' : '#374151', lineHeight: 1.6,
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', backgroundColor: '#F9FAFB', borderRadius: 16, width: 'fit-content', border: '1px solid #E5E7EB' }}>
                  <span style={S.spinner} /><span style={{ fontSize: 13, color: '#9CA3AF' }}>Pensando...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ borderTop: '1px solid #E5E7EB', padding: 12, display: 'flex', gap: 8 }}>
              <input
                type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder={`Pregunta sobre ${plant.name}...`}
                style={{ ...S.input, flex: 1, margin: 0 }}
              />
              <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading} style={{ ...S.btnPrimary, padding: '0 16px', opacity: (!chatInput.trim() || chatLoading) ? 0.5 : 1 }}>
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function Dashboard({ plants, onNavigate }) {
  const needsAttention = plants.filter(p => getAlerts(p).some(a => a.level !== 'low'));
  const needsWater = plants.filter(p => {
    const d = daysBetween(p.lastWatered);
    return d === null || d >= (p.waterInterval || 3);
  });

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 6 }}>Panel de control 🌿</h1>
        <p style={{ fontSize: 15, color: '#9CA3AF' }}>{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 32 }}>
        {[
          { icon: '🌱', value: plants.length, label: 'Plantas registradas', color: '#16A34A', bg: '#F0FDF4' },
          { icon: '⚠️', value: needsAttention.length, label: 'Necesitan atención', color: '#D97706', bg: '#FFFBEB' },
          { icon: '💧', value: needsWater.length, label: 'Necesitan agua', color: '#1D4ED8', bg: '#EFF6FF' },
          { icon: '✅', value: plants.length - needsAttention.length, label: 'En buen estado', color: '#16A34A', bg: '#F0FDF4' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: s.bg, borderRadius: 16, padding: '18px 20px', border: `1px solid ${s.bg === '#F0FDF4' ? '#BBF7D0' : s.bg === '#FFFBEB' ? '#FDE68A' : s.bg === '#EFF6FF' ? '#DBEAFE' : '#BBF7D0'}` }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {plants.length === 0 ? (
        <div style={{ border: '2px dashed #D1D5DB', borderRadius: 20, padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🌱</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 8 }}>¡Empieza tu jardín!</h2>
          <p style={{ fontSize: 15, color: '#9CA3AF', marginBottom: 24, maxWidth: 380, margin: '0 auto 24px' }}>Registra tu primera planta y comienza a monitorear su salud con inteligencia artificial.</p>
          <button onClick={() => onNavigate(VIEWS.ADD_PLANT)} style={S.btnPrimary}>🌿 Agregar mi primera planta</button>
        </div>
      ) : (
        <>
          {/* Needs attention */}
          {needsAttention.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 14 }}>⚠️ Requieren atención</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {needsAttention.slice(0, 3).map(p => {
                  const alerts = getAlerts(p);
                  return (
                    <div key={p.id} onClick={() => onNavigate(VIEWS.PLANT_DETAIL, p)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, cursor: 'pointer' }}>
                      {(p.thumbnail || p.mainImage) && <img src={p.thumbnail || p.mainImage} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, color: '#111827', marginBottom: 2 }}>{p.name}</p>
                        <p style={{ fontSize: 12, color: '#92400E' }}>{alerts[0]?.msg}</p>
                      </div>
                      <span style={{ color: '#D97706', fontSize: 18 }}>→</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent plants */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Mis plantas</h2>
            <button onClick={() => onNavigate(VIEWS.MY_PLANTS)} style={{ fontSize: 13, color: '#16A34A', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Ver todas →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {plants.slice(0, 4).map(p => <PlantCard key={p.id} plant={p} onClick={() => onNavigate(VIEWS.PLANT_DETAIL, p)} />)}
          </div>
        </>
      )}
    </div>
  );
}

// ─── MY PLANTS ────────────────────────────────────────────────────────────────

function MyPlants({ plants, onNavigate }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const filtered = plants.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.species.toLowerCase().includes(search.toLowerCase());
    if (filter === 'attention') return matchSearch && getAlerts(p).some(a => a.level !== 'low');
    if (filter === 'good') return matchSearch && getAlerts(p).length === 0;
    return matchSearch;
  });

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Mis Plantas</h1>
          <p style={{ fontSize: 14, color: '#9CA3AF' }}>{plants.length} planta{plants.length !== 1 ? 's' : ''} registrada{plants.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => onNavigate(VIEWS.ADD_PLANT)} style={S.btnPrimary}>+ Agregar planta</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <input type="text" placeholder="Buscar planta..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...S.input, flex: 1, minWidth: 200 }} />
        {['all', 'attention', 'good'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${filter === f ? '#16A34A' : '#E5E7EB'}`, backgroundColor: filter === f ? '#F0FDF4' : '#FFFFFF', color: filter === f ? '#15803D' : '#6B7280', fontSize: 13, fontWeight: filter === f ? 700 : 400, cursor: 'pointer' }}>
            {f === 'all' ? 'Todas' : f === 'attention' ? '⚠️ Atención' : '✅ Saludables'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9CA3AF' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div>
          <p>{plants.length === 0 ? 'Aún no tienes plantas registradas.' : 'No se encontraron resultados.'}</p>
          {plants.length === 0 && <button onClick={() => onNavigate(VIEWS.ADD_PLANT)} style={{ ...S.btnPrimary, marginTop: 16 }}>+ Agregar planta</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {filtered.map(p => <PlantCard key={p.id} plant={p} onClick={() => onNavigate(VIEWS.PLANT_DETAIL, p)} />)}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [authError, setAuthError] = useState('');
  const [view, setView] = useState(VIEWS.DASHBOARD);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [plants, setPlants] = useState([]);
  const [showAddPlant, setShowAddPlant] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const u = { email: session.user.email, name: session.user.user_metadata?.name || session.user.email, id: session.user.id };
        setUser(u);
        setPlants(loadPlants(u.email));
      }
      setReady(true);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (session?.user) {
        const u = { email: session.user.email, name: session.user.user_metadata?.name || session.user.email, id: session.user.id };
        setUser(u);
        setPlants(loadPlants(u.email));
      } else { setUser(null); setPlants([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleRegister = async (email, password, name) => {
    if (!email || !password || !name) { setAuthError('Completa todos los campos'); return; }
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) { setAuthError(error.message); return; }
    if (data?.user) {
      await supabase.from('profiles').insert({ id: data.user.id, premium_until: null });
      setUser({ email: data.user.email, name, id: data.user.id });
      setPlants([]);
    }
    setShowRegister(false); setAuthError('');
  };

  const handleLogin = async (email, password) => {
    if (!email || !password) { setAuthError('Completa todos los campos'); return; }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setAuthError('Correo o contraseña incorrectos'); return; }
    if (data?.user) {
      const u = { email: data.user.email, name: data.user.user_metadata?.name || data.user.email, id: data.user.id };
      setUser(u);
      setPlants(loadPlants(u.email));
    }
    setShowLogin(false); setAuthError('');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setPlants([]); setView(VIEWS.DASHBOARD); setSelectedPlant(null);
  };

  const navigate = (destination, plant = null) => {
    setView(destination);
    setSelectedPlant(plant);
    setMobileMenuOpen(false);
    if (destination === VIEWS.ADD_PLANT) setShowAddPlant(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const savePlant = (newPlant) => {
    const updated = [newPlant, ...plants];
    setPlants(updated);
    if (user) savePlants(user.email, updated);
    setShowAddPlant(false);
    setView(VIEWS.MY_PLANTS);
  };

  const updatePlant = (updatedPlant) => {
    const updated = plants.map(p => p.id === updatedPlant.id ? updatedPlant : p);
    setPlants(updated);
    setSelectedPlant(updatedPlant);
    if (user) savePlants(user.email, updated);
  };

  const deletePlant = (plantId) => {
    if (!confirm('¿Eliminar esta planta?')) return;
    const updated = plants.filter(p => p.id !== plantId);
    setPlants(updated);
    if (user) savePlants(user.email, updated);
    setView(VIEWS.MY_PLANTS);
  };

  if (!ready) return null;

  const navItems = [
    { id: VIEWS.DASHBOARD, label: '🏠 Panel', icon: '🏠' },
    { id: VIEWS.MY_PLANTS, label: '🌿 Mis Plantas', icon: '🌿' },
  ];

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F8F7F2; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 3px; }
        button:focus-visible, input:focus-visible { outline: 2px solid #16A34A; outline-offset: 2px; }
      `}</style>

      {showRegister && <AuthModal mode="register" onClose={() => { setShowRegister(false); setAuthError(''); }} onSubmit={handleRegister} error={authError} />}
      {showLogin && <AuthModal mode="login" onClose={() => { setShowLogin(false); setAuthError(''); }} onSubmit={handleLogin} error={authError} />}
      {showAddPlant && <AddPlantFlow onClose={() => setShowAddPlant(false)} onSave={savePlant} user={user} />}

      {/* ── NAVBAR ── */}
      <nav style={S.navbar}>
        <div style={S.navInner}>
          <button onClick={() => navigate(VIEWS.DASHBOARD)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
            <div style={S.logoIcon}>🌿</div>
            <span style={S.logoText}>EcoScan<span style={{ color: '#16A34A' }}>AI</span></span>
          </button>

          {user && (
            <div style={{ display: 'flex', gap: 2, flex: 1, paddingLeft: 24 }}>
              {navItems.map(n => (
                <button key={n.id} onClick={() => navigate(n.id)} style={{
                  padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                  backgroundColor: view === n.id ? '#F0FDF4' : 'transparent',
                  color: view === n.id ? '#16A34A' : '#6B7280',
                  transition: 'all 0.15s',
                }}>
                  {n.label}
                </button>
              ))}
            </div>
          )}

          <div style={S.navActions}>
            {user ? (
              <>
                <button onClick={() => setShowAddPlant(true)} style={{ ...S.btnNavPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                  + Nueva planta
                </button>
                <div style={S.userPill}>
                  <div style={S.userAvatar}>{user.name.charAt(0).toUpperCase()}</div>
                  <span style={S.userName}>{user.name.split(' ')[0]}</span>
                  <button onClick={handleLogout} style={{ ...S.pillBtn, color: '#9CA3AF', marginLeft: 4 }}>Salir</button>
                </div>
              </>
            ) : (
              <>
                <button onClick={() => setShowLogin(true)} style={S.btnGhost}>Iniciar sesión</button>
                <button onClick={() => setShowRegister(true)} style={S.btnNavPrimary}>Registrarse</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main style={{ minHeight: 'calc(100vh - 64px)', paddingBottom: 40 }}>
        {!user ? (
          /* ── LANDING (not logged in) ── */
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', color: '#16A34A', fontSize: 13, fontWeight: 600, padding: '6px 16px', borderRadius: 20, marginBottom: 24 }}>
                🌾 Plataforma inteligente de monitoreo de plantas
              </div>
              <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 800, color: '#111827', lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: 20, fontFamily: "'DM Serif Display', serif" }}>
                Cuida tus plantas con<br /><span style={{ color: '#16A34A' }}>inteligencia artificial</span>
              </h1>
              <p style={{ fontSize: 18, color: '#6B7280', lineHeight: 1.7, marginBottom: 36, maxWidth: 540, margin: '0 auto 36px' }}>
                Registra, monitorea y recibe diagnósticos continuos de tus plantas. Un asistente personal para el cuidado de tu jardín.
              </p>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => setShowRegister(true)} style={{ ...S.btnPrimary, padding: '14px 28px', fontSize: 16 }}>🌱 Comenzar gratis</button>
                <button onClick={() => setShowLogin(true)} style={{ ...S.btnGhost, padding: '14px 28px', fontSize: 16 }}>Tengo una cuenta</button>
              </div>
            </div>

            {/* Features */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
              {[
                { icon: '🔬', title: 'Identificación IA', desc: 'Sube una foto y la IA identifica la especie, evalúa la salud y detecta enfermedades.' },
                { icon: '📊', title: 'Monitoreo continuo', desc: 'Registra riegos, fertilizaciones y el estado de cada planta a lo largo del tiempo.' },
                { icon: '🤖', title: 'Chat especializado', desc: 'Consulta con un asistente IA que conoce el historial completo de cada planta.' },
                { icon: '🏆', title: 'Gamificación', desc: 'Gana logros, mantén rachas y sube de nivel como cuidador de plantas.' },
              ].map(f => (
                <div key={f.title} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 18, padding: 24 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
                  <h3 style={{ fontWeight: 700, color: '#111827', marginBottom: 6, fontSize: 16 }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : view === VIEWS.DASHBOARD ? (
          <div className="fade-up">
            <Dashboard plants={plants} onNavigate={navigate} />
          </div>
        ) : view === VIEWS.MY_PLANTS ? (
          <div className="fade-up">
            <MyPlants plants={plants} onNavigate={navigate} />
          </div>
        ) : view === VIEWS.PLANT_DETAIL && selectedPlant ? (
          <div className="fade-up">
            <PlantDetail
              plant={selectedPlant}
              onBack={() => navigate(VIEWS.MY_PLANTS)}
              onUpdate={updatePlant}
            />
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #E5E7EB', padding: '20px 24px', backgroundColor: '#FFFFFF' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🌿</span>
            <span style={{ fontWeight: 700, color: '#111827' }}>EcoScan<span style={{ color: '#16A34A' }}>AI</span></span>
          </div>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>© 2026 EcoScan AI · Hackathon Project Build With AI</p>
        </div>
      </footer>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const S = {
  page: { fontFamily: "'DM Sans', sans-serif", backgroundColor: '#F8F7F2', color: '#1F2937', minHeight: '100vh' },

  // Overlay / Modal
  overlay: { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  overlayBg: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' },
  modalCard: { position: 'relative', zIndex: 10, backgroundColor: '#FFFFFF', borderRadius: 24, padding: '32px 28px', width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.14)' },
  modalIcon: { width: 64, height: 64, borderRadius: '50%', backgroundColor: '#F0FDF4', border: '2px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 },
  modalTitle: { fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 4 },
  modalSub: { fontSize: 14, color: '#6B7280' },
  closeBtn: { background: 'none', border: 'none', fontSize: 16, color: '#9CA3AF', cursor: 'pointer', padding: '4px 8px', borderRadius: 8 },
  errorBox: { backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: 10, padding: '10px 14px', fontSize: 13 },

  // Form
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: '#374151' },
  input: { padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, color: '#111827', outline: 'none', backgroundColor: '#FAFAFA', fontFamily: "'DM Sans', sans-serif", transition: 'border-color 0.2s' },

  // Buttons
  btnPrimary: { backgroundColor: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: 12, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 3px 10px rgba(22,163,74,0.25)', fontFamily: "'DM Sans', sans-serif" },
  btnOutline: { border: '1.5px solid #E5E7EB', background: '#FFFFFF', color: '#374151', borderRadius: 12, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'DM Sans', sans-serif" },
  btnGhost: { backgroundColor: 'transparent', color: '#374151', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'DM Sans', sans-serif" },
  btnNavPrimary: { backgroundColor: '#16A34A', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(22,163,74,0.3)', fontFamily: "'DM Sans', sans-serif" },

  // Drop zone
  dropZone: { position: 'relative', border: '2px dashed #D1D5DB', borderRadius: 16, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', backgroundColor: '#FAFAFA', cursor: 'pointer' },
  dropZoneActive: { borderColor: '#16A34A', backgroundColor: '#F0FDF4' },

  // Spinner
  spinner: { width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' },

  // Navbar
  navbar: { position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E5E7EB', padding: '0 24px' },
  navInner: { maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', height: 64, gap: 16 },
  logoIcon: { width: 36, height: 36, backgroundColor: '#F0FDF4', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: '1px solid #BBF7D0', flexShrink: 0 },
  logoText: { fontSize: 18, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', whiteSpace: 'nowrap' },
  navActions: { display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' },
  userPill: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 24, padding: '5px 12px' },
  userAvatar: { width: 28, height: 28, borderRadius: '50%', backgroundColor: '#16A34A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  userName: { fontSize: 13, fontWeight: 600, color: '#111827', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  pillBtn: { fontSize: 12, fontWeight: 600, color: '#16A34A', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" },

  // Plant card
  plantCard: { backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 18, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', ':hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' } },
};