import { generateGroqText, getGroqModel } from "./groqService.js";

const APPRAISAL_MODEL = getGroqModel();

function compactText(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
}

function safeNumber(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
}

function formatAmenities(amenities = []) {
    if (!Array.isArray(amenities) || amenities.length === 0) {
        return "Not specified";
    }

    return amenities.map(compactText).filter(Boolean).join(", ");
}

function buildAddressLabel(address = {}) {
    return [
        compactText(address.street),
        compactText(address.upazila_id),
        compactText(address.district_id),
        compactText(address.division_id)
    ].filter(Boolean).join(", ");
}

function buildAppraisalFacts(property = {}) {
    const facts = [
        `Currency: BDT only`,
        `Listing type: ${compactText(property.listingType)}`,
        `Property type: ${compactText(property.propertyType)}`,
        `Current listed price in BDT: ${safeNumber(property.price) ?? "unknown"}`,
        `Area in square feet: ${safeNumber(property.areaSqFt) ?? "unknown"}`,
        `Address context: ${buildAddressLabel(property.address) || "Not specified"}`,
        `Amenities: ${formatAmenities(property.amenities)}`
    ];

    if (property.propertyType === "flat") {
        facts.push(`Rooms: ${safeNumber(property.roomCount) ?? "unknown"}`);
        facts.push(`Bathrooms: ${safeNumber(property.bathrooms) ?? "unknown"}`);
    }

    if (property.propertyType === "building") {
        facts.push(`Floor count: ${safeNumber(property.floorCount) ?? "unknown"}`);
        facts.push(`Total units: ${safeNumber(property.totalUnits) ?? "unknown"}`);
    }

    return facts.join("\n");
}

function extractJsonBlock(text) {
    const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
        return fencedMatch[1].trim();
    }

    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return text.slice(firstBrace, lastBrace + 1);
    }

    return text.trim();
}

function normalizeReasoning(reasoning) {
    if (!Array.isArray(reasoning)) {
        return [];
    }

    return reasoning
        .map((item) => compactText(item))
        .filter(Boolean)
        .slice(0, 4);
}

function normalizeConfidence(value) {
    const normalized = compactText(value).toLowerCase();
    return ["low", "medium", "high"].includes(normalized) ? normalized : "medium";
}

function deriveMarketPosition(listedPrice, minPrice, maxPrice) {
    if (!listedPrice || !minPrice || !maxPrice) {
        return "fairly-priced";
    }

    if (listedPrice < minPrice) {
        return "underpriced";
    }

    if (listedPrice > maxPrice) {
        return "overpriced";
    }

    return "fairly-priced";
}

function normalizeAppraisal(parsed, listedPrice) {
    const fairPrice = Math.max(0, Math.round(safeNumber(parsed?.fairPrice) || 0));
    const minPrice = Math.max(0, Math.round(safeNumber(parsed?.minPrice) || 0));
    const maxPrice = Math.max(0, Math.round(safeNumber(parsed?.maxPrice) || 0));
    const fallbackBase = fairPrice || listedPrice || 0;
    const normalizedMin = minPrice || Math.max(0, Math.round(fallbackBase * 0.95));
    const normalizedMax = maxPrice || Math.max(normalizedMin, Math.round(fallbackBase * 1.05));

    return {
        fairPrice: fairPrice || fallbackBase,
        minPrice: Math.min(normalizedMin, normalizedMax),
        maxPrice: Math.max(normalizedMin, normalizedMax),
        confidence: normalizeConfidence(parsed?.confidence),
        marketPosition: deriveMarketPosition(
            listedPrice,
            Math.min(normalizedMin, normalizedMax),
            Math.max(normalizedMin, normalizedMax)
        ),
        summary: compactText(parsed?.summary),
        reasoning: normalizeReasoning(parsed?.reasoning),
        generatedAt: new Date(),
        model: APPRAISAL_MODEL,
        currency: "BDT"
    };
}

function validatePropertyForAppraisal(property = {}) {
    if (!compactText(property.listingType) || !compactText(property.propertyType)) {
        return false;
    }

    if (!safeNumber(property.price) || !safeNumber(property.areaSqFt)) {
        return false;
    }

    if (property.propertyType === "flat") {
        return safeNumber(property.roomCount) >= 1 && safeNumber(property.bathrooms) >= 1;
    }

    if (property.propertyType === "building") {
        return safeNumber(property.floorCount) >= 1 && safeNumber(property.totalUnits) >= 1;
    }

    return true;
}

export async function generatePropertyAppraisal(property = {}) {
    if (!validatePropertyForAppraisal(property)) {
        return null;
    }

    const systemPrompt = "You are a real-estate valuation assistant for a Bangladesh property marketplace. Estimate fair pricing only in Bangladeshi Taka (BDT). Return strict JSON only.";
    const userPrompt = `Estimate a fair market appraisal for this property in BDT.

Rules:
- Return valid JSON only.
- Do not include markdown or code fences.
- All prices must be numeric BDT values without commas or currency symbols.
- fairPrice, minPrice, and maxPrice must be monthly BDT for rent listings and total BDT for sale listings.
- confidence must be one of: low, medium, high.
- marketPosition must be one of: underpriced, fairly-priced, overpriced.
- marketPosition must strictly reflect the listed price versus your own estimated range:
  - underpriced if listed price is below minPrice
  - fairly-priced if listed price is between minPrice and maxPrice
  - overpriced if listed price is above maxPrice
- summary must be one short sentence.
- reasoning must be an array of 2 to 4 short strings.

Return this exact JSON shape:
{
  "fairPrice": 0,
  "minPrice": 0,
  "maxPrice": 0,
  "confidence": "medium",
  "marketPosition": "fairly-priced",
  "summary": "",
  "reasoning": []
}

Property facts:
${buildAppraisalFacts(property)}`;

    const rawResponse = await generateGroqText({
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        maxTokens: 260,
        topP: 0.9
    });

    let parsed;
    try {
        parsed = JSON.parse(extractJsonBlock(rawResponse));
    } catch (error) {
        const parseError = new Error("AI appraisal returned invalid JSON");
        parseError.details = error.message;
        throw parseError;
    }

    const listedPrice = Math.round(safeNumber(property.price) || 0);
    const normalized = normalizeAppraisal(parsed, listedPrice);

    if (!normalized.fairPrice) {
        throw new Error("AI appraisal returned incomplete pricing data");
    }

    return normalized;
}
