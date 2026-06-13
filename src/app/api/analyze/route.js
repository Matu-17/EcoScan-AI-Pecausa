import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PLANT_IDENTIFICATION_PROMPT = `Eres un experto botánico. Analiza esta imagen de una planta y responde ÚNICAMENTE con un objeto JSON válido, sin markdown, sin backticks, sin texto adicional antes ni después.

El JSON debe tener exactamente este formato:

{
  "recommended_species": {
    "name": "Nombre común de la especie",
    "scientific_name": "Nombre científico",
    "confidence": 85
  },
  "alternatives": [
    {
      "name": "Segunda especie posible",
      "confidence": 65
    },
    {
      "name": "Tercera especie posible",
      "confidence": 45
    }
  ],
  "health_analysis": "Descripción del estado de salud visible de la planta en 1-2 oraciones.",
  "watering_days": 5,
  "fertilizer_days": 30,
  "fertilizer_type": "NPK 10-10-10",
  "sunlight": "Luz indirecta brillante",
  "difficulty": "Fácil"
}

Reglas:
- confidence es un número entero entre 0 y 100
- watering_days es un número entero entre 1 y 30
- fertilizer_days es un número entero entre 7 y 180
- difficulty debe ser uno de: "Muy fácil", "Fácil", "Moderada", "Difícil", "Muy difícil"
- Si no puedes identificar la planta con certeza, baja el confidence del recommended_species por debajo de 60
- Responde SOLO el JSON. Nada más.`;

const CHAT_SYSTEM_DEFAULT = `Eres un experto en botánica y cuidado de plantas. Responde de forma concisa, práctica y personalizada. Si no tienes información suficiente, pídela.`;

async function callGemini(contents, modelName = 'gemini-2.5-flash') {
  const response = await ai.models.generateContent({
    model: modelName,
    contents,
  });
  return response.text;
}

async function callGeminiWithFallback(contents) {
  try {
    return await callGemini(contents, 'gemini-2.5-flash');
  } catch (err) {
    const errStr = JSON.stringify(err);
    if (errStr.includes('429') || errStr.includes('503')) {
      console.warn('Primary model quota hit, trying fallback...');
      return await callGemini(contents, 'gemini-1.5-flash');
    }
    throw err;
  }
}

async function* callGeminiStream(contents, modelName = 'gemini-2.5-flash') {
  const responseStream = await ai.models.generateContentStream({
    model: modelName,
    contents,
  });
  for await (const chunk of responseStream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

async function* callGeminiStreamWithFallback(contents) {
  try {
    yield* callGeminiStream(contents, 'gemini-2.5-flash');
  } catch (err) {
    const errStr = JSON.stringify(err);
    if (errStr.includes('429') || errStr.includes('503')) {
      console.warn('Primary model quota hit, trying fallback for stream...');
      yield* callGeminiStream(contents, 'gemini-1.5-flash');
      return;
    }
    throw err;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // ── CHAT / TEXT ANALYSIS (with stream) ──────────────────────────────────
    if (body.message) {
      const systemPrompt = body.systemPrompt || CHAT_SYSTEM_DEFAULT;
      const userMessage = body.message;

      const contents = [];

      // Add image if present in the chat message
      if (body.image) {
        const base64Data = body.image.split(',')[1];
        if (base64Data) {
          contents.push({
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg',
            },
          });
        }
      }

      const conversationContents = [];

      // Include system context as first user turn if provided
      if (body.systemPrompt) {
        conversationContents.push(`[CONTEXTO DEL SISTEMA]\n${systemPrompt}\n\n[FIN CONTEXTO]`);
      }

      // Add prior chat history (last 6 turns)
      if (body.chatHistory && body.chatHistory.length > 0) {
        for (const msg of body.chatHistory.slice(-6)) {
          conversationContents.push(`${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`);
        }
      }

      conversationContents.push(`Usuario: ${userMessage}\nAsistente:`);
      contents.push(conversationContents.join('\n\n'));

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of callGeminiStreamWithFallback(contents)) {
              controller.enqueue(encoder.encode(chunk));
            }
          } catch (error) {
            console.error('Error in streaming chatbot response:', error);
            controller.error(error);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    // ── PLANT IDENTIFICATION (image-based) ──────────────────────────────────
    if (body.image) {
      const base64Data = body.image.split(',')[1];
      if (!base64Data) {
        return NextResponse.json({ error: 'Imagen inválida' }, { status: 400 });
      }

      const contents = [
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg',
          },
        },
        PLANT_IDENTIFICATION_PROMPT,
      ];

      let rawText = await callGeminiWithFallback(contents);

      // Strip any accidental markdown fences
      rawText = rawText.replace(/```json|```/g, '').trim();

      // Validate it's real JSON
      try {
        const parsed = JSON.parse(rawText);
        return NextResponse.json({ result: JSON.stringify(parsed) });
      } catch {
        // If JSON parse fails, return a low-confidence fallback
        const fallback = {
          recommended_species: {
            name: 'Especie desconocida',
            scientific_name: 'Unknown',
            confidence: 0,
          },
          alternatives: [],
          health_analysis: 'No se pudo analizar el estado de salud.',
          watering_days: 7,
          fertilizer_days: 30,
          fertilizer_type: 'Fertilizante equilibrado',
          sunlight: 'Luz indirecta',
          difficulty: 'Moderada',
        };
        return NextResponse.json({ result: JSON.stringify(fallback) });
      }
    }

    // ── FALLBACK PROMPT ANALYSIS (no image, non-streamed) ──────────────────
    if (body.prompt) {
      const systemPrompt = body.systemPrompt || CHAT_SYSTEM_DEFAULT;
      const userMessage = body.prompt;

      const conversationContents = [];

      // Include system context as first user turn if provided
      if (body.systemPrompt) {
        conversationContents.push(`[CONTEXTO DEL SISTEMA]\n${systemPrompt}\n\n[FIN CONTEXTO]`);
      }

      // Add prior chat history (last 6 turns)
      if (body.chatHistory && body.chatHistory.length > 0) {
        for (const msg of body.chatHistory.slice(-6)) {
          conversationContents.push(`${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`);
        }
      }

      conversationContents.push(`Usuario: ${userMessage}\nAsistente:`);

      const text = await callGeminiWithFallback([conversationContents.join('\n\n')]);
      return NextResponse.json({ result: text });
    }

    return NextResponse.json({ error: 'Solicitud inválida: se requiere imagen o mensaje' }, { status: 400 });

  } catch (error) {
    console.error('Error en /api/analyze:', error);
    const errStr = JSON.stringify(error);

    if (errStr.includes('429')) {
      return NextResponse.json(
        { error: '⚠️ La IA está saturada. Espera unos segundos e intenta de nuevo.' },
        { status: 429 }
      );
    }
    if (errStr.includes('503')) {
      return NextResponse.json(
        { error: '⚠️ Los servidores de Google están saturados. Reintenta en breve.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: '❌ Error al procesar la solicitud.' },
      { status: 500 }
    );
  }
}
