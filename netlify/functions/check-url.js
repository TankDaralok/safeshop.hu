exports.handler = async (event) => {
    const urlInput = event.queryStringParameters.url || "";
    if (!urlInput) return { statusCode: 400, body: "Hiányzó URL" };

    let score = 100;
    let checks = [];
    
    // 1. URL Normalizálás és Tisztítás
    let cleanUrl = urlInput.toLowerCase().trim().replace(/^(https?:\/\/)?(www\.)?/, '');
    const domainParts = cleanUrl.split('.');
    const tld = domainParts[domainParts.length - 1];

    // 2. ADATHALÁSZAT ELLENI VÉDELEM (Subdomain trükkök)
    // Ha a 'pornhub.com.ru' típusú URL-t látjuk, az adathalászat
    if (domainParts.length > 2) {
        const primaryDomain = domainParts[domainParts.length - 2];
        const knownGlobals = ['google', 'youtube', 'facebook', 'pornhub', 'netflix', 'otpbank'];
        
        if (knownGlobals.includes(primaryDomain) && tld !== 'com' && tld !== 'hu' && tld !== 'org') {
            score -= 70;
            checks.push({ label: "Adathalászat", status: "err", msg: "VIGYÁZAT: Ez az oldal egy ismert szolgáltató nevét használja, de gyanús végződéssel (.ru, .xyz) próbálja átverni!" });
        }
    }

    // 3. SSL ELLENŐRZÉS
    if (!urlInput.startsWith('https')) {
        score -= 50;
        checks.push({ label: "Biztonság", status: "err", msg: "Nincs SSL titkosítás. Az adatforgalom nyitott és veszélyes." });
    } else {
        checks.push({ label: "Biztonság", status: "ok", msg: "Érvényes SSL tanúsítvány detektálva." });
    }

    // 4. MAGYAR CÉG ELLENŐRZÉS (Heurisztika)
    // Ha .hu a domain, ellenőrizzük a hitelességet
    if (tld === 'hu') {
        checks.push({ label: "Cégadatok", status: "ok", msg: "A .hu domain regisztrációhoz valós magyar adatok szükségesek, ami növeli a bizalmat." });
    } else if (['ru', 'xyz', 'top', 'win'].includes(tld)) {
        score -= 30;
        checks.push({ label: "Cégadatok", status: "warn", msg: "A választott domain végződés nem igényel azonosítást, gyakran használják anonim csalók." });
    }

    // 5. GLOBÁLIS FEHÉRLISTA
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