import React from 'react';
import { X, History, User, Building2, Clock } from 'lucide-react';

const BiddingHistoryModal = ({ isOpen, onClose, application, viewerRole = 'seeker' }) => {
    if (!isOpen || !application || !application.property) return null;

    const property = application.property;

    // Get price history entries sorted by timestamp
    const getPriceHistory = () => {
        if (!application.priceHistory || !Array.isArray(application.priceHistory)) {
            return [];
        }
        return application.priceHistory
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    };

    const priceHistory = getPriceHistory();

    const getEntryLabel = (entry) => {
        const isSeeker = entry.setBy === 'seeker';
        const isOwner = entry.setBy === 'owner';

        if (viewerRole === 'owner') {
            if (isOwner) return 'Your Counter Offer';
            if (isSeeker) return "Buyer's Offer";
            return 'Offer';
        }

        if (isSeeker) return 'Your Offer';
        if (isOwner) return "Owner's Counter Offer";
        return 'Offer';
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-11/12 max-w-3xl mx-auto max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-lg">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            <History size={24} className="text-purple-600" />
                            Bidding History
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">{property.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {priceHistory.length > 0 ? (
                        <div className="space-y-4">
                            {/* Original Listing Price */}
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gray-200 rounded-md">
                                            <Building2 size={18} className="text-gray-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-700 text-sm">Original Listing Price</p>
                                            <p className="text-xs text-gray-500">Initial property listing</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-gray-900">
                                            ৳{property.price?.toLocaleString()}
                                            <span className="text-sm font-medium text-gray-500 ml-1">
                                                /{property.listingType === 'rent' ? 'month' : 'total'}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Price History Timeline */}
                            <div className="space-y-3">
                                {priceHistory.map((entry, index) => {
                                    const isSeeker = entry.setBy === 'seeker';
                                    const isOwner = entry.setBy === 'owner';
                                    
                                    return (
                                        <div
                                            key={index}
                                            className={`relative pl-8 pb-4 ${
                                                index < priceHistory.length - 1 ? 'border-l-2 border-gray-200' : ''
                                            }`}
                                        >
                                            {/* Timeline dot */}
                                            <div
                                                className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-white ${
                                                    isSeeker
                                                        ? 'bg-blue-500'
                                                        : isOwner
                                                        ? 'bg-orange-500'
                                                        : 'bg-gray-400'
                                                }`}
                                                style={{ transform: 'translateX(-10px)' }}
                                            />

                                            {/* Entry content */}
                                            <div
                                                className={`rounded-lg p-4 border-2 ${
                                                    isSeeker
                                                        ? 'bg-blue-50 border-blue-200'
                                                        : isOwner
                                                        ? 'bg-orange-50 border-orange-200'
                                                        : 'bg-gray-50 border-gray-200'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`p-2 rounded-md ${
                                                                isSeeker
                                                                    ? 'bg-blue-200'
                                                                    : isOwner
                                                                    ? 'bg-orange-200'
                                                                    : 'bg-gray-200'
                                                            }`}
                                                        >
                                                            {isSeeker ? (
                                                                <User size={18} className="text-blue-700" />
                                                            ) : isOwner ? (
                                                                <Building2 size={18} className="text-orange-700" />
                                                            ) : (
                                                                <User size={18} className="text-gray-700" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p
                                                                className={`font-bold text-sm ${
                                                                    isSeeker
                                                                        ? 'text-blue-900'
                                                                        : isOwner
                                                                        ? 'text-orange-900'
                                                                        : 'text-gray-900'
                                                                }`}
                                                            >
                                                                {getEntryLabel(entry)}
                                                            </p>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <Clock size={12} className="text-gray-500" />
                                                                <p className="text-xs text-gray-500">
                                                                    {formatDate(entry.timestamp)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p
                                                            className={`text-2xl font-black ${
                                                                isSeeker
                                                                    ? 'text-blue-600'
                                                                    : isOwner
                                                                    ? 'text-orange-600'
                                                                    : 'text-gray-600'
                                                            }`}
                                                        >
                                                            ৳{entry.price?.toLocaleString()}
                                                            <span className="text-sm font-medium ml-1 opacity-75">
                                                                /{property.listingType === 'rent' ? 'month' : 'total'}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                            <History size={48} className="text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-400 font-medium">No bidding history available yet.</p>
                            <p className="text-gray-400 text-sm mt-1">Price negotiations will appear here.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 p-4 rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-gray-200 text-gray-700 rounded-md font-bold hover:bg-gray-300 transition-all text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BiddingHistoryModal;
