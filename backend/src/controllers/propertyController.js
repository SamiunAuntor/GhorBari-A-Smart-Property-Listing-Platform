import { getDatabase } from "../config/db.js";

import { ObjectId } from "mongodb";
import { generatePropertyAppraisal } from "../services/propertyAppraisalService.js";
import { buildPropertySearchText } from "../services/propertyLocationService.js";
import { createPropertyRecord } from "../services/propertyPersistenceService.js";
import { getListingEntitlement } from "../services/listingBillingService.js";
import { initiatePaidListingPayment } from "./paymentController.js";

export const postProperty = async (req, res) => {

    try {

        const db = getDatabase();
        const data = req.body;
        const entitlement = await getListingEntitlement(db, req.user.email);

        if (entitlement.requiresPayment) {
            const paymentSession = await initiatePaidListingPayment(db, req.user, data);
            return res.status(200).send({
                success: true,
                mode: "payment_required",
                ...paymentSession,
                entitlement
            });
        }

        const createdProperty = await createPropertyRecord(db, data, req.user, {
            billing: {
                type: "free",
                amount: 0,
                currency: "BDT",
                paymentId: null
            }
        });

        return res.status(201).send({
            success: true,
            mode: "free_listing",
            id: createdProperty._id,
            entitlement: {
                ...entitlement,
                currentCount: entitlement.currentCount + 1,
                freeRemaining: Math.max(0, entitlement.freeRemaining - 1),
                requiresPayment: entitlement.currentCount + 1 >= entitlement.freeLimit
            }
        });

    } catch (error) {

        console.error(error);

        res.status(error.statusCode || 500).send({ message: error.message || "Server error" });

    }

};

export const getListingEntitlementInfo = async (req, res) => {

    try {

        const entitlement = await getListingEntitlement(req.db, req.user.email);

        res.send({ success: true, ...entitlement });

    } catch (error) {

        res.status(500).send({ success: false, message: error.message });

    }

};

export const getMyProperties = async (req, res) => {

    try {

        const db = getDatabase();

        const email = req.query.email;

        const query = { "owner.email": email };

        const properties = await db.collection("properties")
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();

        const propertiesWithCounts = await Promise.all(
            properties.map(async (property) => {
                const applicationCount = await db.collection("applications").countDocuments({
                    propertyId: property._id,
                    status: { $in: ["pending", "counter", "deal-in-progress", "completed"] }
                });
                return {
                    ...property,
                    requestsCount: applicationCount
                };
            })
        );

        res.send(propertiesWithCounts);

    } catch (error) {

        console.error("GET /my-properties error:", error);

        res.status(500).send({ message: "Server error" });

    }

};

export const getPropertyById = async (req, res) => {

    try {

        const db = getDatabase();

        const id = req.params.id;

        if (!ObjectId.isValid(id)) {

            return res.status(400).send({ message: "Invalid ID format" });

        }

        const result = await db.collection("properties").findOne({ _id: new ObjectId(id) });

        if (!result) return res.status(404).send({ message: "Property not found" });

        res.send(result);

    } catch (error) {

        console.error("GET /property/:id error:", error);

        res.status(500).send({ message: "Server error" });

    }

};

export const getActiveProperties = async (req, res) => {

    try {

        const db = getDatabase();

        const result = await db.collection("properties")
            .find({
                status: "active"
            })
            .sort({ createdAt: -1 })
            .toArray();

        return res.json(result);

    } catch (error) {

        console.error("GET /properties error:", error);

        res.status(500).json({ message: "Server error" });

    }
    
};

export const updateProperty = async (req, res) => {

    try {

        const db = getDatabase();

        const id = req.params.id;

        if (!ObjectId.isValid(id)) {

            return res.status(400).send({ message: "Invalid ID format" });

        }

        const data = req.body;
        const existingProperty = await db.collection("properties").findOne({ _id: new ObjectId(id) });
        
        if (!existingProperty) {
            return res.status(404).send({ message: "Property not found" });
        }

        if (["deal-in-progress", "sold", "rented"].includes(existingProperty.status)) {
            return res.status(400).send({
                message: `Cannot edit property that is ${existingProperty.status}. Please complete or cancel the deal first.`
            });
        }

        const propertyType = existingProperty.propertyType;
        const updateData = {

            price: Number(data.price),
            areaSqFt: Number(data.areaSqFt),
            images: data.images || [],
            overview: data.overview,
            amenities: data.amenities || [],
            location: {
                lat: Number(data.location.lat),
                lng: Number(data.location.lng)
            },
            updatedAt: new Date()

        };

        if (propertyType === "building") {
            updateData.floorCount = Number(data.floorCount);
            updateData.totalUnits = Number(data.totalUnits);
        } else if (propertyType === "flat") {
            updateData.roomCount = Number(data.roomCount);
            updateData.bathrooms = Number(data.bathrooms);
        }

        try {
            updateData.aiAppraisal = await generatePropertyAppraisal({
                ...existingProperty,
                ...updateData,
                propertyType,
                listingType: existingProperty.listingType,
                address: existingProperty.address
            });
        } catch (appraisalError) {
            console.error("Property appraisal generation failed during property update:", appraisalError.message);
            updateData.aiAppraisal = existingProperty.aiAppraisal || null;
        }

        updateData.searchText = buildPropertySearchText({
            ...existingProperty,
            ...updateData,
            address: existingProperty.address
        });

        const result = await db.collection("properties").updateOne(
            { _id: new ObjectId(id), "owner.email": req.user.email },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {

            return res.status(404).send({ message: "Property not found or you don't have permission" });

        }

        res.send({ success: true, message: "Property updated successfully" });

    } catch (error) {

        console.error("UPDATE /property/:id error:", error);

        res.status(500).send({ message: "Server error" });

    }

};

export const deleteProperty = async (req, res) => {

    try {

        const db = getDatabase();

        const id = req.params.id;

        if (!ObjectId.isValid(id)) {

            return res.status(400).send({ message: "Invalid ID format" });

        }

        const property = await db.collection("properties").findOne({
            _id: new ObjectId(id)
        });

        if (!property) {
            return res.status(404).send({ message: "Property not found" });
        }

        if (property.owner.email !== req.user.email) {
            return res.status(403).send({ message: "You don't have permission to delete this property" });
        }

        if (["deal-in-progress", "sold", "rented"].includes(property.status)) {
            return res.status(400).send({
                message: `Cannot delete property that is ${property.status}. Please complete or cancel the deal first.`
            });
        }

        const activeApplications = await db.collection("applications").countDocuments({
            propertyId: new ObjectId(id),
            status: { $in: ["pending", "counter", "deal-in-progress"] }
        });

        if (activeApplications > 0) {
            return res.status(400).send({
                message: "Cannot delete property with active applications. Please wait for applications to be resolved or reject them first."
            });
        }

        const result = await db.collection("properties").deleteOne(
            { _id: new ObjectId(id), "owner.email": req.user.email }
        );

        if (result.deletedCount === 0) {

            return res.status(404).send({ message: "Property not found or you don't have permission" });

        }

        res.send({ success: true, message: "Property deleted successfully" });

    } catch (error) {

        console.error("DELETE /property/:id error:", error);

        res.status(500).send({ message: "Server error" });

    }

};

export const togglePropertyVisibility = async (req, res) => {

    try {

        const db = getDatabase();
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {

            return res.status(400).send({ message: "Invalid ID format" });

        }

        const property = await db.collection("properties").findOne({ _id: new ObjectId(id) });

        if (!property) {

            return res.status(404).send({ message: "Property not found" });

        }

        if (property.owner.email !== req.user.email) {

            return res.status(403).send({ message: "You don't have permission to update this property" });

        }

        if (!["active", "hidden", "deal-in-progress"].includes(property.status)) {

            return res.status(400).send({
                message: `Cannot toggle visibility for properties with status: ${property.status}. Can only toggle for active, hidden, or deal-in-progress properties.`
            });

        }

        let newStatus;
        const updateData = {
            updatedAt: new Date()
        };
        
        if (property.status === "active") {
            newStatus = "hidden";
        } else if (property.status === "hidden") {
            newStatus = property.previousStatus || "active";
            if (property.previousStatus) {
                updateData.previousStatus = null;
            }
        } else if (property.status === "deal-in-progress") {
            newStatus = "hidden";
            updateData.previousStatus = "deal-in-progress";
        } else {
            newStatus = "active";
        }
        
        updateData.status = newStatus;

        const result = await db.collection("properties").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: updateData
            }
        );

        if (result.matchedCount === 0) {

            return res.status(404).send({ message: "Property not found" });

        }

        res.send({
            success: true,
            message: `Property ${newStatus === "active" ? "shown" : "hidden"} successfully`,
            status: newStatus
        });

    } catch (error) {

        console.error("PATCH /property/:id/visibility error:", error);

        res.status(500).send({ message: "Server error" });

    }

};

export const reopenListing = async (req, res) => {

    try {

        const db = getDatabase();
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {

            return res.status(400).send({ message: "Invalid ID format" });

        }

        const property = await db.collection("properties").findOne({ _id: new ObjectId(id) });

        if (!property) {

            return res.status(404).send({ message: "Property not found" });

        }

        if (property.owner.email !== req.user.email) {

            return res.status(403).send({ message: "You don't have permission to update this property" });

        }

        if (property.status !== "rented") {

            return res.status(400).send({
                message: "Can only reopen rented properties. Sold properties cannot be reopened."
            });

        }

        const result = await db.collection("properties").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    status: "active",
                    visibility: "visible",
                    active_proposal_id: null,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {

            return res.status(404).send({ message: "Property not found" });

        }

        res.send({
            success: true,
            message: "Listing reopened successfully. Your property is now active and visible on the marketplace.",
            status: "active"
        });

    } catch (error) {

        console.error("PATCH /property/:id/reopen error:", error);

        res.status(500).send({ message: "Server error" });

    }

};

export const getFeaturedProperties = async (req, res) => {

    try {

        const db = getDatabase();
        const limit = parseInt(req.query.limit) || 8;

        const result = await db.collection("properties")
            .find({
                status: "active"
            })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();
        
        const ownerEmails = [...new Set(result.map((property) => property.owner?.email).filter(Boolean))];
        const owners = ownerEmails.length > 0
            ? await db.collection("users")
                .find(
                    { email: { $in: ownerEmails } },
                    { projection: { email: 1, nidVerified: 1, rating: 1, name: 1, profileImage: 1, phone: 1 } }
                )
                .toArray()
            : [];

        const ownerMap = new Map(owners.map((owner) => [owner.email, owner]));

        const enrichedResult = result.map((property) => {
            const ownerProfile = ownerMap.get(property.owner?.email);
            return {
                ...property,
                owner: {
                    ...property.owner,
                    name: ownerProfile?.name || property.owner?.name || "Owner",
                    email: ownerProfile?.email || property.owner?.email || "",
                    photoURL: ownerProfile?.profileImage || property.owner?.photoURL || "",
                    phone: ownerProfile?.phone || property.owner?.phone || "",
                    nidVerified: ownerProfile?.nidVerified || "unverified",
                    rating: ownerProfile?.rating || { totalRatings: 0, ratingCount: 0, average: 0 }
                },
                ownerNidVerified: ownerProfile?.nidVerified || "unverified"
            };
        });

        return res.json(enrichedResult);

    } catch (error) {

        console.error("GET /featured-properties error:", error);

        res.status(500).json({ message: "Server error" });

    }
    
};
