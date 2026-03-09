import { getDatabase } from "../config/db.js";

import { ObjectId } from "mongodb";
import { verifyPendingUserByNid } from "../services/nidVerificationService.js";

const INSIGHT_PERIODS = {
    daily: 14,
    weekly: 12,
    monthly: 12
};

function getPeriodStart(date, period) {
    const bucketDate = new Date(date);
    bucketDate.setHours(0, 0, 0, 0);

    if (period === "weekly") {
        const day = bucketDate.getDay();
        const diffToMonday = (day + 6) % 7;
        bucketDate.setDate(bucketDate.getDate() - diffToMonday);
        return bucketDate;
    }

    if (period === "monthly") {
        bucketDate.setDate(1);
        return bucketDate;
    }

    return bucketDate;
}

function shiftPeriod(date, period, amount) {
    const shifted = new Date(date);

    if (period === "weekly") {
        shifted.setDate(shifted.getDate() + amount * 7);
        return shifted;
    }

    if (period === "monthly") {
        shifted.setMonth(shifted.getMonth() + amount);
        return shifted;
    }

    shifted.setDate(shifted.getDate() + amount);
    return shifted;
}

function formatPeriodLabel(date, period) {
    if (period === "weekly") {
        return `Week of ${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`;
    }

    if (period === "monthly") {
        return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    }

    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function buildTimeBuckets(period) {
    const totalBuckets = INSIGHT_PERIODS[period] || INSIGHT_PERIODS.daily;
    const currentBucketStart = getPeriodStart(new Date(), period);
    const buckets = [];

    for (let index = totalBuckets - 1; index >= 0; index -= 1) {
        const bucketStart = shiftPeriod(currentBucketStart, period, -index);
        const bucketKey = bucketStart.toISOString();
        buckets.push({
            key: bucketKey,
            label: formatPeriodLabel(bucketStart, period),
            sold: 0,
            rented: 0,
            registrations: 0
        });
    }

    return buckets;
}

function getBucketKey(date, period) {
    return getPeriodStart(date, period).toISOString();
}

export const getPendingVerifications = async (req, res) => {

    try {

        const db = getDatabase();

        const users = await db.collection("users")
            .find({
                nidNumber: { $exists: true, $ne: null },
                nidVerified: "pending"
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

        const { action } = req.body; // "approve" | "reject"

        if (!["approve", "reject"].includes(action)) {
            return res.status(400).send({ message: "action must be 'approve' or 'reject'" });
        }

        const nextState = action === "approve" ? "verified" : "rejected";

        const existingUser = await db.collection("users").findOne({ _id: new ObjectId(id) });
        if (!existingUser) {
            return res.status(404).send({ message: "User not found" });
        }
        if (existingUser.nidVerified !== "pending") {
            return res.status(400).send({ message: "Only pending verification requests can be processed" });
        }

        const result = await db.collection("users").updateOne(
            { _id: new ObjectId(id) },
            { $set: { nidVerified: nextState, nidVerifiedAt: action === "approve" ? new Date() : null } }
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

        const { status } = req.body;

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

        const allowedStatuses = ["active", "rejected"];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).send({
                message: `Invalid status. Admin can only set: ${allowedStatuses.join(", ")}`
            });
        }

        const result = await db.collection("properties").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    status,
                    updatedAt: new Date()
                }
            }
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
    
        const pendingVer = await db.collection("users").countDocuments({ nidImages: { $exists: true, $ne: [] }, nidVerified: "pending" });

        const verifiedUsers = await db.collection("users").countDocuments({ nidVerified: "verified" });
    
        const activeList = await db.collection("properties").countDocuments({ status: "active" });
    
        const rentedCount = await db.collection("properties").countDocuments({ status: "rented" });
    
        const soldCount = await db.collection("properties").countDocuments({ status: "sold" });

        res.send({
            pendingVer,
            verifiedUsers,
            activeList,
            rentedCount,
            soldCount
        });
    
    } catch (error) {
    
        res.status(500).send({ message: "Server error" });
    
    }

};

export const getDashboardInsights = async (req, res) => {

    try {

        const db = getDatabase();
        const period = ["daily", "weekly", "monthly"].includes(req.query.period) ? req.query.period : "daily";

        const [
            activeCount,
            inProgressCount,
            soldCount,
            rentedCount,
            hiddenCount,
            unverifiedUsers,
            pendingUsers,
            verifiedUsers,
            rejectedUsers,
            dealProperties,
            users
        ] = await Promise.all([
            db.collection("properties").countDocuments({ status: "active" }),
            db.collection("properties").countDocuments({ status: "deal-in-progress" }),
            db.collection("properties").countDocuments({ status: "sold" }),
            db.collection("properties").countDocuments({ status: "rented" }),
            db.collection("properties").countDocuments({ status: "hidden" }),
            db.collection("users").countDocuments({ $or: [{ nidVerified: "unverified" }, { nidVerified: { $exists: false } }] }),
            db.collection("users").countDocuments({ nidVerified: "pending" }),
            db.collection("users").countDocuments({ nidVerified: "verified" }),
            db.collection("users").countDocuments({ nidVerified: "rejected" }),
            db.collection("properties").find(
                { status: { $in: ["sold", "rented"] } },
                { projection: { status: 1, updatedAt: 1, createdAt: 1 } }
            ).toArray(),
            db.collection("users").find(
                {},
                { projection: { createdAt: 1 } }
            ).toArray()
        ]);

        const timeBuckets = buildTimeBuckets(period);
        const timeBucketMap = new Map(timeBuckets.map((bucket) => [bucket.key, bucket]));
        const firstBucketDate = new Date(timeBuckets[0].key);

        dealProperties.forEach((property) => {
            const sourceDate = property.updatedAt || property.createdAt;
            if (!sourceDate) {
                return;
            }

            const eventDate = new Date(sourceDate);
            if (Number.isNaN(eventDate.getTime()) || eventDate < firstBucketDate) {
                return;
            }

            const bucket = timeBucketMap.get(getBucketKey(eventDate, period));
            if (!bucket) {
                return;
            }

            if (property.status === "sold") {
                bucket.sold += 1;
            }

            if (property.status === "rented") {
                bucket.rented += 1;
            }
        });

        users.forEach((user) => {
            if (!user.createdAt) {
                return;
            }

            const createdAt = new Date(user.createdAt);
            if (Number.isNaN(createdAt.getTime()) || createdAt < firstBucketDate) {
                return;
            }

            const bucket = timeBucketMap.get(getBucketKey(createdAt, period));
            if (bucket) {
                bucket.registrations += 1;
            }
        });

        res.send({
            period,
            listingStatus: [
                { name: "Active", value: activeCount },
                { name: "In Progress", value: inProgressCount },
                { name: "Sold", value: soldCount },
                { name: "Rented", value: rentedCount },
                { name: "Hidden", value: hiddenCount }
            ],
            verificationStates: [
                { name: "Unverified", value: unverifiedUsers },
                { name: "Pending", value: pendingUsers },
                { name: "Verified", value: verifiedUsers },
                { name: "Rejected", value: rejectedUsers }
            ],
            dealTrend: timeBuckets.map(({ label, sold, rented }) => ({ label, sold, rented })),
            registrationTrend: timeBuckets.map(({ label, registrations }) => ({ label, registrations }))
        });

    } catch (error) {

        console.error("GET /admin/dashboard-insights error:", error);

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

        const result = await verifyPendingUserByNid(req.params.id);

        if (!result.ok) {
            return res.status(result.status || 400).send({ message: result.message, nidVerified: result.nidVerified });
        }

        res.send({
            matched: result.matched,
            nidVerified: result.nidVerified
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

        const ownerEmails = [...new Set(properties.map((property) => property.owner?.email).filter(Boolean))];
        const owners = ownerEmails.length > 0
            ? await db.collection("users")
                .find({ email: { $in: ownerEmails } })
                .project({ name: 1, email: 1, phone: 1, mobile: 1, photoURL: 1, image: 1 })
                .toArray()
            : [];

        const ownerMap = new Map(owners.map((owner) => [owner.email, owner]));

        const enrichedProperties = properties.map((property) => {
            const ownerEmail = property.owner?.email;
            const ownerProfile = ownerEmail ? ownerMap.get(ownerEmail) : null;

            return {
                ...property,
                owner: {
                    ...property.owner,
                    name: ownerProfile?.name || property.owner?.name || "Owner",
                    email: ownerProfile?.email || property.owner?.email || "",
                    phone: ownerProfile?.phone || ownerProfile?.mobile || property.owner?.phone || property.owner?.mobile || "",
                    photoURL: ownerProfile?.photoURL || ownerProfile?.image || property.owner?.photoURL || property.owner?.image || ""
                }
            };
        });

        res.send(enrichedProperties);

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

