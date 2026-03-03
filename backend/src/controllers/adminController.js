import { getDatabase } from "../config/db.js";

import { ObjectId } from "mongodb";
import { findByNidNumber } from "../services/nidRegistryService.js";

export const getPendingVerifications = async (req, res) => {

    try {

        const db = getDatabase();

        const users = await db.collection("users")
            .find({
                nidNumber: { $exists: true, $ne: null },
                nidVerified: false
            })
            .sort({ nidSubmittedAt: -1 })
            .toArray();

        res.send(users);

    } catch (error) {

        res.status(500).send({ message: "Server error" });

    }

};

export const verifyUser = async (req, res) => {
    
    try {
    
        const db = getDatabase();
    
        const id = req.params.id;
    
        const { status } = req.body; // boolean
    
        const result = await db.collection("users").updateOne(
            { _id: new ObjectId(id) },
            { $set: { nidVerified: status, nidVerifiedAt: status ? new Date() : null } }
        );
    
        res.send(result);
    
    } catch (error) {
    
        res.status(500).send({ message: "Server error" });
    
    }

};

export const getPendingProperties = async (req, res) => {

    try {

        const db = getDatabase();

        const properties = await db.collection("properties")
            .find({ status: "pending" })
            .sort({ createdAt: -1 })
            .toArray();

        res.send(properties);
    
    } catch (error) {
    
        res.status(500).send({ message: "Server error" });
    
    }

};

export const updatePropertyStatus = async (req, res) => {

    try {

        const db = getDatabase();

        const id = req.params.id;

        const { status } = req.body; // status can be: "active", "rejected", "removed", "hidden"

        // Get the current property to check its status
        const property = await db.collection("properties").findOne({ _id: new ObjectId(id) });
        
        if (!property) {
            return res.status(404).send({ message: "Property not found" });
        }

        // Handle REMOVED status (soft delete - permanent)
        if (status === "removed") {
            const result = await db.collection("properties").updateOne(
                { _id: new ObjectId(id) },
                { 
                    $set: { 
                        status: "removed",
                        updatedAt: new Date()
                    } 
                }
            );
            return res.send(result);
        }

        // Handle ACTIVE status (approve property)
        if (status === "active") {
            const result = await db.collection("properties").updateOne(
                { _id: new ObjectId(id) },
                { 
                    $set: { 
                        status: "active",
                        updatedAt: new Date()
                    } 
                }
            );
            return res.send(result);
        }

        // Handle REJECTED status
        if (status === "rejected") {
            const result = await db.collection("properties").updateOne(
                { _id: new ObjectId(id) },
                { 
                    $set: { 
                        status: "rejected",
                        updatedAt: new Date()
                    } 
                }
            );
            return res.send(result);
        }

        // If status is "deal-cancelled", restore previous status from the property document
        if (status === "deal-cancelled") {
            const statusToRestore = property.previousStatus || property.status;
            const result = await db.collection("properties").updateOne(
                { _id: new ObjectId(id) },
                { 
                    $set: { 
                        status: statusToRestore,
                        previousStatus: null, // Clear previous status after restoration
                        updatedAt: new Date()
                    } 
                }
            );
            return res.send(result);
        }

        // Business logic validations
        // Can't mark as rented if listingType is sale
        if (status === "rented" && property.listingType === "sale") {
            return res.status(400).send({ message: "Cannot mark a property for sale as rented" });
        }
        
        // Can't mark as sold if listingType is rent
        if (status === "sold" && property.listingType === "rent") {
            return res.status(400).send({ message: "Cannot mark a property for rent as sold" });
        }
        
        // Can't mark as rented if already rented or sold
        if (status === "rented" && ["rented", "sold"].includes(property.status)) {
            return res.status(400).send({ message: "Property is already marked as rented or sold" });
        }
        
        // Can't mark as sold if already rented or sold
        if (status === "sold" && ["rented", "sold"].includes(property.status)) {
            return res.status(400).send({ message: "Property is already marked as rented or sold" });
        }
        
        // CRITICAL: Admin CANNOT set property to deal-in-progress directly
        // Only owner/user accepting an application can set deal-in-progress
        // Admin can only see and manage properties that are already in deal-in-progress
        if (status === "deal-in-progress") {
            // Check if property already has an active application (meaning it's already in deal-in-progress)
            if (!property.active_proposal_id) {
                return res.status(400).send({ 
                    message: "Cannot set property to deal-in-progress. Only property owner or applicant accepting an application can set this status." 
                });
            }
            // If it already has active_proposal_id, it means it's already in deal-in-progress
            // So admin is just confirming/keeping it, which is fine
        }
        
        // Can't mark deal-in-progress if already rented or sold
        if (status === "deal-in-progress" && ["rented", "sold"].includes(property.status)) {
            return res.status(400).send({ message: "Cannot mark rented or sold property as deal in progress" });
        }
        
        // Can't mark deal-in-progress if property is rejected (must be approved first)
        if (status === "deal-in-progress" && property.status === "rejected") {
            return res.status(400).send({ message: "Cannot mark rejected property as deal in progress. Please approve it first." });
        }

        // For other status changes
        let updateData = { 
            status: status,
            updatedAt: new Date()
        };
        
        // Store previous status if changing from active or pending to deal-in-progress
        // Note: This should only happen if property already has active_proposal_id (from admin perspective)
        if ((property.status === "active" || property.status === "pending") && status === "deal-in-progress") {
            // Double check: only allow if active_proposal_id exists
            if (property.active_proposal_id) {
                updateData.previousStatus = property.status;
            }
        }

        const result = await db.collection("properties").updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        res.send(result);
    
    } catch (error) {
    
        res.status(500).send({ message: "Server error" });
    
    }

};

export const deleteProperty = async (req, res) => {

    try {

        const db = getDatabase();

        const id = req.params.id;

        // Get the property first to check status
        const property = await db.collection("properties").findOne({
            _id: new ObjectId(id)
        });

        if (!property) {
            return res.status(404).send({ message: "Property not found" });
        }

        // CRITICAL: Cannot delete properties with active deals (even admin)
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
                message: "Cannot delete property with active applications. Please wait for applications to be resolved first." 
            });
        }

        const result = await db.collection("properties").deleteOne({
            _id: new ObjectId(id)
        });

        res.send(result);

    } catch (error) {
        
        res.status(500).send({ message: "Server error" });
    
    }

};

export const getStats = async (req, res) => {

    try {
    
        const db = getDatabase();
    
        const pendingVer = await db.collection("users").countDocuments({ nidImages: { $exists: true, $ne: [] }, nidVerified: false });
    
        const pendingList = await db.collection("properties").countDocuments({ status: "pending" });
    
        const activeList = await db.collection("properties").countDocuments({ status: "active" });
    
        const rentedCount = await db.collection("properties").countDocuments({ status: "rented" });
    
        const soldCount = await db.collection("properties").countDocuments({ status: "sold" });

        res.send({
            pendingVer,
            pendingList,
            activeList,
            rentedCount,
            soldCount
        });
    
    } catch (error) {
    
        res.status(500).send({ message: "Server error" });
    
    }

};

export const getAdminPropertyById = async (req, res) => {

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

        res.status(500).send({ message: "Server error" });

    }

};

export const verifyUserByNidFromRegistry = async (req, res) => {

    try {

        const db = getDatabase();

        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid user id" });
        }

        const user = await db.collection("users").findOne({ _id: new ObjectId(id) });

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        if (!user.nidNumber || typeof user.nidNumber !== "string" || !user.nidNumber.trim()) {
            return res.status(400).send({ message: "User has not submitted a valid NID number" });
        }

        const registryRecord = await findByNidNumber(user.nidNumber);

        if (!registryRecord) {
            return res.status(200).send({
                matched: false,
                nidVerified: user.nidVerified || false
            });
        }

        await db.collection("users").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    nidVerified: true,
                    nidVerifiedAt: new Date()
                }
            }
        );

        res.send({
            matched: true,
            nidVerified: true
        });

    } catch (error) {

        res.status(500).send({ message: "Server error" });

    }

};

// Get all users
export const getAllUsers = async (req, res) => {

    try {

        const db = getDatabase();

        const users = await db.collection("users")
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        // Get property count for each user
        const usersWithPropertyCount = await Promise.all(
            users.map(async (user) => {
                const propertyCount = await db.collection("properties")
                    .countDocuments({ "owner.email": user.email });
                return { ...user, totalProperties: propertyCount };
            })
        );

        res.send(usersWithPropertyCount);

    } catch (error) {

        res.status(500).send({ message: "Server error" });

    }

};

// Get all properties
export const getAllProperties = async (req, res) => {

    try {

        const db = getDatabase();

        const properties = await db.collection("properties")
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        res.send(properties);

    } catch (error) {

        res.status(500).send({ message: "Server error" });

    }

};

// Delete user
export const deleteUser = async (req, res) => {

    try {

        const db = getDatabase();

        const id = req.params.id;

        const result = await db.collection("users").deleteOne({
            _id: new ObjectId(id)
        });

        res.send(result);

    } catch (error) {
        
        res.status(500).send({ message: "Server error" });
    
    }

};

