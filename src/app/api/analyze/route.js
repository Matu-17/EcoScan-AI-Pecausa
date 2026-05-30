import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

// Inicializa el cliente oficial de Google GenAI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No se recibió ninguna imagen' }, { status: 400 });
    }

    // Extrae solo los caracteres puros del Base64
    const base64PureData = image.split(',')[1]; 

    // Intentamos procesar primero con el modelo de alta precisión
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.5-flash', 
        contents: [
          {
            inlineData: {
              data: base64PureData,
              mimeType: 'image/jpeg'
            }
          },
          `Analiza la comida de la imagen.
          Responde breve y directo.
          Máximo 80 palabras.

          Formato:
          🍽️ Alimentos:
          - ingredientes visibles

          🔥 Calorías:
          - total aproximado

          🥗 Opciones saludables:
          1.
          2.`
        ],
      });
    } catch (proError) {
     
      const errorStr = JSON.stringify(proError);
      if (errorStr.includes('429')) {
        console.warn('Cuota Pro agotada. Activando fallback con Gemini 2.5 Flash...');
        
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash', // <--- Modelo secundario con cuota masiva gratuita
          contents: [
            {
              inlineData: {
                data: base64PureData,
                mimeType: 'image/jpeg'
              }
            },
            `Analiza la comida de la imagen. Responde breve y directo...` 
          ]
        });
      } else {
        throw proError; 
      }
    }

    
    if (!response.text) {
      return NextResponse.json({ error: 'La IA no devolvió texto' }, { status: 500 });
    }

    return NextResponse.json({ result: response.text });

  } catch (error) {
    console.error('Error detallado en tu servidor:', error);
    const errorMessage = JSON.stringify(error);

    if (errorMessage.includes('429')) {
      return NextResponse.json(
        { error: '⚠️ NutriCam AI está saturado. Espera unos segundos e intenta de nuevo.' },
        { status: 429 }
      );
    }

    if (errorMessage.includes('503')) {
      return NextResponse.json(
        { error: '⚠️ Los servidores de Google están saturados. Reintenta en momentos.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: '❌ Ocurrió un error al procesar la imagen con NutriCam AI.' },
      { status: 500 }
    );
  }
}
