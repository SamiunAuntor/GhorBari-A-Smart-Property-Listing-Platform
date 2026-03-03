import { getDatabase } from "../config/db.js";
import { ObjectId } from "mongodb";

export const verifyPropertyOwner = async (req, res, next) => {

    try {

        const db = getDatabase();

        const id = req.params.id;

        if (!ObjectId.isValid(id)) {

            return res.status(400).send({ message: "Invalid ID format" });

        }

        const property = await db.collection("properties").findOne({ _id: new ObjectId(id) });

        if (!property) {

            return res.status(404).send({ message: "Property not found" });

        }

        if (property.owner.email !== req.user.email) {

            return res.status(403).send({ message: "Forbidden: You don't own this property" });

        }

        req.property = property;

        next();

    } catch (error) {

        console.error("verifyPropertyOwner error:", error);

        res.status(500).send({ message: "Server error" });

    }

};

















