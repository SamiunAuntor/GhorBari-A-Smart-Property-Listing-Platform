import { buildPropertySearchText, formatPropertyLocation } from "./propertyLocationService.js";

function compactText(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeText(value) {
    return compactText(value).toLowerCase();
}

function tokenizeText(value) {
    return normalizeText(value)
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean);
}

const LOCATION_STOP_WORDS = new Set([
    "i", "me", "my", "we", "our", "need", "want", "find", "show", "looking", "property",
    "properties", "home", "house", "place", "rent", "rental", "lease", "buy", "sale",
    "purchase", "flat", "apartment", "building", "bdt", "tk", "taka", "under", "below",
    "maximum", "max", "budget", "with", "near", "around", "for", "from", "the", "and",
    "or", "in", "at", "to", "of", "a", "an"
]);

function extractBudgetFromMessage(message) {
    const normalized = normalizeText(message).replace(/,/g, "");
    const budgetMatch = normalized.match(/(?:under|below|max(?:imum)?|budget)\s*(?:bdt|tk|taka)?\s*(\d{4,9})/i)
        || normalized.match(/(\d{4,9})\s*(?:bdt|tk|taka)/i);

    if (!budgetMatch) {
        return null;
    }

    const budget = Number(budgetMatch[1]);
    return Number.isFinite(budget) && budget > 0 ? budget : null;
}

function extractRoomCount(message) {
    const match = normalizeText(message).match(/(\d+)\s*(?:bed|beds|bedroom|bedrooms|room|rooms)\b/);
    const roomCount = Number(match?.[1] || 0);
    return Number.isFinite(roomCount) && roomCount > 0 ? roomCount : null;
}

function extractBathroomCount(message) {
    const match = normalizeText(message).match(/(\d+)\s*(?:bath|baths|bathroom|bathrooms)\b/);
    const bathrooms = Number(match?.[1] || 0);
    return Number.isFinite(bathrooms) && bathrooms > 0 ? bathrooms : null;
}

function detectAdviceIntent(message) {
    return /\b(best area|which area|where should i|where to live|good area|safe area|recommend area|suggest area)\b/i.test(message);
}

export function parsePropertyIntent(message) {
    const normalized = normalizeText(message);
    const roomCount = extractRoomCount(message);
    const bathrooms = extractBathroomCount(message);

    return {
        rawMessage: compactText(message),
        normalizedMessage: normalized,
        listingType: /\brent|rental|lease\b/.test(normalized)
            ? "rent"
            : (/\bbuy|sale|purchase\b/.test(normalized) ? "sale" : null),
        propertyType: /\bflat|apartment\b/.test(normalized)
            ? "flat"
            : (/\bbuilding\b/.test(normalized) ? "building" : null),
        budget: extractBudgetFromMessage(message),
        roomCount,
        bathrooms,
        adviceIntent: detectAdviceIntent(message),
        locationTokens: tokenizeText(message).filter(
            (token) => token.length >= 3 && !LOCATION_STOP_WORDS.has(token) && Number.isNaN(Number(token))
        )
    };
}

function buildMongoQuery(intent) {
    const query = { status: "active" };

    if (intent.listingType) {
        query.listingType = intent.listingType;
    }

    if (intent.propertyType) {
        query.propertyType = intent.propertyType;
    }

    if (intent.budget) {
        query.price = { $lte: intent.budget };
    }

    if (intent.roomCount) {
        query.roomCount = { $gte: intent.roomCount };
    }

    if (intent.bathrooms) {
        query.bathrooms = { $gte: intent.bathrooms };
    }

    return query;
}

function scoreProperty(property, intent) {
    const searchable = normalizeText(property.searchText || buildPropertySearchText(property));
    let score = 0;

    if (intent.listingType && property.listingType === intent.listingType) {
        score += 20;
    }

    if (intent.propertyType && property.propertyType === intent.propertyType) {
        score += 20;
    }

    if (intent.budget && Number(property.price) <= intent.budget) {
        score += 18;
    }

    if (intent.roomCount && Number(property.roomCount) >= intent.roomCount) {
        score += 8;
    }

    if (intent.bathrooms && Number(property.bathrooms) >= intent.bathrooms) {
        score += 6;
    }

    intent.locationTokens.forEach((token) => {
        if (searchable.includes(token)) {
            score += token.length >= 5 ? 12 : 6;
        }
    });

    return score;
}

function toCompactProperty(property) {
    return {
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
        location: formatPropertyLocation(property.address),
        amenities: Array.isArray(property.amenities) ? property.amenities.slice(0, 8) : [],
        createdAt: property.createdAt || null,
        aiAppraisal: property.aiAppraisal || null
    };
}

function buildAppliedFilters(intent) {
    return {
        listingType: intent.listingType,
        propertyType: intent.propertyType,
        maxPrice: intent.budget,
        roomCount: intent.roomCount,
        bathrooms: intent.bathrooms,
        locationTokens: intent.locationTokens.slice(0, 8),
        adviceIntent: intent.adviceIntent
    };
}

function buildMatchSummary(properties = []) {
    return properties.map((property, index) => {
        const summaryBits = [
            `#${index + 1}`,
            property.title || "Untitled property",
            property.location || "Location available in listing",
            property.price ? `BDT ${property.price}` : "Price n/a",
            `${property.listingType || "n/a"} ${property.propertyType || "property"}`
        ];

        if (property.areaSqFt) {
            summaryBits.push(`${property.areaSqFt} sqft`);
        }

        if (property.roomCount) {
            summaryBits.push(`${property.roomCount} rooms`);
        }

        if (property.bathrooms) {
            summaryBits.push(`${property.bathrooms} baths`);
        }

        return summaryBits.join(" | ");
    }).join("\n");
}

export async function getPropertyMatchesForAi(database, message, limit = 5) {
    const intent = parsePropertyIntent(message);
    const baseQuery = buildMongoQuery(intent);

    const candidates = await database
        .collection("properties")
        .find(baseQuery)
        .sort({ createdAt: -1 })
        .limit(60)
        .toArray();

    const scored = candidates
        .map((property) => ({ property, score: scoreProperty(property, intent) }))
        .sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }

            const createdAtA = new Date(a.property.createdAt || 0).getTime();
            const createdAtB = new Date(b.property.createdAt || 0).getTime();
            return createdAtB - createdAtA;
        });

    const bestMatches = scored
        .filter((entry) => entry.score > 0 || candidates.length <= limit)
        .slice(0, limit)
        .map((entry) => toCompactProperty(entry.property));

    return {
        intent,
        filters: buildAppliedFilters(intent),
        total: bestMatches.length,
        properties: bestMatches,
        propertySummary: buildMatchSummary(bestMatches)
    };
}

export function buildMatchedProperties(properties = []) {
    return properties.slice(0, 5).map((property) => ({
        id: property.id,
        title: property.title || "Untitled property",
        location: property.location || "Location available in listing",
        price: property.price ?? null,
        listingType: property.listingType || "n/a",
        propertyType: property.propertyType || "property",
        areaSqFt: property.areaSqFt ?? null
    }));
}
