import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import * as paymentController from "../controllers/paymentController.js";

const router = express.Router();

router.get("/api/payments/listing-drafts/:draftId/status", verifyToken, paymentController.getListingDraftStatus);
router.get("/api/payments/listing-drafts", verifyToken, paymentController.getOwnerListingDrafts);
router.post("/api/payments/listing-drafts/:draftId/retry", verifyToken, paymentController.retryListingPayment);

router.all("/api/payments/sslcommerz/success", paymentController.handleSslCommerzSuccess);
router.all("/api/payments/sslcommerz/fail", paymentController.handleSslCommerzFail);
router.all("/api/payments/sslcommerz/cancel", paymentController.handleSslCommerzCancel);
router.all("/api/payments/sslcommerz/ipn", paymentController.handleSslCommerzIpn);

export default router;
