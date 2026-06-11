import express from "express";

import { verifyToken } from "../middleware/verifyToken.js";

import { verifyOwner } from "../middleware/verifyOwner.js";

import { verifyPropertyOwner } from "../middleware/verifyPropertyOwner.js";

import * as propertyController from "../controllers/propertyController.js";


const router = express.Router();


// Create property
router.post("/post-property", verifyToken, propertyController.postProperty);

// Get current owner's free/paid listing entitlement
router.get("/listing-entitlement", verifyToken, propertyController.getListingEntitlementInfo);

// Get all property data of a user
router.get("/my-properties", verifyToken, verifyOwner, propertyController.getMyProperties);

// Get single property by ID
router.get("/property/:id", verifyToken, propertyController.getPropertyById);

// Get all ACTIVE property listings
router.get("/active-properties", verifyToken, propertyController.getActiveProperties);

// Update property (only owner)
router.put("/property/:id", verifyToken, verifyPropertyOwner, propertyController.updateProperty);

// Delete property (only owner)
router.delete("/property/:id", verifyToken, verifyPropertyOwner, propertyController.deleteProperty);

// Toggle property visibility (hide/unhide)
router.patch("/property/:id/visibility", verifyToken, verifyPropertyOwner, propertyController.togglePropertyVisibility);

// Reopen listing for rented properties
router.patch("/property/:id/reopen", verifyToken, verifyPropertyOwner, propertyController.reopenListing);

// Get featured properties for homepage (public endpoint - no authentication required)
router.get("/featured-properties", propertyController.getFeaturedProperties);

export default router;
