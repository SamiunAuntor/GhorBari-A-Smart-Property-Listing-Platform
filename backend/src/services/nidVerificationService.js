import { ObjectId } from "mongodb";
import { getDatabase } from "../config/db.js";
import { findByNidNumber } from "./nidRegistryService.js";

export async function verifyPendingUserByNid(userId) {
    const db = getDatabase();
    const normalizedId = typeof userId === "string" ? userId : userId?.toString();

    if (!normalizedId || !ObjectId.isValid(normalizedId)) {
        return { ok: false, status: 400, message: "Invalid user id" };
    }

    const _id = new ObjectId(normalizedId);
    const user = await db.collection("users").findOne({ _id });

    if (!user) {
        return { ok: false, status: 404, message: "User not found" };
    }

    if (user.nidVerified !== "pending") {
        return { ok: false, status: 400, message: "Only pending verification requests can be processed", nidVerified: user.nidVerified };
    }

    if (!user.nidNumber || typeof user.nidNumber !== "string" || !user.nidNumber.trim()) {
        return { ok: false, status: 400, message: "User has not submitted a valid NID number" };
    }

    const registryRecord = await findByNidNumber(user.nidNumber);
    const nextState = registryRecord ? "verified" : "rejected";
    const verifiedAt = registryRecord ? new Date() : null;

    const updateResult = await db.collection("users").updateOne(
        { _id, nidVerified: "pending" },
        {
            $set: {
                nidVerified: nextState,
                nidVerifiedAt: verifiedAt
            }
        }
    );

    if (updateResult.matchedCount === 0) {
        const latestUser = await db.collection("users").findOne({ _id }, { projection: { nidVerified: 1 } });
        return {
            ok: false,
            status: 409,
            message: "Verification request was already processed",
            nidVerified: latestUser?.nidVerified
        };
    }

    return {
        ok: true,
        matched: !!registryRecord,
        nidVerified: nextState
    };
}
