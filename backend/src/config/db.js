import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { WishlistModel } from "../models/Wishlist.js";
import { RatingModel } from "../models/Rating.js";
import { EmailJobModel } from "../models/EmailJob.js";
import { buildParticipantPairKey } from "../models/Chat.js";


// Load environment variables
dotenv.config();


// Initialize MongoDB client
const client = new MongoClient(process.env.MONGO_URI);

let db;

async function migrateConversationsToParticipantPairs(database) {
    const conversationsCollection = database.collection("conversations");
    const messagesCollection = database.collection("messages");
    const conversations = await conversationsCollection.find({}).toArray();
    const groupedConversations = new Map();

    for (const conversation of conversations) {
        if (!conversation?.participant1Email || !conversation?.participant2Email) {
            continue;
        }

        const participantPairKey = buildParticipantPairKey(
            conversation.participant1Email,
            conversation.participant2Email
        );

        if (!groupedConversations.has(participantPairKey)) {
            groupedConversations.set(participantPairKey, []);
        }

        groupedConversations.get(participantPairKey).push(conversation);
    }

    for (const [participantPairKey, grouped] of groupedConversations.entries()) {
        const sortedGroup = grouped.sort((a, b) => {
            const createdAtA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const createdAtB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

            if (createdAtA !== createdAtB) {
                return createdAtA - createdAtB;
            }

            return a._id.toString().localeCompare(b._id.toString());
        });

        const survivor = sortedGroup[0];
        const duplicateConversations = sortedGroup.slice(1);
        const duplicateIds = duplicateConversations.map((conversation) => conversation._id);
        const duplicateIdStrings = duplicateIds.map((id) => id.toString());
        const allConversationIds = [survivor._id, ...duplicateIds];
        const allConversationIdStrings = allConversationIds.map((id) => id.toString());

        if (duplicateConversations.length > 0) {
            await messagesCollection.updateMany(
                {
                    $or: [
                        { conversationId: { $in: duplicateIds } },
                        { conversationId: { $in: duplicateIdStrings } }
                    ]
                },
                {
                    $set: {
                        conversationId: survivor._id
                    }
                }
            );
        }

        const latestMessage = await messagesCollection.findOne(
            {
                $or: [
                    { conversationId: { $in: allConversationIds } },
                    { conversationId: { $in: allConversationIdStrings } }
                ]
            },
            {
                sort: {
                    createdAt: -1,
                    updatedAt: -1,
                    _id: -1
                }
            }
        );

        const latestActivityAt = latestMessage?.createdAt
            || latestMessage?.updatedAt
            || survivor.lastMessageTime
            || survivor.updatedAt
            || survivor.createdAt
            || new Date();

        await conversationsCollection.updateOne(
            { _id: survivor._id },
            {
                $set: {
                    participantPairKey,
                    lastMessage: latestMessage
                        ? (latestMessage.content || (latestMessage.attachments?.length ? "[Attachment]" : ""))
                        : (survivor.lastMessage || null),
                    lastMessageTime: latestMessage ? latestActivityAt : (survivor.lastMessageTime || null),
                    lastMessageSender: latestMessage?.senderEmail || survivor.lastMessageSender || null,
                    updatedAt: latestActivityAt
                }
            }
        );

        if (duplicateConversations.length > 0) {
            await conversationsCollection.deleteMany({
                _id: { $in: duplicateIds }
            });
        }
    }

    const conversationsWithoutPairKey = await conversationsCollection.find({
        $or: [
            { participantPairKey: { $exists: false } },
            { participantPairKey: null }
        ]
    }).toArray();

    for (const conversation of conversationsWithoutPairKey) {
        if (!conversation?.participant1Email || !conversation?.participant2Email) {
            continue;
        }

        await conversationsCollection.updateOne(
            { _id: conversation._id },
            {
                $set: {
                    participantPairKey: buildParticipantPairKey(
                        conversation.participant1Email,
                        conversation.participant2Email
                    )
                }
            }
        );
    }

    await conversationsCollection.createIndex(
        { participantPairKey: 1 },
        {
            unique: true,
            partialFilterExpression: { participantPairKey: { $exists: true } }
        }
    );
}


/**
 * Connect to MongoDB database
 * Set up indexes for collections
 */
export async function connectDatabase() {

    try {

        // Connect to MongoDB server
        await client.connect();

        // Get database reference
        db = client.db("GhorBari");

        console.log("✅ MongoDB connected");


        // Set up Wishlist indexes
        try {
            await WishlistModel.ensureIndexes(db);
            console.log("📑 Wishlist indexes ensured");
        } catch (err) {
            console.error("Failed to ensure wishlist indexes", err);
        }


        // Set up Rating indexes
        try {
            await RatingModel.ensureIndexes(db);
            console.log("📑 Rating indexes ensured");
        } catch (err) {
            console.error("Failed to ensure rating indexes", err);
        }


        // Set up Email Job indexes
        try {
            await EmailJobModel.ensureIndexes(db);
            console.log("📑 Email job indexes ensured");
        } catch (err) {
            console.error("Failed to ensure email job indexes", err);
        }

        try {
            await migrateConversationsToParticipantPairs(db);
            console.log("Chat conversation pair migration ensured");
        } catch (err) {
            console.error("Failed to migrate chat conversations", err);
        }

        try {
            await db.collection("property_drafts").createIndex({ "owner.email": 1, status: 1, createdAt: -1 });
            await db.collection("payments").createIndex({ tranId: 1 }, { unique: true });
            await db.collection("payments").createIndex({ draftId: 1, createdAt: -1 });
            await db.collection("payments").createIndex({ "owner.email": 1, status: 1, createdAt: -1 });
            console.log("Payment indexes ensured");
        } catch (err) {
            console.error("Failed to ensure payment indexes", err);
        }

        return db;

    } catch (error) {

        console.error("❌ MongoDB connection failed:", error.message);
        throw error;

    }

}


/**
 * Get the database instance
 * @returns {Object} MongoDB database instance
 */
export function getDatabase() {

    return db;

}
