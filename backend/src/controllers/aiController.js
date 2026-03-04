import axios from "axios";

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Hugging Face model for real estate AI
// Using meta-llama/Llama-2-7b-chat-hf (works on free tier)
const HUGGINGFACE_MODEL = "meta-llama/Llama-2-7b-chat-hf";
const HUGGINGFACE_API_URL = `https://router.huggingface.co/v1/chat/completions`;

export const sendMessageToAI = async (req, res) => {
    try {
        const { message } = req.body;
        const userEmail = req.user?.email || "anonymous";

        console.log(`📨 AI Request received from ${userEmail}: "${message.substring(0, 50)}..."`);

        if (!message || !message.trim()) {
            console.warn("❌ Message is empty");
            return res.status(400).json({ error: "Message is required" });
        }

        if (!HUGGINGFACE_API_KEY) {
            console.error("❌ HUGGINGFACE_API_KEY is not set in environment variables");
            return res.status(500).json({ error: "AI service is not configured" });
        }

        try {
            console.log(`🤖 Sending request to Hugging Face (${HUGGINGFACE_MODEL})...`);
            
            const systemPrompt = `You are Ghor AI, a helpful real estate assistant for a property rental and sales platform called "GHOR BARI" (which means "home" in Bengali). You help users find properties, answer questions about real estate, provide advice on renting or buying properties in Bangladesh, and assist with any property-related queries.

Be friendly, professional, and helpful. Keep responses concise and informative. Format your response in a clear, readable way.`;

            const response = await axios.post(
                HUGGINGFACE_API_URL,
                {
                    model: HUGGINGFACE_MODEL,
                    messages: [
                        {
                            role: "system",
                            content: systemPrompt
                        },
                        {
                            role: "user",
                            content: message
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 512,
                    top_p: 0.95,
                },
                {
                    timeout: 30000,
                    headers: {
                        "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
                        "Content-Type": "application/json",
                    }
                }
            );

            // Hugging Face returns a structured response
            if (response.status === 200 && response.data?.choices?.[0]?.message?.content) {
                const aiResponse = response.data.choices[0].message.content;
                
                if (aiResponse) {
                    console.log(`✅ Successfully received response from Hugging Face for user: ${userEmail}`);
                    return res.status(200).json({
                        success: true,
                        response: aiResponse.trim(),
                        model: HUGGINGFACE_MODEL
                    });
                }
            }

            console.error("❌ Invalid response structure from Hugging Face");
            return res.status(503).json({
                error: "Unable to process your request. AI service returned invalid response.",
                details: "Response parsing failed"
            });
            
        } catch (error) {
            const statusCode = error.response?.status;
            const errorMessage = error.response?.data?.error || error.message;
            
            console.error(`❌ Hugging Face API error (${statusCode}):`, errorMessage);

            // Handle specific errors
            if (statusCode === 401 || statusCode === 403) {
                return res.status(401).json({
                    error: "AI service authentication failed. Please check your configuration.",
                    details: "Invalid or expired API key"
                });
            }

            if (statusCode === 429) {
                return res.status(429).json({
                    error: "AI service is experiencing high demand. Please try again in a few moments.",
                    details: "Rate limit reached"
                });
            }

            if (statusCode === 503 || statusCode === 500) {
                return res.status(503).json({
                    error: "AI service is temporarily unavailable. Please try again later.",
                    details: errorMessage
                });
            }

            return res.status(500).json({
                error: "An error occurred while processing your request.",
                details: errorMessage
            });
        }

    } catch (error) {
        console.error("❌ Unexpected error in sendMessageToAI:", error);
        return res.status(500).json({
            error: "An unexpected error occurred. Please try again later.",
            details: error.message
        });
    }
};
