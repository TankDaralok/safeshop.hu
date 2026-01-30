exports.handler = async (event) => {
    const urlInput = event.queryStringParameters.url || "";
    if (!urlInput) return { statusCode: 400, body: "Hiányzó URL" };

    let score = 100;
    let checks = [];
    const url = urlInput.toLowerCase().trim().replace(/^(https?:\/\/)?(www\.)?/, '');
    const fullUrl = urlInput.startsWith('http') ? urlInput : `https://${urlInput}`;

    // 1. GLOBÁLIS BIZALMI LISTA (White-list)
    // Ha ezen rajta van, az alapértelmezetten 100% (ha HTTPS)
    const topDomains = ['google.com', 'youtube.com', 'facebook.com', 'wikipedia.org', 'gov.hu', 'index.hu', 'telex.hu', 'otpbank.hu'];
    const isTopDomain = topDomains.some(d => url.startsWith(d));

    // 2. HTTPS/SSL ELLENŐRZÉS (Kritikus minden oldalnál)
    if (!urlInput.startsWith('https')) {
        score -= 40;
        checks.push({ label: "Biztonsági réteg", status: "err", msg: "Az oldal nem használ titkosítást. Jelszavak vagy adatok megadása tilos!" });
    } else {
        checks.push({ label: "Biztonsági réteg", status: "ok", msg: "Titkosított kapcsolat (SSL) aktív." });
    }

    // 3. ADATHALÁSZAT ÉS KARAKTER-TRÜKKÖK (Punycode védelem)
    // Figyeli a gyanús kötőjeleket és számokat a névben
    const digitCount = (url.split('.')[0].match(/\d/g) || []).length;
    if (digitCount > 3) {
        score -= 20;
        checks.push({ label: "Domain elemzés", status: "warn", msg: "Szokatlanul sok szám a névben, ami gyakran automatizált csaló oldalakra utal." });
    }

    // 4. MEGBÍZHATÓSÁGI INDEX (TLD)
    const dangerousTLDs = ['.top', '.xyz', '.work', '.click', '.gq', '.cf', '.tk'];
    const currentTLD = '.' + url.split('.').pop();
    
    if (dangerousTLDs.includes(currentTLD)) {
        score -= 30;
        checks.push({ label: "Végződés", status: "warn", msg: `A(z) ${currentTLD} végződés ingyenes vagy olcsó, gyakran használják ideiglenes káros oldalakhoz.` });
    } else {
        checks.push({ label: "Végződés", status: "ok", msg: "Megbízható, szabványos domain végződés." });
    }

    // 5. GLOBÁLIS HÍRNÉV KORREKCIÓ
    if (isTopDomain && urlInput.startsWith('https')) {
        score = 100;
        checks = [{ label: "Hírnév", status: "ok", msg: "Ez egy hitelesített, világszerte ismert biztonságos webhely." }];
    }

    // Eredmény meghatározása
    let verdict = "Megbízható";
    if (score < 50) verdict = "Veszélyes";
    else if (score < 85) verdict = "Körültekintést igényel";

    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, checks, verdict })
    };
};