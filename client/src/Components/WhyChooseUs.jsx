import React from 'react';
import { ShieldCheck, Zap, Headphones, BarChart3, MessageSquare, Handshake, Wallet, Bell } from 'lucide-react';

const WhyChooseUs = () => {
    const features = [
        {
            icon: ShieldCheck,
            title: "NID Verified Security",
            description:
                "Owner identity is verified through NID checks, helping reduce fake listings and making every interaction more trustworthy.",
        },
        {
            icon: Zap,
            title: "AI Property Assistant",
            description:
                "Built-in Ghor AI helps users discover listings, understand options, and move faster with better decisions.",
        },
        {
            icon: BarChart3,
            title: "Market Insights",
            description:
                "Live listing patterns and location-level signals support smarter rent and sale decisions across neighborhoods.",
        },
        {
            icon: Headphones,
            title: "Email Notifications",
            description:
                "Get notified by email for major actions like new applications, incoming offers, counter-offers, and key deal status changes.",
        },
        {
            icon: MessageSquare,
            title: "In-App Deal Chat",
            description:
                "Seeker and owner can communicate directly in context of an application, keeping negotiation and decisions in one place.",
        },
        {
            icon: Handshake,
            title: "Structured Negotiation",
            description:
                "Offer, counter-offer, acceptance, and deal-in-progress states are tracked with clear transitions to avoid confusion.",
        },
        {
            icon: Wallet,
            title: "Flexible Deal Types",
            description:
                "Supports both rent and sale workflows with role-based actions for seekers and owners throughout the transaction lifecycle.",
        },
        {
            icon: Bell,
            title: "Status Transparency",
            description:
                "Applications and properties show precise status updates like pending, counter, completed, sold, or rented for full visibility.",
        },
    ];

    return (
        <section className="py-16 md:py-24 bg-gray-100">
            <div className="w-11/12 mx-auto">
                {/* SECTION HEADER */}
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">
                        Why Choose{" "}
                        <span className="bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
                            GhorBari
                        </span>
                    </h2>
                    <p className="text-gray-600 text-sm md:text-lg max-w-2xl mx-auto font-light">
                        Experience a new standard of real estate excellence where luxury
                        meets transparency and cutting-edge technology.
                    </p>
                </div>

                {/* FEATURES GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <div
                                key={index}
                                className="group bg-white p-8 rounded-lg border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500"
                            >
                                {/* ICON BOX */}
                                <div className="w-16 h-16 rounded-md bg-orange-50 flex items-center justify-center mb-6 group-hover:bg-gradient-to-br group-hover:from-orange-500 group-hover:to-yellow-500 transition-colors duration-300">
                                    <Icon className="text-orange-500 group-hover:text-white transition-colors duration-300" size={32} />
                                </div>

                                {/* TEXT CONTENT */}
                                <h3 className="text-xl font-bold text-gray-900 mb-3">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default WhyChooseUs;
