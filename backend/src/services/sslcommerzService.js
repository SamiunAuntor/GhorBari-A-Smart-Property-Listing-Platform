import axios from "axios";

function getRequiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not configured`);
    }
    return value;
}

export function getSslCommerzConfig() {
    const isSandbox = process.env.SSLCOMMERZ_IS_SANDBOX !== "false";
    const apiBaseUrl = process.env.SSLCOMMERZ_API_BASE_URL
        || (isSandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com");
    const validationBaseUrl = process.env.SSLCOMMERZ_VALIDATION_API_URL
        || `${apiBaseUrl}/validator/api/validationserverAPI.php`;

    return {
        storeId: getRequiredEnv("SSLCOMMERZ_STORE_ID"),
        storePassword: getRequiredEnv("SSLCOMMERZ_STORE_PASSWORD"),
        apiBaseUrl: apiBaseUrl.replace(/\/$/, ""),
        validationUrl: validationBaseUrl,
        backendPublicUrl: getRequiredEnv("BACKEND_PUBLIC_URL").replace(/\/$/, ""),
        clientUrl: getRequiredEnv("CLIENT_URL").replace(/\/$/, ""),
        isSandbox
    };
}

export async function createHostedCheckoutSession(payload) {
    const config = getSslCommerzConfig();

    const response = await axios.post(
        `${config.apiBaseUrl}/gwprocess/v4/api.php`,
        new URLSearchParams({
            store_id: config.storeId,
            store_passwd: config.storePassword,
            ...payload
        }).toString(),
        {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            timeout: 30000
        }
    );

    return response.data;
}

export async function validateSslCommerzPayment(valId) {
    const config = getSslCommerzConfig();

    const response = await axios.get(config.validationUrl, {
        params: {
            val_id: valId,
            store_id: config.storeId,
            store_passwd: config.storePassword,
            format: "json"
        },
        timeout: 30000
    });

    return response.data;
}

export function buildSslCommerzCallbackUrls(draftId) {
    const config = getSslCommerzConfig();
    const encodedDraftId = encodeURIComponent(draftId);

    return {
        success_url: `${config.backendPublicUrl}/api/payments/sslcommerz/success?draftId=${encodedDraftId}`,
        fail_url: `${config.backendPublicUrl}/api/payments/sslcommerz/fail?draftId=${encodedDraftId}`,
        cancel_url: `${config.backendPublicUrl}/api/payments/sslcommerz/cancel?draftId=${encodedDraftId}`,
        ipn_url: `${config.backendPublicUrl}/api/payments/sslcommerz/ipn?draftId=${encodedDraftId}`
    };
}

export function buildFrontendPaymentReturnUrl(status, draftId) {
    const config = getSslCommerzConfig();
    const params = new URLSearchParams({
        payment: status,
        draftId
    });

    return `${config.clientUrl}/add-property?${params.toString()}`;
}
