import "dotenv/config";
import { MongoClient } from "mongodb";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { buildPropertyAddress, buildPropertySearchText } from "../src/services/propertyLocationService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const clientPublicDir = path.join(projectRoot, "client", "public");

async function readJson(filename) {
    const filePath = path.join(clientPublicDir, filename);
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
}

async function loadGeoMaps() {
    const [divisions, districts, upazilas, thanas] = await Promise.all([
        readJson("divisions.json"),
        readJson("districts.json"),
        readJson("upzillas.json"),
        readJson("thanas.json")
    ]);

    return {
        divisionMap: new Map(divisions.map((item) => [String(item.id), item.name])),
        districtMap: new Map(districts.map((item) => [String(item.id), item.name])),
        upazilaMap: new Map([
            ...upazilas.map((item) => [String(item.id), item.name]),
            ...thanas.map((item) => [String(item.id), item.name])
        ])
    };
}

async function main() {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is required");
    }

    const geoMaps = await loadGeoMaps();
    const client = new MongoClient(process.env.MONGO_URI);

    try {
        await client.connect();
        const db = client.db("GhorBari");
        const properties = await db.collection("properties").find({}).toArray();

        let modifiedCount = 0;

        for (const property of properties) {
            const address = property.address || {};
            const nextAddress = buildPropertyAddress({
                division_id: address.division_id,
                division_name: address.division_name || geoMaps.divisionMap.get(String(address.division_id)),
                district_id: address.district_id,
                district_name: address.district_name || geoMaps.districtMap.get(String(address.district_id)),
                upazila_id: address.upazila_id,
                upazila_name: address.upazila_name || geoMaps.upazilaMap.get(String(address.upazila_id)),
                street: address.street
            });

            const searchText = buildPropertySearchText({
                ...property,
                address: nextAddress
            });

            const result = await db.collection("properties").updateOne(
                { _id: property._id },
                {
                    $set: {
                        address: nextAddress,
                        searchText
                    }
                }
            );

            modifiedCount += result.modifiedCount;
        }

        console.log(`Backfill complete. Updated ${modifiedCount} properties.`);
    } finally {
        await client.close();
    }
}

main().catch((error) => {
    console.error("Property location backfill failed:", error);
    process.exit(1);
});
