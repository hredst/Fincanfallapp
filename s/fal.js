exports.handler = async function(event) {
  // Sadece POST kabul et
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { name, imageBase64, imageMimeType } = JSON.parse(event.body);

    if (!name || !imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "Eksik bilgi" }) };
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY;

    const prompt = `Sen deneyimli ve mistik bir kahve falcisissin. Kullanici sana kahve fincaninin fotografini gonderiyor.

ONCE gorselin gercekten bir kahve fincani ici olup olmadigini kontrol et.

Eger gorsel bir kahve fincani ici DEGILSE sadece sunusyle yaz:
"Sevgili ${name}, fincaninizi goremiyorum. Falinizi okuyabilmem icin lutfen kahve fincaninizin icini fotograflayip gonderin."

Eger gorsel bir kahve fincani ici ISE kisinin adini kullanarak mistik, sicak ve umut dolu bir fal oku. Gorseldeki sekilleri, izleri ve desenleri yorumla. Su bolümlere ayir:

1. Fincanin genel enerjisi - gorseli dogrudan yorumla (2 cumle)
2. Ask ve iliskiler (2-3 cumle)
3. Is ve kariyer (2-3 cumle)
4. Yakin gelecek (2-3 cumle)
5. Falcinin notu - siiirsel, kisa bir kapanis (1 cumle)

Uslup: Mistik, sicak, kisisel. Turkce yaz. Kisinin adini dogal kullan. Emoji yok. Basliklar bold olmasin. Paragraflar arasi bos satir birak.

Kullanicinin adi: ${name}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: imageMimeType || "image/jpeg", data: imageBase64 } }
            ]
          }],
          generationConfig: { maxOutputTokens: 1000, temperature: 0.9 }
        })
      }
    );

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]) {
      return { statusCode: 500, body: JSON.stringify({ error: "AI yanit vermedi" }) };
    }

    const falText = data.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ falText })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Sunucu hatasi: " + err.message })
    };
  }
};
