// =====================================================
// AI ASSISTANT — Large Language Model
//
// Two features:
// 1. Farmers: write a product description from a few
//    details (name, category, location, notes).
// 2. Buyers: describe what they need in plain words
//    ("vegetables for a restaurant in Pune") and get
//    matching products from the REAL marketplace list.
//
// Works with either provider (set ONE key in .env):
//   GEMINI_API_KEY     -> Google Gemini (free tier)
//   ANTHROPIC_API_KEY  -> Anthropic Claude (paid)
// If both are set, Gemini is used.
// Without a key the rest of the website works normally
// and these buttons are hidden.
// Uses Node's built-in fetch (Node 18+), so no extra
// npm package is needed.
// =====================================================

const TIMEOUT_MS = 20000;


// ---------- Google Gemini ----------
const GEMINI_DEFAULT_MODEL = "gemini-3.5-flash-lite";

// GEMINI_API_BASE can be overridden (e.g. for testing)
const GEMINI_API_BASE =
    process.env.GEMINI_API_BASE ||
    "https://generativelanguage.googleapis.com/v1beta";


// ---------- Anthropic Claude ----------
const CLAUDE_DEFAULT_MODEL = "claude-haiku-5-5";

// ANTHROPIC_API_URL can be overridden (e.g. for testing)
const CLAUDE_API_URL =
    process.env.ANTHROPIC_API_URL ||
    "https://api.anthropic.com/v1/messages";


// Which provider is configured?
function getProvider() {

    if (process.env.GEMINI_API_KEY) return "gemini";

    if (process.env.ANTHROPIC_API_KEY) return "claude";

    return null;

}


function isEnabled() {

    return getProvider() !== null;

}


// Send a request with a timeout and return parsed JSON
async function postJson(url, headers, body) {

    if (typeof fetch !== "function") {
        throw new Error("AI assistant needs Node.js 18 or newer.");
    }


    const controller = new AbortController();

    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);


    try {

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                ...headers
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });


        const data = await response.json().catch(() => ({}));


        if (!response.ok) {

            const reason = data && data.error ? data.error.message : response.statusText;

            throw new Error(`AI service error (${response.status}): ${reason}`);

        }


        return data;

    } finally {

        clearTimeout(timer);

    }

}


// Google Gemini — generateContent API
async function callGemini(system, userMessage, maxTokens) {

    const model = process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL;

    const data = await postJson(
        `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`,
        {
            "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        {
            systemInstruction: {
                parts: [{ text: system }]
            },
            contents: [
                {
                    role: "user",
                    parts: [{ text: userMessage }]
                }
            ],
            generationConfig: {
                maxOutputTokens: maxTokens,
                temperature: 0.4
            }
        }
    );


    const candidate = (data.candidates || [])[0];

    if (!candidate || !candidate.content) {
        throw new Error("The AI did not return an answer. Please try again.");
    }


    return (candidate.content.parts || [])
        .map((part) => part.text || "")
        .join("")
        .trim();

}


// Anthropic Claude — Messages API
async function callClaude(system, userMessage, maxTokens) {

    const data = await postJson(
        CLAUDE_API_URL,
        {
            "x-api-key": process.env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01"
        },
        {
            model: process.env.AI_MODEL || CLAUDE_DEFAULT_MODEL,
            max_tokens: maxTokens,
            system,
            messages: [
                { role: "user", content: userMessage }
            ]
        }
    );


    return (data.content || [])
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("")
        .trim();

}


// One function used by both AI features
async function callAI(system, userMessage, maxTokens = 600) {

    const provider = getProvider();

    if (provider === "gemini") return callGemini(system, userMessage, maxTokens);

    if (provider === "claude") return callClaude(system, userMessage, maxTokens);

    throw new Error("AI assistant is not configured (add GEMINI_API_KEY to .env).");

}


// Keep user text short and single-line inside prompts
function clean(text, max = 200) {

    return String(text || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max);

}


// =====================================================
// 1. PRODUCT DESCRIPTION WRITER (FARMERS)
// =====================================================

async function generateDescription(details) {

    const system =
        "You write short, honest product descriptions for an Indian agricultural marketplace " +
        "where farmers sell directly to buyers. Write 2-4 plain sentences (max 600 characters). " +
        "Mention freshness, typical uses and quality only in general terms. Do not invent " +
        "certifications, awards, prices, discounts or health claims. No markdown, no emojis, no headings.";

    const userMessage =
        `Product name: ${clean(details.name, 100)}\n` +
        `Category: ${clean(details.category, 40)}\n` +
        `Sold per: ${clean(details.unit, 20)}\n` +
        `Farm location: ${clean(details.location, 80)}\n` +
        `Farmer's notes: ${clean(details.notes, 300) || "none"}\n\n` +
        "Write the description now.";


    const text = await callAI(system, userMessage, 300);

    return text.replace(/^["']|["']$/g, "").slice(0, 1000);

}


// =====================================================
// 2. SHOPPING ASSISTANT (BUYERS)
// The model may ONLY choose from the product list we
// send, and we double-check every returned id.
// =====================================================

async function recommendProducts(query, products) {

    const catalog = products.slice(0, 60).map((p) => ({
        id: String(p._id),
        name: p.name,
        category: p.category,
        price: p.price,
        unit: p.unit,
        available: p.quantity,
        location: p.location
    }));


    if (catalog.length === 0) {
        return { summary: "There are no products in stock right now.", picks: [] };
    }


    const system =
        "You are a shopping assistant for an agricultural marketplace. Choose products ONLY from " +
        "the JSON catalog provided. Reply with JSON only, no other text, in this exact shape: " +
        '{"summary": "one short sentence", "picks": [{"id": "<catalog id>", "reason": "max 15 words"}]}. ' +
        "Pick at most 4 products, best match first. If nothing matches, return an empty picks array " +
        "and explain briefly in summary.";

    const userMessage =
        `Buyer request: "${clean(query, 300)}"\n\nCatalog:\n${JSON.stringify(catalog)}`;


    const raw = await callAI(system, userMessage, 500);


    // Extract the JSON object even if extra text slipped in
    let parsed;

    try {

        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");

        parsed = JSON.parse(raw.slice(start, end + 1));

    } catch (error) {

        throw new Error("The AI reply could not be understood. Please try again.");

    }


    const byId = new Map(products.map((p) => [String(p._id), p]));


    const picks =
        (Array.isArray(parsed.picks) ? parsed.picks : [])
            .filter((pick) => pick && byId.has(String(pick.id)))
            .slice(0, 4)
            .map((pick) => {

                const product = byId.get(String(pick.id));

                return {
                    id: String(product._id),
                    name: product.name,
                    price: product.price,
                    unit: product.unit,
                    location: product.location,
                    farmerName: product.farmerName,
                    reason: clean(pick.reason, 140)
                };

            });


    return {
        summary: clean(parsed.summary, 200),
        picks
    };

}


module.exports = {
    isEnabled,
    getProvider,
    generateDescription,
    recommendProducts
};
