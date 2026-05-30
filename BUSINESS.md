# Análisis de Negocio y Viabilidad: EcoScan AI
**Hackathon:** Build With AI 2026  
**Proyecto:** Plataforma inteligente para monitoreo, diagnóstico y cuidado automatizado de plantas domésticas y huertos urbanos.  
**Ubicación de Impacto:** Santa Cruz de la Sierra, Bolivia  

---

## 1. Contexto Local e Impacto Regional

En Santa Cruz de la Sierra, el crecimiento urbano acelerado ha impulsado un gran interés en la **agricultura urbana, la jardinería de interiores y la reforestación doméstica**. No obstante, los ciudadanos se enfrentan a desafíos críticos:
1. **Estrés Hídrico y Sequía:** El departamento experimenta periodos secos intensos donde la gestión ineficiente del agua doméstica agrava la escasez. EcoScan AI calcula cronogramas de riego dinámicos para evitar el desperdicio.
2. **Desconocimiento Técnico:** El 70% de las plantas de interior o pequeños huertos mueren debido a un riego inadecuado (exceso o falta), luz deficiente o plagas no identificadas a tiempo.
3. **Biodiversidad Local:** EcoScan AI permite reconocer especies autóctonas del oriente boliviano y proveer cuidados adaptados a las condiciones de humedad y temperatura de la región.

---

## 2. Análisis PESTEL

Analizamos el entorno macroeconómico en el que opera EcoScan AI dentro del contexto boliviano, específicamente en Santa Cruz:

| Factor | Análisis de Entorno (Contexto Bolivia / Santa Cruz) |
| :--- | :--- |
| **Político** | * Apoyo municipal y gubernamental a iniciativas de sostenibilidad y digitalización urbana.<br>* Cumplimiento de políticas locales de incentivo ambiental (como campañas de arborización urbana en Santa Cruz). |
| **Económico** | * Tendencia de consumo hacia productos "verdes" y autosuficiencia alimentaria (micro-huertos).<br>* Modelo de precios Premium de bajo costo (29 BOB/mes) accesible para la clase media y jóvenes profesionales bolivianos. |
| **Social** | * Creciente interés en el bienestar mental, biofilia (conexión con la naturaleza) y decoración con plantas de interior.<br>* Rápida adopción de tecnologías móviles y soluciones basadas en smartphones en la población urbana cruceña. |
| **Tecnológico** | * Democratización del uso de Inteligencia Artificial Generativa y conectividad móvil 4G/5G.<br>* Integración de APIs de IA de alta disponibilidad (Google Gemini) y bases de datos seguras (Supabase) con coste por uso altamente optimizado. |
| **Ecológico** | * Alta relevancia ante el cambio climático, la variabilidad del régimen de lluvias y el calentamiento urbano en Santa Cruz.<br>* Promueve el cuidado preventivo y reduce la pérdida de biomasa vegetal doméstica, optimizando el uso del agua de riego. |
| **Legal** | * Normativas locales de protección de datos personales de usuarios.<br>* Cumplimiento de términos de uso y propiedad intelectual relacionados con el uso de APIs externas (Google y Supabase). |

---

## 3. Análisis FODA

Analizamos los factores internos (Fortalezas, Debilidades) y externos (Oportunidades, Amenazas) de la solución tecnológica:

### Factores Internos (Controlables)
* **Fortalezas (F):**
  1. **Análisis Multimodal Inmediato:** Diagnóstico preciso a través del reconocimiento visual de imágenes con Gemini 2.5.
  2. **Gamificación Integrada:** Sistema de logros, rachas y niveles que incrementa drásticamente la retención y el uso diario de la app.
  3. **Chat de Soporte Contextual:** El chatbot IA no es genérico, conoce la especie, el historial de riegos y el estado de salud exacto de la planta del usuario.
  4. **Arquitectura Serverless Eficiente:** Escalable, con procesamiento de imágenes (canvas thumbnails) optimizado en el cliente.
* **Debilidades (D):**
  1. **Dependencia de Conectividad:** Requiere conexión a internet para el análisis de imágenes por IA.
  2. **Dependencia de APIs de Terceros:** El costo y la velocidad de respuesta dependen del proveedor (Google Gemini y Supabase).

### Factores Externos (No Controlables)
* **Oportunidades (O):**
  1. **Mercado de Huertos Urbanos:** Alianzas estratégicas con viveros locales en Santa Cruz para recomendar plantas y vender fertilizantes directo en la plataforma.
  2. **Planes Corporativos:** Ofrecer licencias B2B a oficinas y constructoras de departamentos que deseen integrar el mantenimiento de áreas verdes comunes.
  3. **Educación Ecológica:** Expansión del modelo hacia escuelas y colegios para fomentar proyectos escolares de agro y botánica.
* **Amenazas (A):**
  1. **Competencia Internacional:** Apps extranjeras ya posicionadas en tiendas de aplicaciones móviles (aunque no adaptadas al mercado boliviano).
  2. **Variabilidad en Precios de APIs:** Aumentos imprevistos en los costos de consumo de modelos de inteligencia artificial generativa.

---

## 4. Lean Canvas EcoScan AI

| 1. PROBLEMA | 4. SOLUCIÓN | 3. PROPUESTA DE VALOR | 9. VENTAJA INJUSTA | 2. SEGMENTOS DE CLIENTES |
| :--- | :--- | :--- | :--- | :--- |
| * Alta tasa de muerte de plantas domésticas por desconocimiento de cuidados.<br>* Riego y abonado ineficientes.<br>* Dificultad para identificar plagas o enfermedades botánicas a tiempo. | * Diagnóstico instantáneo de salud e identificación de especie mediante IA.<br>* Sistema de notificaciones y temporizadores personalizados de riego.<br>* Chatbot IA interactivo alimentado con el historial de la planta. | **Tu asistente botánico en el bolsillo.**<br><br>Garantizamos el crecimiento saludable de tu jardín mediante diagnósticos por IA, gamificación interactiva que crea hábitos de riego, y un asistente que conoce la historia individual de tus plantas. | * Integración única de gamificación lúdica (*rachas de riego*) con diagnóstico avanzado por IA.<br>* Enfoque y adaptación a las especies y clima tropical de Santa Cruz. | * Entusiastas de plantas de interior y jardinería urbana.<br>* Personas ocupadas que olvidan regar sus plantas.<br>* Agricultores urbanos principiantes y aficionados. |
| **8. MÉTRICAS CLAVE** | | **5. CANALES** | | **EARLY ADOPTERS** |
| * Tasa de conversión (Gratuito a Premium).<br>* Retención diaria/semanal (DAU/WAU).<br>* Cantidad de plantas registradas.<br>* Frecuencia de uso del chatbot de IA. | | * Aplicación web responsiva de alta velocidad.<br>* Redes sociales (Instagram, TikTok) orientadas a la decoración verde.<br>* Alianzas con viveros y tiendas de plantas locales. | | * Jóvenes de 20 a 35 años que viven en departamentos y desean decorar con plantas.<br>* Entusiastas del cultivo de huertos orgánicos caseros. |
| **7. ESTRUCTURA DE COSTOS** | | **6. FUENTES DE INGRESOS** |
| * API de Google Gemini (costo por millar de tokens de entrada/salida).<br>* Infraestructura cloud en Supabase (base de datos relacional y autenticación).<br>* Mantenimiento de software y costos de marketing digital. | | * **Suscripción Premium Mensual:** 29 BOB/mes (Plantas ilimitadas, chat IA sin restricciones y diagnósticos avanzados).<br>* **Modelo B2B Viveros:** Comisión por referenciar productos de abono o plantas específicas de viveros cruceños. |

---

## 5. Estudio Financiero y Viabilidad de Costos

Para asegurar la sostenibilidad económica, se evalúa el costo operativo de la IA frente a los ingresos estimados.

### A. Costo Unitario de Uso de IA (Google Gemini 2.5 Flash)
* *Precio Promedio por Token:*
  * Entrada: $0.075 por millón de tokens ($0.000000075 por token)
  * Salida: $0.30 por millón de tokens ($0.00000030 por token)
* *Estimación de un Análisis Multimodal (Foto + Prompt):*
  * Imagen convertida y escalada + Prompt = ~4,000 tokens de entrada = **$0.0003**
  * Respuesta JSON de la IA = ~300 tokens de salida = **$0.00009**
  * **Costo por escaneo de planta: ~$0.00039 USD (~0.0027 BOB)**
* *Estimación de Consulta al Chatbot:*
  * Historial de chat (6 turnos) + Prompt de contexto = ~2,000 tokens de entrada = **$0.00015**
  * Respuesta del asistente = ~150 tokens de salida = **$0.000045**
  * **Costo por mensaje del chat: ~$0.000195 USD (~0.0013 BOB)**

### B. Rentabilidad por Usuario Premium (29 BOB / Mes ~ $4.20 USD)
Si un usuario Premium realiza un uso intenso al mes:
* 10 diagnósticos con foto al mes: $0.0039 USD
* 100 consultas de chat de soporte al mes: $0.0195 USD
* Costo total de API consumido por el usuario: **$0.0234 USD (~0.16 BOB)**
* **Margen Bruto de Contribución: >99% por usuario.**

*Nota: La rentabilidad permite cubrir ampliamente los costos fijos de base de datos en Supabase y deja fondos para adquisición de clientes (marketing).*
