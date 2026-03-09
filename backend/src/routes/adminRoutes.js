import express from "express";

import { verifyToken } from "../middleware/verifyToken.js";

import { verifyAdmin } from "../middleware/verifyAdmin.js";

import * as adminController from "../controllers/adminController.js";


const router = express.Router();

router.use("/admin", verifyToken, verifyAdmin);

// Get all users with pending NID submissions

router.get("/admin/pending-verifications", adminController.getPendingVerifications);

// Update user verification status

router.patch("/admin/verify-user/:id", adminController.verifyUser);

// Verify user using NID registry (dummy NID server)

router.patch("/admin/verify-user-nid/:id", adminController.verifyUserByNidFromRegistry);

// Get all pending property listings

router.get("/admin/pending-properties", adminController.getPendingProperties);

// Update property status (Approve/Delete)

router.patch("/admin/property-status/:id", adminController.updatePropertyStatus);

// Permanently delete a property from the database

router.delete("/admin/delete-property/:id", adminController.deleteProperty);

// Dashboard Stats API

router.get("/admin/stats", adminController.getStats);
router.get("/admin/dashboard-insights", adminController.getDashboardInsights);

// API for admin to get property by id regardless of status

router.get("/admin/property/:id", adminController.getAdminPropertyById);

// Get all users

router.get("/admin/all-users", adminController.getAllUsers);

// Get all properties

router.get("/admin/all-properties", adminController.getAllProperties);

// Delete user

router.delete("/admin/delete-user/:id", adminController.deleteUser);

export default router;

