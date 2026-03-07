import { ObjectId } from "mongodb";
import { RatingModel } from "../models/Rating.js";

const ALLOWED_APPLICATION_STATUSES = ["completed", "cancelled"];

const getRoleContext = (application, raterEmail) => {
    if (application?.owner?.email === raterEmail) return "owner_to_seeker";
    if (application?.seeker?.email === raterEmail) return "seeker_to_owner";
    return null;
};

const getRateeEmail = (application, raterEmail) => {
    if (application?.owner?.email === raterEmail) return application?.seeker?.email || null;
    if (application?.seeker?.email === raterEmail) return application?.owner?.email || null;
    return null;
};

const updateUserRatingAggregate = async (db, rateeEmail) => {
    const aggregate = await RatingModel.getAggregateForRatee(db, rateeEmail);
    await db.collection("users").updateOne(
        { email: rateeEmail },
        {
            $set: {
                rating: aggregate,
                updatedAt: new Date()
            }
        }
    );
    return aggregate;
};

export const submitRating = async (req, res) => {
    try {
        const db = req.db;
        const raterEmail = req.user.email;
        const { applicationId, score, review = "" } = req.body;

        if (!applicationId || !ObjectId.isValid(applicationId)) {
            return res.status(400).json({ message: "Valid applicationId is required" });
        }

        const numericScore = Number(score);
        if (!Number.isFinite(numericScore) || numericScore < 1 || numericScore > 5) {
            return res.status(400).json({ message: "score must be between 1 and 5" });
        }

        const application = await db.collection("applications").findOne({ _id: new ObjectId(applicationId) });
        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        const isParticipant = [application?.owner?.email, application?.seeker?.email].includes(raterEmail);
        if (!isParticipant) {
            return res.status(403).json({ message: "You are not part of this deal" });
        }

        if (!ALLOWED_APPLICATION_STATUSES.includes(application.status)) {
            return res.status(400).json({
                message: `Rating is only allowed when application status is one of: ${ALLOWED_APPLICATION_STATUSES.join(", ")}`
            });
        }

        const rateeEmail = getRateeEmail(application, raterEmail);
        const roleContext = getRoleContext(application, raterEmail);

        if (!rateeEmail || !roleContext) {
            return res.status(400).json({ message: "Unable to resolve rating direction" });
        }

        if (rateeEmail === raterEmail) {
            return res.status(400).json({ message: "You cannot rate yourself" });
        }

        const rating = await RatingModel.upsert(db, {
            applicationId,
            propertyId: application.propertyId,
            raterEmail,
            rateeEmail,
            score: numericScore,
            review: String(review || "").trim(),
            roleContext
        });

        const userRating = await updateUserRatingAggregate(db, rateeEmail);

        return res.status(200).json({
            success: true,
            message: "Rating submitted successfully",
            rating,
            userRating
        });
    } catch (error) {
        console.error("POST /ratings error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

export const getCanRateStatus = async (req, res) => {
    try {
        const db = req.db;
        const raterEmail = req.user.email;
        const { applicationId } = req.params;

        if (!applicationId || !ObjectId.isValid(applicationId)) {
            return res.status(400).json({ message: "Valid applicationId is required" });
        }

        const application = await db.collection("applications").findOne({ _id: new ObjectId(applicationId) });
        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        const isParticipant = [application?.owner?.email, application?.seeker?.email].includes(raterEmail);
        if (!isParticipant) {
            return res.status(403).json({ message: "You are not part of this deal" });
        }

        const statusAllowed = ALLOWED_APPLICATION_STATUSES.includes(application.status);
        const counterpartyEmail = getRateeEmail(application, raterEmail);
        const existingRating = await RatingModel.findByApplicationAndRater(db, applicationId, raterEmail);

        return res.status(200).json({
            success: true,
            canRate: statusAllowed,
            alreadyRated: Boolean(existingRating),
            counterpartyEmail,
            applicationStatus: application.status,
            existingRating: existingRating || null
        });
    } catch (error) {
        console.error("GET /ratings/can-rate/:applicationId error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

export const getReceivedRatings = async (req, res) => {
    try {
        const db = req.db;
        const { email } = req.params;
        const skip = Math.max(0, Number(req.query.skip || 0));
        const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));

        if (!email) {
            return res.status(400).json({ message: "email is required" });
        }

        const [ratings, total] = await Promise.all([
            RatingModel.findReceived(db, email, skip, limit),
            RatingModel.countReceived(db, email)
        ]);

        const raterEmails = [...new Set(ratings.map((rating) => rating.raterEmail).filter(Boolean))];
        const propertyIds = ratings
            .map((rating) => rating.propertyId)
            .filter(Boolean);

        const [raters, properties] = await Promise.all([
            raterEmails.length > 0
                ? db.collection("users")
                    .find({ email: { $in: raterEmails } }, { projection: { email: 1, name: 1, profileImage: 1 } })
                    .toArray()
                : [],
            propertyIds.length > 0
                ? db.collection("properties")
                    .find({ _id: { $in: propertyIds } }, { projection: { title: 1 } })
                    .toArray()
                : []
        ]);

        const raterMap = new Map(raters.map((rater) => [rater.email, rater]));
        const propertyMap = new Map(properties.map((property) => [property._id.toString(), property]));

        const enrichedRatings = ratings.map((rating) => ({
            ...rating,
            rater: {
                email: rating.raterEmail,
                name: raterMap.get(rating.raterEmail)?.name || "User",
                profileImage: raterMap.get(rating.raterEmail)?.profileImage || ""
            },
            propertyTitle: rating.propertyId ? propertyMap.get(rating.propertyId.toString())?.title || "Property" : "Property"
        }));

        const aggregate = await RatingModel.getAggregateForRatee(db, email);

        return res.status(200).json({
            success: true,
            total,
            skip,
            limit,
            aggregate,
            ratings: enrichedRatings
        });
    } catch (error) {
        console.error("GET /ratings/received/:email error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
