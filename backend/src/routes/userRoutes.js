import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import * as userController from "../controllers/userController.js";


const router = express.Router();


// ========== PUBLIC ROUTES ==========

/**
 * POST /api/register-user
 * Register a new user
 */
router.post("/register-user", userController.registerUser);


/**
 * GET /api/check-user-exist?email=user@example.com
 * Check if user exists by email
 */
router.get("/check-user-exist", userController.checkUserExist);


/**
 * GET /api/get-user-role?email=user@example.com
 * Get user's role
 */
router.get("/get-user-role", userController.getUserRole);


// ========== PROTECTED ROUTES ==========

/**
 * GET /api/users-by-emails?emails=email1,email2
 * Batch fetch users by email addresses
 */
router.get("/users-by-emails", verifyToken, userController.getUsersByEmails);


/**
 * PATCH /api/update-profile
 * Update current user's profile
 */
router.patch("/update-profile", verifyToken, userController.updateProfile);


/**
 * POST /api/submit-nid
 * Submit NID for verification
 */
router.post("/submit-nid", verifyToken, userController.submitNid);


/**
 * GET /api/user-profile
 * Get current user's full profile
 */
router.get("/user-profile", verifyToken, userController.getUserProfile);


/**
 * GET /api/users/admin/:email
 * Check if user is admin
 */
router.get("/users/admin/:email", verifyToken, userController.checkIsAdmin);


router.get("/public-profile/:email/message-status", verifyToken, userController.getPublicProfileMessageStatus);
router.get("/public-profile/:email", verifyToken, userController.getPublicProfile);


export default router;