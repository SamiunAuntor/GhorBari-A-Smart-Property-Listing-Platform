import axios from "axios";

const DUCKDUCKGO_INSTANT_API = "https://api.duckduckgo.com/";

function cleanText(value) {
    if (!value || typeof value !== "string") {
        return "";
    }

    return value
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function flattenRelatedTopics(relatedTopics = []) {
    const results = [];

    for (const topic of relatedTopics) {
        if (topic?.Text && topic?.FirstURL) {
            results.push(topic);
        }

        if (Array.isArray(topic?.Topics)) {
            results.push(...flattenRelatedTopics(topic.Topics));
        }
    }

    return results;
}

export async function searchWebContext(query, limit = 5) {
    if (!query || typeof query !== "string") {
        return [];
    }

    const response = await axios.get(DUCKDUCKGO_INSTANT_API, {
        params: {
            q: query,
            format: "json",
            no_html: 1,
            no_redirect: 1,
            skip_disambig: 1
        },
        timeout: 8000
    });

    const data = response.data || {};
    const items = [];

    if (data.AbstractText && data.AbstractURL) {
        items.push({
            title: cleanText(data.Heading || "Summary"),
            snippet: cleanText(data.AbstractText),
            url: data.AbstractURL
        });
    }

    const related = flattenRelatedTopics(data.RelatedTopics || []);
    for (const topic of related) {
        if (items.length >= limit) {
            break;
        }

        items.push({
            title: cleanText(topic.Text?.split(" - ")[0] || "Result"),
            snippet: cleanText(topic.Text),
            url: topic.FirstURL
        });
    }

    return items
        .filter((item) => item.snippet && item.url)
        .slice(0, limit);
}
