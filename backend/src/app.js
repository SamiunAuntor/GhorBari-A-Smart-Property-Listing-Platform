import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import userRoutes from "./routes/userRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import comparisonRoutes from "./routes/comparisonRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import ratingRoutes from "./routes/ratingRoutes.js";
import internalRoutes from "./routes/internalRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";


// Load environment variables
dotenv.config();

const app = express();


// ========== MIDDLEWARE ==========

// CORS configuration
app.use(cors());

// JSON body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ========== HEALTH CHECK ==========

app.get("/", (req, res) => {

    res.send("🏠 GhorBari server is running");

});


// ========== ROUTES ==========

// User routes
app.use("/", userRoutes);

// Property routes
app.use("/", propertyRoutes);

// Admin routes
app.use("/", adminRoutes);

// Application routes
app.use("/", applicationRoutes);

// Chat routes
app.use("/", chatRoutes);

// Comparison routes
app.use("/", comparisonRoutes);

// Statistics routes
app.use("/", statsRoutes);

// AI routes
app.use("/", aiRoutes);

// Wishlist routes
app.use("/", wishlistRoutes);

// Rating routes
app.use("/", ratingRoutes);

// Internal routes
app.use("/", internalRoutes);

// Payment routes
app.use("/", paymentRoutes);


export default app;
