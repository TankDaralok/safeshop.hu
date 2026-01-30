exports.handler = async (event) => {
    const url = event.queryStringParameters.url || "";
    let score = 100;
    let checks = [];

    // Simple Logic: Flag non-HTTPS sites
    if (!url.startsWith('https')) {
        score -= 50;
        checks.push("Nem biztonságos (No HTTPS)");
    }

    // Flag common scam words
    if (url.includes('cheap') || url.includes('akcio')) {
        score -= 20;
        checks.push("Gyanús kulcsszavak a névben");
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ score: Math.max(0, score), checks: checks })
    };
};