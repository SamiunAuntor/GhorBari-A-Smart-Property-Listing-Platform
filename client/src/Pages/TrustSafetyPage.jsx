import React from "react";
import { CheckCircle2, Bell, UserCheck, Shield } from "lucide-react";

const standards = [
    {
        icon: UserCheck,
        title: "Identity Confidence",
        text: "NID-based verification strengthens confidence before users engage in deals.",
    },
    {
        icon: Bell,
        title: "Major Action Alerts",
        text: "Email notifications are triggered for key actions like new applications and counter-offers.",
    },
    {
        icon: CheckCircle2,
        title: "Traceable Deal Status",
        text: "Every application and deal status is visible to both sides to reduce misunderstandings.",
    },
    {
        icon: Shield,
        title: "Safer Workflows",
        text: "Role-based actions for owners and seekers keep listing and negotiation operations controlled.",
    },
];

const TrustSafetyPage = () => {
    return (
        <div className="min-h-screen bg-gray-100 py-12">
            <div className="w-11/12 max-w-6xl mx-auto space-y-8">
                <section className="bg-white border border-gray-200 rounded-xl p-8 md:p-12 shadow-sm">
                    <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">
                        Trust &amp; <span className="bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">Safety</span>
                    </h1>
                    <p className="text-gray-600 text-base md:text-lg leading-relaxed max-w-4xl">
                        GhorBari is built with practical trust controls and transparent deal flows so users can transact with clarity and confidence.
                    </p>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {standards.map((item) => {
                        const Icon = item.icon;
                        return (
                            <article key={item.title} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                <div className="w-12 h-12 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
                                    <Icon size={22} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h2>
                                <p className="text-gray-600 leading-relaxed">{item.text}</p>
                            </article>
                        );
                    })}
                </section>
            </div>
        </div>
    );
};

export default TrustSafetyPage;
