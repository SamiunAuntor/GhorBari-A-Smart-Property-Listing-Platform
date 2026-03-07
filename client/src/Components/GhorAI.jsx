import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import { sendMessageToGemini } from "../Utilities/geminiService";
import useAxiosSecure from "../Hooks/useAxiosSecure";

const GhorAI = () => {
    const axiosSecure = useAxiosSecure();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Hello! I'm Ghor AI, your personal real estate assistant. How can I help you find your perfect home today?",
            isBot: true,
            timestamp: new Date(),
        },
    ]);
    const [inputMessage, setInputMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            text: inputMessage,
            isBot: false,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputMessage("");
        setIsLoading(true);

        try {
            const response = await sendMessageToGemini(inputMessage, messages, axiosSecure);
            
            const botMessage = {
                id: Date.now() + 1,
                text: response,
                isBot: true,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error("GhorAI Error:", error);
            
            let errorText = "Sorry, I encountered an error. Please try again later.";
            
            // Check for specific error types from the error message
            const errorMsg = error.message || error.toString();
            
            if (errorMsg.includes("quota")) {
                errorText = "I'm currently experiencing high demand. Please try again in a few moments. 🙏";
            } else if (errorMsg.includes("auth")) {
                errorText = "Please log in to use Ghor AI features. Your session may have expired.";
            } else if (errorMsg.includes("service-unavailable")) {
                errorText = "Our AI service is temporarily unavailable. Please try again later.";
            } else if (errorMsg.includes("connection-error")) {
                errorText = "Connection error. Please check your internet connection and try again.";
            } else if (errorMsg.includes("server-error")) {
                errorText = "Server error. Please try again in a few moments.";
            } else if (errorMsg.includes("configured")) {
                errorText = "There's an issue with my configuration. Please contact support.";
            } else if (error.response?.status === 404) {
                errorText = "Backend service not found. Please ensure the server is running.";
            } else if (!navigator.onLine) {
                errorText = "You appear to be offline. Please check your internet connection.";
            }
            
            const errorMessage = {
                id: Date.now() + 1,
                text: errorText,
                isBot: true,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <>
            {/* Floating Chat Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-[9999] bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-full shadow-2xl hover:shadow-orange-300 hover:scale-110 transition-all duration-300 group"
                    style={{ zIndex: 9999 }}
                    aria-label="Open Ghor AI Chat"
                >
                    <MessageCircle size={28} className="group-hover:rotate-12 transition-transform" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-[9999] w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-in slide-in-from-bottom-5 duration-300" style={{ zIndex: 9999 }}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                                <Bot className="text-orange-500" size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Ghor AI</h3>
                                <p className="text-xs text-orange-100">Your Real Estate Assistant</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-white/20 p-2 rounded-full transition-colors"
                            aria-label="Close chat"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex gap-3 ${message.isBot ? "justify-start" : "justify-end"}`}
                            >
                                {message.isBot && (
                                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Bot className="text-orange-500" size={18} />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[75%] p-3 rounded-2xl ${
                                        message.isBot
                                            ? "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
                                            : "bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-tr-none"
                                    }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                                    <p className={`text-xs mt-1 ${message.isBot ? "text-gray-400" : "text-orange-100"}`}>
                                        {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                                {!message.isBot && (
                                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <User className="text-white" size={18} />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 justify-start">
                                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Bot className="text-orange-500" size={18} />
                                </div>
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-200">
                                    <Loader2 className="text-orange-500 animate-spin" size={20} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-200">
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask me anything..."
                                disabled={isLoading}
                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputMessage.trim() || isLoading}
                                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3 rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                                aria-label="Send message"
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <Send size={20} />
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 text-center">
                            Powered by Groq Llama 3.1
                        </p>
                    </div>
                </div>
            )}
        </>
    );
};

export default GhorAI;
