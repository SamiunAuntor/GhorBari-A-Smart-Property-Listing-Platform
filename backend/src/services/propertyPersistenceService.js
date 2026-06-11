import { generatePropertyAppraisal } from "./propertyAppraisalService.js";
import { buildPropertyAddress, buildPropertySearchText } from "./propertyLocationService.js";

function normalizeNumber(value, fallback = 0) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function buildPropertyDocument(data = {}, owner = {}) {
    const propertyType = data.propertyType;

    const property = {
        title: data.title,
        listingType: data.listingType,
        propertyType,
        price: normalizeNumber(data.price),
        areaSqFt: normalizeNumber(data.areaSqFt),
        address: buildPropertyAddress(data.address),
        images: Array.isArray(data.images) ? data.images : [],
        overview: data.overview,
        amenities: Array.isArray(data.amenities) ? data.amenities : [],
        location: {
            lat: normalizeNumber(data.location?.lat),
            lng: normalizeNumber(data.location?.lng)
        },
        owner: {
            uid: owner.uid,
            name: owner.name,
            email: owner.email,
            photoURL: owner.photoURL || ""
        },
        isOwnerVerified: Boolean(owner.isVerified),
        status: data.status || "active",
        active_proposal_id: null,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
    };

    if (propertyType === "building") {
        property.floorCount = normalizeNumber(data.floorCount);
        property.totalUnits = normalizeNumber(data.totalUnits);
    } else if (propertyType === "flat") {
        property.roomCount = normalizeNumber(data.roomCount);
        property.bathrooms = normalizeNumber(data.bathrooms);
    }

    return property;
}

export async function createPropertyRecord(db, data = {}, owner = {}, extraFields = {}) {
    const property = buildPropertyDocument(data, owner);

    try {
        property.aiAppraisal = await generatePropertyAppraisal(property);
    } catch (appraisalError) {
        console.error("Property appraisal generation failed:", appraisalError.message);
        property.aiAppraisal = null;
    }

    Object.assign(property, extraFields);
    property.searchText = buildPropertySearchText(property);

    const result = await db.collection("properties").insertOne(property);

    return {
        ...property,
        _id: result.insertedId
    };
}
