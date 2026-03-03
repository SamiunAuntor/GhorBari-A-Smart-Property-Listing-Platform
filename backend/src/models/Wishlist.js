import { ObjectId } from "mongodb";

export class WishlistModel {
    // ensure the unique index on userEmail+propertyId
    static async ensureIndexes(db) {
        try {
            await db.collection("wishlist").createIndex(
                { userEmail: 1, propertyId: 1 },
                { unique: true }
            );
        } catch (err) {
            console.error("Failed to create wishlist indexes", err);
        }
    }

    static async add(db, userEmail, propertyId, note = "") {
        if (!ObjectId.isValid(propertyId)) return null;
        const doc = {
            userEmail,
            propertyId: new ObjectId(propertyId),
            note,
            createdAt: new Date()
        };
        // Upsert the single wishlist entry (ensures uniqueness via index)
        const result = await db.collection("wishlist").updateOne(
            { userEmail, propertyId: new ObjectId(propertyId) },
            { $set: doc },
            { upsert: true }
        );
        return result;
    }

    static async remove(db, userEmail, propertyId) {
        if (!ObjectId.isValid(propertyId)) return null;
        return await db.collection("wishlist").deleteOne({
            userEmail,
            propertyId: new ObjectId(propertyId)
        });
    }

    static async updateNote(db, userEmail, propertyId, note) {
        if (!ObjectId.isValid(propertyId)) return null;
        return await db.collection("wishlist").updateOne(
            { userEmail, propertyId: new ObjectId(propertyId) },
            { $set: { note, updatedAt: new Date() } }
        );
    }

    static async getByUser(db, userEmail) {
        const entries = await db.collection("wishlist").find({ userEmail }).toArray();
        return entries;
    }

    // return entries with property details
    static async getFullByUser(db, userEmail) {
        const entries = await db.collection("wishlist").find({ userEmail }).toArray();
        const propertyIds = entries.map(e => e.propertyId).filter(Boolean);
        let properties = [];
        if (propertyIds.length) {
            properties = await db.collection("properties").find({
                _id: { $in: propertyIds }
            }).toArray();
        }
        const propMap = new Map(properties.map(p => [p._id.toString(), p]));
        return entries.map(e => {
            const prop = propMap.get(e.propertyId.toString());
            if (!prop) return null;
            return {
                ...prop,
                wishlistNote: e.note || "",
                wishlistAddedAt: e.createdAt
            };
        }).filter(Boolean);
    }
}
