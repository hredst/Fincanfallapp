exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { name, imageBase64, imageMimeType } = JSON.parse(event.body);

    if (!name || !imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "Eksik bilgi" }) };
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "API key bulunamadi" }) };
    }

    const prompt = `Sen deneyimli ve mistik bir kahve falcisissin. Kullanici sana kahve fincaninin fotografini gonderiyor.

ONCE gorselin gercekten bir kahve fincani ici olup olmadigini kontrol et.

Eger gorsel bir kahve fincani ici DEGILSE sadece su cumleri yaz:
"Sevgili ${name}, fincaninizi goremiyorum. Falinizi okuyabilmem icin lutfen kahve fincaninizin icini fotograflayip gonderin."

Eger gorsel bir kahve fincani ici ISE ${name} adli kisiye ozel mistik, sicak ve umut dolu bir fal oku. Su bolumlere ayir:

1. Fincanin genel enerjisi (2 cumle)
2. Ask ve iliskiler (2-3 cumle)
3. Is ve kariyer (2-3 cumle)
4. Yakin gelecek (2-3 cumle)
5. Falcinin notu - siiirsel kapаnis (1 cumle)

Turkce yaz. Kisinin adini dogal kullan. Paragraflar arasi bos satir birak.`;

    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          { 
            inline_data: { 
              mime_type: imageMimeType || "image/jpeg", 
              data: imageBase64 
            } 
          }
        ]
      }],
      generationConfig: { 
        maxOutputTokens: 800, 
        temperature: 0.9 
      }
    };

    console.log("Gemini API'ye istek gonderiliyor...");
    console.log("Image size (base64 length):", imageBase64.length);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      }
    );

    const data = await response.json();
    console.log("Gemini yaniti:", JSON.stringify(data).substring(0, 500));

    if (!response.ok) {
      console.error("Gemini hata:", data);
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: "Gemini hatasi: " + (data.error?.message || "Bilinmeyen hata") }) 
      };
    }

    if (!data.candidates || !data.candidates[0]) {
      console.error("Kandidat yok:", data);
      return { statusCode: 500, body: JSON.stringify({ error: "AI yanit vermedi" }) };
    }

    const falText = data.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ falText })
    };

  } catch (err) {
    console.error("Genel hata:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Sunucu hatasi: " + err.message })
    };
  }
};
