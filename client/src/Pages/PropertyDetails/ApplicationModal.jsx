import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, FileText, Loader2 } from 'lucide-react';
import useAxios from '../../Hooks/useAxios';
import useAuth from '../../Hooks/useAuth';
import { showToast } from '../../Utilities/ToastMessage';
import { useQueryClient } from '@tanstack/react-query';

const ApplicationModal = ({ isOpen, onClose, property }) => {
    const { user } = useAuth();
    const axios = useAxios();
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const listingPrice = Number(property?.price || 0);
    const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm({
        defaultValues: {
            proposedPrice: property?.price || ''
        }
    });

    // Auto-fill price when modal opens or property changes
    React.useEffect(() => {
        if (isOpen && property?.price) {
            setValue('proposedPrice', property.price);
        }
    }, [isOpen, property?.price, setValue]);

    if (!isOpen || !property) return null;

    const onSubmit = async (data) => {
        try {
            setIsSubmitting(true);
            const token = await user.getIdToken();
            const offerPrice = Number(data.proposedPrice);

            if (offerPrice > listingPrice) {
                showToast(`Offer price cannot exceed the listing price of ${listingPrice.toLocaleString()}`, 'error');
                return;
            }

            const payload = {
                propertyId: property._id,
                proposedPrice: offerPrice,
                message: data.message || ""
            };

            await axios.post('/application', payload, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            showToast('Application submitted successfully!', 'success');
            reset();
            onClose();
            
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['my-applications', user?.email] });
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to submit application';
            showToast(errorMessage, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10050] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-11/12 max-w-2xl mx-auto max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-[2.5rem]">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">Submit Application</h2>
                        <p className="text-sm text-gray-500 mt-1">{property.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    {/* Property Info */}
                    <div className="bg-gray-50 rounded-md p-4 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-gray-500 uppercase">Listing Price</span>
                            <span className="text-xl font-black text-gray-900">
                                ৳{property.price?.toLocaleString()}
                                <span className="text-sm font-medium text-gray-400">
                                    /{property.listingType === 'rent' ? 'month' : 'total'}
                                </span>
                            </span>
                        </div>
                    </div>

                    {/* Proposed Price */}
                    <div>
                        <label className="text-sm font-bold text-gray-700 mb-2">
                            Your Offer Price <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder={`Enter your offer (${property.listingType === 'rent' ? 'per month' : 'total'})`}
                            {...register("proposedPrice", {
                                required: "Price is required",
                                min: {
                                    value: 1,
                                    message: "Price must be greater than 0"
                                },
                                validate: (value) => Number(value) <= listingPrice || `Offer price cannot exceed the listing price of ${listingPrice.toLocaleString()}`
                            })}
                            className="w-full bg-white border border-gray-200 rounded-md px-4 py-3 text-gray-800 focus:border-orange-500 outline-none transition-all"
                        />
                        {errors.proposedPrice && (
                            <p className="text-red-500 text-xs mt-1">{errors.proposedPrice.message}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                            Price is pre-filled with the listing price. Your offer can be any positive amount up to {"\u09F3"}{listingPrice.toLocaleString()}.
                        </p>
                    </div>

                    {/* Message */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <FileText size={16} className="text-orange-500" />
                            Message (Optional)
                        </label>
                        <textarea
                            rows={4}
                            placeholder="Add a personal message to the property owner..."
                            {...register("message", {
                                maxLength: {
                                    value: 500,
                                    message: "Message must be less than 500 characters"
                                }
                            })}
                            className="w-full bg-white border border-gray-200 rounded-md px-4 py-3 text-gray-800 focus:border-orange-500 outline-none transition-all resize-none"
                        />
                        {errors.message && (
                            <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>
                        )}
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
                                    Submitting...
                                </>
                            ) : (
                                'Submit Application'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ApplicationModal;
