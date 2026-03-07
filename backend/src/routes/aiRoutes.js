import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import * as aiController from "../controllers/aiController.js";

const router = express.Router();

// Send message to AI assistant
router.post("/api/ai/send-message", verifyToken, aiController.sendMessageToAI);
router.post("/api/ai/generate-property-description", verifyToken, aiController.generatePropertyDescription);
router.post("/api/ai/estimate-property-price", verifyToken, aiController.estimatePropertyPrice);

export default router;
