import { WishlistModel } from "../models/Wishlist.js";
import { ObjectId } from "mongodb";

export const getUserWishlist = async (req, res) => {
    try {
        const db = req.db;
        const userEmail = req.user.email;

        const items = await WishlistModel.getFullByUser(db, userEmail);
        return res.status(200).json(items);
    } catch (error) {
        console.error("GET /user-wishlist error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const addToWishlist = async (req, res) => {
    try {
        const db = req.db;
        const userEmail = req.user.email;
        const { propertyId, note } = req.body;

        if (!propertyId) {
            return res.status(400).json({ message: "Property ID is required" });
        }

        // verify property exists
        const property = await db.collection("properties").findOne({
            _id: new ObjectId(propertyId)
        });
        if (!property) {
            return res.status(404).json({ message: "Property not found" });
        }

        await WishlistModel.add(db, userEmail, propertyId, note || "");

        return res.status(200).json({ message: "Added to wishlist" });
    } catch (error) {
        console.error("POST /wishlist/add error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateWishlistNote = async (req, res) => {
    try {
        const db = req.db;
        const userEmail = req.user.email;
        const { propertyId } = req.params;
        const { note } = req.body;

        if (!propertyId) {
            return res.status(400).json({ message: "Property ID is required" });
        }
        if (note === undefined) {
            return res.status(400).json({ message: "Note is required" });
        }

        const result = await WishlistModel.updateNote(db, userEmail, propertyId, note);
        if (!result || result.matchedCount === 0) {
            return res.status(404).json({ message: "Wishlist entry not found" });
        }

        return res.status(200).json({ message: "Note updated" });
    } catch (error) {
        console.error("PATCH /wishlist/:propertyId error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const removeFromWishlist = async (req, res) => {
    try {
        const db = req.db;
        const userEmail = req.user.email;
        const { propertyId } = req.params;

        if (!propertyId) {
            return res.status(400).json({ message: "Property ID is required" });
        }

        await WishlistModel.remove(db, userEmail, propertyId);

        return res.status(200).json({ message: "Removed from wishlist" });
    } catch (error) {
        console.error("DELETE /wishlist/:propertyId error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
