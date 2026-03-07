import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqItems = [
    {
        question: 'How do I verify if a property owner is trusted?',
        answer:
            'GhorBari verifies owner identity through NID checks. You can also review ratings, profile details, and listing history before making any deal.',
    },
    {
        question: 'Can I negotiate price directly on the platform?',
        answer:
            'Yes. You can submit offers, receive counter-offers, and continue negotiation within the platform. The full offer flow is tracked for transparency.',
    },
    {
        question: 'What happens after an offer is accepted?',
        answer:
            'The application moves to deal-in-progress. Both parties can chat, finalize details, and mark the transaction completed once the sale or rent is closed.',
    },
    {
        question: 'Can owners list both rent and sale properties?',
        answer:
            'Yes. Owners can create listings for rent or sale, manage visibility, review applications, and track deal status from their dashboard.',
    },
    {
        question: 'Is there support if I face an issue during a deal?',
        answer:
            'Yes. You can use platform support channels and in-app guidance when issues occur, including help with applications, negotiations, and status updates.',
    },
];

const FAQSection = () => {
    const [openIndex, setOpenIndex] = useState(0);

    return (
        <section className="bg-gray-100 py-12 md:py-24">
            <div className="w-11/12 mx-auto">
                <div className="text-center mb-10 md:mb-14">
                    <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">
                        Frequently Asked{' '}
                        <span className="bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
                            Questions
                        </span>
                    </h2>
                    <p className="text-gray-600 text-sm md:text-lg max-w-2xl mx-auto font-light">
                        Quick answers about listings, offers, and closing deals on GhorBari.
                    </p>
                </div>

                <div className="max-w-4xl mx-auto space-y-4">
                    {faqItems.map((item, index) => {
                        const isOpen = openIndex === index;

                        return (
                            <article
                                key={item.question}
                                className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
                            >
                                <button
                                    type="button"
                                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                                    className="w-full flex items-center justify-between gap-4 px-6 md:px-7 py-5 text-left"
                                    aria-expanded={isOpen}
                                >
                                    <span className="text-base md:text-lg font-semibold text-gray-900">
                                        {item.question}
                                    </span>
                                    <ChevronDown
                                        size={20}
                                        className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-orange-500' : ''}`}
                                    />
                                </button>

                                {isOpen && (
                                    <div className="px-6 md:px-7 pb-5">
                                        <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                                            {item.answer}
                                        </p>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default FAQSection;
