import React from "react";

const policyItems = [
    {
        title: "Information We Collect",
        body: "We collect account details, profile data, property listing inputs, application data, and communication metadata needed to run platform features.",
    },
    {
        title: "How We Use Data",
        body: "Data is used to authenticate users, process listings and applications, support chat and notifications, and improve service quality.",
    },
    {
        title: "Data Sharing",
        body: "We only share relevant details between parties involved in a transaction workflow. We do not sell personal data.",
    },
    {
        title: "Security Practices",
        body: "We use access control, token-based authorization, and operational safeguards to protect user and transaction data.",
    },
    {
        title: "Your Controls",
        body: "You can update profile information, manage listings, and request account-related support through official channels.",
    },
];

const PrivacyPolicyPage = () => {
    return (
        <div className="min-h-screen bg-gray-100 py-12">
            <div className="w-11/12 max-w-5xl mx-auto">
                <section className="bg-white border border-gray-200 rounded-xl p-8 md:p-12 shadow-sm">
                    <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">
                        Privacy <span className="bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">Policy</span>
                    </h1>
                    <p className="text-gray-600 text-base md:text-lg leading-relaxed mb-8">
                        This policy explains how GhorBari handles user information across account, listing, and deal workflows.
                    </p>

                    <div className="space-y-6">
                        {policyItems.map((item) => (
                            <article key={item.title} className="border border-gray-200 rounded-lg p-5">
                                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-2">{item.title}</h2>
                                <p className="text-gray-600 leading-relaxed">{item.body}</p>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default PrivacyPolicyPage;
