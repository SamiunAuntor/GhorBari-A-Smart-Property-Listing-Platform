import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import MyPropertyCard from './MyPropertyCard';
import MyRequestedProperties from './MyRequestedProperties';
import useAuth from '../../Hooks/useAuth';
import useAxios from '../../Hooks/useAxios';
import { PlusCircle, Building2, Activity, Loader2, FileText, Handshake } from 'lucide-react';

const ListProperty = () => {
    const { user } = useAuth();
    const axios = useAxios();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('listings');

    // Fetch User Listings
    const { data: properties = [], isLoading: propertiesLoading } = useQuery({
        queryKey: ['my-properties', user?.email],
        queryFn: async () => {
            if (!user) return [];

            const token = await user.getIdToken(); // get Firebase token

            const res = await axios.get(`/my-properties?email=${user.email}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            return res.data;
        },
    });

    // Fetch User Applications
    const { data: applications = [], isLoading: applicationsLoading } = useQuery({
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


    const ownerSuccessfulDeals = properties?.filter(
        (property) => property?.status === 'sold' || property?.status === 'rented'
    ).length || 0;

    const seekerSuccessfulDeals = applications?.filter(
        (application) => application?.status === 'completed'
    ).length || 0;

    const stats = [
        {
            label: "Total Properties Listed",
            value: properties?.length || 0,
            icon: Building2,
            iconClass: "text-orange-600",
            iconBg: "bg-orange-50"
        },
        {
            label: "Active Listings",
            value: properties?.filter(p => p.status === 'active').length || 0,
            icon: Activity,
            iconClass: "text-emerald-600",
            iconBg: "bg-emerald-50"
        },
        {
            label: "Total Successful Deals",
            value: ownerSuccessfulDeals + seekerSuccessfulDeals,
            icon: Handshake,
            iconClass: "text-sky-600",
            iconBg: "bg-sky-50"
        },
        {
            label: "My Applications",
            value: applications?.length || 0,
            icon: FileText,
            iconClass: "text-amber-600",
            iconBg: "bg-amber-50"
        },
    ];

    return (
        <div className="bg-gray-100 min-h-screen py-12">
            <div className="w-11/12 mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">
                            My <span className="bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">Properties</span>
                        </h1>
                    </div>
                    <button
                        onClick={() => navigate('/add-property')}
                        className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg font-bold uppercase tracking-widest shadow-lg shadow-orange-200 hover:shadow-orange-300 active:scale-95 transition-all"
                    >
                        <PlusCircle size={20} /> Add New Property
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                    {stats.map((stat, i) => (
                        <article
                            key={i}
                            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
                        >
                            <div className="mb-5 flex items-center justify-center">
                                <div className={`h-12 w-12 rounded-xl ${stat.iconBg} ring-1 ring-black/5 flex items-center justify-center`}>
                                    <stat.icon className={stat.iconClass} size={22} />
                                </div>
                            </div>

                            <div className="space-y-1 text-center">
                                <p className="text-sm font-medium text-gray-500">
                                    {stat.label}
                                </p>
                                <div className="text-4xl font-extrabold leading-none text-gray-900">
                                    {stat.value}
                                </div>
                            </div>

                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-orange-500/0 via-orange-500/60 to-orange-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        </article>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                    {activeTab === 'listings' ? (
                        <>
                            <div className="flex items-center justify-between gap-4 mb-6">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                                    My Listings ({properties.length || 0})
                                </h2>
                                <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setActiveTab('listings')}
                                            className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                                                activeTab === 'listings'
                                                    ? 'bg-orange-500 text-white shadow-inner'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                            }`}
                                        >
                                            My Listings
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('requests')}
                                            className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                                                activeTab === 'requests'
                                                    ? 'bg-orange-500 text-white shadow-inner'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                            }`}
                                        >
                                            My Requested Properties
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {propertiesLoading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Loader2 className="animate-spin text-orange-500 mb-4" size={40} />
                                    <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Loading Listings...</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto sm:overflow-visible pb-2">
                                    <div className="grid grid-cols-1 gap-6 min-w-[680px] sm:min-w-0">
                                        {properties.length > 0 ? (
                                            properties.map(property => (
                                                <MyPropertyCard key={property._id} property={property} />
                                            ))
                                        ) : (
                                            <div className="col-span-full text-center py-20 border-2 border-dashed border-gray-100 rounded-lg">
                                                <p className="text-gray-400 font-medium">No properties found. Start by adding one!</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-between gap-4 mb-6">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                                    My Requested Properties ({applications.length || 0})
                                </h2>
                                <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setActiveTab('listings')}
                                            className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                                                activeTab === 'listings'
                                                    ? 'bg-orange-500 text-white shadow-inner'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                            }`}
                                        >
                                            My Listings
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('requests')}
                                            className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                                                activeTab === 'requests'
                                                    ? 'bg-orange-500 text-white shadow-inner'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                            }`}
                                        >
                                            My Requested Properties
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <MyRequestedProperties />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ListProperty;
