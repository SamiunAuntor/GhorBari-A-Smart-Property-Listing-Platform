import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function normalizeAiResponseText(text) {
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

/**
 * Send a message to the Ghor AI backend for processing with Gemini API
 * @param {string} message - The user's message
 * @param {array} conversationHistory - Previous messages (currently unused, for future enhancement)
 * @param {object} axiosInstance - Axios instance with authorization headers (optional)
 * @returns {Promise<{text: string, matchedProperties: array}>} The AI response payload
 */
export const sendMessageToGemini = async (message, conversationHistory = [], axiosInstance = null) => {
    try {
        if (!message || !message.trim()) {
            throw new Error("Message cannot be empty");
        }

        // Use provided axios instance for authenticated requests
        if (axiosInstance) {
            try {
                const response = await axiosInstance.post("/api/ai/send-message", {
                    message: message.trim(),
                    conversationHistory: conversationHistory
                });

                if (response.data?.success && response.data?.response) {
                    console.log("✅ AI response received successfully");
                    return {
                        text: normalizeAiResponseText(response.data.response),
                        matchedProperties: Array.isArray(response.data.matchedProperties)
                            ? response.data.matchedProperties
                            : []
                    };
                }

                throw new Error(response.data?.error || "Invalid response from AI service");
            } catch (axiosError) {
                // Handle axios errors specifically
                if (axiosError.response) {
                    // Server responded with error status
                    const status = axiosError.response.status;
                    const errorData = axiosError.response.data;
                    
                    console.error(`❌ Server error (${status}):`, errorData);
                    
                    if (status === 429) {
                        throw new Error("quota-limit: I'm currently experiencing high demand. Please try again in a few moments.");
                    } else if (status === 401 || status === 403) {
                        throw new Error("auth: Please log in to use Ghor AI.");
                    } else if (status === 500) {
                        throw new Error("server-error: " + (errorData?.error || "Server error. Please try again later."));
                    } else {
                        throw new Error(errorData?.error || `API Error: ${status}`);
                    }
                } else if (axiosError.request) {
                    // Request made but no response
                    console.error("❌ No response from server:", axiosError.request);
                    throw new Error("connection-error: Unable to reach the server. Please check your connection.");
                } else {
                    // Error in setting up request
                    console.error("❌ Request setup error:", axiosError.message);
                    throw axiosError;
                }
            }
        } else {
            // Fallback: make unauthenticated request (will fail with 401)
            const response = await fetch(`${API_BASE_URL}/api/ai/send-message`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: message.trim(),
                    conversationHistory: conversationHistory
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.response) {
                    return {
                        text: normalizeAiResponseText(data.response),
                        matchedProperties: Array.isArray(data.matchedProperties)
                            ? data.matchedProperties
                            : []
                    };
                }
                throw new Error(data.error || "Invalid response from AI service");
            }

            const errorData = await response.json().catch(() => ({}));
            const statusCode = response.status;

            if (statusCode === 429) {
                throw new Error("quota-limit: I'm currently experiencing high demand. Please try again in a few moments.");
            } else if (statusCode === 401 || statusCode === 403) {
                throw new Error("auth: Please log in to use Ghor AI.");
            } else if (statusCode === 503) {
                throw new Error("service-unavailable: " + (errorData.error || "Our AI service is temporarily unavailable. Please try again later."));
            }

            throw new Error(errorData.error || `AI Service Error (${statusCode})`);
        }
    } catch (error) {
        console.error("❌ Ghor AI Error:", error);
        // Re-throw with more specific error handling in the component
        throw error;
    }
};
