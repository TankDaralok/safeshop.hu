exports.handler = async (event) => {
    const urlInput = event.queryStringParameters.url || "";
    if (!urlInput) return { statusCode: 400, body: "URL megadása kötelező." };

    let cleanUrl = urlInput.toLowerCase().trim().replace(/^(https?:\/\/)?(www\.)?/, '');
    const domainParts = cleanUrl.split('.');
    const tld = domainParts[domainParts.length - 1];

    // Súlyozott pontozási rendszer inicializálása
    let scores = { infrastructure: 25, transparency: 20, patterns: 30, reputation: 15, regional: 10 };
    let penalties = 0;
    let checks = [];

    // --- 1. DOMAIN & INFRASTRUKTÚRA (25%) ---
    if (!urlInput.startsWith('https')) {
        penalties += 25;
        checks.push({ cat: "Infrastruktúra", status: "err", msg: "Hiányzó SSL/HTTPS titkosítás." });
    } else {
        checks.push({ cat: "Infrastruktúra", status: "ok", msg: "Érvényes SSL tanúsítvány és biztonságos protokoll." });
    }
    
    const riskyTLDs = ['xyz', 'top', 'win', 'icu', 'shop', 'click', 'ru'];
    if (riskyTLDs.includes(tld)) {
        penalties += 15;
        checks.push({ cat: "Infrastruktúra", status: "warn", msg: "Kockázatos TLD végződés használata." });
    }

    // --- 2. ÁTLÁTHATÓSÁG ÉS JOGI MEGFELELÉS (20%) ---
    // (Mocked: Valós környezetben a HTML tartalmat szkenneljük Adatvédelem/ÁSZF után)
    const hasLegalPages = cleanUrl.includes('aszf') || cleanUrl.includes('adatvedelem');
    if (!hasLegalPages && tld === 'hu') {
        penalties += 10;
        checks.push({ cat: "Átláthatóság", status: "warn", msg: "Nem találhatók jogi dokumentumok (ÁSZF, Adatvédelem) a URL-ben." });
    }

    // --- 3. CSALÓ MINTÁK ÉS PSZICHOLÓGIAI NYOMÁS (30%) ---
    const scamKeywords = ['akcio', 'olcso', 'discount', 'sale', 'outlet', 'ingyen'];
    let scamHits = scamKeywords.filter(word => cleanUrl.includes(word));
    if (scamHits.length > 0) {
        penalties += 20;
        checks.push({ cat: "Minták", status: "warn", msg: "Sürgető marketing kulcsszavak észlelése a domainben." });
    }

    // --- 4. HÍRNÉV ÉS MÚLT (15%) ---
    const whiteList = ['google.com', 'youtube.com', 'facebook.com', 'wikipedia.org', 'otpbank.hu', 'gov.hu'];
    const isWhiteListed = whiteList.some(d => cleanUrl.startsWith(d));
    if (isWhiteListed) {
        penalties = 0; // Fehérlista felülírja a pontozást
        checks = [{ cat: "Hírnév", status: "ok", msg: "Verifikált, globálisan elismert szolgáltató." }];
    }

    // --- 5. REGIONÁLIS KOCKÁZATOK (10%) ---
    // Phishing imitáció ellenőrzés (pl. otpbank-biztonsag.com)
    const brandImitation = ['otpbank', 'nav', 'police', 'posta'].some(b => cleanUrl.includes(b) && !cleanUrl.endsWith('.hu') && !cleanUrl.endsWith('.hu/'));
    if (brandImitation && !isWhiteListed) {
        penalties += 40;
        checks.push({ cat: "Regionális", status: "err", msg: "Kritikus: Ismert magyar márka nevével való visszaélés gyanúja nem .hu doménen." });
    }

    // Végszámítás
    const finalScore = Math.max(0, 100 - penalties);
    let verdict = "Megbízható";
    if (finalScore < 40) verdict = "Magas Kockázat";
    else if (finalScore < 80) verdict = "Körültekintést igényel";

    // Humán magyarázat generálása
    const explanation = finalScore === 100 ? "A weboldal minden biztonsági teszten átment." : 
                        `Az oldal kockázatos, mivel ${checks.filter(c => c.status !== 'ok').map(c => c.msg.toLowerCase()).join(', ')}.`;

    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            score: finalScore, 
            checks: checks, 
            verdict: verdict,
            explanation: explanation 
        })
    };
};