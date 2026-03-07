import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
    Mail,
    ShieldCheck,
    ShieldAlert,
    Star,
    Award,
    Phone,
    MessageSquare,
    Quote,
    UserRound,
    BadgeCheck
} from 'lucide-react';
import useAxios from '../../Hooks/useAxios';
import useAuth from '../../Hooks/useAuth';
import Loading from '../../Components/Loading';
import { showToast } from '../../Utilities/ToastMessage';

const fallbackProfileImage = 'https://i.ibb.co/5GzXpdx/default-user.png';

const PublicUserProfile = () => {
    const { email } = useParams();
    const navigate = useNavigate();
    const axios = useAxios();
    const { user: authUser } = useAuth();
    const [messageLoading, setMessageLoading] = useState(false);

    const getAuthHeaders = async () => {
        const token = await authUser?.getIdToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const { data: profile, isLoading, error } = useQuery({
        queryKey: ['public-profile', email],
        queryFn: async () => {
            const res = await axios.get(`/public-profile/${email}`, {
                headers: await getAuthHeaders()
            });
            return res.data;
        },
        enabled: !!email && !!authUser
    });

    const { data: ratingsData } = useQuery({
        queryKey: ['public-profile-ratings', email],
        queryFn: async () => {
            const res = await axios.get(`/ratings/received/${email}?limit=8`, {
                headers: await getAuthHeaders()
            });
            return res.data;
        },
        enabled: !!email && !!authUser
    });

    const { data: messageStatus, isLoading: messageStatusLoading } = useQuery({
        queryKey: ['public-profile-message-status', email],
        queryFn: async () => {
            const res = await axios.get(`/public-profile/${email}/message-status`, {
                headers: await getAuthHeaders()
            });
            return res.data;
        },
        enabled: !!email && !!authUser
    });

    const reviews = ratingsData?.ratings || [];
    const receivedAggregate = ratingsData?.aggregate || profile?.rating || { totalRatings: 0, ratingCount: 0, average: 0 };
    const ratingAverage = Number(receivedAggregate?.average ?? 0).toFixed(1);
    const ratingCount = receivedAggregate?.ratingCount ?? 0;
    const isVerified = profile?.nidVerified === 'verified';
    const joinedLabel = useMemo(() => {
        if (!profile?.createdAt) return 'Unknown';
        return new Date(profile.createdAt).toLocaleDateString('en-GB', {
            month: 'long',
            year: 'numeric'
        });
    }, [profile?.createdAt]);

    const handleSendMessage = async () => {
        if (!messageStatus?.canMessage || !messageStatus?.applicationId) {
            showToast(
                messageStatus?.message || 'Messaging is available after one of your deals goes in progress with this user.',
                'error'
            );
            return;
        }

        setMessageLoading(true);
        navigate(`/chat?applicationId=${messageStatus.applicationId}`);
    };

    if (isLoading) return <Loading />;

    if (error || !profile) {
        return (
            <div className="h-screen flex items-center justify-center font-black text-2xl">
                <ShieldAlert className="mr-2 text-rose-500" />
                PROFILE NOT FOUND
            </div>
        );
    }

    return (
        <div className="w-11/12 mx-auto my-10 max-w-7xl">
            <div className="grid grid-cols-1 xl:grid-cols-[0.92fr_1.08fr] gap-8 items-start">
                <aside className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 lg:p-7 sticky top-24">
                    <div className="flex items-start gap-5">
                        <img
                            src={profile.profileImage || fallbackProfileImage}
                            alt={profile.name}
                            className="w-24 h-24 rounded-2xl object-cover border border-gray-200 shadow-sm"
                        />
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h1 className="text-3xl font-black text-[#1f2937] leading-tight">{profile.name}</h1>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.18em] border ${isVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                                    {isVerified ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                                    {isVerified ? 'Verified' : 'Unverified'}
                                </span>
                            </div>
                            <p className="text-sm text-[#67748e] font-medium">Member since {joinedLabel}</p>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-md border border-amber-100 bg-amber-50 px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-amber-700 mb-1">
                                <Star size={16} className="fill-amber-400 text-amber-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.18em]">Rating</span>
                            </div>
                            <p className="text-2xl font-black text-[#1f2937]">{ratingAverage}</p>
                        </div>
                        <div className="rounded-md border border-violet-100 bg-violet-50 px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-violet-700 mb-1">
                                <Quote size={16} />
                                <span className="text-[10px] font-black uppercase tracking-[0.18em]">Total Reviews</span>
                            </div>
                            <p className="text-2xl font-black text-[#1f2937]">{ratingCount}</p>
                        </div>
                        <div className="rounded-md border border-sky-100 bg-sky-50 px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-sky-700 mb-1">
                                <Award size={16} />
                                <span className="text-[10px] font-black uppercase tracking-[0.18em]">Role</span>
                            </div>
                            <p className="text-sm font-black text-[#1f2937] capitalize">{(profile.role || 'user').replace(/_/g, ' ' )}</p>
                        </div>
                    </div>
                    <div className="mt-6 space-y-4">
                        <div className="flex items-start gap-3 rounded-md border border-gray-100 bg-gray-50 px-4 py-3">
                            <div className="p-2 rounded-md bg-white text-orange-600 border border-orange-100"><Mail size={16} /></div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1">Email</p>
                                <p className="text-sm font-bold text-[#1f2937] break-all">{profile.email}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 rounded-md border border-gray-100 bg-gray-50 px-4 py-3">
                            <div className="p-2 rounded-md bg-white text-blue-600 border border-blue-100"><Phone size={16} /></div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1">Phone</p>
                                <p className="text-sm font-bold text-[#1f2937]">{profile.phone || 'Not provided'}</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSendMessage}
                        disabled={messageLoading || messageStatusLoading}
                        className="mt-6 w-full flex items-center justify-center gap-2 rounded-md bg-[#f97316] px-4 py-3 text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-[#ea580c] transition-all disabled:opacity-70"
                    >
                        <MessageSquare size={16} />
                        {messageLoading ? 'Opening Inbox...' : 'Send Message'}
                    </button>
                    <p className="mt-3 text-xs text-[#67748e] leading-5">
                        {messageStatus?.canMessage
                            ? 'Messaging is available because one of your deals with this user is currently in progress.'
                            : 'Messaging becomes available after one of your deals with this user goes in progress.'}
                    </p>
                </aside>

                <section className="space-y-6">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 rounded-md bg-orange-50 text-orange-600 border border-orange-100"><Quote size={18} /></div>
                            <div>
                                <h2 className="text-lg font-black text-[#1f2937] uppercase tracking-[0.14em]">Received Ratings and Reviews</h2>
                                <p className="text-sm text-[#67748e] font-medium mt-1">Recent feedback left by other users after completed or cancelled deals.</p>
                            </div>
                        </div>

                        {reviews.length === 0 ? (
                            <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
                                <UserRound size={40} className="mx-auto text-gray-300 mb-3" />
                                <p className="text-sm font-bold text-gray-500">No reviews yet</p>
                                <p className="text-xs text-gray-400 mt-1">Reviews will appear here after other users rate completed or cancelled deals.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {reviews.map((review) => (
                                    <article key={review._id} className="rounded-md border border-gray-200 bg-gray-50 px-5 py-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <img
                                                    src={review.rater?.profileImage || fallbackProfileImage}
                                                    alt={review.rater?.name || 'Reviewer'}
                                                    className="w-11 h-11 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                                                />
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-bold text-[#1f2937] truncate">{review.rater?.name || 'User'}</p>
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">
                                                            <Star size={10} className="fill-amber-400 text-amber-400" />
                                                            {Number(review.score || 0).toFixed(1)}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#67748e]">
                                                        <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                                                        <span className="text-gray-300">|</span>
                                                        <span className="font-medium">{review.propertyTitle || 'Property'}</span>
                                                        {review.roleContext && (
                                                            <>
                                                                <span className="text-gray-300">|</span>
                                                                <span className="capitalize">{review.roleContext.replace(/_/g, ' ')}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <BadgeCheck size={16} className="text-gray-300 flex-shrink-0 mt-1" />
                                        </div>
                                        <p className="mt-3 text-sm leading-6 text-[#374151]">
                                            {review.review?.trim() || 'No written review was added for this rating.'}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default PublicUserProfile;
