import React, { useState, useEffect } from 'react';
import { uploadImageToImgBB } from "../../Utilities/UploadImage";
import useAxios from '../../Hooks/useAxios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useAuth from '../../Hooks/useAuth';
import {
    User, Mail, Phone, ShieldCheck, ShieldAlert,
    Calendar, Star, Camera, Check, X, UploadCloud, Loader2, XCircle, Settings, Award, Clock
} from 'lucide-react';
import Swal from 'sweetalert2';
import { showToast } from '../../Utilities/ToastMessage';
import Loading from '../../Components/Loading';

const ProfilePage = () => {
    const { user: authUser, updateUserProfile } = useAuth();
    const axios = useAxios();
    const queryClient = useQueryClient();

    // UI States
    const [isEditing, setIsEditing] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);


    // Form State
    const [formData, setFormData] = useState({ name: '', phone: '', profileImage: '' });

    // Fetch User Data
    const { data: user, isLoading, error } = useQuery({
        queryKey: ['user-profile', authUser?.email],
        enabled: !!authUser,
        queryFn: async () => {
            const token = await authUser.getIdToken();
            const res = await axios.get(`/user-profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data;
        }
    });

    useEffect(() => {
        if (user) {
            const rawPhone = user.phone || '';
            let localPhone = '';
            if (rawPhone.startsWith('+88')) {
                localPhone = rawPhone.slice(3);
            } else {
                localPhone = rawPhone;
            }

            setFormData({
                name: user.name || '',
                phone: localPhone,
                profileImage: user.profileImage || ''
            });
        }
    }, [user]);

    // Mutation: Update Profile (DB + Firebase)
    const updateProfile = useMutation({
        mutationFn: async (newData) => {
            const token = await authUser.getIdToken();

            const phoneDigits = (newData.phone || "").trim();
            const fullPhone = phoneDigits ? `+88${phoneDigits}` : "";

            // 1. Update Firebase Auth Profile
            await updateUserProfile({
                displayName: newData.name,
                photoURL: newData.profileImage
            });

            // 2. Update Backend Database
            return axios.patch('/update-profile', {
                name: newData.name,
                phone: fullPhone,
                profileImage: newData.profileImage
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['user-profile']);
            setIsEditing(false);
            showToast("Profile updated successfully!", "success");
        },
        onError: (err) => {
            console.error(err);
            showToast("Failed to update profile", "error");
        }
    });

    const handleUpdateClick = () => {
        Swal.fire({
            title: "Confirm Changes?",
            text: "This will update your profile across the entire platform.",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#ea580c",
            cancelButtonColor: "#64748b",
            confirmButtonText: "Yes, Update it!"
        }).then((result) => {
            if (result.isConfirmed) {
                const phone = (formData.phone || "").trim();
                if (phone && !/^\d{11}$/.test(phone)) {
                    showToast("Phone number must be exactly 11 digits", "error");
                    return;
                }
                updateProfile.mutate(formData);
            }
        });
    };

    const handleProfilePicChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await uploadImageToImgBB(file);
            setFormData(prev => ({ ...prev, profileImage: url }));
            showToast("Photo uploaded! Save to apply changes.", "success");
        } catch (err) {
            showToast("Image upload failed", "error");
        } finally {
            setUploading(false);
        }
    };

    const handleNIDSubmit = async (e) => {
        e.preventDefault();

        const nidNumber = e.target.nidNumber?.value?.trim();
        const front = e.target.nidFront?.files?.[0] || null;
        const back = e.target.nidBack?.files?.[0] || null;

        if (!nidNumber) {
            return showToast("NID number is required", "error");
        }

        setUploading(true);
        try {
            const nidImages = [];

            if (front) {
                const frontUrl = await uploadImageToImgBB(front);
                if (frontUrl) nidImages.push(frontUrl);
            }

            if (back) {
                const backUrl = await uploadImageToImgBB(back);
                if (backUrl) nidImages.push(backUrl);
            }

            const token = await authUser.getIdToken();
            await axios.post('/submit-nid', { nidNumber, nidImages }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            queryClient.invalidateQueries(['user-profile']);
            setIsVerifying(false);
            showToast("NID submitted for review", "success");
        } catch (err) {
            showToast(err?.response?.data?.message || "NID submission failed", "error");
        } finally {
            setUploading(false);
        }
    };

    if (error) return (
        <div className="h-[70vh] flex flex-col items-center justify-center text-center p-6">
            <XCircle className="text-red-500 mb-4" size={50} />
            <h2 className="text-2xl font-black text-gray-800">Authorization Failed</h2>
            <button onClick={() => window.location.reload()} className="mt-4 px-8 py-3 bg-orange-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Retry</button>
        </div>
    );

    // LAND AT TOP & FORCED INITIAL LOADING (0.25s)
    useEffect(() => {
        window.scrollTo(0, 0);
        const timer = setTimeout(() => {
            setInitialLoading(false);
        }, 250);
        return () => clearTimeout(timer);
    }, []);

    if (isLoading || !user || initialLoading) return (
        <Loading></Loading>
    );

    const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
    const lastUpdate = user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never';

    return (
        <div className="w-[92%] mx-auto my-10 font-sans">
            {/* Page Title */}
            <div className="flex items-center gap-3 mb-8">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Profile <span className="text-orange-600">Overview</span></h1>
            </div>

            {/* Hero Header Section */}
            <div className="relative bg-[#1A1A2E] rounded-[2.5rem] p-8 md:p-12 mb-10 overflow-hidden shadow-2xl">
                <div className="relative flex flex-col md:flex-row items-center md:items-center gap-8">

                    {/* Avatar Container with Gradient Background */}
                    <div className="relative p-1 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-[2.8rem]">
                        <div className="relative group">
                            <img
                                src={formData.profileImage || "https://i.ibb.co/5GzXpdx/default-user.png"}
                                className={`w-40 h-40 rounded-[2.5rem] object-cover border-4 border-[#1A1A2E] shadow-2xl transition-all ${uploading ? 'opacity-50' : ''}`}
                                alt="Profile"
                            />
                            {isEditing && (
                                <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-[2.5rem] cursor-pointer opacity-0 group-hover:opacity-100 transition-all border-2 border-dashed border-orange-400">
                                    <Camera className="text-white mb-2" size={32} />
                                    <span className="text-[10px] text-white font-black uppercase tracking-tighter">Change Photo</span>
                                    <input type="file" className="hidden" onChange={handleProfilePicChange} />
                                </label>
                            )}
                            {uploading && <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-spin" size={32} />}
                        </div>

                        {/* Status Badge */}
                        <div className="absolute -bottom-2 -right-2">
                            {user?.nidVerified ? (
                                <span className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-full border-2 border-[#1A1A2E] shadow-lg">
                                    <ShieldCheck size={12} /> Verified
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-500 text-white text-[10px] font-black uppercase rounded-full border-2 border-[#1A1A2E] shadow-lg">
                                    <ShieldAlert size={12} /> Unverified
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Name & Quick Info (Email + Phone) */}
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-4xl font-black text-white mb-3">{user.name || "User Name"}</h2>
                        <div className="flex flex-col gap-2">
                            <span className="flex items-center justify-center md:justify-start gap-2 text-gray-400 font-medium">
                                <Mail size={16} className="text-orange-400" /> {user.email}
                            </span>
                            <span className="flex items-center justify-center md:justify-start gap-2 text-gray-400 font-medium">
                                <Phone size={16} className="text-orange-400" /> {user.phone || "No phone added"}
                            </span>
                        </div>
                    </div>

                    {/* Edit Actions */}
                    <div className="flex gap-3">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-8 py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl"
                            >
                                <Settings size={16} /> Edit Profile
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={handleUpdateClick}
                                    className="p-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 shadow-xl"
                                >
                                    <Check size={24} />
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setFormData({ name: user.name, phone: user.phone, profileImage: user.profileImage });
                                    }}
                                    className="p-4 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 shadow-xl"
                                >
                                    <X size={24} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Card 1: Personal Info */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><User size={20} /></div>
                        <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm">Personal Information</h3>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Full Name</label>
                            {isEditing ? (
                                <input
                                    className="w-full px-5 py-3 rounded-xl bg-gray-50 border-2 border-orange-100 focus:border-orange-500 outline-none font-bold transition-all"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            ) : (
                                <p className="text-lg font-black text-gray-800">{user.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Email Address</label>
                            <p className="text-lg font-bold text-gray-500 flex items-center gap-2">
                                {user.email} <span className="text-[9px] bg-gray-100 px-2 py-0.5 rounded text-gray-400 tracking-tighter font-black">NOT EDITABLE</span>
                            </p>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Phone Contact</label>
                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    <div className="px-4 py-3 rounded-xl bg-gray-100 border-2 border-orange-100 text-gray-700 text-sm font-bold select-none">
                                        +88
                                    </div>
                                    <input
                                        className="flex-1 px-5 py-3 rounded-xl bg-gray-50 border-2 border-orange-100 focus:border-orange-500 outline-none font-bold transition-all"
                                        value={formData.phone}
                                        maxLength={11}
                                        onChange={(e) => {
                                            const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                                            setFormData(prev => ({ ...prev, phone: digits }));
                                        }}
                                        placeholder="01XXXXXXXXX"
                                    />
                                </div>
                            ) : (
                                <p className="text-lg font-black text-gray-800 flex items-center gap-2">
                                    <Phone size={18} className="text-gray-400" /> {user.phone || "No phone added"}
                                </p>
                            )}
                        </div>

                        <div className="pt-4 flex items-center gap-4">
                            <div className="bg-orange-50 px-6 py-3 rounded-2xl flex flex-col">
                                <span className="text-[9px] font-black text-orange-400 uppercase">Platform Rating</span>
                                <div className="flex items-center gap-2">
                                    <Star size={16} className="text-orange-500 fill-orange-500" />
                                    <span className="text-xl font-black text-orange-700">{user?.rating?.average || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 2: System Insights */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><Award size={20} /></div>
                        <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm">Account Insights</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                        <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-2">System Role</p>
                            <p className="text-sm font-black text-gray-800 uppercase tracking-tight bg-white inline-block px-3 py-1 rounded-lg shadow-sm border border-gray-100">
                                {user?.role?.replace('_', ' ')}
                            </p>
                        </div>
                        <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Member Since</p>
                            <div className="flex items-center gap-2 text-gray-800 font-bold">
                                <Calendar size={14} className="text-gray-400" /> {memberSince}
                            </div>
                        </div>
                        <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 sm:col-span-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Last Profile Update</p>
                            <div className="flex items-center gap-2 text-gray-800 font-bold">
                                <Clock size={14} className="text-gray-400" /> {lastUpdate}
                            </div>
                        </div>
                    </div>

                    {/* NID Status */}
                    <div className="mt-auto">
                        {!user?.nidVerified && !user?.nidSubmittedAt ? (
                            <button
                                onClick={() => {
                                    if (!user?.phone || !String(user.phone).trim()) {
                                        showToast("Please add your phone number in your profile before applying for verification", "error");
                                        setIsEditing(true);
                                        return;
                                    }
                                    setIsVerifying(true);
                                }}
                                className="w-full py-4 bg-orange-50 text-orange-600 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 border-dashed border-orange-200 hover:bg-orange-100 transition-all"
                            >
                                Apply for Verification
                            </button>
                        ) : user?.nidSubmittedAt && !user?.nidVerified ? (
                            <div className="p-4 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 text-center">
                                <p className="font-black text-[10px] uppercase tracking-widest">Review in Progress</p>
                                <p className="text-[10px] font-bold opacity-80 mt-1">Manual review usually takes 24-48h</p>
                            </div>
                        ) : (
                            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 text-center flex items-center justify-center gap-2">
                                <ShieldCheck size={18} />
                                <p className="font-black text-[10px] uppercase">Identity Fully Verified</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Verification Form Section */}
            {isVerifying && (
                <div className="mt-10 animate-in slide-in-from-bottom-5 duration-500">
                    <form onSubmit={handleNIDSubmit} className="bg-[#1A1A2E] p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8">
                            <UploadCloud size={100} className="text-white/5" />
                        </div>

                        <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
                            Identity Verification
                        </h3>
                        <p className="text-gray-400 mb-10 text-sm font-medium">
                            Enter your National ID number. Uploading NID images is optional but recommended for manual review.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                            <div className="space-y-4 md:col-span-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">NID Number</label>
                                <input
                                    name="nidNumber"
                                    type="text"
                                    required
                                    className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="Enter your NID number"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">NID Front Side (optional)</label>
                                <input name="nidFront" type="file" className="block w-full text-xs text-gray-400 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-orange-600 file:text-white bg-white/5 border border-white/10 p-4 rounded-2xl focus:outline-none" />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">NID Back Side (optional)</label>
                                <input name="nidBack" type="file" className="block w-full text-xs text-gray-400 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-orange-600 file:text-white bg-white/5 border border-white/10 p-4 rounded-2xl focus:outline-none" />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                            <button
                                disabled={uploading}
                                type="submit"
                                className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {uploading ? "Uploading..." : "Submit Verification"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsVerifying(false)}
                                className="px-10 py-4 bg-white/5 text-gray-400 rounded-2xl font-black uppercase text-xs tracking-widest border border-white/10 hover:bg-white/10 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;