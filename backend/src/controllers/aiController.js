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

        const propertyContext = await getPropertyContextForAi(req.db, message);

        let webContext = [];
        try {
            webContext = await searchWebContext(`${message} Bangladesh real estate`, 5);
        } catch (webError) {
            console.error("Web search context fetch failed:", webError.message);
        }

        const systemPrompt = `You are Ghor AI, a helpful real estate assistant for a property rental and sales platform called "GHOR BARI" (which means "home" in Bengali). You help users find properties, answer questions about real estate, provide advice on renting or buying properties in Bangladesh, and assist with any property-related queries.

    Be friendly, professional, and helpful. Keep responses concise and informative.
    Always respond in plain text. Do not use markdown formatting, headings, bullets, asterisks, or hash symbols.

    You have access to two data sources:
    1) Local GHOR BARI database snapshot.
    2) Online web snippets.

    Prioritize local database records when recommending actual listings. Do not invent local listings.
    If no local listing matches, clearly say so and then provide helpful online guidance.
    When using web data, mention source URLs in plain text.
    Mention local property IDs when relevant so users can identify exact listings.`;

        const userPrompt = `User message: ${message}\n\nLocal property data snapshot (JSON):\n${JSON.stringify(propertyContext)}\n\nOnline web snippets (JSON):\n${JSON.stringify(webContext)}`;

        try {
            const aiResponse = await generateGroqText({
                systemPrompt,
                userPrompt,
                temperature: 0.7,
                maxTokens: 512,
                topP: 0.95
            });

            return res.status(200).json({
                success: true,
                response: normalizeAiChatResponse(aiResponse),
                model: GROQ_MODEL
            });
        } catch (error) {
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
