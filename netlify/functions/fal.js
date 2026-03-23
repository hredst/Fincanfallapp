exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { name, imageBase64, imageMimeType } = JSON.parse(event.body);

    if (!name || !imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "Eksik bilgi" }) };
    }

    const GROQ_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "API key bulunamadi" }) };
    }

    console.log("Groq API'ye istek gonderiliyor...");
    console.log("Image size:", imageBase64.length);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        max_tokens: 1000,
        temperature: 0.9,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Sen deneyimli ve mistik bir kahve falcisissin. Sana bir kahve fincaninin fotografini gonderiyorum.

ONCE gorseli dikkatlice incele. Gercekten bir kahve fincani ici mi?

Eger kahve fincani ici DEGILSE sadece su cumleri yaz:
"Sevgili ${name}, fincaninizi goremiyorum. Falinizi okuyabilmem icin lutfen kahve fincaninizin icini fotograflayip gonderin."

Eger kahve fincani ici ISE fincandaki kahve izlerini, sekilleri ve desenleri gercekten analiz et. Ne goruyorsan onu yorumla. Uydurma, gorsele bak. Su bolumlere ayir:

1. Fincaninda ne goruyorum - gercek gozlemini yaz (2 cumle)
2. Ask ve iliskiler - bu sekillere gore yorumla (2-3 cumle)  
3. Is ve kariyer - bu sekillere gore yorumla (2-3 cumle)
4. Yakin gelecek - bu sekillere gore yorumla (2-3 cumle)
5. Falcinin notu - siiirsel bir kapаnis (1 cumle)

Kisinin adi: ${name}
Turkce yaz. Adini dogal kullan. Paragraflar arasi bos satir birak.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${imageMimeType || "image/jpeg"};base64,${imageBase64}`
                }
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    console.log("Groq yaniti:", JSON.stringify(data).substring(0, 300));

    if (!response.ok) {
      console.error("Groq hata:", data);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "AI hatasi: " + (data.error?.message || "Bilinmeyen hata") })
      };
    }

    const falText = data.choices[0].message.content;

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
