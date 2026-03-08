import { getDatabase } from "../config/db.js";
import { ObjectId } from "mongodb";
import { ConversationModel } from "../models/Chat.js";
import {
    queueApplicationRejectedEmail,
    queueApplicationSubmittedEmail,
    queueApplicationWithdrawnEmail,
    queueCounterAcceptedEmail,
    queueCounterOfferEmail,
    queueDealCancelledEmails,
    queueDealCompletedEmails,
    queueDealInProgressEmail,
    queueOfferRevisedEmail
} from "../services/emailNotificationService.js";

async function getProfileIdentity(db, email, fallback = {}) {
    if (!email) {
        return fallback;
    }

    const user = await db.collection("users").findOne(
        { email },
        {
            projection: {
                name: 1,
                profileImage: 1,
                phone: 1,
                role: 1,
                nidVerified: 1,
                rating: 1,
                createdAt: 1
            }
        }
    );

    return {
        name: user?.name || fallback.name || "User",
        photoURL: user?.profileImage || fallback.photoURL || "",
        phone: user?.phone ?? fallback.phone ?? "",
        role: user?.role ?? fallback.role ?? "",
        nidVerified: user?.nidVerified ?? fallback.nidVerified ?? "unverified",
        rating: user?.rating || fallback.rating || { totalRatings: 0, ratingCount: 0, average: 0 },
        createdAt: user?.createdAt || fallback.createdAt || null
    };
}

async function enrichApplicationParticipants(db, application) {
    if (!application) {
        return application;
    }

    const [ownerIdentity, seekerIdentity] = await Promise.all([
        getProfileIdentity(db, application.owner?.email, application.owner || {}),
        getProfileIdentity(db, application.seeker?.email, application.seeker || {})
    ]);

    return {
        ...application,
        owner: {
            ...application.owner,
            ...ownerIdentity
        },
        seeker: {
            ...application.seeker,
            ...seekerIdentity
        }
    };
}

// Create a new application/proposal
export const createApplication = async (req, res) => {
    try {
        const db = getDatabase();
        const data = req.body;

        // Validate required fields
        if (!data.propertyId) {
            return res.status(400).send({ message: "Property ID is required" });
        }

        if (!ObjectId.isValid(data.propertyId)) {
            return res.status(400).send({ message: "Invalid property ID format" });
        }

        // Check if property exists and is active
        const property = await db.collection("properties").findOne({ 
            _id: new ObjectId(data.propertyId) 
        });

        if (!property) {
            return res.status(404).send({ message: "Property not found" });
        }

        // Check if property is active (only active properties can receive applications)
        if (property.status !== "active") {
            return res.status(400).send({ 
                message: "Property is not available for applications. Only active properties can receive applications." 
            });
        }

        // Check if user is trying to apply to their own property
        if (property.owner.email === req.user.email) {
            return res.status(400).send({ 
                message: "You cannot apply to your own property" 
            });
        }

        // Check if user already has an active/blocking application for this property
        // Blocked statuses: pending, counter, deal-in-progress
        // Allowed to reapply: completed, rejected, withdrawn, cancelled
        const existingApplication = await db.collection("applications").findOne({
            propertyId: new ObjectId(data.propertyId),
            "seeker.email": req.user.email,
            status: { $in: ["pending", "counter", "deal-in-progress"] }
        });

        if (existingApplication) {
            return res.status(400).send({ 
                message: "You already have an active application for this property" 
            });
        }

        // Validate proposedPrice
        if (!data.proposedPrice || Number(data.proposedPrice) <= 0) {
            return res.status(400).send({ message: "Valid proposed price is required" });
        }

        // Get complete seeker information from users collection
        const seekerUser = await db.collection("users").findOne({ email: req.user.email });
        
        // Get complete owner information from users collection
        const ownerUser = await db.collection("users").findOne({ email: property.owner.email });
        const occurredAt = new Date();
        const seekerName = seekerUser?.name || req.user.name || "User";
        const seekerPhoto = seekerUser?.profileImage || req.user.photoURL || "";
        const ownerName = ownerUser?.name || property.owner.name || "User";
        const ownerPhoto = ownerUser?.profileImage || property.owner.photoURL || "";

        // Create comprehensive application with all necessary information
        const application = {
            // Property Reference
            propertyId: new ObjectId(data.propertyId),
            
            // Complete Property Snapshot (at time of application)
            propertySnapshot: {
                _id: property._id,
                title: property.title,
                listingType: property.listingType,
                propertyType: property.propertyType,
                price: property.price, // Original listing price
                areaSqFt: property.areaSqFt,
                address: property.address,
                images: property.images,
                overview: property.overview,
                amenities: property.amenities || [],
                location: property.location,
                status: property.status,
                // Dynamic fields
                ...(property.roomCount && { roomCount: property.roomCount }),
                ...(property.bathrooms && { bathrooms: property.bathrooms }),
                ...(property.floorCount && { floorCount: property.floorCount }),
                ...(property.totalUnits && { totalUnits: property.totalUnits })
            },

            // Complete Owner Information
            owner: {
                uid: property.owner.uid,
                name: ownerName,
                email: property.owner.email,
                photoURL: ownerPhoto,
                // Additional owner details from users collection
                phone: ownerUser?.phone || "",
                role: ownerUser?.role || "",
                nidVerified: ownerUser?.nidVerified || "unverified",
                rating: ownerUser?.rating || { totalRatings: 0, ratingCount: 0, average: 0 },
                createdAt: ownerUser?.createdAt || null
            },

            // Complete Seeker Information
            seeker: {
                uid: req.user.uid,
                name: seekerName,
                email: req.user.email,
                photoURL: seekerPhoto,
                // Additional seeker details from users collection
                phone: seekerUser?.phone || "",
                role: seekerUser?.role || "",
                nidVerified: seekerUser?.nidVerified || "unverified",
                rating: seekerUser?.rating || { totalRatings: 0, ratingCount: 0, average: 0 },
                createdAt: seekerUser?.createdAt || null
            },

            // Application Details
            status: "pending",
            originalListingPrice: property.price, // Store original price
            proposedPrice: Number(data.proposedPrice), // Current proposed price
            message: data.message || "",

            // Embedded Messages Thread (conversation between seeker and owner)
            messages: [
                ...(data.message
                    ? [{
                        _id: new ObjectId(),
                        sender: "seeker",
                        senderEmail: req.user.email,
                        senderName: seekerName,
                        text: data.message,
                        actionType: "application_submitted",
                        linkedPrice: Number(data.proposedPrice),
                        timestamp: occurredAt
                    }]
                    : [])
            ],

            // Negotiation History (track all changes)
            negotiationHistory: [
                {
                    action: "application_submitted",
                    actor: "seeker",
                    actorEmail: req.user.email,
                    proposedPrice: Number(data.proposedPrice),
                    status: "pending",
                    message: data.message || "",
                    timestamp: occurredAt
                }
            ],

            // Price History (track all price changes)
            priceHistory: [
                {
                    price: Number(data.proposedPrice),
                    setBy: "seeker",
                    setByEmail: req.user.email,
                    timestamp: occurredAt,
                    note: "Initial offer"
                }
            ],

            // Status History (track all status changes)
            statusHistory: [
                {
                    status: "pending",
                    changedBy: "seeker",
                    changedByEmail: req.user.email,
                    timestamp: occurredAt,
                    note: "Application submitted"
                }
            ],

            // Timestamps
            createdAt: occurredAt,
            updatedAt: occurredAt,
            lastActionAt: occurredAt,
            lastActionBy: "seeker",
            lastActionByEmail: req.user.email
        };

        const result = await db.collection("applications").insertOne(application);

        await queueApplicationSubmittedEmail(
            { ...application, _id: result.insertedId },
            occurredAt
        );

        res.status(201).send({ 
            success: true, 
            id: result.insertedId,
            message: "Application submitted successfully" 
        });

    } catch (error) {
        console.error("POST /application error:", error);
        res.status(500).send({ message: "Server error" });
    }
};

// Get all applications for a user (as seeker)
export const getMyApplications = async (req, res) => {
    try {
        const db = getDatabase();
        const email = req.query.email;

        if (!email) {
            return res.status(400).send({ message: "Email is required" });
        }

        const applications = await db.collection("applications")
            .find({ "seeker.email": email })
            .sort({ createdAt: -1 })
            .toArray();

        // Populate property details for each application
        const applicationsWithProperties = await Promise.all(
            applications.map(async (app) => {
                const property = await db.collection("properties").findOne({
                    _id: app.propertyId
                });
                const enrichedApplication = await enrichApplicationParticipants(db, app);
                return {
                    ...enrichedApplication,
                    property: property || null
                };
            })
        );

        res.send(applicationsWithProperties);

    } catch (error) {
        console.error("GET /my-applications error:", error);
        res.status(500).send({ message: "Server error" });
    }
};

// Get all applications for a property (as owner)
export const getPropertyApplications = async (req, res) => {
    try {
        const db = getDatabase();
        const propertyId = req.params.propertyId;

        if (!propertyId) {
            return res.status(400).send({ message: "Property ID is required" });
        }

        if (!ObjectId.isValid(propertyId)) {
            return res.status(400).send({ message: "Invalid property ID format" });
        }

        // Verify that the user owns this property
        const property = await db.collection("properties").findOne({
            _id: new ObjectId(propertyId)
        });

        if (!property) {
            return res.status(404).send({ message: "Property not found" });
        }

        if (property.owner.email !== req.user.email) {
            return res.status(403).send({ 
                message: "You don't have permission to view applications for this property" 
            });
        }

        // Find applications - propertyId is stored as ObjectId
        const applications = await db.collection("applications")
            .find({ propertyId: new ObjectId(propertyId) })
            .sort({ createdAt: -1 })
            .toArray();
        const enrichedApplications = await Promise.all(
            applications.map((application) => enrichApplicationParticipants(db, application))
        );

        res.send(enrichedApplications);

    } catch (error) {
        console.error("GET /property/:propertyId/applications error:", error);
        console.error("Error stack:", error.stack);
        res.status(500).send({ message: "Server error: " + error.message });
    }
};

// Update application status (owner actions: accept, reject, counter)
export const updateApplicationStatus = async (req, res) => {
    try {
        const db = getDatabase();
        const applicationId = req.params.id;
        const { status, proposedPrice, message } = req.body;

        if (!ObjectId.isValid(applicationId)) {
            return res.status(400).send({ message: "Invalid application ID format" });
        }

        // Valid statuses for owner actions
        const validStatuses = ["deal-in-progress", "rejected", "counter"];
        if (!validStatuses.includes(status)) {
            return res.status(400).send({ 
                message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` 
            });
        }

        // Get the application
        const application = await db.collection("applications").findOne({
            _id: new ObjectId(applicationId)
        });

        if (!application) {
            return res.status(404).send({ message: "Application not found" });
        }

        // Get the property to verify ownership
        const property = await db.collection("properties").findOne({
            _id: application.propertyId
        });

        if (!property) {
            return res.status(404).send({ message: "Property not found" });
        }

        if (property.owner.email !== req.user.email) {
            return res.status(403).send({ 
                message: "You don't have permission to update this application" 
            });
        }

        // Business logic for accepting an application (now using "deal-in-progress" status)
        if (status === "deal-in-progress") {
            // Owner cannot accept their own counter offer - only seeker can accept counter offers
            if (application.status === "counter") {
                return res.status(400).send({ 
                    message: "You cannot accept your own counter offer. Wait for the seeker to respond." 
                });
            }

            // Owner can only accept when status is "pending" (seeker's offer)
            if (application.status !== "pending") {
                return res.status(400).send({ 
                    message: `Cannot accept application with status "${application.status}". Only pending applications can be accepted.` 
                });
            }

            // Check if property already has an active proposal
            if (property.active_proposal_id) {
                return res.status(400).send({ 
                    message: "Property already has an accepted proposal" 
                });
            }

            // Update property: set status to deal-in-progress, set active_proposal_id
            await db.collection("properties").updateOne(
                { _id: property._id },
                {
                    $set: {
                        status: "deal-in-progress",
                        active_proposal_id: new ObjectId(applicationId),
                        updatedAt: new Date()
                    }
                }
            );

            // Ensure a chat conversation exists between owner and seeker for this property
            await ConversationModel.findOrCreate(
                db,
                application.owner.email,
                application.seeker.email,
                application.propertyId
            );

            // NOTE: We do NOT auto-reject other applications here because deal-in-progress is not final.
            // Other applications will only be auto-rejected when the deal is marked as sold/rented (completed).
        }

        // For counter offers, require proposedPrice
        if (status === "counter") {
            if (!proposedPrice || Number(proposedPrice) <= 0) {
                return res.status(400).send({ 
                    message: "Valid proposed price is required for counter offers" 
                });
            }
        }
        const ownerIdentity = await getProfileIdentity(db, req.user.email, application.owner || {});

        // Prepare update data with comprehensive tracking
        const occurredAt = new Date();
        const setData = {
            status: status,
            updatedAt: occurredAt,
            lastActionAt: occurredAt,
            lastActionBy: "owner",
            lastActionByEmail: req.user.email
        };

        // Store final price when owner accepts the deal (deal closing price)
        if (status === "deal-in-progress" && application.status === "pending") {
            setData.finalPrice = application.proposedPrice; // Closing price = seeker's offer
        }

        // When owner counters, update the proposedPrice to owner's counter offer
        if (status === "counter" && proposedPrice) {
            const newPrice = Number(proposedPrice);
            setData.proposedPrice = newPrice;
            // Optionally update the top-level message to reflect latest owner note
            if (message !== undefined) {
                setData.message = message || "";
            }
        }

        // Prepare push data for history tracking
        const pushData = {};
        
        if (status === "counter" && proposedPrice) {
            pushData.priceHistory = {
                price: Number(proposedPrice),
                setBy: "owner",
                setByEmail: req.user.email,
                timestamp: occurredAt,
                note: "Owner counter offer"
            };
            pushData.negotiationHistory = {
                action: "counter_offer",
                actor: "owner",
                actorEmail: req.user.email,
                proposedPrice: Number(proposedPrice),
                status: "counter",
                message: message || "",
                timestamp: occurredAt
            };
            pushData.statusHistory = {
                status: "counter",
                changedBy: "owner",
                changedByEmail: req.user.email,
                timestamp: occurredAt,
                note: "Owner sent counter offer"
            };
            // Embed a message entry for this counter offer if message is provided
            if (message !== undefined && message !== "") {
                pushData.messages = {
                    _id: new ObjectId(),
                    sender: "owner",
                    senderEmail: req.user.email,
                    senderName: ownerIdentity.name,
                    text: message,
                    actionType: "counter_offer",
                    linkedPrice: Number(proposedPrice),
                    timestamp: occurredAt
                };
            }
        } else {
            // For accept/reject, add to history
            pushData.negotiationHistory = {
                action: status === "deal-in-progress" ? "application_accepted" : "application_rejected",
                actor: "owner",
                actorEmail: req.user.email,
                status: status,
                timestamp: occurredAt
            };
            pushData.statusHistory = {
                status: status,
                changedBy: "owner",
                changedByEmail: req.user.email,
                timestamp: occurredAt,
                note: status === "deal-in-progress" ? "Owner accepted application - Deal in progress" : "Owner rejected application"
            };
        }

        // Build update operation
        const updateOperation = { $set: setData };
        if (Object.keys(pushData).length > 0) {
            updateOperation.$push = pushData;
        }

        const result = await db.collection("applications").updateOne(
            { _id: new ObjectId(applicationId) },
            updateOperation
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Application not found" });
        }

        const applicationForNotification = await enrichApplicationParticipants(db, {
            ...application,
            ...setData,
            proposedPrice: setData.proposedPrice ?? application.proposedPrice,
            message: setData.message ?? application.message,
            finalPrice: setData.finalPrice ?? application.finalPrice
        });

        if (status === "counter") {
            await queueCounterOfferEmail(applicationForNotification, occurredAt, {
                proposedPrice: Number(proposedPrice),
                message: message || ""
            });
        } else if (status === "rejected") {
            await queueApplicationRejectedEmail(applicationForNotification, occurredAt);
        } else if (status === "deal-in-progress") {
            await queueDealInProgressEmail(applicationForNotification, occurredAt);
        }

        res.send({ 
            success: true, 
            message: `Application ${status} successfully` 
        });

    } catch (error) {
        console.error("PATCH /application/:id error:", error);
        res.status(500).send({ message: "Server error" });
    }
};

// Withdraw application (seeker action)
export const withdrawApplication = async (req, res) => {
    try {
        const db = getDatabase();
        const applicationId = req.params.id;

        if (!ObjectId.isValid(applicationId)) {
            return res.status(400).send({ message: "Invalid application ID format" });
        }

        // Get the application
        const application = await db.collection("applications").findOne({
            _id: new ObjectId(applicationId)
        });

        if (!application) {
            return res.status(404).send({ message: "Application not found" });
        }

        // Verify that the user is the seeker
        if (application.seeker.email !== req.user.email) {
            return res.status(403).send({ 
                message: "You don't have permission to withdraw this application" 
            });
        }

        // Can only withdraw pending or counter applications
        if (!["pending", "counter"].includes(application.status)) {
            return res.status(400).send({ 
                message: "Can only withdraw pending or counter applications" 
            });
        }

        const occurredAt = new Date();

        // Update application status with history
        const result = await db.collection("applications").updateOne(
            { _id: new ObjectId(applicationId) },
            {
                $set: {
                    status: "withdrawn",
                    updatedAt: occurredAt,
                    lastActionAt: occurredAt,
                    lastActionBy: "seeker",
                    lastActionByEmail: req.user.email
                },
                $push: {
                    negotiationHistory: {
                        action: "application_withdrawn",
                        actor: "seeker",
                        actorEmail: req.user.email,
                        status: "withdrawn",
                        timestamp: occurredAt
                    },
                    statusHistory: {
                        status: "withdrawn",
                        changedBy: "seeker",
                        changedByEmail: req.user.email,
                        timestamp: occurredAt,
                        note: "Seeker withdrew application"
                    }
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Application not found" });
        }

        const applicationForNotification = await enrichApplicationParticipants(db, application);
        await queueApplicationWithdrawnEmail(applicationForNotification, occurredAt);

        res.send({ 
            success: true, 
            message: "Application withdrawn successfully" 
        });

    } catch (error) {
        console.error("PATCH /application/:id/withdraw error:", error);
        res.status(500).send({ message: "Server error" });
    }
};

// Generic: send a standalone message on an application (owner or seeker)
export const sendApplicationMessage = async (req, res) => {
    try {
        const db = getDatabase();
        const applicationId = req.params.id;
        const { text } = req.body;

        if (!ObjectId.isValid(applicationId)) {
            return res.status(400).send({ message: "Invalid application ID format" });
        }

        if (!text || typeof text !== "string" || text.trim().length === 0) {
            return res.status(400).send({ message: "Message text is required" });
        }

        const application = await db.collection("applications").findOne({
            _id: new ObjectId(applicationId)
        });

        if (!application) {
            return res.status(404).send({ message: "Application not found" });
        }

        const isSeeker = application.seeker?.email === req.user.email;
        const isOwner = application.owner?.email === req.user.email;

        if (!isSeeker && !isOwner && req.user.role !== "admin") {
            return res.status(403).send({
                message: "You don't have permission to send messages on this application"
            });
        }

        const senderRole = isSeeker ? "seeker" : isOwner ? "owner" : "admin";
        const senderIdentity = await getProfileIdentity(db, req.user.email, isSeeker ? application.seeker || {} : isOwner ? application.owner || {} : req.user);

        const messageEntry = {
            _id: new ObjectId(),
            sender: senderRole,
            senderEmail: req.user.email,
            senderName: senderIdentity.name,
            text: text.trim(),
            actionType: "manual_message",
            linkedPrice: application.proposedPrice || application.originalListingPrice || null,
            timestamp: new Date()
        };

        const result = await db.collection("applications").updateOne(
            { _id: new ObjectId(applicationId) },
            {
                $set: {
                    updatedAt: new Date(),
                    lastActionAt: new Date(),
                    lastActionBy: senderRole,
                    lastActionByEmail: req.user.email
                },
                $push: {
                    messages: messageEntry,
                    negotiationHistory: {
                        action: "message_sent",
                        actor: senderRole,
                        actorEmail: req.user.email,
                        status: application.status,
                        message: text.trim(),
                        timestamp: new Date()
                    }
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Application not found" });
        }

        res.send({
            success: true,
            message: "Message sent successfully",
            data: messageEntry
        });

    } catch (error) {
        console.error("POST /application/:id/message error:", error);
        res.status(500).send({ message: "Server error" });
    }
};

// Revise offer (seeker action - counter back to owner)
export const reviseApplication = async (req, res) => {
    try {
        const db = getDatabase();
        const applicationId = req.params.id;
        const { proposedPrice, message } = req.body;

        if (!ObjectId.isValid(applicationId)) {
            return res.status(400).send({ message: "Invalid application ID format" });
        }

        if (!proposedPrice || Number(proposedPrice) <= 0) {
            return res.status(400).send({ message: "Valid proposed price is required" });
        }

        // Get the application
        const application = await db.collection("applications").findOne({
            _id: new ObjectId(applicationId)
        });

        if (!application) {
            return res.status(404).send({ message: "Application not found" });
        }

        // Verify that the user is the seeker
        if (application.seeker.email !== req.user.email) {
            return res.status(403).send({ 
                message: "You don't have permission to revise this application" 
            });
        }

        // Can only revise counter applications (when owner has countered)
        if (application.status !== "counter") {
            return res.status(400).send({ 
                message: "Can only revise applications that have received a counter offer" 
            });
        }

        const occurredAt = new Date();
        const seekerIdentity = await getProfileIdentity(db, req.user.email, application.seeker || {});

        // Prepare update data (same structure as owner's counter)
        const setData = {
            status: "pending",
            proposedPrice: Number(proposedPrice),
            updatedAt: occurredAt,
            lastActionAt: occurredAt,
            lastActionBy: "seeker",
            lastActionByEmail: req.user.email
        };

        // Update message if provided
        if (message !== undefined) {
            setData.message = message || "";
        }

        // Prepare push data for history tracking (same structure as owner's counter)
        const pushData = {
            priceHistory: {
                price: Number(proposedPrice),
                setBy: "seeker",
                setByEmail: req.user.email,
                timestamp: occurredAt,
                note: "Seeker revised offer"
            },
            negotiationHistory: {
                action: "offer_revised",
                actor: "seeker",
                actorEmail: req.user.email,
                proposedPrice: Number(proposedPrice),
                status: "pending",
                message: message || "",
                timestamp: occurredAt
            },
            statusHistory: {
                status: "pending",
                changedBy: "seeker",
                changedByEmail: req.user.email,
                timestamp: occurredAt,
                note: "Seeker revised offer - waiting for owner response"
            },
            ...(message !== undefined && message !== ""
                ? {
                    messages: {
                        _id: new ObjectId(),
                        sender: "seeker",
                        senderEmail: req.user.email,
                        senderName: seekerIdentity.name,
                        text: message,
                        actionType: "offer_revised",
                        linkedPrice: Number(proposedPrice),
                        timestamp: occurredAt
                    }
                }
                : {})
        };

        // Build update operation (same structure as owner's counter)
        const updateOperation = {
            $set: setData,
            $push: pushData
        };

        // Update application: new price, message (if provided) and status back to pending
        const result = await db.collection("applications").updateOne(
            { _id: new ObjectId(applicationId) },
            updateOperation
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Application not found" });
        }

        const applicationForNotification = await enrichApplicationParticipants(db, {
            ...application,
            ...setData,
            proposedPrice: Number(proposedPrice),
            message: message ?? application.message
        });

        await queueOfferRevisedEmail(applicationForNotification, occurredAt, {
            proposedPrice: Number(proposedPrice),
            message: message || ""
        });

        res.send({ 
            success: true, 
            message: "Offer revised successfully" 
        });

    } catch (error) {
        console.error("PATCH /application/:id/revise error:", error);
        res.status(500).send({ message: "Server error" });
    }
};

// Accept counter offer (seeker action - accepts owner's counter offer)
export const acceptCounterOffer = async (req, res) => {
    try {
        const db = getDatabase();
        const applicationId = req.params.id;

        if (!ObjectId.isValid(applicationId)) {
            return res.status(400).send({ message: "Invalid application ID format" });
        }

        // Get the application
        const application = await db.collection("applications").findOne({
            _id: new ObjectId(applicationId)
        });

        if (!application) {
            return res.status(404).send({ message: "Application not found" });
        }

        // Verify that the user is the seeker
        if (application.seeker.email !== req.user.email) {
            return res.status(403).send({ 
                message: "You don't have permission to accept this counter offer" 
            });
        }

        // Can only accept counter offers
        if (application.status !== "counter") {
            return res.status(400).send({ 
                message: "Can only accept counter offers. Current status: " + application.status 
            });
        }

        // Get the property
        const property = await db.collection("properties").findOne({
            _id: application.propertyId
        });

        if (!property) {
            return res.status(404).send({ message: "Property not found" });
        }

        // If property already has an active proposal, cancel it first
        const occurredAt = new Date();
        if (property.active_proposal_id) {
            const existingApplicationId = property.active_proposal_id;
            
            // Don't cancel if it's the same application
            if (existingApplicationId.toString() !== applicationId.toString()) {
                // Cancel the existing deal-in-progress application
                await db.collection("applications").updateOne(
                    { _id: existingApplicationId },
                    {
                        $set: {
                            status: "cancelled",
                            updatedAt: occurredAt,
                            lastActionAt: occurredAt,
                            lastActionBy: "system",
                            lastActionByEmail: "system@ghorbari.com"
                        },
                        $push: {
                            negotiationHistory: {
                                action: "deal_cancelled",
                                actor: "system",
                                actorEmail: "system@ghorbari.com",
                                status: "cancelled",
                                timestamp: occurredAt,
                                note: "Deal cancelled automatically: Another application was accepted"
                            },
                            statusHistory: {
                                status: "cancelled",
                                changedBy: "system",
                                changedByEmail: "system@ghorbari.com",
                                timestamp: occurredAt,
                                note: "Deal cancelled automatically: Another application was accepted"
                            }
                        }
                    }
                );
            }
        }

        // Update application: accept the counter offer (now using "deal-in-progress" status)
        const result = await db.collection("applications").updateOne(
            { _id: new ObjectId(applicationId) },
            {
                $set: {
                    status: "deal-in-progress",
                    finalPrice: application.proposedPrice, // Closing price = owner's counter offer
                    updatedAt: occurredAt,
                    lastActionAt: occurredAt,
                    lastActionBy: "seeker",
                    lastActionByEmail: req.user.email
                },
                $push: {
                    negotiationHistory: {
                        action: "counter_offer_accepted",
                        actor: "seeker",
                        actorEmail: req.user.email,
                        proposedPrice: application.proposedPrice, // Owner's counter price
                        status: "deal-in-progress",
                        timestamp: occurredAt,
                        note: "Seeker accepted owner's counter offer - Deal in progress"
                    },
                    statusHistory: {
                        status: "deal-in-progress",
                        changedBy: "seeker",
                        changedByEmail: req.user.email,
                        timestamp: occurredAt,
                        note: "Seeker accepted owner's counter offer - Deal in progress"
                    }
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Application not found" });
        }

        // Update property: set status to deal-in-progress, set active_proposal_id
        await db.collection("properties").updateOne(
            { _id: property._id },
            {
                $set: {
                    status: "deal-in-progress",
                    active_proposal_id: new ObjectId(applicationId),
                    updatedAt: occurredAt
                }
            }
        );

        // Ensure a chat conversation exists between owner and seeker for this property
        await ConversationModel.findOrCreate(
            db,
            application.owner.email,
            application.seeker.email,
            application.propertyId
        );

        // NOTE: We do NOT auto-reject other applications here because deal-in-progress is not final.
        // Other applications will only be auto-rejected when the deal is marked as sold/rented (completed).

        const applicationForNotification = await enrichApplicationParticipants(db, {
            ...application,
            status: "deal-in-progress",
            finalPrice: application.proposedPrice
        });

        await queueCounterAcceptedEmail(applicationForNotification, occurredAt);

        res.send({ 
            success: true, 
            message: "Counter offer accepted successfully! Deal is now in progress." 
        });

    } catch (error) {
        console.error("PATCH /application/:id/accept-counter error:", error);
        res.status(500).send({ message: "Server error" });
    }
};

// Complete or cancel deal (owner/admin actions)
export const updateDealStatus = async (req, res) => {
    try {
        const db = getDatabase();
        const propertyId = req.params.propertyId;
        const { dealStatus } = req.body; // "completed" or "cancelled"

        if (!ObjectId.isValid(propertyId)) {
            return res.status(400).send({ message: "Invalid property ID format" });
        }

        if (!["completed", "cancelled"].includes(dealStatus)) {
            return res.status(400).send({ 
                message: "dealStatus must be 'completed' or 'cancelled'" 
            });
        }

        // Get the property
        const property = await db.collection("properties").findOne({
            _id: new ObjectId(propertyId)
        });

        if (!property) {
            return res.status(404).send({ message: "Property not found" });
        }

        // Get the active application ID first
        const activeApplicationId = property.active_proposal_id;

        // Check if property is in deal-in-progress with an active proposal
        if (property.status !== "deal-in-progress" || !activeApplicationId) {
            return res.status(400).send({ 
                message: "Property is not in deal-in-progress with an active proposal" 
            });
        }

        // Convert to ObjectId if it's a string
        const applicationId = typeof activeApplicationId === 'string' 
            ? new ObjectId(activeApplicationId) 
            : activeApplicationId;

        // Get the active application
        const application = await db.collection("applications").findOne({
            _id: applicationId
        });

        if (!application) {
            return res.status(404).send({ message: "Application not found" });
        }

        // Verify ownership, application ownership, or admin
        const isOwner = property.owner.email === req.user.email;
        const isSeeker = application.seeker.email === req.user.email;
        const isAdmin = req.user.role === "admin";

        if (!isOwner && !isSeeker && !isAdmin) {
            return res.status(403).send({ 
                message: "You don't have permission to update this deal. Only the property owner, applicant, or admin can update deals." 
            });
        }

        const occurredAt = new Date();
        let completedPropertyStatus = null;

        if (dealStatus === "completed") {
            // Check if application is in deal-in-progress
            if (application.status !== "deal-in-progress") {
                return res.status(400).send({ 
                    message: "Application must be in deal-in-progress status to be marked as completed" 
                });
            }

            // Mark property as sold/rented based on listingType
            const finalStatus = property.listingType === "sale" ? "sold" : "rented";
            
            await db.collection("properties").updateOne(
                { _id: property._id },
                {
                    $set: {
                        status: finalStatus,
                        visibility: "hidden",
                        updatedAt: occurredAt
                    }
                }
            );

            // NOW reject all other pending/counter/deal-in-progress applications since deal is finalized
            const actorType = isOwner ? "owner" : isSeeker ? "seeker" : "admin";
            await db.collection("applications").updateMany(
                {
                    propertyId: property._id,
                    _id: { $ne: applicationId },
                    status: { $in: ["pending", "counter", "deal-in-progress"] }
                },
                {
                    $set: {
                        status: "rejected",
                        updatedAt: occurredAt,
                        lastActionAt: occurredAt,
                        lastActionBy: "system",
                        lastActionByEmail: req.user.email
                    },
                    $push: {
                        statusHistory: {
                            status: "rejected",
                            changedBy: "system",
                            changedByEmail: req.user.email,
                            timestamp: occurredAt,
                            note: "Auto-rejected: Property deal has been finalized (sold/rented)"
                        },
                        negotiationHistory: {
                            action: "application_auto_rejected",
                            actor: "system",
                            actorEmail: req.user.email,
                            status: "rejected",
                            timestamp: occurredAt,
                            note: "Auto-rejected because property deal has been finalized (sold/rented)"
                        }
                    }
                }
            );

            // Update application status to completed
            await db.collection("applications").updateOne(
                { _id: applicationId },
                {
                    $set: {
                        status: "completed",
                        updatedAt: occurredAt,
                        lastActionAt: occurredAt,
                        lastActionBy: actorType,
                        lastActionByEmail: req.user.email
                    },
                    $push: {
                        negotiationHistory: {
                            action: "deal_completed",
                            actor: actorType,
                            actorEmail: req.user.email,
                            status: "completed",
                            timestamp: occurredAt,
                            note: `Deal completed - Property marked as ${finalStatus}`
                        },
                        statusHistory: {
                            status: "completed",
                            changedBy: actorType,
                            changedByEmail: req.user.email,
                            timestamp: occurredAt,
                            note: `Deal completed - Property marked as ${finalStatus}`
                        }
                    }
                }
            );

            completedPropertyStatus = finalStatus;

        } else if (dealStatus === "cancelled") {
            // Check if application is in deal-in-progress
            if (application.status !== "deal-in-progress") {
                return res.status(400).send({ 
                    message: "Application must be in deal-in-progress status to be cancelled" 
                });
            }

            // Restore property to previous status or active, clear active_proposal_id
            const previousStatus = property.previousStatus || "active";
            await db.collection("properties").updateOne(
                { _id: property._id },
                {
                    $set: {
                        status: previousStatus,
                        active_proposal_id: null,
                        previousStatus: null, // Clear previous status
                        updatedAt: occurredAt
                    }
                }
            );

            // Mark application as cancelled with history
            const actorType = isOwner ? "owner" : isSeeker ? "seeker" : "admin";
            await db.collection("applications").updateOne(
                { _id: applicationId },
                {
                    $set: {
                        status: "cancelled",
                        updatedAt: occurredAt,
                        lastActionAt: occurredAt,
                        lastActionBy: actorType,
                        lastActionByEmail: req.user.email
                    },
                    $push: {
                        negotiationHistory: {
                            action: "deal_cancelled",
                            actor: actorType,
                            actorEmail: req.user.email,
                            status: "cancelled",
                            timestamp: occurredAt,
                            note: "Deal cancelled"
                        },
                        statusHistory: {
                            status: "cancelled",
                            changedBy: actorType,
                            changedByEmail: req.user.email,
                            timestamp: occurredAt,
                            note: "Deal cancelled"
                        }
                    }
                }
            );
        }

        const applicationForNotification = await enrichApplicationParticipants(db, {
            ...application,
            finalPrice: application.finalPrice ?? application.proposedPrice,
            status: dealStatus
        });

        if (dealStatus === "completed") {
            await queueDealCompletedEmails(
                applicationForNotification,
                occurredAt,
                completedPropertyStatus
            );
        } else {
            await queueDealCancelledEmails(
                applicationForNotification,
                occurredAt
            );
        }

        res.send({ 
            success: true, 
            message: `Deal ${dealStatus} successfully`,
            propertyId: property._id,
            applicationId: applicationId
        });

    } catch (error) {
        console.error("PATCH /property/:propertyId/deal error:", error);
        res.status(500).send({ message: "Server error" });
    }
};
