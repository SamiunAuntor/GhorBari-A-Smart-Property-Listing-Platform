import { buildPropertyDescriptionPrompt, validatePropertyDescriptionPayload } from "../services/propertyDescriptionPromptService.js";
import { generateGroqText, getGroqModel } from "../services/groqService.js";
import { generatePropertyPriceEstimate } from "../services/propertyAppraisalService.js";
import { searchWebContext } from "../services/webSearchService.js";

const GROQ_MODEL = getGroqModel();

function normalizeAiChatResponse(text) {
    if (!text || typeof text !== "string") {
        return "";
    }

    return text
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/^\s*[-*]\s+/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function extractBudgetFromMessage(message) {
    const normalized = message.toLowerCase().replace(/,/g, "");
    const budgetMatch = normalized.match(/(?:under|below|max(?:imum)?|budget)\s*(?:bdt|tk|taka)?\s*(\d{4,9})/i)
        || normalized.match(/(\d{4,9})\s*(?:bdt|tk|taka)/i);

    if (!budgetMatch) {
        return null;
    }

    const budget = Number(budgetMatch[1]);
    return Number.isFinite(budget) && budget > 0 ? budget : null;
}

function buildPropertyIntentQuery(message) {
    const normalized = message.toLowerCase();
    const query = { status: "active" };

    if (/\brent|rental|lease\b/.test(normalized)) {
        query.listingType = "rent";
    } else if (/\bbuy|sale|purchase\b/.test(normalized)) {
        query.listingType = "sale";
    }

    if (/\bflat|apartment\b/.test(normalized)) {
        query.propertyType = "flat";
    } else if (/\bbuilding\b/.test(normalized)) {
        query.propertyType = "building";
    }

    const budget = extractBudgetFromMessage(message);
    if (budget) {
        query.price = { $lte: budget };
    }

    return query;
}

function inferLocationKeyword(message) {
    const normalized = message.toLowerCase();
    const stopWords = new Set([
        "i", "need", "a", "an", "the", "for", "in", "at", "to", "on", "with", "near", "around",
        "rent", "rental", "lease", "buy", "sale", "purchase", "flat", "apartment", "building", "house",
        "property", "properties", "bdt", "tk", "taka", "under", "below", "max", "maximum", "budget",
        "and", "or", "me", "my", "please", "find", "show", "looking"
    ]);

    const tokens = normalized
        .replace(/[^a-z\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 4 && !stopWords.has(token));

    return tokens[0] || null;
}

async function getPropertyContextForAi(database, message, limit = 6) {
    const query = buildPropertyIntentQuery(message);
    const locationKeyword = inferLocationKeyword(message);
    const appliedFilters = {
        listingType: query.listingType || null,
        propertyType: query.propertyType || null,
        maxPrice: query.price?.$lte || null,
        locationKeyword
    };

    if (locationKeyword) {
        query.$or = [
            { "address.district_id": { $regex: locationKeyword, $options: "i" } },
            { "address.upazila_id": { $regex: locationKeyword, $options: "i" } },
            { "address.street": { $regex: locationKeyword, $options: "i" } },
            { title: { $regex: locationKeyword, $options: "i" } }
        ];
    }

    const properties = await database
        .collection("properties")
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

    const compactProperties = properties.map((property) => ({
        id: property._id?.toString(),
        title: property.title,
        listingType: property.listingType,
        propertyType: property.propertyType,
        price: property.price,
        areaSqFt: property.areaSqFt,
        roomCount: property.roomCount ?? null,
        bathrooms: property.bathrooms ?? null,
        floorCount: property.floorCount ?? null,
        totalUnits: property.totalUnits ?? null,
        division: property.address?.division_id || null,
        district: property.address?.district_id || null,
        upazila: property.address?.upazila_id || null,
        street: property.address?.street || null,
        amenities: Array.isArray(property.amenities) ? property.amenities.slice(0, 8) : [],
        createdAt: property.createdAt || null
    }));

    return {
        filters: appliedFilters,
        total: compactProperties.length,
        properties: compactProperties
    };
}

function formatLocation(property) {
    if (property.street) {
        return property.street;
    }

    const labels = [];
    if (property.upazila && Number.isNaN(Number(property.upazila))) {
        labels.push(property.upazila);
    }
    if (property.district && Number.isNaN(Number(property.district))) {
        labels.push(property.district);
    }
    if (property.division && Number.isNaN(Number(property.division))) {
        labels.push(property.division);
    }

    return labels.length ? labels.join(", ") : "Location details available in listing";
}

function formatLocalPropertyMatches(properties) {
    const lines = [];

    properties.slice(0, 5).forEach((property, index) => {
        const title = property.title || "Untitled property";
        const type = `${property.listingType || "n/a"} ${property.propertyType || "property"}`;
        const price = property.price ? `BDT ${property.price}` : "Price n/a";
        const area = property.areaSqFt ? `${property.areaSqFt} sqft` : null;
        const location = formatLocation(property);
        
        lines.push(`• ${title}`);
        lines.push(`  📍 ${location}`);
        lines.push(`  💰 ${price}`);
        lines.push(`  🏢 ${type}`);
        if (area) {
            lines.push(`  📏 ${area}`);
        }
        lines.push("");
    });

    return lines.join("\n").trim();
}

function buildMatchedProperties(properties) {
    return properties.slice(0, 5).map((property) => ({
        id: property.id,
        title: property.title || "Untitled property",
        location: formatLocation(property),
        price: property.price ?? null,
        listingType: property.listingType || "n/a",
        propertyType: property.propertyType || "property",
        areaSqFt: property.areaSqFt ?? null
    }));
}

async function getBestPropertyMatches(database, message, limit = 6) {
    const strictContext = await getPropertyContextForAi(database, message, limit);
    if (strictContext.total > 0) {
        return { context: strictContext, strategy: "strict" };
    }

    const baseQuery = buildPropertyIntentQuery(message);
    const relaxedQuery = { status: "active" };

    if (baseQuery.listingType) {
        relaxedQuery.listingType = baseQuery.listingType;
    }
    if (baseQuery.propertyType) {
        relaxedQuery.propertyType = baseQuery.propertyType;
    }

    const relaxedProperties = await database
        .collection("properties")
        .find(relaxedQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

    if (relaxedProperties.length > 0) {
        const properties = relaxedProperties.map((property) => ({
            id: property._id?.toString(),
            title: property.title,
            listingType: property.listingType,
            propertyType: property.propertyType,
            price: property.price,
            areaSqFt: property.areaSqFt,
            roomCount: property.roomCount ?? null,
            bathrooms: property.bathrooms ?? null,
            floorCount: property.floorCount ?? null,
            totalUnits: property.totalUnits ?? null,
            division: property.address?.division_id || null,
            district: property.address?.district_id || null,
            upazila: property.address?.upazila_id || null,
            street: property.address?.street || null,
            amenities: Array.isArray(property.amenities) ? property.amenities.slice(0, 8) : [],
            createdAt: property.createdAt || null
        }));

        return {
            strategy: "relaxed",
            context: {
                filters: {
                    listingType: relaxedQuery.listingType || null,
                    propertyType: relaxedQuery.propertyType || null,
                    maxPrice: null,
                    locationKeyword: null
                },
                total: properties.length,
                properties
            }
        };
    }

    return { context: strictContext, strategy: "none" };
}

function handleAiControllerError(res, error, fallbackMessage) {
    const statusCode = error.response?.status || error.statusCode || 500;
    const errorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.details ||
        error.message;

    if (statusCode === 401 || statusCode === 403) {
        return res.status(401).json({
            success: false,
            error: "AI service authentication failed. Please check your API key.",
            details: "Invalid or expired API key"
        });
    }

    if (statusCode === 429) {
        return res.status(429).json({
            success: false,
            error: "AI service is experiencing high demand. Please try again in a few moments.",
            details: "Rate limit reached"
        });
    }

    if (statusCode === 503 || statusCode === 500) {
        return res.status(statusCode === 500 ? 503 : statusCode).json({
            success: false,
            error: fallbackMessage,
            details: errorMessage
        });
    }

    return res.status(500).json({
        success: false,
        error: "An error occurred while processing your request.",
        details: errorMessage
    });
}

export const sendMessageToAI = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: "Message is required"
            });
        }

        const { context: propertyContext, strategy } = await getBestPropertyMatches(req.db, message);

        let webContext = [];
        try {
            webContext = await searchWebContext(`${message} Bangladesh real estate`, 5);
        } catch (webError) {
            console.error("Web search context fetch failed:", webError.message);
        }

        const systemPrompt = `You are Ghor AI, a real estate assistant for GhorAi platform.

Your job is to help users find rental properties and recommend suitable areas in Dhaka based on their budget, income, and preferences.

IMPORTANT RULES:

1. INTENT DETECTION
   If the user asks about:
   - "which area should I rent"
   - "best area to live"
   - "where should I stay"
   Then prioritize area recommendations.
   Only show database properties if they match the user's question and location.
   If properties are not relevant to the user's location or budget, do not show them.

2. BUDGET LOGIC
   Estimate affordable rent as: Income × 25% to 35%
   Example: Income 50,000 BDT → recommended rent 12,000–18,000 BDT.

3. DHAKA RENTAL KNOWLEDGE
   For mid-income renters (10k–20k rent), common areas include:
   Mirpur, Mohammadpur, Rampura, Badda, Jatrabari, Uttara sector 10–13
   
   Avoid recommending expensive areas like Gulshan or Banani unless the user's budget is high.

4. DO NOT invent platform features.
   Only describe properties from the database or give general housing advice.

5. Keep answers concise, clear, and practical.
   Do not add filler phrases like "Congratulations on your income".
   Do not add irrelevant website links.
   Do not use markdown formatting, headings, bullets, asterisks, or hash symbols in your text.

Always keep the response clean and easy to read.`;

        const userPrompt = `User message: ${message}\n\nLocal database filters used:\n${JSON.stringify(propertyContext.filters)}\n\nOnline web snippets (JSON):\n${JSON.stringify(webContext)}`;

        try {
            const aiResponse = await generateGroqText({
                systemPrompt,
                userPrompt,
                temperature: 0.7,
                maxTokens: 512,
                topP: 0.95
            });

            const combinedResponse = propertyContext.total > 0
                ? `Area or housing suggestions\n\n${aiResponse}`
                : `Properties available on Ghor Bari\n\nNo relevant property found in our database for this exact request.\n\n──────────\n\nArea or housing suggestions\n\n${aiResponse}`;

            return res.status(200).json({
                success: true,
                response: normalizeAiChatResponse(combinedResponse),
                matchedProperties: buildMatchedProperties(propertyContext.properties),
                model: GROQ_MODEL,
                source: propertyContext.total > 0 ? "hybrid-db-and-web" : "web-with-db-check"
            });
        } catch (error) {
            const combinedFallback = propertyContext.total > 0
                ? "Area or housing suggestions\n\nOnline response is temporarily unavailable. Please try again in a moment."
                : "Properties available on Ghor Bari\n\nNo relevant property found in our database for this exact request.\n\n──────────\n\nArea or housing suggestions\n\nOnline response is temporarily unavailable. Please try again in a moment.";

            const statusCode = error.response?.status || error.statusCode;
            if (propertyContext.total > 0 && (statusCode === 429 || statusCode === 503 || statusCode === 500)) {
                return res.status(200).json({
                    success: true,
                    response: normalizeAiChatResponse(combinedFallback),
                    matchedProperties: buildMatchedProperties(propertyContext.properties),
                    model: GROQ_MODEL,
                    source: "database-only-fallback"
                });
            }

            return handleAiControllerError(res, error, "AI service is temporarily unavailable. Please try again later.");
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: "An unexpected error occurred. Please try again later.",
            details: error.message
        });
    }
};

export const generatePropertyDescription = async (req, res) => {
    try {
        const validationError = validatePropertyDescriptionPayload(req.body);

        if (validationError) {
            return res.status(400).json({
                success: false,
                error: validationError
            });
        }

        const systemPrompt = `You write polished real-estate listing descriptions for a Bangladesh property marketplace. Your writing should be natural, trustworthy, concise, and conversion-friendly.`;
        const userPrompt = buildPropertyDescriptionPrompt(req.body);

        try {
            const description = await generateGroqText({
                systemPrompt,
                userPrompt,
                temperature: 0.6,
                maxTokens: 220,
                topP: 0.9
            });

            return res.status(200).json({
                success: true,
                description: description.replace(/\s+/g, " ").trim(),
                model: GROQ_MODEL
            });
        } catch (error) {
            return handleAiControllerError(res, error, "Description generation is temporarily unavailable. Please try again later.");
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: "An unexpected error occurred. Please try again later.",
            details: error.message
        });
    }
};

export const estimatePropertyPrice = async (req, res) => {
    try {
        const propertyPayload = {
            listingType: req.body?.listingType,
            propertyType: req.body?.propertyType,
            areaSqFt: req.body?.areaSqFt,
            roomCount: req.body?.roomCount,
            bathrooms: req.body?.bathrooms,
            floorCount: req.body?.floorCount,
            totalUnits: req.body?.totalUnits,
            amenities: req.body?.amenities,
            address: {
                division_id: req.body?.divisionName,
                district_id: req.body?.districtName,
                upazila_id: req.body?.upazilaName,
                street: req.body?.address
            }
        };

        const estimate = await generatePropertyPriceEstimate(propertyPayload);

        if (!estimate) {
            return res.status(400).json({
                success: false,
                error: "Fill the main property details first to estimate price."
            });
        }

        return res.status(200).json({
            success: true,
            estimate,
            model: GROQ_MODEL
        });
    } catch (error) {
        return handleAiControllerError(res, error, "Price estimation is temporarily unavailable. Please try again later.");
    }
};
