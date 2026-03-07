import React from "react";
import { ShieldCheck, MessageSquare, Handshake, Building2 } from "lucide-react";

const AboutPage = () => {
    const pillars = [
        {
            icon: ShieldCheck,
            title: "Verified Trust",
            description: "Identity checks and transparent status workflows reduce fake listings and improve user confidence.",
        },
        {
            icon: MessageSquare,
            title: "In-App Communication",
            description: "Property seekers and owners can negotiate directly with contextual chat tied to active applications.",
        },
        {
            icon: Handshake,
            title: "Deal Lifecycle",
            description: "From pending to completed, each stage is tracked clearly so both sides always know what happens next.",
        },
        {
            icon: Building2,
            title: "Local Market Focus",
            description: "GhorBari is built around Bangladesh real estate workflows for both rent and sale use cases.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-100 py-12">
            <div className="w-11/12 max-w-6xl mx-auto space-y-10">
                <section className="bg-white border border-gray-200 rounded-xl p-8 md:p-12 shadow-sm">
                    <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">
                        About <span className="bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">GhorBari</span>
                    </h1>
                    <p className="text-gray-600 text-base md:text-lg leading-relaxed max-w-4xl">
                        GhorBari is a trusted digital marketplace for Bangladesh real estate, designed to simplify how users discover properties,
                        negotiate offers, and close successful rent or sale deals with transparency.
                    </p>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pillars.map((item) => {
                        const Icon = item.icon;
                        return (
                            <article key={item.title} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                <div className="w-12 h-12 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
                                    <Icon size={22} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h2>
                                <p className="text-gray-600 leading-relaxed">{item.description}</p>
                            </article>
                        );
                    })}
                </section>
            </div>
        </div>
    );
};

export default AboutPage;
