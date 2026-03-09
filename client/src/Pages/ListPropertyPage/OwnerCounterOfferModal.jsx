import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Send, Loader2, DollarSign, MessageSquare } from 'lucide-react';
import useAxios from '../../Hooks/useAxios';
import useAuth from '../../Hooks/useAuth';
import { showToast } from '../../Utilities/ToastMessage';

const OwnerCounterOfferModal = ({ isOpen, onClose, application, property, onSuccess }) => {
    const { user } = useAuth();
    const axios = useAxios();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const applicantOffer = Number(application?.proposedPrice || 0);
    const listingPrice = Number(property?.price || 0);
    const previousOwnerCounter = Array.isArray(application?.priceHistory)
        ? application.priceHistory
            .filter((entry) => entry?.setBy === 'owner' && Number(entry?.price) > 0)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .at(-1)?.price ?? null
        : null;
    
    const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm({
        defaultValues: {
            proposedPrice: application?.proposedPrice || property?.price || '',
            message: ''
        }
    });

    // Auto-fill price when modal opens
    React.useEffect(() => {
        if (isOpen && application && property) {
            const priceToUse = application.proposedPrice || property.price || '';
            setValue('proposedPrice', priceToUse);
            setValue('message', '');
        }
    }, [isOpen, application, property, setValue]);

    if (!isOpen || !application || !property) return null;

    const onSubmit = async (data) => {
        try {
            setIsSubmitting(true);
            const token = await user.getIdToken();
            const counterPrice = Number(data.proposedPrice);

            if (counterPrice <= applicantOffer) {
                showToast(`Counter offer must be greater than ${applicantOffer.toLocaleString()}`, 'error');
                return;
            }

            if (previousOwnerCounter !== null && counterPrice >= Number(previousOwnerCounter)) {
                showToast(`Counter offer must be less than ${Number(previousOwnerCounter).toLocaleString()}`, 'error');
                return;
            }

            if (counterPrice > listingPrice) {
                showToast(`Counter offer cannot exceed ${listingPrice.toLocaleString()}`, 'error');
                return;
            }
            
            await axios.patch(`/application/${application._id}`, {
                status: 'counter',
                proposedPrice: counterPrice,
                message: data.message || ''
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            showToast('Counter offer sent successfully!', 'success');
            reset();
            onClose();
            if (onSuccess) onSuccess();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to send counter offer', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-[3px] z-[60] flex items-start sm:items-center justify-center px-4 pt-20 sm:p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl mx-auto max-h-[92vh] sm:max-h-none overflow-y-auto shadow-2xl border border-gray-200">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-xl">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">Counter Offer</h2>
                        <p className="text-sm text-gray-500 mt-1">Enter your counter offer price and an optional message</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content - Landscape Layout */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Price Information & Input */}
                        <div className="space-y-6">
                            {/* Price Info Cards */}
                            <div className="space-y-3">
                                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Current Listed Price</span>
                                        <span className="text-xl font-black text-gray-900">
                                            ৳{property.price?.toLocaleString()}
                                            <span className="text-xs font-medium text-gray-500 ml-1">
                                                /{property.listingType === 'rent' ? 'month' : 'total'}
                                            </span>
                                        </span>
                                    </div>
                                </div>

                                {application.proposedPrice && (
                                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Applicant's Offer</span>
                                            <span className="text-xl font-black text-blue-700">
                                                ৳{application.proposedPrice.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Counter Price Input */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                    <DollarSign size={16} className="text-orange-500" />
                                    Counter Price <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder={`Enter price (${property.listingType === 'rent' ? 'per month' : 'total'})`}
                                    {...register("proposedPrice", {
                                        required: "Price is required",
                                        min: {
                                            value: applicantOffer + Number.EPSILON,
                                            message: `Counter offer must be greater than ${applicantOffer.toLocaleString()}`
                                        },
                                        validate: (value) => {
                                            const numericValue = Number(value);
                                            if (previousOwnerCounter !== null && numericValue >= Number(previousOwnerCounter)) {
                                                return `Counter offer must be less than ${Number(previousOwnerCounter).toLocaleString()}`;
                                            }
                                            return numericValue <= listingPrice || `Counter offer cannot exceed ${listingPrice.toLocaleString()}`;
                                        }
                                    })}
                                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-lg font-semibold"
                                />
                                {errors.proposedPrice && (
                                    <p className="text-red-500 text-xs mt-1">{errors.proposedPrice.message}</p>
                                )}
                                <p className="text-xs text-gray-400 mt-2">
                                    Allowed range: more than {"\u09F3"}{applicantOffer.toLocaleString()} and {previousOwnerCounter !== null ? <>less than {"\u09F3"}{Number(previousOwnerCounter).toLocaleString()}</> : <>up to {"\u09F3"}{listingPrice.toLocaleString()}</>}
                                </p>
                            </div>
                        </div>

                        {/* Right Column - Message Input */}
                        <div className="space-y-6">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                    <MessageSquare size={16} className="text-blue-500" />
                                    Message (Optional)
                                </label>
                                <textarea
                                    rows={8}
                                    placeholder="Explain your counter offer, terms, or conditions..."
                                    {...register("message", {
                                        maxLength: {
                                            value: 500,
                                            message: "Message must be less than 500 characters"
                                        }
                                    })}
                                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                                />
                                {errors.message && (
                                    <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>
                                )}
                                <p className="text-xs text-gray-400 mt-2">
                                    This message will be sent to the applicant along with your counter offer.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold uppercase text-xs tracking-wider hover:bg-gray-200 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 flex items-center justify-center gap-2 px-5 sm:px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold uppercase text-xs tracking-wider hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send size={16} />
                                    Send Counter Offer
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OwnerCounterOfferModal;

