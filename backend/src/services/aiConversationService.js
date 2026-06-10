function normalizeChatText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}

export function buildConversationHistoryContext(history = [], maxTurns = 6) {
    if (!Array.isArray(history) || history.length === 0) {
        return "";
    }

    const relevantTurns = history
        .slice(-maxTurns)
        .map((entry) => {
            const role = entry?.isBot ? "assistant" : "user";
            const text = normalizeChatText(entry?.text);

            if (!text) {
                return null;
            }

            return `${role}: ${text}`;
        })
        .filter(Boolean);

    if (relevantTurns.length === 0) {
        return "";
    }

    return relevantTurns.join("\n");
}
