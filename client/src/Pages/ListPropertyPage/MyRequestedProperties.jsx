import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import useAuth from '../../Hooks/useAuth';
import useAxios from '../../Hooks/useAxios';
import { MapPin, Eye, Loader2, Clock, CheckCircle, XCircle, MessageSquare, LogOut, Edit, Handshake, History, CheckCircle2, Ban, Star } from 'lucide-react';
import Swal from 'sweetalert2';
import { showToast } from '../../Utilities/ToastMessage';
import ReviseOfferModal from './ReviseOfferModal';
import BiddingHistoryModal from './BiddingHistoryModal';
import CounterOfferModal from './CounterOfferModal';
import RateUserModal from './RateUserModal';
import { 
    getApplicationStatusDisplay, 
    getApplicationStatusColor
} from '../../Utilities/StatusDisplay';

const MyRequestedProperties = () => {
    const { user } = useAuth();
    const axios = useAxios();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [reviseModalOpen, setReviseModalOpen] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [biddingHistoryModalOpen, setBiddingHistoryModalOpen] = useState(false);
    const [selectedApplicationForHistory, setSelectedApplicationForHistory] = useState(null);
    const [counterModalOpen, setCounterModalOpen] = useState(false);
    const [selectedApplicationForCounter, setSelectedApplicationForCounter] = useState(null);
    const [rateModalOpen, setRateModalOpen] = useState(false);
    const [selectedApplicationForRating, setSelectedApplicationForRating] = useState(null);

    // Fetch User Applications
    const { data: applications = [], isLoading } = useQuery({
        queryKey: ['my-applications', user?.email],
        queryFn: async () => {
            if (!user) return [];

            const token = await user.getIdToken();

            const res = await axios.get(`/my-applications?email=${user.email}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            return res.data;
        },
    });

    const handleWithdraw = async (application) => {
        const result = await Swal.fire({
            title: 'Withdraw Application?',
            html: `
                <p class="text-left mb-4">Are you sure you want to withdraw this application?</p>
                <div class="text-left space-y-2">
                    <p><strong>Property:</strong> ${application.property?.title || 'N/A'}</p>
                </div>
                <p class="text-left mt-4 text-sm text-gray-600">You can submit a new application later if needed.</p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Withdraw',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                const token = await user.getIdToken();
                await axios.patch(`/application/${application._id}/withdraw`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                showToast('Application withdrawn successfully', 'success');
                queryClient.invalidateQueries({ queryKey: ['my-applications', user?.email] });
            } catch (error) {
                showToast(error.response?.data?.message || 'Failed to withdraw application', 'error');
            }
        }
    };


    const handleMarkDealCompleted = async (application) => {
        const property = application.property;
        if (!property) return;

        const actionTextLower = property.listingType === 'sale' ? 'sold' : 'rented';

        const result = await Swal.fire({
            title: 'Mark Deal as Completed?',
            html: `
                <p class="text-left mb-4">Are you sure you want to mark this deal as completed?</p>
                <div class="text-left space-y-2">
                    <p><strong>Property:</strong> ${property.title}</p>
                    <p><strong>Final Price:</strong> ৳${application.proposedPrice?.toLocaleString() || property.price?.toLocaleString() || 'N/A'}</p>
                </div>
                <p class="text-left mt-4 text-sm text-gray-600">This will mark the property as ${actionTextLower} and finalize the deal.</p>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#22c55e',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Mark as Completed',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                const token = await user.getIdToken();
                await axios.patch(`/property/${property._id}/deal`, {
                    dealStatus: 'completed'
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                showToast(`Deal marked as ${actionTextLower} successfully!`, 'success');
                queryClient.invalidateQueries({ queryKey: ['my-applications', user?.email] });
                queryClient.invalidateQueries({ queryKey: ['property', property._id] });
                queryClient.invalidateQueries({ queryKey: ['my-properties', user?.email] });
            } catch (error) {
                showToast(error.response?.data?.message || `Failed to mark deal as ${actionTextLower}`, 'error');
            }
        }
    };

    const handleCancelDeal = async (application) => {
        const property = application.property;
        if (!property) return;

        const result = await Swal.fire({
            title: 'Cancel Deal?',
            html: `
                <p class="text-left mb-4">Are you sure you want to cancel this deal?</p>
                <div class="text-left space-y-2">
                    <p><strong>Property:</strong> ${property.title}</p>
                    <p><strong>Final Price:</strong> ৳${application.proposedPrice?.toLocaleString() || property.price?.toLocaleString() || 'N/A'}</p>
                </div>
                <p class="text-left mt-4 text-sm text-gray-600">This will cancel the deal and restore the property to its previous status. Your application will be marked as cancelled.</p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Cancel Deal',
            cancelButtonText: 'No, Keep Deal'
        });

        if (result.isConfirmed) {
            try {
                const token = await user.getIdToken();
                await axios.patch(`/property/${property._id}/deal`, {
                    dealStatus: 'cancelled'
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                showToast('Deal cancelled successfully', 'success');
                queryClient.invalidateQueries({ queryKey: ['my-applications', user?.email] });
                queryClient.invalidateQueries({ queryKey: ['property', property._id] });
                queryClient.invalidateQueries({ queryKey: ['my-properties', user?.email] });
            } catch (error) {
                showToast(error.response?.data?.message || 'Failed to cancel deal', 'error');
            }
        }
    };

    const getStatusIcon = (status) => {
        // Backward compatibility: treat 'accepted' as 'deal-in-progress'
        const normalizedStatus = status === 'accepted' ? 'deal-in-progress' : status;
        
        switch (normalizedStatus) {
            case 'pending':
                return <Clock size={14} />;
            case 'counter':
                return <MessageSquare size={14} />;
            case 'deal-in-progress':
                return <Handshake size={14} />;
            case 'completed':
                return <CheckCircle size={14} />;
            case 'rejected':
                return <XCircle size={14} />;
            case 'cancelled':
                return <XCircle size={14} />;
            default:
                return <Clock size={14} />;
        }
    };

    return (
        <>
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-gray-100">
                    <Loader2 className="animate-spin text-orange-500 mb-4" size={40} />
                    <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Loading Applications...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {applications.length > 0 ? (
                        applications.map((application) => {
                            const property = application.property;
                            if (!property) return null;

                            return (
                                <div
                                    key={application._id}
                                    className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all group flex flex-col md:flex-row"
                                >
                                    {/* Image Section - Left */}
                                    <div className="relative w-full md:w-72 flex-shrink-0 p-4">
                                        <div className="relative w-full h-40 overflow-hidden bg-gray-100 rounded-lg">
                                            <img
                                                src={property.images?.[0] || "https://via.placeholder.com/400"}
                                                alt={property.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <div className="absolute top-2 right-2">
                                                <div className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider shadow-sm border flex items-center gap-1 ${getApplicationStatusColor(application.status)}`}>
                                                    {getStatusIcon(application.status)}
                                                    {getApplicationStatusDisplay(application.status, property)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Details Section - Middle */}
                                    <div className="flex-1 p-4 flex flex-col justify-between">
                                        <div className="space-y-3">
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900 mb-1.5 group-hover:text-orange-600 transition-colors line-clamp-2">
                                                    {property.title}
                                                </h3>
                                                <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                                                    <MapPin size={14} className="text-orange-500 flex-shrink-0" />
                                                    <span className="line-clamp-1">{property.address?.street || 'Address not available'}</span>
                                                </div>
                                            </div>

                                            {/* Price and Last Offer */}
                                            <div className="space-y-2">
                                                <div className="flex items-baseline gap-1 min-w-0">
                                                    <span className="text-lg sm:text-xl font-black text-gray-700">
                                                        ৳{property.price?.toLocaleString()}
                                                    </span>
                                                    <span className="text-xs sm:text-sm font-medium text-gray-500">
                                                        /{property.listingType === 'rent' ? 'month' : 'total'}
                                                    </span>
                                                </div>
                                                {(() => {
                                                    if (!application.priceHistory || !Array.isArray(application.priceHistory)) {
                                                        return null;
                                                    }
                                                    const seekerPrices = application.priceHistory
                                                        .filter(entry => entry.setBy === 'seeker')
                                                        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                                                    const lastOffer = seekerPrices.length > 0 ? seekerPrices[seekerPrices.length - 1].price : null;
                                                    return lastOffer ? (
                                                        <div className="flex items-baseline gap-2 min-w-0">
                                                            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">My Offer</span>
                                                            <span className="text-lg sm:text-xl font-black text-blue-600">
                                                                ৳{lastOffer.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    ) : null;
                                                })()}
                                            </div>
                                        </div>

                                        {/* Counter Offer button - at bottom, same design as owner's request button */}
                                        {application.status === 'counter' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedApplicationForCounter(application);
                                                    setCounterModalOpen(true);
                                                }}
                                                className="w-fit flex items-center justify-center gap-1.5 px-4 py-2 rounded-md font-semibold text-sm transition-all bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
                                            >
                                                <MessageSquare size={16} />
                                                <span>View Counter Offer</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Actions Section - Right */}
                                    <div className="p-4 flex flex-col gap-2 md:border-l md:border-t-0 border-t border-gray-100 justify-center">
                                        <button
                                            onClick={() => navigate(`/property-details/${property._id}`)}
                                            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-50 text-orange-600 rounded-md hover:bg-orange-100 transition-all text-sm font-semibold"
                                        >
                                            <Eye size={16} />
                                            <span>View</span>
                                        </button>

                                        {/* Bidding History Button */}
                                        <button
                                            onClick={() => {
                                                setSelectedApplicationForHistory(application);
                                                setBiddingHistoryModalOpen(true);
                                            }}
                                            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 transition-all text-sm font-semibold"
                                        >
                                            <History size={16} />
                                            <span>History</span>
                                        </button>

                                        {/* Mark Deal as Completed/Rented/Sold, Chat, and Cancel Deal - only for deal-in-progress */}
                                        {(application.status === 'deal-in-progress' || application.status === 'accepted') && (
                                            <>
                                                <button
                                                    onClick={() => navigate(`/chat?applicationId=${application._id}`)}
                                                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-all text-sm font-semibold"
                                                >
                                                    <MessageSquare size={16} />
                                                    <span>Chat with Seller</span>
                                                </button>
                                                <button
                                                    onClick={() => handleMarkDealCompleted(application)}
                                                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-all text-sm font-semibold"
                                                >
                                                    <CheckCircle2 size={16} />
                                                    <span>Mark as {property?.listingType === 'sale' ? 'Sold' : 'Rented'}</span>
                                                </button>
                                                <button
                                                    onClick={() => handleCancelDeal(application)}
                                                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-all text-sm font-semibold"
                                                >
                                                    <Ban size={16} />
                                                    <span>Cancel Deal</span>
                                                </button>
                                            </>
                                        )}

                                        {['completed', 'cancelled'].includes(application.status) && (
                                            <button
                                                onClick={() => {
                                                    setSelectedApplicationForRating(application);
                                                    setRateModalOpen(true);
                                                }}
                                                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-600 rounded-md hover:bg-amber-100 transition-all text-sm font-semibold"
                                            >
                                                <Star size={16} />
                                                <span>Rate Seller</span>
                                            </button>
                                        )}

                                        {/* Withdraw button - only for pending and counter */}
                                        {['pending', 'counter'].includes(application.status) && (
                                            <button
                                                onClick={() => handleWithdraw(application)}
                                                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-all text-sm font-semibold"
                                            >
                                                <LogOut size={16} />
                                                <span>Withdraw</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-lg">
                            <MessageSquare size={48} className="text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-400 font-medium">No applications found. Start applying to properties!</p>
                        </div>
                    )}
                </div>
            )}

            {/* Counter Offer Modal */}
            <CounterOfferModal
                isOpen={counterModalOpen}
                onClose={() => {
                    setCounterModalOpen(false);
                    setSelectedApplicationForCounter(null);
                }}
                application={selectedApplicationForCounter}
            />

            {/* Revise Offer Modal */}
            <ReviseOfferModal
                isOpen={reviseModalOpen}
                onClose={() => {
                    setReviseModalOpen(false);
                    setSelectedApplication(null);
                }}
                application={selectedApplication}
            />

            {/* Bidding History Modal */}
            <BiddingHistoryModal
                isOpen={biddingHistoryModalOpen}
                onClose={() => {
                    setBiddingHistoryModalOpen(false);
                    setSelectedApplicationForHistory(null);
                }}
                application={selectedApplicationForHistory}
            />

            <RateUserModal
                isOpen={rateModalOpen}
                onClose={() => {
                    setRateModalOpen(false);
                    setSelectedApplicationForRating(null);
                }}
                application={selectedApplicationForRating}
                counterpartyLabel="Seller"
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['my-applications', user?.email] });
                }}
            />
        </>
    );
};

export default MyRequestedProperties;
