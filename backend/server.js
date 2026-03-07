import app from "./src/app.js";

import { connectDatabase } from "./src/config/db.js";

import { initializeSocket } from "./src/config/socket.js";

import { setupSocketEvents } from "./src/events/chatEvents.js";
import { startEmailJobCron } from "./src/jobs/emailJobCron.js";
import { startNidVerificationCron } from "./src/jobs/nidVerificationCron.js";

import http from "http";

const PORT = process.env.PORT || 5000;

async function startServer() {

    try {
        
        await connectDatabase();

        // Create HTTP server for Socket.io
        const httpServer = http.createServer(app);

        // Initialize Socket.io
        initializeSocket(httpServer);

        // Setup Socket.io event handlers
        setupSocketEvents();

        if (process.env.ENABLE_EMAIL_JOB_CRON !== "false") {
            startEmailJobCron();
        }

        if (process.env.ENABLE_NID_VERIFICATION_CRON !== "false") {
            startNidVerificationCron();
        }

        httpServer.listen(PORT, () => {

            console.log(`🏠 GhorBari server is running at http://localhost:${PORT}`);

        });

    } catch (error) {

        console.error("❌ Server startup failed:", error.message);

        process.exit(1);

    }
}

startServer();
