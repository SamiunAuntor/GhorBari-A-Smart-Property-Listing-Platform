import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { X, User, MessageSquare, CheckCircle, XCircle, Clock, Loader2, Send, Ban, Star, History } from 'lucide-react';
import Swal from 'sweetalert2';
import useAxios from '../../Hooks/useAxios';
import useAuth from '../../Hooks/useAuth';
import { showToast } from '../../Utilities/ToastMessage';
import { getApplicationStatusDisplay, getApplicationStatusColor, isActiveApplicationStatus } from '../../Utilities/StatusDisplay';
import OwnerCounterOfferModal from './OwnerCounterOfferModal';
import RateUserModal from './RateUserModal';
import BiddingHistoryModal from './BiddingHistoryModal';

const ApplicationManagementModal = ({ isOpen, onClose, property }) => {
    // ALL HOOKS MUST BE CALLED FIRST - before any conditional returns
    const { user } = useAuth();
    const axios = useAxios();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [processingId, setProcessingId] = useState(null);
    const [counterModalOpen, setCounterModalOpen] = useState(false);
    const [selectedApplicationForCounter, setSelectedApplicationForCounter] = useState(null);
    const [rateModalOpen, setRateModalOpen] = useState(false);
    const [selectedApplicationForRating, setSelectedApplicationForRating] = useState(null);
    const [biddingHistoryModalOpen, setBiddingHistoryModalOpen] = useState(false);
    const [selectedApplicationForHistory, setSelectedApplicationForHistory] = useState(null);

    // Fetch applications for this property
    const { data: applications = [], isLoading, error } = useQuery({
        queryKey: ['property-applications', property?._id],
        enabled: isOpen && !!property?._id && !!user,
        queryFn: async () => {
            if (!user || !property?._id) {
                console.error('Missing user or property._id:', { user: !!user, propertyId: property?._id });
                return [];
            }
            
            try {
                const token = await user.getIdToken();
                // Ensure propertyId is a string - handle both ObjectId and string formats
                const propertyId = property?._id?.toString ? property._id.toString() : String(property?._id || '');
                
                if (!propertyId || propertyId === 'undefined' || propertyId === 'null' || !propertyId.trim()) {
                    const errorMsg = 'Invalid property ID';
                    console.error(errorMsg, property);
                    throw new Error(errorMsg);
                }
                
                console.log('Fetching applications for property:', propertyId);
                
                const res = await axios.get(`/property/${propertyId}/applications`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                console.log('Applications response:', res.data);
                
                if (!res.data) {
                    console.warn('No data in response');
                    return [];
                }
                
                return Array.isArray(res.data) ? res.data : [];
            } catch (err) {
                console.error('Error fetching applications:', err);
                console.error('Error details:', {
                    message: err.message,
                    response: err.response?.data,
                    status: err.response?.status,
                    propertyId: property?._id,
                    property: property
                });
                // Don't show toast here - let the error display handle it
                throw err;
            }
        },
        retry: 1,
        onError: (err) => {
            console.error('Query error fetching applications:', err);
        }
    });


    const handleAccept = async (application) => {
        const result = await Swal.fire({
            title: 'Accept Application?',
            html: `
                <p class="text-left mb-4">Are you sure you want to accept this application?</p>
                <div class="text-left space-y-2">
                    <p><strong>Applicant:</strong> ${application.seeker.name}</p>
                    <p><strong>Proposed Price:</strong> ${application.proposedPrice ? `৳${application.proposedPrice.toLocaleString()}` : 'Listed Price'}</p>
                </div>
                <p class="text-left mt-4 text-sm text-gray-600">This will reject all other pending applications for this property.</p>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Accept',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                setProcessingId(application._id);
                const token = await user.getIdToken();
                await axios.patch(`/application/${application._id}`, {
                    status: 'deal-in-progress'
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                showToast('Application accepted! Deal is now in progress.', 'success');
                queryClient.invalidateQueries({ queryKey: ['property-applications', property._id] });
                queryClient.invalidateQueries({ queryKey: ['my-properties', user?.email] });
            } catch (error) {
                showToast(error.response?.data?.message || 'Failed to accept application', 'error');
            } finally {
                setProcessingId(null);
            }
        }
    };

    const handleReject = async (application) => {
        const result = await Swal.fire({
            title: 'Reject Application?',
            html: `
                <p class="text-left mb-4">Are you sure you want to reject this application?</p>
                <div class="text-left space-y-2">
                    <p><strong>Applicant:</strong> ${application.seeker.name}</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Reject',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                setProcessingId(application._id);
                const token = await user.getIdToken();
                await axios.patch(`/application/${application._id}`, {
                    status: 'rejected'
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                showToast('Application rejected', 'success');
                queryClient.invalidateQueries({ queryKey: ['property-applications', property._id] });
                queryClient.invalidateQueries({ queryKey: ['my-properties', user?.email] });
            } catch (error) {
                showToast(error.response?.data?.message || 'Failed to reject application', 'error');
            } finally {
                setProcessingId(null);
            }
        }
    };

    const handleCancelDeal = async (application) => {
        const result = await Swal.fire({
            title: 'Cancel Deal?',
            html: `
                <p class="text-left mb-4">Are you sure you want to cancel this deal?</p>
                <div class="text-left space-y-2">
                    <p><strong>Property:</strong> ${property.title}</p>
                    <p><strong>Applicant:</strong> ${application.seeker.name}</p>
                    <p><strong>Final Price:</strong> ৳${application.proposedPrice?.toLocaleString() || property.price?.toLocaleString() || 'N/A'}</p>
                </div>
                <p class="text-left mt-4 text-sm text-gray-600">This will cancel the deal and restore the property to its previous status. The application will be marked as cancelled.</p>
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
                setProcessingId(application._id);
                const token = await user.getIdToken();
                await axios.patch(`/property/${property._id}/deal`, {
                    dealStatus: 'cancelled'
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                showToast('Deal cancelled successfully', 'success');
                queryClient.invalidateQueries({ queryKey: ['property-applications', property._id] });
                queryClient.invalidateQueries({ queryKey: ['my-properties', user?.email] });
                queryClient.invalidateQueries({ queryKey: ['my-applications', user?.email] });
                queryClient.invalidateQueries({ queryKey: ['property', property._id] });
            } catch (error) {
                showToast(error.response?.data?.message || 'Failed to cancel deal', 'error');
            } finally {
                setProcessingId(null);
            }
        }
    };

    const handleCounter = (application) => {
        setSelectedApplicationForCounter(application);
        setCounterModalOpen(true);
    };

    const handleCounterModalSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['property-applications', property._id] });
        setCounterModalOpen(false);
        setSelectedApplicationForCounter(null);
    };

    const handleOpenHistory = (application) => {
        setSelectedApplicationForHistory({
            ...application,
            property
        });
        setBiddingHistoryModalOpen(true);
    };

    // Now handle conditional rendering AFTER all hooks are called
    if (!isOpen) return null;
    
    // Validate property object
    if (!property) {
        console.error('ApplicationManagementModal: Property is null or undefined');
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg w-11/12 max-w-2xl mx-auto p-6 shadow-2xl">
                    <div className="flex flex-col items-center justify-center py-10">
                        <XCircle className="text-red-500 mb-4" size={40} />
                        <p className="font-bold text-red-500 mb-2">Invalid Property Data</p>
                        <p className="text-sm text-gray-500 text-center mb-4">Property information is missing.</p>
                        <button onClick={onClose} className="px-4 py-2 bg-orange-500 text-white rounded-md">Close</button>
                    </div>
                </div>
            </div>
        );
    }
    
    if (!property._id) {
        console.error('ApplicationManagementModal: Property._id is missing', property);
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg w-11/12 max-w-2xl mx-auto p-6 shadow-2xl">
                    <div className="flex flex-col items-center justify-center py-10">
                        <XCircle className="text-red-500 mb-4" size={40} />
                        <p className="font-bold text-red-500 mb-2">Missing Property ID</p>
                        <p className="text-sm text-gray-500 text-center mb-4">Property ID is missing. Please refresh the page.</p>
                        <button onClick={onClose} className="px-4 py-2 bg-orange-500 text-white rounded-md">Close</button>
                    </div>
                </div>
            </div>
        );
    }

    const activeApplications = applications.filter(app => isActiveApplicationStatus(app.status));
    const otherApplications = applications.filter(app => !isActiveApplicationStatus(app.status));

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-11/12 mx-auto max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-lg z-10">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">Manage Applications</h2>
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
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="animate-spin text-orange-500 mb-4" size={40} />
                            <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Loading Applications...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <XCircle className="text-red-500 mb-4" size={40} />
                            <p className="font-bold text-red-500 mb-2">Error Loading Applications</p>
                            <p className="text-sm text-gray-500 text-center px-4 mb-4">
                                {error.response?.data?.message || error.message || 'Failed to load applications'}
                            </p>
                            <button
                                onClick={() => queryClient.invalidateQueries({ queryKey: ['property-applications', property._id] })}
                                className="px-4 py-2 bg-orange-500 text-white rounded-md font-bold text-xs uppercase tracking-wider hover:bg-orange-600 transition-all"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Active Applications */}
                            {activeApplications.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4">Active Applications ({activeApplications.length})</h3>
                                    <div className="space-y-4">
                                        {activeApplications.map((application) => (
                                            <div
                                                key={application._id}
                                                className="bg-gray-50 rounded-md p-5 border border-gray-200"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="w-12 h-12 rounded-md bg-orange-100 flex items-center justify-center overflow-hidden">
                                                                {application.seeker.photoURL ? (
                                                                    <img src={application.seeker.photoURL} alt={application.seeker.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <User size={20} className="text-orange-500" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h4 className="font-bold text-gray-900">{application.seeker.name}</h4>
                                                                    <div className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getApplicationStatusColor(application.status)}`}>
                                                                        {getApplicationStatusDisplay(application.status, property)}
                                                                    </div>
                                                                </div>
                                                                <p className="text-xs text-gray-500">{application.seeker.email}</p>
                                                            </div>
                                                        </div>

                                                        {(application.proposedPrice || application.message) && (
                                                            <div className="mb-3 rounded-md border border-gray-200 bg-white px-4 py-3">
                                                                {application.proposedPrice && (
                                                                    <div className="mb-3">
                                                                        <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-600">
                                                                            Proposed
                                                                        </div>
                                                                        <p className="text-base font-black text-gray-900">
                                                                            {"\u09F3"}{application.proposedPrice.toLocaleString()}
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {application.message && (
                                                                    <div className={application.proposedPrice ? "border-t border-gray-100 pt-3" : ""}>
                                                                        <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                                                                            <MessageSquare size={14} className="text-gray-400" />
                                                                            Message
                                                                        </div>
                                                                        <p className="text-sm leading-6 text-gray-600">{application.message}</p>
                                                                    </div>
                                                                )}

                                                                <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
                                                                    Applied : {new Date(application.createdAt).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-2">
                                                        {application.status === 'pending' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleAccept(application)}
                                                                    disabled={processingId === application._id}
                                                                    className="px-4 py-2 bg-green-600 text-white rounded-md font-bold text-xs uppercase tracking-wider hover:bg-green-700 transition-all disabled:opacity-50 flex items-center gap-2"
                                                                >
                                                                    {processingId === application._id ? (
                                                                        <Loader2 size={14} className="animate-spin" />
                                                                    ) : (
                                                                        <CheckCircle size={14} />
                                                                    )}
                                                                    Accept
                                                                </button>
                                                                <button
                                                                    onClick={() => handleOpenHistory(application)}
                                                                    className="px-4 py-2 bg-purple-600 text-white rounded-md font-bold text-xs uppercase tracking-wider hover:bg-purple-700 transition-all flex items-center gap-2"
                                                                >
                                                                    <History size={14} />
                                                                    History
                                                                </button>
                                                                <button
                                                                    onClick={() => handleCounter(application)}
                                                                    disabled={processingId === application._id}
                                                                    className="px-4 py-2 bg-blue-600 text-white rounded-md font-bold text-xs uppercase tracking-wider hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                                                                >
                                                                    <Send size={14} />
                                                                    Counter
                                                                </button>
                                                                <button
                                                                    onClick={() => handleReject(application)}
                                                                    disabled={processingId === application._id}
                                                                    className="px-4 py-2 bg-red-600 text-white rounded-md font-bold text-xs uppercase tracking-wider hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
                                                                >
                                                                    <XCircle size={14} />
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}
                                                                                                                {application.status === 'counter' && (
                                                            <>
                                                                <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-md font-bold text-xs uppercase tracking-wider text-center border border-blue-200 mb-2">
                                                                    Waiting for Seeker Response
                                                                </div>
                                                                <button
                                                                    onClick={() => handleOpenHistory(application)}
                                                                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-md font-bold text-xs uppercase tracking-wider hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                                                                >
                                                                    <History size={14} />
                                                                    History
                                                                </button>
                                                                <button
                                                                    onClick={() => handleReject(application)}
                                                                    disabled={processingId === application._id}
                                                                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md font-bold text-xs uppercase tracking-wider hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                                                >
                                                                    <XCircle size={14} />
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}
                                                        {(application.status === 'deal-in-progress' || application.status === 'accepted') && (
                                                            <>
                                                                <div className="px-4 py-2 bg-orange-100 text-orange-700 rounded-md font-bold text-xs uppercase tracking-wider text-center mb-2">
                                                                    Deal in Progress
                                                                </div>
                                                                <button
                                                                    onClick={() => handleOpenHistory(application)}
                                                                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-md font-bold text-xs uppercase tracking-wider hover:bg-purple-700 transition-all flex items-center justify-center gap-2 mb-2"
                                                                >
                                                                    <History size={14} />
                                                                    History
                                                                </button>
                                                                <button
                                                                    onClick={() => navigate(`/chat?applicationId=${application._id}`)}
                                                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md font-bold text-xs uppercase tracking-wider hover:bg-blue-700 transition-all flex items-center justify-center gap-2 mb-2"
                                                                >
                                                                    <MessageSquare size={14} />
                                                                    Chat with Buyer
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        const result = await Swal.fire({
                                                                            title: `Mark as ${property.listingType === 'sale' ? 'Sold' : 'Rented'}?`,
                                                                            html: `
                                                                                <p class="text-left mb-4">Are you sure you want to mark this deal as ${property.listingType === 'sale' ? 'sold' : 'rented'}?</p>
                                                                                <div class="text-left space-y-2">
                                                                                    <p><strong>Property:</strong> ${property.title}</p>
                                                                                    <p><strong>Applicant:</strong> ${application.seeker.name}</p>
                                                                                    <p><strong>Final Price:</strong> ৳${application.proposedPrice?.toLocaleString() || property.price?.toLocaleString() || 'N/A'}</p>
                                                                                </div>
                                                                                <p class="text-left mt-4 text-sm text-gray-600">This will mark the property as ${property.listingType === 'sale' ? 'sold' : 'rented'} and finalize the deal.</p>
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
                                                                                setProcessingId(application._id);
                                                                                const token = await user.getIdToken();
                                                                                await axios.patch(`/property/${property._id}/deal`, {
                                                                                    dealStatus: 'completed'
                                                                                }, {
                                                                                    headers: { Authorization: `Bearer ${token}` }
                                                                                });

                                                                                showToast(`Deal marked as ${property.listingType === 'sale' ? 'sold' : 'rented'} successfully!`, 'success');
                                                                                queryClient.invalidateQueries({ queryKey: ['property-applications', property._id] });
                                                                                queryClient.invalidateQueries({ queryKey: ['my-properties', user?.email] });
                                                                                queryClient.invalidateQueries({ queryKey: ['my-applications', user?.email] });
                                                                                queryClient.invalidateQueries({ queryKey: ['property', property._id] });
                                                                            } catch (error) {
                                                                                showToast(error.response?.data?.message || `Failed to mark deal as ${property.listingType === 'sale' ? 'sold' : 'rented'}`, 'error');
                                                                            } finally {
                                                                                setProcessingId(null);
                                                                            }
                                                                        }
                                                                    }}
                                                                    disabled={processingId === application._id}
                                                                    className="w-full px-4 py-2 bg-emerald-600 text-white rounded-md font-bold text-xs uppercase tracking-wider hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                                                >
                                                                    {processingId === application._id ? (
                                                                        <Loader2 size={14} className="animate-spin" />
                                                                    ) : (
                                                                        <CheckCircle size={14} />
                                                                    )}
                                                                    Mark as {property.listingType === 'sale' ? 'Sold' : 'Rented'}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleCancelDeal(application)}
                                                                    disabled={processingId === application._id}
                                                                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md font-bold text-xs uppercase tracking-wider hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                                                >
                                                                    {processingId === application._id ? (
                                                                        <Loader2 size={14} className="animate-spin" />
                                                                    ) : (
                                                                        <Ban size={14} />
                                                                    )}
                                                                    Cancel Deal
                                                                </button>
                                                            </>
                                                        )}
                                                        {(application.status === 'completed') && (
                                                            <div className="space-y-2">
                                                                <div className="px-4 py-2 bg-green-100 text-green-700 rounded-md font-bold text-xs uppercase tracking-wider text-center">
                                                                    Completed
                                                                </div>
                                                                <button
                                                                    onClick={() => handleOpenHistory(application)}
                                                                    className="px-4 py-2 bg-purple-600 text-white rounded-md font-bold text-xs uppercase tracking-wider hover:bg-purple-700 transition-all flex items-center gap-2"
                                                                >
                                                                    <History size={14} />
                                                                    History
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedApplicationForRating(application);
                                                                        setRateModalOpen(true);
                                                                    }}
                                                                    className="w-full px-4 py-2 bg-amber-500 text-white rounded-md font-bold text-xs uppercase tracking-wider hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                                                                >
                                                                    <Star size={14} />
                                                                    Rate Buyer
                                                                </button>
                                                            </div>
                                                        )}
                                                        {(application.status === 'cancelled') && (
                                                            <div className="space-y-2">
                                                                <button
                                                                    onClick={() => handleOpenHistory(application)}
                                                                    className="px-4 py-2 bg-purple-600 text-white rounded-md font-bold text-xs uppercase tracking-wider hover:bg-purple-700 transition-all flex items-center gap-2"
                                                                >
                                                                    <History size={14} />
                                                                    History
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedApplicationForRating(application);
                                                                        setRateModalOpen(true);
                                                                    }}
                                                                    className="w-full px-4 py-2 bg-amber-500 text-white rounded-md font-bold text-xs uppercase tracking-wider hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                                                                >
                                                                    <Star size={14} />
                                                                    Rate Buyer
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Other Applications */}
                            {otherApplications.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 mb-4">Other Applications ({otherApplications.length})</h3>
                                    <div className="space-y-3">
                                        {otherApplications.map((application) => (
                                            <div
                                                key={application._id}
                                                className="bg-gray-50 rounded-md p-4 border border-gray-200 flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-md bg-gray-200 flex items-center justify-center overflow-hidden">
                                                        {application.seeker.photoURL ? (
                                                            <img src={application.seeker.photoURL} alt={application.seeker.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User size={16} className="text-gray-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-gray-900">{application.seeker.name}</p>
                                                        <p className="text-xs text-gray-500">{new Date(application.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => handleOpenHistory(application)}
                                                        className="px-3 py-1.5 bg-purple-600 text-white rounded-md text-xs font-semibold hover:bg-purple-700 flex items-center gap-1"
                                                    >
                                                        <History size={12} />
                                                        History
                                                    </button>
                                                    <div className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getApplicationStatusColor(application.status)}`}>
                                                        {getApplicationStatusDisplay(application.status, property)}
                                                    </div>
                                                    {(application.status === 'deal-in-progress' || application.status === 'accepted') && (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => navigate(`/chat?applicationId=${application._id}`)}
                                                                className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 flex items-center gap-1"
                                                            >
                                                                <MessageSquare size={12} />
                                                                Chat
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    const result = await Swal.fire({
                                                                        title: `Mark as ${property.listingType === 'sale' ? 'Sold' : 'Rented'}?`,
                                                                        html: `
                                                                            <p class="text-left mb-4">Are you sure you want to mark this deal as ${property.listingType === 'sale' ? 'sold' : 'rented'}?</p>
                                                                            <div class="text-left space-y-2">
                                                                                <p><strong>Property:</strong> ${property.title}</p>
                                                                                <p><strong>Applicant:</strong> ${application.seeker.name}</p>
                                                                                <p><strong>Final Price:</strong> ৳${application.proposedPrice?.toLocaleString() || property.price?.toLocaleString() || 'N/A'}</p>
                                                                            </div>
                                                                            <p class="text-left mt-4 text-sm text-gray-600">This will mark the property as ${property.listingType === 'sale' ? 'sold' : 'rented'} and finalize the deal.</p>
                                                                        `,
                                                                        icon: 'question',
                                                                        showCancelButton: true,
                                                                        confirmButtonColor: '#22c55e',
                                                                        cancelButtonColor: '#6b7280',
                                                                        confirmButtonText: `Yes, Mark as ${property.listingType === 'sale' ? 'Sold' : 'Rented'}`,
                                                                        cancelButtonText: 'Cancel'
                                                                    });

                                                                    if (result.isConfirmed) {
                                                                        try {
                                                                            setProcessingId(application._id);
                                                                            const token = await user.getIdToken();
                                                                            await axios.patch(`/property/${property._id}/deal`, {
                                                                                dealStatus: 'completed'
                                                                            }, {
                                                                                headers: { Authorization: `Bearer ${token}` }
                                                                            });

                                                                            showToast(`Deal marked as ${property.listingType === 'sale' ? 'sold' : 'rented'} successfully!`, 'success');
                                                                            queryClient.invalidateQueries({ queryKey: ['property-applications', property._id] });
                                                                            queryClient.invalidateQueries({ queryKey: ['my-properties', user?.email] });
                                                                            queryClient.invalidateQueries({ queryKey: ['my-applications', user?.email] });
                                                                            queryClient.invalidateQueries({ queryKey: ['property', property._id] });
                                                                        } catch (error) {
                                                                            showToast(error.response?.data?.message || `Failed to mark deal as ${property.listingType === 'sale' ? 'sold' : 'rented'}`, 'error');
                                                                        } finally {
                                                                            setProcessingId(null);
                                                                        }
                                                                    }
                                                                }}
                                                                disabled={processingId === application._id}
                                                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-md font-bold text-xs uppercase tracking-wider hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-1.5"
                                                            >
                                                                {processingId === application._id ? (
                                                                    <Loader2 size={12} className="animate-spin" />
                                                                ) : (
                                                                    <CheckCircle size={12} />
                                                                )}
                                                                Mark as {property.listingType === 'sale' ? 'Sold' : 'Rented'}
                                                            </button>
                                                            <button
                                                                onClick={() => handleCancelDeal(application)}
                                                                disabled={processingId === application._id}
                                                                className="px-3 py-1.5 bg-red-600 text-white rounded-md font-bold text-xs uppercase tracking-wider hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-1.5"
                                                            >
                                                                {processingId === application._id ? (
                                                                    <Loader2 size={12} className="animate-spin" />
                                                                ) : (
                                                                    <Ban size={12} />
                                                                )}
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    )}
                                                    {['completed', 'cancelled'].includes(application.status) && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedApplicationForRating(application);
                                                                setRateModalOpen(true);
                                                            }}
                                                            className="px-3 py-1.5 bg-amber-500 text-white rounded-md text-xs font-semibold hover:bg-amber-600 flex items-center gap-1"
                                                        >
                                                            <Star size={12} />
                                                            Rate
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {applications.length === 0 && (
                                <div className="text-center py-20">
                                    <MessageSquare size={48} className="text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-400 font-medium">No applications yet</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Owner Counter Offer Modal */}
            <OwnerCounterOfferModal
                isOpen={counterModalOpen}
                onClose={() => {
                    setCounterModalOpen(false);
                    setSelectedApplicationForCounter(null);
                }}
                application={selectedApplicationForCounter}
                property={property}
                onSuccess={handleCounterModalSuccess}
            />

            <BiddingHistoryModal
                isOpen={biddingHistoryModalOpen}
                onClose={() => {
                    setBiddingHistoryModalOpen(false);
                    setSelectedApplicationForHistory(null);
                }}
                application={selectedApplicationForHistory}
                viewerRole="owner"
            />

            <RateUserModal
                isOpen={rateModalOpen}
                onClose={() => {
                    setRateModalOpen(false);
                    setSelectedApplicationForRating(null);
                }}
                application={selectedApplicationForRating}
                counterpartyLabel="Buyer"
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['property-applications', property?._id] });
                }}
            />
        </div>
    );
};

export default ApplicationManagementModal;

