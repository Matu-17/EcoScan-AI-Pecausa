-- ==========================================
-- ESQUEMA DE BASE DE DATOS: ECOSCAN AI
-- HACKATHON BUILD WITH AI 2026
-- ==========================================
-- Ejecuta este script en el editor SQL de tu consola de Supabase
-- (https://supabase.com -> Tu Proyecto -> SQL Editor)

-- 1. Crear tabla de Plantas
CREATE TABLE IF NOT EXISTS public.plants (
    id TEXT PRIMARY KEY,                       -- ID único autogenerado por el frontend (Date.now())
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- ID del usuario autenticado
    name TEXT NOT NULL,                        -- Nombre asignado por el usuario
    species TEXT,                              -- Especie (identificada o personalizada)
    thumbnail TEXT,                            -- Imagen miniatura en formato Base64
    main_image TEXT,                           -- Imagen completa en formato Base64
    registered_at TIMESTAMPTZ NOT NULL,        -- Fecha de registro
    last_photo_date TIMESTAMPTZ,               -- Fecha de última actualización de foto
    last_watered TIMESTAMPTZ,                  -- Fecha de último riego
    last_fertilized TIMESTAMPTZ,               -- Fecha de última fertilización
    water_streak INTEGER DEFAULT 0,            -- Racha de riegos
    confidence INTEGER,                        -- % Confianza IA
    recommended_watering_days INTEGER,         -- Frecuencia de riego sugerida por IA
    recommended_fertilizer_days INTEGER,       -- Frecuencia de fertilización sugerida por IA
    fertilizer_type TEXT,                      -- Tipo abono IA
    sunlight TEXT,                             -- Tipo luz IA
    difficulty TEXT,                           -- Dificultad IA
    activities JSONB DEFAULT '[]'::jsonb,      -- Historial de actividades (riego, abono, etc.)
    updates JSONB DEFAULT '[]'::jsonb,         -- Historial de fotos y diagnósticos IA
    chat_history JSONB DEFAULT '[]'::jsonb,    -- Historial del chat interactivo con el Asistente IA
    notes TEXT DEFAULT '',                     -- Notas adicionales
    created_at TIMESTAMPTZ DEFAULT NOW()       -- Fecha de creación en base de datos
);

-- 2. Habilitar la seguridad a nivel de fila (Row Level Security - RLS)
-- Esto garantiza que un usuario no pueda leer ni editar las plantas de otro usuario.
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

-- 3. Crear Políticas de Acceso RLS (Políticas Select, Insert, Update, Delete)

-- Política para permitir que los usuarios lean solo sus propias plantas
CREATE POLICY "Permitir lectura a usuarios de sus propias plantas" 
ON public.plants 
FOR SELECT 
USING (auth.uid() = user_id);

-- Política para permitir que los usuarios inserten sus propias plantas
CREATE POLICY "Permitir insercion de plantas propias" 
ON public.plants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Política para permitir que los usuarios actualicen solo sus propias plantas
CREATE POLICY "Permitir actualizacion de plantas propias" 
ON public.plants 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política para permitir que los usuarios eliminen solo sus propias plantas
CREATE POLICY "Permitir eliminacion de plantas propias" 
ON public.plants 
FOR DELETE 
USING (auth.uid() = user_id);

-- ==========================================
-- 4. Crear Tabla de Perfiles Premium (Opcional, en caso de requerir validación)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    premium_until TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura de perfiles propios"
ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Permitir actualizacion de perfiles propios"
ON public.profiles FOR UPDATE USING (auth.uid() = id);
