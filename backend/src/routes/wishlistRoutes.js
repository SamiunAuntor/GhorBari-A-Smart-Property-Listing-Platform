import express from "express";
import { getUserWishlist, addToWishlist, updateWishlistNote, removeFromWishlist } from "../controllers/wishlistController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/user-wishlist", verifyToken, getUserWishlist);
router.post("/wishlist/add", verifyToken, addToWishlist);
router.patch("/wishlist/:propertyId", verifyToken, updateWishlistNote);
router.delete("/wishlist/:propertyId", verifyToken, removeFromWishlist);

export default router;
