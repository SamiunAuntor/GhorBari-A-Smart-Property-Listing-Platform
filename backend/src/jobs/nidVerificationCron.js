import cron from "node-cron";
import { getDatabase } from "../config/db.js";
import { verifyPendingUserByNid } from "../services/nidVerificationService.js";

let nidVerificationCronStarted = false;

export function startNidVerificationCron() {
    if (nidVerificationCronStarted) {
        return;
    }

    // Comment out this bootstrap before Vercel deployment and switch to a scheduled endpoint.
    cron.schedule("* * * * *", async () => {
        try {
            const db = getDatabase();
            const pendingUsers = await db.collection("users")
                .find({ nidVerified: "pending" }, { projection: { _id: 1 } })
                .toArray();

            await Promise.allSettled(
                pendingUsers.map((user) => verifyPendingUserByNid(user._id))
            );
        } catch (error) {
            console.error("NID verification cron failed:", error?.message || error);
        }
    });

    nidVerificationCronStarted = true;
}
