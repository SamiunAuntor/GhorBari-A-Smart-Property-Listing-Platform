import React, { useState } from 'react';
import { CreditCard, MapPin, RefreshCcw, TriangleAlert } from 'lucide-react';
import Swal from 'sweetalert2';
import useAxios from '../../Hooks/useAxios';
import useAuth from '../../Hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

const statusMeta = {
    payment_pending: {
        label: 'Payment Pending',
        className: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    payment_failed: {
        label: 'Payment Failed',
        className: 'bg-red-100 text-red-700 border-red-200'
    },
    payment_cancelled: {
        label: 'Payment Cancelled',
        className: 'bg-gray-100 text-gray-700 border-gray-200'
    }
};

const PendingPaymentDraftCard = ({ draft }) => {
    const axios = useAxios();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isRetrying, setIsRetrying] = useState(false);

    const meta = statusMeta[draft?.draftStatus] || statusMeta.payment_pending;

    const handleRetryPayment = async () => {
        try {
            setIsRetrying(true);
            const token = await user?.getIdToken();
            const { data } = await axios.post(`/api/payments/listing-drafts/${draft._id}/retry`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!data?.success || !data?.redirectUrl) {
                throw new Error(data?.message || 'Failed to start payment');
            }

            await queryClient.invalidateQueries({ queryKey: ['listing-drafts', user?.email] });
            window.location.href = data.redirectUrl;
        } catch (error) {
            Swal.fire({
                title: 'Payment Error',
                text: error?.response?.data?.message || error.message || 'Could not retry payment.',
                icon: 'error',
                confirmButtonColor: '#f97316'
            });
        } finally {
            setIsRetrying(false);
        }
    };

    return (
        <div className="bg-white border border-amber-200 rounded-lg overflow-hidden hover:shadow-md transition-all group flex flex-row">
            <div className="relative w-72 flex-shrink-0 p-4">
                <div className="relative w-full h-40 overflow-hidden bg-gray-100 rounded-lg">
                    <img
                        src={draft?.images?.[0] || "https://via.placeholder.com/400"}
                        alt={draft?.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2">
                        <div className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider shadow-sm border ${meta.className}`}>
                            {meta.label}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-4 flex flex-col justify-between">
                <div className="space-y-3">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1.5 line-clamp-2">
                            {draft?.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                            <MapPin size={14} className="text-orange-500 flex-shrink-0" />
                            <span className="line-clamp-1">{draft?.address?.street || 'Address not available'}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Listing Price</p>
                            <p className="text-xl font-black text-gray-900">৳{Number(draft?.price || 0).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Payment Due</p>
                            <p className="text-xl font-black text-orange-600">৳{Number(draft?.amount || 0).toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-100 px-3 py-3 text-sm text-amber-900">
                        <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                        <p>This draft is saved but will not be published until payment is completed successfully.</p>
                    </div>
                </div>
            </div>

            <div className="p-4 flex flex-col gap-2 border-l border-gray-100 justify-center">
                <button
                    onClick={handleRetryPayment}
                    disabled={isRetrying || !draft?.canRetryPayment}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-50 text-orange-600 rounded-md hover:bg-orange-100 transition-all text-sm font-semibold disabled:opacity-60"
                    title="Retry payment"
                >
                    {isRetrying ? <RefreshCcw size={16} className="animate-spin" /> : <CreditCard size={16} />}
                    <span>{isRetrying ? 'Redirecting...' : 'Pay Now'}</span>
                </button>
            </div>
        </div>
    );
};

export default PendingPaymentDraftCard;
