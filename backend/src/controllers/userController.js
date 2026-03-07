import { getDatabase } from "../config/db.js";

export const registerUser = async (req, res) => {

    try {

        const db = getDatabase();

        const { email, name, profileImage = "", phone, role } = req.body;

        if (!email || !name) return res.status(400).json({ message: "Email and name are required" });

        const validRoles = ["property_seeker", "property_owner", "user", "admin"];

        const userRole = validRoles.includes(role) ? role : "user";

        const existing = await db.collection("users").findOne({ email });

        if (existing) return res.status(400).json({ message: "User already exists" });

        const result = await db.collection("users").insertOne({
            email,
            name,
            profileImage,
            phone: phone || "",
            role: userRole,
            nidVerified: "unverified",
            nidImages: [],
            nidSubmittedAt: null,
            nidVerifiedAt: null,
            rating: { totalRatings: 0, ratingCount: 0, average: 0 },
            createdAt: new Date(),
            updatedAt: new Date()
        });

        return res.status(201).json({ message: "User created successfully", user: result.insertedId });

    } catch (error) {

        console.error("POST /register-user error:", error);

        res.status(500).json({ message: "Server error" });

    }

};

export const getUsersByEmails = async (req, res) => {

    try {

        const db = getDatabase();

        const emailsParam = req.query.emails;

        if (!emailsParam) return res.status(400).json({ message: "emails query required" });

        const emails = emailsParam.split(",").map(e => e.trim()).filter(Boolean);

        if (emails.length === 0) return res.json([]);

        const users = await db.collection("users")
            .find({ email: { $in: emails } }, { projection: { email: 1, nidVerified: 1, rating: 1, name: 1 } })
            .toArray();

        return res.json(users);

    } catch (error) {

        console.error("GET /users-by-emails error:", error);

        res.status(500).json({ message: "Server error" });

    }

};

export const checkUserExist = async (req, res) => {

    try {

        const db = getDatabase();

        const email = req.query.email;

        if (!email) return res.status(400).json({ message: "Email is required" });

        const user = await db.collection("users").findOne({ email });

        return res.json({ exists: !!user });

    } catch (error) {

        console.error(error);

        res.status(500).json({ message: "Server error" });

    }

};

export const getUserRole = async (req, res) => {

    try {

        const db = getDatabase();
        const email = req.query.email;

        if (!email) return res.status(400).json({ role: null });

        const user = await db.collection("users").findOne({ email });

        return res.json({ role: user?.role || null });

    } catch (error) {

        console.error(error);

        res.status(500).json({ role: null });

    }

};

export const updateProfile = async (req, res) => {

    try {

        const db = getDatabase();

        const { name, phone, profileImage } = req.body;

        const email = req.user.email;

        const updatedDoc = {
            $set: {
                name,
                phone,
                profileImage,
                updatedAt: new Date()
            }
        };

        const result = await db.collection("users").updateOne({ email }, updatedDoc);

        res.send({ success: true, modifiedCount: result.modifiedCount });

    } catch (error) {

        res.status(500).send({ message: "Server error" });

    }
};

export const submitNid = async (req, res) => {

    try {

        const db = getDatabase();

        const { nidNumber, nidImages = [] } = req.body;

        const email = req.user.email;

        if (!nidNumber || typeof nidNumber !== "string" || !nidNumber.trim()) {
            return res.status(400).send({ message: "NID number is required" });
        }

        const normalizedNid = nidNumber.trim();
        const isValidNid = /^(\d{10}|\d{16})$/.test(normalizedNid);
        if (!isValidNid) {
            return res.status(400).send({ message: "NID number must be exactly 10 or 16 digits" });
        }

        // Ensure user has a phone number before allowing verification request
        const existingUser = await db.collection("users").findOne({ email });
        const hasPhone =
            existingUser?.phone !== undefined &&
            existingUser.phone !== null &&
            String(existingUser.phone).trim() !== "";

        if (!hasPhone) {
            return res.status(400).send({
                message: "Please add a phone number to your profile before applying for verification",
            });
        }

        const cleanedImages = Array.isArray(nidImages) ? nidImages.filter(Boolean) : [];

        const updatedDoc = {
            $set: {
                nidNumber: normalizedNid,
                nidImages: cleanedImages,
                nidSubmittedAt: new Date(),
                nidVerified: "pending",
                nidVerifiedAt: null
            }
        };

        await db.collection("users").updateOne({ email }, updatedDoc);

        res.send({ success: true, message: "NID submitted for review" });

    } catch (error) {

        res.status(500).send({ message: "Server error" });

    }
};

export const getUserProfile = async (req, res) => {

    try {

        const db = getDatabase();

        const user = await db.collection("users").findOne({ email: req.user.email });

        res.send(user);

    } catch (error) {

        res.status(500).send({ message: "Server error" });

    }
};

export const checkIsAdmin = async (req, res) => {

    try {

        const db = getDatabase();

        const email = req.params.email;

        // Security: Only the user themselves or an existing admin should ideally call this, 
        // but for the hook, we check if the token email matches the requested email.

        if (email !== req.user.email) {

            return res.status(403).send({ message: "Forbidden Access" });

        }

        const user = await db.collection("users").findOne({ email });

        const isAdmin = user?.role === "admin";

        res.send({ admin: isAdmin });

    } catch (error) {

        res.status(500).send({ message: "Server error" });

    }

};


export const getPublicProfileMessageStatus = async (req, res) => {

    try {

        const db = getDatabase();
        const currentUserEmail = req.user?.email;
        const targetEmail = req.params.email;

        if (!currentUserEmail) {
            return res.status(401).send({ message: "Unauthorized" });
        }

        if (!targetEmail) {
            return res.status(400).send({ message: "Target email is required" });
        }

        if (currentUserEmail === targetEmail) {
            return res.send({
                canMessage: false,
                message: "You cannot message your own profile from here."
            });
        }

        const activeDeal = await db.collection("applications")
            .find({
                status: "deal-in-progress",
                $or: [
                    { "owner.email": currentUserEmail, "seeker.email": targetEmail },
                    { "owner.email": targetEmail, "seeker.email": currentUserEmail }
                ]
            })
            .sort({ updatedAt: -1, createdAt: -1 })
            .limit(1)
            .toArray();

        const application = activeDeal[0];

        if (!application) {
            return res.send({
                canMessage: false,
                message: "Messaging is available after one of your deals goes in progress with this user."
            });
        }

        return res.send({
            canMessage: true,
            message: "You can message this user now.",
            applicationId: application._id?.toString(),
            propertyId: application.propertyId?.toString?.() || application.propertyId || null
        });

    } catch (error) {

        res.status(500).send({ message: "Server error" });

    }

};
export const getPublicProfile = async (req, res) => {

    try {

        const db = getDatabase();

        const email = req.params.email;

        const user = await db.collection("users").findOne(
            { email },
            {
                projection: {
                    name: 1,
                    email: 1,
                    profileImage: 1,
                    role: 1,
                    rating: 1,
                    createdAt: 1,
                    nidVerified: 1,
                    phone: 1
                }
            }
        );

        if (!user) return res.status(404).send({ message: "User not found" });

        res.send(user);

    } catch (error) {

        res.status(500).send({ message: "Server error" });

    }
    
};

