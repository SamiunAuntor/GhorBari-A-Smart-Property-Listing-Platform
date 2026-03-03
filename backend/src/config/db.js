import { MongoClient } from "mongodb";

import dotenv from "dotenv";
import { WishlistModel } from "../models/Wishlist.js";

dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

let db;

export async function connectDatabase() {

    try {

        await client.connect();

        db = client.db("GhorBari");

        console.log("✅ MongoDB connected");

        // ensure wishlist indexes
        try {
            await WishlistModel.ensureIndexes(db);
            console.log("✅ Wishlist indexes ensured");
        } catch (err) {
            console.error("❌ Failed to ensure wishlist indexes", err);
        }

        return db;

    } catch (error) {

        console.error("❌ MongoDB connection failed:", error.message);

        throw error;

    }

}

export function getDatabase() {

    return db;
    
}

