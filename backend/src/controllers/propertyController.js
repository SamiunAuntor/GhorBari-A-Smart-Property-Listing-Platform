import { getDatabase } from "../config/db.js";

import { ObjectId } from "mongodb";
import { generatePropertyAppraisal } from "../services/propertyAppraisalService.js";

export const postProperty = async (req, res) => {

    try {

        const db = getDatabase();

        const data = req.body;

        const propertyType = data.propertyType; // flat | building

        // Base property object
        const property = {

            title: data.title,
            listingType: data.listingType,        // rent | sale
            propertyType: propertyType,           // flat | building
            price: Number(data.price),             // sale price or rent per month
            areaSqFt: Number(data.areaSqFt),

            // Address object now stores IDs + full address
            address: {
                division_id: data.address.division_id,
                district_id: data.address.district_id,
                upazila_id: data.address.upazila_id,
                street: data.address.street
            },

            // Array of image URLs from ImgBB
            images: data.images || [],

            overview: data.overview,
            amenities: data.amenities || [],

            location: {
                lat: Number(data.location.lat),
                lng: Number(data.location.lng)
            },

            owner: {
                uid: req.user.uid,
                name: req.user.name,
                email: req.user.email,
                photoURL: req.user.photoURL
            },

            isOwnerVerified: req.user.isVerified,
            status: "active", // pending → active (approved) → hidden (owner hides) → deal-in-progress → sold/rented
            active_proposal_id: null, // No active proposal initially
            createdAt: new Date()
        };

        // Dynamic fields based on property type
        if (propertyType === "building") {
            // For building: floorCount and totalUnits
            property.floorCount = Number(data.floorCount);
            property.totalUnits = Number(data.totalUnits);
        } else if (propertyType === "flat") {
            // For flat: roomCount and bathrooms
            property.roomCount = Number(data.roomCount);
            property.bathrooms = Number(data.bathrooms);
        }

        try {
            property.aiAppraisal = await generatePropertyAppraisal(property);
        } catch (appraisalError) {
            console.error("Property appraisal generation failed during property creation:", appraisalError.message);
            property.aiAppraisal = null;
        }

        // Insert directly into the "properties" collection

        const result = await db.collection("properties").insertOne(property);

        res.status(201).send({ success: true, id: result.insertedId });

    } catch (error) {

        console.error(error);

        res.status(500).send({ message: "Server error" });

    }

};

export const getMyProperties = async (req, res) => {

    try {

        const db = getDatabase();

        const email = req.query.email;

        const query = { "owner.email": email };

        // Sorting by newest first
        const properties = await db.collection("properties")
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();

        // Get application counts for each property
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

        // Only show active properties (not pending, rejected, hidden, sold, rented, removed)
        const result = await db.collection("properties")
            .find({ 
                status: "active"  // Only active properties are shown in marketplace
            })
            .sort({ createdAt: -1 })          // newest first
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

        // Get the existing property to check propertyType
        const existingProperty = await db.collection("properties").findOne({ _id: new ObjectId(id) });
        
        if (!existingProperty) {
            return res.status(404).send({ message: "Property not found" });
        }

        // Prevent editing properties that are in deal-in-progress, sold, or rented
        if (["deal-in-progress", "sold", "rented"].includes(existingProperty.status)) {
            return res.status(400).send({ 
                message: `Cannot edit property that is ${existingProperty.status}. Please complete or cancel the deal first.` 
            });
        }

        const propertyType = existingProperty.propertyType; // flat | building

        // Only allow updating specific fields
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

        // Dynamic fields based on property type
        if (propertyType === "building") {
            // For building: floorCount and totalUnits
            updateData.floorCount = Number(data.floorCount);
            updateData.totalUnits = Number(data.totalUnits);
        } else if (propertyType === "flat") {
            // For flat: roomCount and bathrooms
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

        // Get the property first to check status
        const property = await db.collection("properties").findOne({
            _id: new ObjectId(id)
        });

        if (!property) {
            return res.status(404).send({ message: "Property not found" });
        }

        // Verify ownership
        if (property.owner.email !== req.user.email) {
            return res.status(403).send({ message: "You don't have permission to delete this property" });
        }

        // CRITICAL: Cannot delete properties with active deals
        if (["deal-in-progress", "sold", "rented"].includes(property.status)) {
            return res.status(400).send({ 
                message: `Cannot delete property that is ${property.status}. Please complete or cancel the deal first.` 
            });
        }

        // Check if property has any active applications
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

// Toggle property status (hide/unhide) - switches between "active" and "hidden"
export const togglePropertyVisibility = async (req, res) => {

    try {

        const db = getDatabase();

        const id = req.params.id;

        if (!ObjectId.isValid(id)) {

            return res.status(400).send({ message: "Invalid ID format" });

        }

        // Get the property
        const property = await db.collection("properties").findOne({ _id: new ObjectId(id) });

        if (!property) {

            return res.status(404).send({ message: "Property not found" });

        }

        // Verify ownership
        if (property.owner.email !== req.user.email) {

            return res.status(403).send({ message: "You don't have permission to update this property" });

        }

        // Can toggle between active, hidden, and deal-in-progress
        // Cannot toggle if property is sold, rented, rejected, pending, or removed
        if (!["active", "hidden", "deal-in-progress"].includes(property.status)) {

            return res.status(400).send({ 
                message: `Cannot toggle visibility for properties with status: ${property.status}. Can only toggle for active, hidden, or deal-in-progress properties.` 
            });

        }

        // Toggle status: active ↔ hidden (for deal-in-progress, toggle to hidden)
        let newStatus;
        let updateData = {
            updatedAt: new Date()
        };
        
        if (property.status === "active") {
            newStatus = "hidden";
        } else if (property.status === "hidden") {
            // When unhiding, restore to previousStatus if it exists (deal-in-progress), otherwise active
            newStatus = property.previousStatus || "active";
            // Clear previousStatus if we're restoring
            if (property.previousStatus) {
                updateData.previousStatus = null;
            }
        } else if (property.status === "deal-in-progress") {
            // For deal-in-progress, hide it but store deal-in-progress as previousStatus
            newStatus = "hidden";
            updateData.previousStatus = "deal-in-progress";
        } else {
            newStatus = "active"; // fallback
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

// Reopen listing for rented properties (change status from "rented" to "active")
export const reopenListing = async (req, res) => {

    try {

        const db = getDatabase();

        const id = req.params.id;

        if (!ObjectId.isValid(id)) {

            return res.status(400).send({ message: "Invalid ID format" });

        }

        // Get the property
        const property = await db.collection("properties").findOne({ _id: new ObjectId(id) });

        if (!property) {

            return res.status(404).send({ message: "Property not found" });

        }

        // Verify ownership
        if (property.owner.email !== req.user.email) {

            return res.status(403).send({ message: "You don't have permission to update this property" });

        }

        // Only allow reopening rented properties, not sold properties
        if (property.status !== "rented") {

            return res.status(400).send({ 
                message: "Can only reopen rented properties. Sold properties cannot be reopened." 
            });

        }

        // Change status from "rented" to "active" and clear visibility
        const result = await db.collection("properties").updateOne(
            { _id: new ObjectId(id) },
            { 
                $set: { 
                    status: "active",
                    visibility: "visible",
                    active_proposal_id: null, // Clear any active proposal
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

// Get featured properties for homepage (public endpoint - no authentication required)
export const getFeaturedProperties = async (req, res) => {

    try {

        const db = getDatabase();

        const limit = parseInt(req.query.limit) || 8; // Default to 8, can be customized

        // Get latest active properties (not pending, rejected, hidden, sold, rented, removed)
        const result = await db.collection("properties")
            .find({ 
                status: "active"  // Only active properties are shown
            })
            .sort({ createdAt: -1 })          // newest first
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
