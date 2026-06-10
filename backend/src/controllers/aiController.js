import { buildPropertyDescriptionPrompt, validatePropertyDescriptionPayload } from "../services/propertyDescriptionPromptService.js";
import { generateGroqText, getGroqModel } from "../services/groqService.js";
import { generatePropertyPriceEstimate } from "../services/propertyAppraisalService.js";
import { searchWebContext } from "../services/webSearchService.js";
import { buildConversationHistoryContext } from "../services/aiConversationService.js";
import { buildMatchedProperties, getPropertyMatchesForAi } from "../services/propertySearchService.js";

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

function shouldSearchWeb(propertyContext) {
    return propertyContext.intent.adviceIntent || propertyContext.total === 0;
}

function buildSystemPrompt(propertyContext) {
    return `You are Ghor AI, a real estate assistant for the Ghor Bari platform in Bangladesh.

Your responsibilities:
- Help users discover suitable properties from the platform's own listings.
- Give practical Bangladesh-specific housing advice when needed.
- Prefer grounded answers from the provided property matches whenever they exist.

Rules:
1. If matched platform properties are provided, refer to them directly and do not invent additional platform listings.
2. If no platform match exists, clearly say that no close listing is available right now before giving general advice.
3. For affordability advice, use rent guidance around 25% to 35% of income unless the user specifies otherwise.
4. Keep the reply concise, natural, and easy to read.
5. Do not use markdown, bullets, asterisks, hashtags, or fabricated links.
6. Mention prices only in BDT/Tk.
7. If the user asks a simple property search question, prioritize concrete listing suggestions over generic advice.

Current interpreted intent:
${JSON.stringify(propertyContext.filters)}`;
}

function buildUserPrompt({ message, conversationContext, propertyContext, webContext }) {
    return [
        conversationContext ? `Recent conversation:\n${conversationContext}` : "",
        `Latest user message: ${message}`,
        `Matched platform properties (${propertyContext.total}):\n${propertyContext.propertySummary || "None"}`,
        webContext.length > 0
            ? `Optional external context (use only if helpful):\n${JSON.stringify(webContext)}`
            : ""
    ].filter(Boolean).join("\n\n");
}

export const sendMessageToAI = async (req, res) => {
    try {
        const { message, conversationHistory = [] } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: "Message is required"
            });
        }

        const propertyContext = await getPropertyMatchesForAi(req.db, message, 5);
        const conversationContext = buildConversationHistoryContext(conversationHistory);

        let webContext = [];
        if (shouldSearchWeb(propertyContext)) {
            try {
                webContext = await searchWebContext(`${message} Bangladesh real estate`, 4);
            } catch (webError) {
                console.error("Web search context fetch failed:", webError.message);
            }
        }

        const systemPrompt = buildSystemPrompt(propertyContext);
        const userPrompt = buildUserPrompt({
            message,
            conversationContext,
            propertyContext,
            webContext
        });

        try {
            const startedAt = Date.now();
            const aiResponse = await generateGroqText({
                systemPrompt,
                userPrompt,
                temperature: 0.45,
                maxTokens: 420,
                topP: 0.9
            });
            const durationMs = Date.now() - startedAt;

            console.log("[AI] send-message", {
                durationMs,
                adviceIntent: propertyContext.intent.adviceIntent,
                matchCount: propertyContext.total,
                usedWebContext: webContext.length > 0
            });

            return res.status(200).json({
                success: true,
                response: normalizeAiChatResponse(aiResponse),
                matchedProperties: buildMatchedProperties(propertyContext.properties),
                filters: propertyContext.filters,
                model: GROQ_MODEL,
                source: propertyContext.total > 0 ? "grounded-db" : "advisory-fallback"
            });
        } catch (error) {
            const statusCode = error.response?.status || error.statusCode;

            if (propertyContext.total > 0 && (statusCode === 429 || statusCode === 503 || statusCode === 500)) {
                return res.status(200).json({
                    success: true,
                    response: normalizeAiChatResponse("I found matching properties on Ghor Bari, but the AI explanation is temporarily unavailable. Please review the property cards below."),
                    matchedProperties: buildMatchedProperties(propertyContext.properties),
                    filters: propertyContext.filters,
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

        const systemPrompt = "You write polished real-estate listing descriptions for a Bangladesh property marketplace. Your writing should be natural, trustworthy, concise, and conversion-friendly.";
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
                division_name: req.body?.divisionName,
                district_name: req.body?.districtName,
                upazila_name: req.body?.upazilaName,
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
