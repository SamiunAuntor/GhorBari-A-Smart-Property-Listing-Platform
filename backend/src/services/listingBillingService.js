const DEFAULT_FREE_LIMIT = Number(process.env.LISTING_FREE_LIMIT || 3);
const DEFAULT_LISTING_FEE = Number(process.env.LISTING_FEE_BDT || 99);

export function getListingBillingConfig() {
    return {
        freeLimit: Number.isFinite(DEFAULT_FREE_LIMIT) ? DEFAULT_FREE_LIMIT : 3,
        listingFeeBdt: Number.isFinite(DEFAULT_LISTING_FEE) ? DEFAULT_LISTING_FEE : 99
    };
}

export async function getOwnerListingCount(db, ownerEmail) {
    if (!ownerEmail) {
        return 0;
    }

    return db.collection("properties").countDocuments({
        "owner.email": ownerEmail,
        status: { $ne: "removed" }
    });
}

export async function getListingEntitlement(db, ownerEmail) {
    const config = getListingBillingConfig();
    const currentCount = await getOwnerListingCount(db, ownerEmail);
    const freeRemaining = Math.max(0, config.freeLimit - currentCount);

    return {
        currentCount,
        freeLimit: config.freeLimit,
        freeRemaining,
        requiresPayment: currentCount >= config.freeLimit,
        listingFeeBdt: config.listingFeeBdt
    };
}
