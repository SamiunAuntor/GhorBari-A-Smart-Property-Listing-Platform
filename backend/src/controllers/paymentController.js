import { ObjectId } from "mongodb";
import { getDatabase } from "../config/db.js";
import { getListingBillingConfig, getListingEntitlement } from "../services/listingBillingService.js";
import {
    buildFrontendPaymentReturnUrl,
    buildSslCommerzCallbackUrls,
    createHostedCheckoutSession,
    validateSslCommerzPayment
} from "../services/sslcommerzService.js";
import { createPropertyRecord } from "../services/propertyPersistenceService.js";

function isValidObjectId(value) {
    return ObjectId.isValid(value);
}

function normalizeDraftPayload(payload = {}) {
    return {
        title: payload.title,
        listingType: payload.listingType,
        propertyType: payload.propertyType,
        price: Number(payload.price),
        areaSqFt: Number(payload.areaSqFt),
        address: payload.address,
        images: Array.isArray(payload.images) ? payload.images : [],
        overview: payload.overview,
        amenities: Array.isArray(payload.amenities) ? payload.amenities : [],
        location: payload.location,
        floorCount: payload.floorCount,
        totalUnits: payload.totalUnits,
        roomCount: payload.roomCount,
        bathrooms: payload.bathrooms,
        createdAt: payload.createdAt
    };
}

async function getOwnerProfile(db, email) {
    return db.collection("users").findOne({ email });
}

function buildCustomerPayload({ ownerProfile, draftPayload }) {
    const address = draftPayload.address || {};

    return {
        cus_name: ownerProfile?.name || "Property Owner",
        cus_email: ownerProfile?.email || "owner@example.com",
        cus_add1: address.street || "Bangladesh",
        cus_add2: address.upazila_name || address.upazila_id || "",
        cus_city: address.district_name || address.district_id || "Dhaka",
        cus_state: address.division_name || address.division_id || "Dhaka",
        cus_postcode: ownerProfile?.postcode || "1000",
        cus_country: "Bangladesh",
        cus_phone: ownerProfile?.phone || "01700000000",
        shipping_method: "NO",
        product_name: "Property Listing Slot",
        product_category: "listing",
        product_profile: "non-physical-goods"
    };
}

async function publishPaidDraftIfNeeded(db, payment, validationPayload) {
    if (payment.propertyId) {
        return payment.propertyId;
    }

    const draft = await db.collection("property_drafts").findOne({ _id: payment.draftId });
    if (!draft) {
        throw new Error("Listing draft not found");
    }

    const createdProperty = await createPropertyRecord(
        db,
        draft.propertyPayload,
        draft.owner,
        {
            billing: {
                type: "paid",
                amount: payment.amount,
                currency: payment.currency,
                paymentId: payment._id,
                tranId: payment.tranId,
                validatedAt: new Date()
            },
            updatedAt: new Date()
        }
    );

    await db.collection("payments").updateOne(
        { _id: payment._id },
        {
            $set: {
                propertyId: createdProperty._id,
                status: "validated",
                validatedAt: new Date(),
                validationPayload
            }
        }
    );

    await db.collection("property_drafts").updateOne(
        { _id: draft._id },
        {
            $set: {
                status: "published",
                propertyId: createdProperty._id,
                publishedAt: new Date(),
                updatedAt: new Date()
            }
        }
    );

    return createdProperty._id;
}

async function processValidatedPayment(db, gatewayPayload = {}) {
    const valId = gatewayPayload.val_id;
    const tranId = gatewayPayload.tran_id;

    if (!valId || !tranId) {
        throw new Error("Missing payment validation identifiers");
    }

    const validationPayload = await validateSslCommerzPayment(valId);
    const validationStatus = String(validationPayload?.status || "").toUpperCase();

    if (!["VALID", "VALIDATED"].includes(validationStatus)) {
        throw new Error(`Payment validation failed with status ${validationStatus || "UNKNOWN"}`);
    }

    const payment = await db.collection("payments").findOne({ tranId });
    if (!payment) {
        throw new Error("Payment record not found");
    }

    if (Number(validationPayload.amount) !== Number(payment.amount)) {
        throw new Error("Validated amount does not match payment record");
    }

    await db.collection("payments").updateOne(
        { _id: payment._id },
        {
            $set: {
                status: "paid",
                paidAt: new Date(),
                valId,
                validationPayload,
                gatewayPayload,
                updatedAt: new Date()
            }
        }
    );

    const propertyId = await publishPaidDraftIfNeeded(db, payment, validationPayload);

    return {
        paymentId: payment._id,
        draftId: payment.draftId,
        propertyId,
        validationPayload
    };
}

export const retryListingPayment = async (req, res) => {
    try {
        const db = req.db;
        const draftId = req.params.draftId;

        if (!isValidObjectId(draftId)) {
            return res.status(400).send({ success: false, message: "Invalid draft id" });
        }

        const draft = await db.collection("property_drafts").findOne({
            _id: new ObjectId(draftId),
            "owner.email": req.user.email
        });

        if (!draft) {
            return res.status(404).send({ success: false, message: "Draft not found" });
        }

        const ownerProfile = await getOwnerProfile(db, req.user.email);
        if (!ownerProfile?.phone) {
            return res.status(400).send({ success: false, message: "Add a phone number to your profile before paying for a listing." });
        }

        const payment = await db.collection("payments").findOne({
            draftId: draft._id
        }, {
            sort: { createdAt: -1 }
        });

        if (!payment) {
            return res.status(404).send({ success: false, message: "Payment record not found for this draft." });
        }

        const callbackUrls = buildSslCommerzCallbackUrls(draftId);
        const session = await createHostedCheckoutSession({
            total_amount: payment.amount.toFixed(2),
            currency: payment.currency,
            tran_id: payment.tranId,
            ...callbackUrls,
            ...buildCustomerPayload({ ownerProfile, draftPayload: draft.propertyPayload }),
            value_a: String(draft._id),
            value_b: req.user.email,
            value_c: "listing_fee",
            value_d: "retry"
        });

        if (String(session?.status || "").toUpperCase() !== "SUCCESS" || !session?.GatewayPageURL) {
            return res.status(502).send({
                success: false,
                message: session?.failedreason || "Failed to initialize SSLCOMMERZ payment session."
            });
        }

        await db.collection("payments").updateOne(
            { _id: payment._id },
            {
                $set: {
                    status: "pending",
                    sessionKey: session.sessionkey || null,
                    gatewayInitResponse: session,
                    updatedAt: new Date()
                }
            }
        );

        await db.collection("property_drafts").updateOne(
            { _id: draft._id },
            {
                $set: {
                    status: "payment_pending",
                    updatedAt: new Date()
                }
            }
        );

        return res.send({
            success: true,
            requiresPayment: true,
            redirectUrl: session.GatewayPageURL,
            draftId
        });
    } catch (error) {
        return res.status(500).send({ success: false, message: error.message });
    }
};

export const getListingDraftStatus = async (req, res) => {
    try {
        const db = req.db;
        const draftId = req.params.draftId;

        if (!isValidObjectId(draftId)) {
            return res.status(400).send({ success: false, message: "Invalid draft id" });
        }

        const draft = await db.collection("property_drafts").findOne({
            _id: new ObjectId(draftId),
            "owner.email": req.user.email
        });

        if (!draft) {
            return res.status(404).send({ success: false, message: "Draft not found" });
        }

        const payment = await db.collection("payments").findOne(
            { draftId: draft._id },
            { sort: { createdAt: -1 } }
        );

        return res.send({
            success: true,
            draftId,
            draftStatus: draft.status,
            propertyId: draft.propertyId || null,
            paymentStatus: payment?.status || null,
            amount: payment?.amount || null,
            canRetryPayment: ["payment_pending", "payment_failed", "payment_cancelled"].includes(draft.status)
        });
    } catch (error) {
        return res.status(500).send({ success: false, message: error.message });
    }
};

export const getOwnerListingDrafts = async (req, res) => {
    try {
        const db = req.db;

        const drafts = await db.collection("property_drafts")
            .find({
                "owner.email": req.user.email,
                status: { $in: ["payment_pending", "payment_failed", "payment_cancelled"] }
            })
            .sort({ createdAt: -1 })
            .toArray();

        const draftIds = drafts.map((draft) => draft._id);
        const payments = draftIds.length > 0
            ? await db.collection("payments")
                .find({ draftId: { $in: draftIds } })
                .sort({ createdAt: -1 })
                .toArray()
            : [];

        const paymentMap = new Map();
        payments.forEach((payment) => {
            const key = String(payment.draftId);
            if (!paymentMap.has(key)) {
                paymentMap.set(key, payment);
            }
        });

        const response = drafts.map((draft) => {
            const payment = paymentMap.get(String(draft._id));
            return {
                _id: draft._id,
                title: draft.propertyPayload?.title || "Untitled draft",
                listingType: draft.propertyPayload?.listingType || "rent",
                propertyType: draft.propertyPayload?.propertyType || "flat",
                address: draft.propertyPayload?.address || {},
                images: draft.propertyPayload?.images || [],
                price: draft.propertyPayload?.price || 0,
                draftStatus: draft.status,
                amount: draft.amount,
                currency: draft.currency,
                createdAt: draft.createdAt,
                paymentStatus: payment?.status || null,
                canRetryPayment: ["payment_pending", "payment_failed", "payment_cancelled"].includes(draft.status)
            };
        });

        return res.send({ success: true, drafts: response });
    } catch (error) {
        return res.status(500).send({ success: false, message: error.message });
    }
};

export const handleSslCommerzSuccess = async (req, res) => {
    const db = getDatabase();

    try {
        const result = await processValidatedPayment(db, req.body && Object.keys(req.body).length > 0 ? req.body : req.query);
        return res.redirect(buildFrontendPaymentReturnUrl("success", String(result.draftId)));
    } catch (error) {
        return res.redirect(buildFrontendPaymentReturnUrl("failed", String(req.query.draftId || req.body?.draftId || "")));
    }
};

export const handleSslCommerzFail = async (req, res) => {
    const db = getDatabase();

    try {
        const draftId = req.query.draftId || req.body?.draftId;
        if (draftId && isValidObjectId(draftId)) {
            await db.collection("property_drafts").updateOne(
                { _id: new ObjectId(draftId) },
                { $set: { status: "payment_failed", updatedAt: new Date() } }
            );
        }

        if (req.body?.tran_id) {
            await db.collection("payments").updateOne(
                { tranId: req.body.tran_id },
                { $set: { status: "failed", gatewayPayload: req.body, updatedAt: new Date() } }
            );
        }
    } catch (error) {
        console.error("SSLCOMMERZ fail handler error:", error.message);
    }

    return res.redirect(buildFrontendPaymentReturnUrl("failed", String(req.query.draftId || req.body?.draftId || "")));
};

export const handleSslCommerzCancel = async (req, res) => {
    const db = getDatabase();

    try {
        const draftId = req.query.draftId || req.body?.draftId;
        if (draftId && isValidObjectId(draftId)) {
            await db.collection("property_drafts").updateOne(
                { _id: new ObjectId(draftId) },
                { $set: { status: "payment_cancelled", updatedAt: new Date() } }
            );
        }

        if (req.body?.tran_id) {
            await db.collection("payments").updateOne(
                { tranId: req.body.tran_id },
                { $set: { status: "cancelled", gatewayPayload: req.body, updatedAt: new Date() } }
            );
        }
    } catch (error) {
        console.error("SSLCOMMERZ cancel handler error:", error.message);
    }

    return res.redirect(buildFrontendPaymentReturnUrl("cancelled", String(req.query.draftId || req.body?.draftId || "")));
};

export const handleSslCommerzIpn = async (req, res) => {
    const db = getDatabase();

    try {
        await processValidatedPayment(db, req.body && Object.keys(req.body).length > 0 ? req.body : req.query);
        return res.status(200).send("IPN processed");
    } catch (error) {
        console.error("SSLCOMMERZ IPN error:", error.message);
        return res.status(400).send("IPN failed");
    }
};

export async function initiatePaidListingPayment(db, reqUser, propertyPayload) {
    const ownerProfile = await getOwnerProfile(db, reqUser.email);
    if (!ownerProfile?.phone) {
        const error = new Error("Add a phone number to your profile before paying for a listing.");
        error.statusCode = 400;
        throw error;
    }

    const entitlement = await getListingEntitlement(db, reqUser.email);
    const { listingFeeBdt } = getListingBillingConfig();

    const owner = {
        uid: reqUser.uid,
        email: reqUser.email,
        name: reqUser.name,
        photoURL: reqUser.photoURL,
        isVerified: reqUser.isVerified
    };

    const draftDoc = {
        owner,
        propertyPayload: normalizeDraftPayload(propertyPayload),
        status: "payment_pending",
        billingDecision: "paid",
        amount: listingFeeBdt,
        currency: "BDT",
        entitlementSnapshot: entitlement,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const draftResult = await db.collection("property_drafts").insertOne(draftDoc);
    const draftId = draftResult.insertedId;
    const tranId = `LISTING-${draftId.toString().slice(-10)}-${Date.now()}`.slice(0, 30);

    const paymentDoc = {
        owner,
        draftId,
        propertyId: null,
        gateway: "sslcommerz",
        purpose: "listing_fee",
        amount: listingFeeBdt,
        currency: "BDT",
        tranId,
        status: "initiated",
        valId: null,
        sessionKey: null,
        gatewayInitResponse: null,
        gatewayPayload: null,
        validationPayload: null,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const paymentResult = await db.collection("payments").insertOne(paymentDoc);
    const callbackUrls = buildSslCommerzCallbackUrls(String(draftId));
    const session = await createHostedCheckoutSession({
        total_amount: listingFeeBdt.toFixed(2),
        currency: "BDT",
        tran_id: tranId,
        ...callbackUrls,
        ...buildCustomerPayload({ ownerProfile, draftPayload: propertyPayload }),
        value_a: String(draftId),
        value_b: reqUser.email,
        value_c: "listing_fee",
        value_d: String(paymentResult.insertedId)
    });

    if (String(session?.status || "").toUpperCase() !== "SUCCESS" || !session?.GatewayPageURL) {
        await db.collection("property_drafts").updateOne(
            { _id: draftId },
            { $set: { status: "payment_failed", updatedAt: new Date() } }
        );
        await db.collection("payments").updateOne(
            { _id: paymentResult.insertedId },
            { $set: { status: "failed", gatewayInitResponse: session, updatedAt: new Date() } }
        );

        const error = new Error(session?.failedreason || "Failed to initialize SSLCOMMERZ payment session.");
        error.statusCode = 502;
        throw error;
    }

    await db.collection("payments").updateOne(
        { _id: paymentResult.insertedId },
        {
            $set: {
                status: "pending",
                sessionKey: session.sessionkey || null,
                gatewayInitResponse: session,
                updatedAt: new Date()
            }
        }
    );

    return {
        requiresPayment: true,
        amount: listingFeeBdt,
        currency: "BDT",
        draftId: String(draftId),
        redirectUrl: session.GatewayPageURL
    };
}
