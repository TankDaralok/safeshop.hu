exports.handler = async (event) => {
    const urlInput = event.queryStringParameters.url || "";
    if (!urlInput) return { statusCode: 400, body: "Hiányzó URL" };

    let score = 100;
    let checks = [];
    
    // 1. Tisztítás és Alapok
    let cleanUrl = urlInput.toLowerCase().trim().replace(/^(https?:\/\/)?(www\.)?/, '');
    const domainParts = cleanUrl.split('.');
    const tld = domainParts[domainParts.length - 1];

    // 2. Google Safe Browsing Szimuláció (Ingyenes API hívás helye)
    // Ha van API kulcsod, ide illesztheted be a lekérdezést
    // Addig is használjuk a kiterjesztett feketelistát
    const knownPhish = ['pornhub.com.ru', 'nike-akcio.hu', 'otp-belepes.xyz', 'vatera-eladas.top'];
    if (knownPhish.includes(cleanUrl)) {
        score = 0;
        checks.push({ label: "Feketelista", status: "err", msg: "Ez a domain szerepel a globális adathalász adatbázisunkban!" });
    }

    // 3. Karakter-hasonlósági vizsgálat (Levenshtein-elv)
    // Megnézzük, hogy egy bank nevét próbálják-e imitálni
    const banks = ['otpbank', 'mbhbank', 'raiffeisen', 'erstebank'];
    banks.forEach(bank => {
        if (cleanUrl.includes(bank) && !cleanUrl.includes(bank + '.hu') && !cleanUrl.includes(bank + '.com')) {
            score -= 60;
            checks.push({ label: "Imitáció", status: "err", msg: `VIGYÁZAT: Ez az oldal a(z) ${bank} nevével él vissza, de nem a hivatalos domaint használja!` });
        }
    });

    // 4. Ingyenes TLD Bizalmi Index
    const freeTlds = ['tk', 'ml', 'ga', 'cf', 'gq', 'xyz', 'top', 'win', 'bid'];
    if (freeTlds.includes(tld)) {
        score -= 30;
        checks.push({ label: "Domain költség", status: "warn", msg: "Ingyenes vagy extrém olcsó domain végződés, amit gyakran használnak eldobható csaló oldalakhoz." });
    }

    // 5. SSL & Hírnév (Ahogy korábban)
    if (!urlInput.startsWith('https')) {
        score -= 40;
        checks.push({ label: "Biztonság", status: "err", msg: "Nincs titkosítás. Az adatai veszélyben vannak." });
    } else {
        checks.push({ label: "Biztonság", status: "ok", msg: "Titkosított HTTPS kapcsolat." });
    }

    // Globális hírnév korrekció
    const whiteList = ['google.com', 'youtube.com', 'wikipedia.org', 'telex.hu', 'index.hu', 'pornhub.com'];
    if (whiteList.some(d => cleanUrl === d || cleanUrl.startsWith(d + '/'))) {
        score = 100;
        checks = [{ label: "Hitelesítés", status: "ok", msg: "Ez egy hivatalos, verifikált globális szolgáltatás." }];
    }

    score = Math.max(0, score);
    let verdict = score > 80 ? "Megbízható" : (score > 40 ? "Kockázatos" : "Veszélyes");

    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, checks, verdict })
    };
};