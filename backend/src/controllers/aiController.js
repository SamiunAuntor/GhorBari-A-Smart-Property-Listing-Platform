import { buildPropertyDescriptionPrompt, validatePropertyDescriptionPayload } from "../services/propertyDescriptionPromptService.js";
import { generateGroqText, getGroqModel } from "../services/groqService.js";
import { generatePropertyPriceEstimate } from "../services/propertyAppraisalService.js";

const GROQ_MODEL = getGroqModel();

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

        const systemPrompt = `You are Ghor AI, a helpful real estate assistant for a property rental and sales platform called "GHOR BARI" (which means "home" in Bengali). You help users find properties, answer questions about real estate, provide advice on renting or buying properties in Bangladesh, and assist with any property-related queries.

Be friendly, professional, and helpful. Keep responses concise and informative.`;

        try {
            const aiResponse = await generateGroqText({
                systemPrompt,
                userPrompt: message,
                temperature: 0.7,
                maxTokens: 512,
                topP: 0.95
            });

            return res.status(200).json({
                success: true,
                response: aiResponse,
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
