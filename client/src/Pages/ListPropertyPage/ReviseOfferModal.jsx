import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import useAxios from '../../Hooks/useAxios';
import useAuth from '../../Hooks/useAuth';
import { showToast } from '../../Utilities/ToastMessage';
import { useQueryClient } from '@tanstack/react-query';

const getLastPriceByActor = (application, actor) => {
    if (!Array.isArray(application?.priceHistory)) return null;
    const prices = application.priceHistory
        .filter((entry) => entry?.setBy === actor && Number(entry?.price) > 0)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return prices.length > 0 ? Number(prices[prices.length - 1].price) : null;
};

const ReviseOfferModal = ({ isOpen, onClose, application }) => {
    const { user } = useAuth();
    const axios = useAxios();
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const property = application?.property;
    const lastSeekerPrice = getLastPriceByActor(application, 'seeker') ?? 0;
    const lastOwnerPrice = getLastPriceByActor(application, 'owner') ?? Number(application?.proposedPrice || 0);
    
    const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm({
        defaultValues: {
            proposedPrice: application?.proposedPrice || property?.price || '',
            message: application?.message || ''
        }
    });

    // Auto-fill price and message when modal opens
    useEffect(() => {
        if (isOpen && application) {
            // Get user's previous offer from priceHistory (to pre-fill, not owner's counter)
            const getUserPreviousOffer = () => {
                if (!application.priceHistory || !Array.isArray(application.priceHistory)) {
                    return null;
                }
                const seekerPrices = application.priceHistory
                    .filter(entry => entry.setBy === 'seeker')
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                return seekerPrices.length > 0 ? seekerPrices[seekerPrices.length - 1].price : null;
            };
            
            const userPreviousOffer = getUserPreviousOffer();
            // Pre-fill with user's previous offer (not owner's counter)
            const priceToUse = userPreviousOffer || property?.price || '';
            const messageToUse = application.message || '';
            setValue('proposedPrice', priceToUse);
            setValue('message', messageToUse);
        }
    }, [isOpen, application, property?.price, setValue]);

    if (!isOpen || !application || !property) return null;

    const onSubmit = async (data) => {
        try {
            setIsSubmitting(true);
            const token = await user.getIdToken();
            const revisedPrice = Number(data.proposedPrice);

            if (revisedPrice <= lastSeekerPrice) {
                showToast(`Revised offer must be greater than ${lastSeekerPrice.toLocaleString()}`, 'error');
                return;
            }

            if (revisedPrice >= lastOwnerPrice) {
                showToast(`Revised offer must be less than ${lastOwnerPrice.toLocaleString()}`, 'error');
                return;
            }

            // Revise offer by updating the application with new price, message and setting status back to pending
            await axios.patch(`/application/${application._id}/revise`, {
                proposedPrice: revisedPrice,
                message: data.message || ''
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            showToast('Offer revised successfully!', 'success');
            reset();
            onClose();
            
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['my-applications', user?.email] });
            queryClient.invalidateQueries({ queryKey: ['property-applications', property._id] });
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to revise offer';
            showToast(errorMessage, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-11/12 max-w-md mx-auto max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-center justify-between rounded-t-lg">
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Revise Your Offer</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">
                    {/* Proposed Price */}
                    <div>
                        <label className="text-sm font-bold text-gray-700 mb-2">
                            Your New Offer <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder={`Enter your offer (${property.listingType === 'rent' ? 'per month' : 'total'})`}
                            {...register("proposedPrice", {
                                required: "Price is required",
                                min: {
                                    value: lastSeekerPrice + Number.EPSILON,
                                    message: `Revised offer must be greater than ${lastSeekerPrice.toLocaleString()}`
                                },
                                validate: (value) => Number(value) < lastOwnerPrice || `Revised offer must be less than ${lastOwnerPrice.toLocaleString()}`
                            })}
                            className="w-full bg-white border border-gray-200 rounded-md px-4 py-3 text-gray-800 focus:border-orange-500 outline-none transition-all"
                        />
                        {errors.proposedPrice && (
                            <p className="text-red-500 text-xs mt-1">{errors.proposedPrice.message}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                            Allowed range: more than {"\u09F3"}{lastSeekerPrice.toLocaleString()} and less than {"\u09F3"}{lastOwnerPrice.toLocaleString()}
                        </p>
                    </div>

                    {/* Message */}
                    <div>
                        <label className="text-sm font-bold text-gray-700 mb-2">
                            Message (Optional)
                        </label>
                        <textarea
                            rows={4}
                            placeholder="Add a message to accompany your revised offer..."
                            {...register("message")}
                            className="w-full bg-white border border-gray-200 rounded-md px-4 py-3 text-gray-800 focus:border-orange-500 outline-none transition-all resize-none"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            You can update your message to reflect your revised offer
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-md font-bold uppercase text-xs tracking-wider hover:bg-gray-200 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-md font-bold uppercase text-xs tracking-wider hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Revising...
                                </>
                            ) : (
                                'Revise Offer'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReviseOfferModal;

