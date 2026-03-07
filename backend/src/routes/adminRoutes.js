import express from "express";

import { verifyToken } from "../middleware/verifyToken.js";

import { verifyAdmin } from "../middleware/verifyAdmin.js";

import * as adminController from "../controllers/adminController.js";


const router = express.Router();


// Get all users with pending NID submissions

router.get("/admin/pending-verifications", verifyToken, adminController.getPendingVerifications);

// Update user verification status

router.patch("/admin/verify-user/:id", verifyToken, adminController.verifyUser);

// Verify user using NID registry (dummy NID server)

router.patch("/admin/verify-user-nid/:id", verifyToken, adminController.verifyUserByNidFromRegistry);

// Get all pending property listings

router.get("/admin/pending-properties", verifyToken, adminController.getPendingProperties);

// Update property status (Approve/Delete)

router.patch("/admin/property-status/:id", verifyToken, adminController.updatePropertyStatus);

// Permanently delete a property from the database

router.delete("/admin/delete-property/:id", verifyToken, adminController.deleteProperty);

// Dashboard Stats API

router.get("/admin/stats", verifyToken, adminController.getStats);
router.get("/admin/dashboard-insights", verifyToken, adminController.getDashboardInsights);

// API for admin to get property by id regardless of status

router.get("/admin/property/:id", verifyToken, verifyAdmin, adminController.getAdminPropertyById);

// Get all users

router.get("/admin/all-users", verifyToken, adminController.getAllUsers);

// Get all properties

router.get("/admin/all-properties", verifyToken, adminController.getAllProperties);

// Delete user

router.delete("/admin/delete-user/:id", verifyToken, adminController.deleteUser);

export default router;

