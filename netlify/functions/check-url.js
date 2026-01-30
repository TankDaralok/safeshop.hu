exports.handler = async (event) => {
    const urlInput = event.queryStringParameters.url || "";
    let score = 100;
    let checks = [];

    // URL tisztítása
    const url = urlInput.toLowerCase().trim();

    // 1. SSL Vizsgálat (40 pont)
    if (!url.startsWith('https')) {
        score -= 40;
        checks.push({ label: "Kapcsolat", status: "err", msg: "Nem titkosított (HTTP). Az adatai lehallgathatók!" });
    } else {
        checks.push({ label: "Kapcsolat", status: "ok", msg: "Biztonságos HTTPS protokoll." });
    }

    // 2. Domain Végződés (TLD) Vizsgálat (20 pont)
    const suspiciousTLDs = ['.xyz', '.top', '.pw', '.icu', '.shop', '.click', '.info'];
    const hasSuspiciousTLD = suspiciousTLDs.some(tld => url.endsWith(tld));
    
    if (hasSuspiciousTLD) {
        score -= 25;
        checks.push({ label: "Domain bizalom", status: "warn", msg: "Olcsó, gyakran csalásra használt végződés (.xyz, .shop stb.)." });
    } else if (url.endsWith('.hu')) {
        checks.push({ label: "Domain bizalom", status: "ok", msg: "Hazai (.hu) bejegyzésű domain." });
    }

    // 3. Magyar Specifikus Csaló Minták (30 pont)
    // Csalók gyakran használnak márkaneveket "akció" vagy "olcsó" szavakkal kombinálva
    const scamKeywords = ['akcio', 'olcso', 'shop', 'sale', 'cipok', 'outlet', 'rendeles'];
    const brandNames = ['nike', 'adidas', 'hu-nike', 'huhu', 'vatera', 'jofogas']; // imitált márkák
    
    let scamSigns = 0;
    scamKeywords.forEach(word => { if (url.includes(word)) scamSigns++; });
    
    if (scamSigns >= 2) {
        score -= 30;
        checks.push({ label: "Név elemzés", status: "err", msg: "Gyanúsan sok akciós kulcsszó a névben. Jellemző a csaló oldalakra." });
    }

    // 4. Kifinomultabb "Szuper-Olcsó" minta (pl: nikeakcio.hu)
    const regexPattern = /([a-z0-9])\1{2,}/; // pl: niiiike.hu (karakterismétlés)
    if (regexPattern.test(url)) {
        score -= 15;
        checks.push({ label: "Karakter vizsgálat", status: "warn", msg: "Szokatlan karakterismétlések a domainben." });
    }

    // Eredmény finomítása
    score = Math.max(0, Math.min(100, score));

    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            score: score, 
            checks: checks,
            timestamp: new Date().toISOString()
        })
    };
};