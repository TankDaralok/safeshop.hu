exports.handler = async (event) => {
    const urlInput = event.queryStringParameters.url || "";
    if (!urlInput) return { statusCode: 400, body: "URL megadása kötelező." };

    // URL tisztítása (pl. https://www.pornhub.com.ru/ -> pornhub.com.ru)
    let cleanUrl = urlInput.toLowerCase().trim()
        .replace(/^(https?:\/\/)?(www\.)?/, '')
        .split('/')[0]; // Csak a domain részt nézzük, a perjel utániakat levágjuk

    // 1. Súlyozott pontozási rendszer
    let scores = { infrastructure: 25, transparency: 20, patterns: 30, reputation: 15, regional: 10 };
    let penalties = 0;
    let checks = [];

    // --- DOMAIN ELEMZÉS & FEHÉRLISTA (Szigorított) ---
    // A hiba itt volt: nem szabad engedni, hogy a 'pornhub.com.ru' átmenjen a 'pornhub.com' teszten.
    // Megoldás: Pontos egyezés vizsgálata vagy aldomain ellenőrzés (pl. sub.pornhub.com OK, de pornhub.com.ru NEM OK)
    
    const globalSafelist = ['google.com', 'youtube.com', 'facebook.com', 'wikipedia.org', 'pornhub.com', 'otpbank.hu'];
    
    // Ellenőrizzük, hogy a domain PONTOSAN egyezik-e, vagy valódi aldomain-e (pl. m.facebook.com)
    const isSafe = globalSafelist.some(safeDomain => {
        return cleanUrl === safeDomain || cleanUrl.endsWith('.' + safeDomain);
    });

    if (isSafe) {
        // Ha valódi, biztonságos oldal
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                score: 100, 
                checks: [{ cat: "Hírnév", status: "ok", msg: "Hivatalos, verifikált domain." }], 
                verdict: "Megbízható",
                explanation: "Ez egy ellenőrzött, hivatalos weboldal." 
            })
        };
    }

    // --- HA NEM FEHÉRLISTÁS, AKKOR ELEMZÉS ---

    // 1. "Double Extension" Trükkök (pl. .com.ru, .hu.net)
    // Ez a leggyakoribb adathalász trükk
    if (cleanUrl.match(/\.(com|net|org|hu|gov)\.(ru|xyz|top|vip|site|info)$/)) {
        penalties += 60; // Brutális büntetés
        checks.push({ cat: "Csaló Minta", status: "err", msg: "KRITIKUS: Megtévesztő domain végződés (pl. .com.ru)! Ez tipikus átverés." });
    }

    // 2. TLD (Végződés) Kockázat
    const riskyTLDs = ['ru', 'cn', 'xyz', 'top', 'win', 'vip', 'cam', 'gq'];
    const tld = cleanUrl.split('.').pop();
    if (riskyTLDs.includes(tld)) {
        penalties += 25;
        checks.push({ cat: "Infrastruktúra", status: "warn", msg: `A(z) .${tld} végződés magas kockázatú régióhoz vagy olcsó szolgáltatóhoz tartozik.` });
    }

    // 3. Márkanév lopás (Brand Spoofing)
    // Ha a névben benne van egy márka, de nem a hivatalos oldalon vagyunk
    const brands = ['otp', 'facebook', 'google', 'apple', 'pornhub', 'post', 'nav'];
    brands.forEach(brand => {
        if (cleanUrl.includes(brand)) {
            penalties += 30;
            checks.push({ cat: "Hírnév", status: "err", msg: `Gyanús: A(z) "${brand}" nevet használja, de nem a hivatalos domain.` });
        }
    });

    // 4. HTTPS hiánya
    if (!urlInput.startsWith('https')) {
        penalties += 30;
        checks.push({ cat: "Biztonság", status: "err", msg: "Nincs titkosítás (HTTP). Az oldal nem biztonságos." });
    } else {
        checks.push({ cat: "Biztonság", status: "ok", msg: "SSL titkosítás rendben." });
    }

    // 5. Kulcsszó gyanú
    if (cleanUrl.includes('login') || cleanUrl.includes('secure') || cleanUrl.includes('account')) {
        penalties += 15;
        checks.push({ cat: "Adathalászat", status: "warn", msg: "Érzékeny kulcsszavak (login, secure) használata ismeretlen domainen." });
    }

    // Végszámítás
    const finalScore = Math.max(0, 100 - penalties);
    let verdict = "Megbízható";
    if (finalScore < 40) verdict = "VESZÉLYES";
    else if (finalScore < 80) verdict = "Körültekintést igényel";

    // Humán magyarázat
    const explanation = finalScore > 80 
        ? "Az oldal technikai paraméterei rendben vannak." 
        : `Az oldal kockázatos! Fő ok: ${checks.find(c => c.status === 'err')?.msg || "Gyanús domain szerkezet."}`;

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