exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { name, imageBase64, imageMimeType, yas, cinsiyet, iliski } = JSON.parse(event.body);

    if (!name || !imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "Eksik bilgi" }) };
    }

    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "API key bulunamadi" }) };
    }

    // Kişisel bilgi metni
    let kisiselBilgi = `Kullanicinin adi: ${name}`;
    if (yas) kisiselBilgi += `, yasi: ${yas}`;
    if (cinsiyet) kisiselBilgi += `, cinsiyeti: ${cinsiyet}`;
    if (iliski) kisiselBilgi += `, iliski durumu: ${iliski}`;

    const prompt = `Sen yasli, bilge ve mistik bir Turk kahve falcisisin, adin Hatice Nine. Kullanici sana kahve fincaninin fotografini gonderiyor.

${kisiselBilgi}

ONCE gorseli dikkatlice incele. Gercekten bir kahve fincani ici mi?

Eger kahve fincani ici DEGILSE sadece su cumleri yaz:
"Evladim ${name}, fincanini goremiyorum. Falini okuyabilmem icin lutfen kahve fincaninin icini fotograflayip gonder."

Eger kahve fincani ici ISE fincandaki kahve izlerini, sekilleri ve desenleri gercekten analiz et. Ne goruyorsan onu yorumla, uydurmak yasak. Asagidaki bolumlere gore yaz:

1. Fincaninda ne goruyorum - gorseli dogrudan yorumla, hangi sekiller, izler var (2 cumle)
2. Ask ve iliskiler - iliski durumunu ve gorseli baz al (2-3 cumle)
3. Is ve kariyer - yasa ve gorsele gore yorumla (2-3 cumle)  
4. Yakin gelecek - gorseldeki isaretlere gore (2-3 cumle)
5. Hatice Nine'nin notu - sicak, annelik sifatiyla kapatis (1 cumle)

Uslup: Yasli, bilge, sicak bir nine gibi konuş. Turkce yaz. Kisinin adini dogal kullan. Paragraflar arasi bos satir birak. Emoji yok. Bold yok.`;

    console.log("Groq API'ye istek gonderiliyor...");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        max_tokens: 1000,
        temperature: 0.85,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${imageMimeType || "image/jpeg"};base64,${imageBase64}` } }
          ]
        }]
      })
    });

    const data = await response.json();
    console.log("Groq yaniti:", JSON.stringify(data).substring(0, 300));

    if (!response.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: "AI hatasi: " + (data.error?.message || "Bilinmeyen hata") }) };
    }

    const falText = data.choices[0].message.content;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ falText })
    };

  } catch (err) {
    console.error("Hata:", err.message);
    return { statusCode: 500, body: JSON.stringify({ error: "Sunucu hatasi: " + err.message }) };
  }
};
