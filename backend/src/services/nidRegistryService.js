import { getDatabase } from "../config/db.js";

// NID Registry Service
// --------------------
// This acts as a dummy external NID server / registry.
// We simply use a dedicated MongoDB collection named "nids".
//
// Example document shape in the "nids" collection:
// {
//   nidNumber: "1234567890",     // REQUIRED, UNIQUE per person
//   fullName: "John Doe",        // Optional, for reference
//   dateOfBirth: "1990-01-01",   // Optional ISO date string
//   address: "Dhaka, Bangladesh" // Optional
// }

const COLLECTION_NAME = "nids";

export async function findByNidNumber(nidNumber) {
  if (!nidNumber || typeof nidNumber !== "string") return null;

  const db = getDatabase();
  const trimmed = nidNumber.trim();

  if (!trimmed) return null;

  const record = await db.collection(COLLECTION_NAME).findOne({
    nidNumber: trimmed,
  });

  return record;
}

