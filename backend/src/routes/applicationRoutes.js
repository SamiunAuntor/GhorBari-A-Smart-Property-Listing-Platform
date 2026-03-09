import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import * as applicationController from "../controllers/applicationController.js";

const router = express.Router();

// Create a new application/proposal
router.post("/application", verifyToken, applicationController.createApplication);

// Get all applications for a user (as seeker)
router.get("/my-applications", verifyToken, applicationController.getMyApplications);

// Get all applications for a property (as owner)
// Ownership verification is done in the controller
router.get("/property/:propertyId/applications", verifyToken, applicationController.getPropertyApplications);

// Update application status (owner actions: accept, reject, counter)
// Ownership verification is done in the controller
router.patch("/application/:id", verifyToken, applicationController.updateApplicationStatus);

// Withdraw application (seeker action)
router.patch("/application/:id/withdraw", verifyToken, applicationController.withdrawApplication);

// Revise offer (seeker action - counter back to owner)
router.patch("/application/:id/revise", verifyToken, applicationController.reviseApplication);

// Accept counter offer (seeker action - accept owner's counter)
router.patch("/application/:id/accept-counter", verifyToken, applicationController.acceptCounterOffer);

// Send a standalone application message (owner or seeker)
router.post("/application/:id/message", verifyToken, applicationController.sendApplicationMessage);

// Complete or cancel deal (owner or seeker actions)
router.patch("/property/:propertyId/deal", verifyToken, applicationController.updateDealStatus);

export default router;
