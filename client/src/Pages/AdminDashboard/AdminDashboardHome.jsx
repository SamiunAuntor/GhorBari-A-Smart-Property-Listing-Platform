import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, CheckCircle, Handshake, UserCheck } from 'lucide-react';
import useAxiosSecure from '../../Hooks/useAxiosSecure';

const AdminDashboardHome = () => {
    const axiosSecure = useAxiosSecure();

    // Fetch data from database
    const { data: stats } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const res = await axiosSecure.get('/admin/stats');
            return res.data;
        }
    });

    const statCards = [
        {
            label: 'Pending User Verifications',
            count: stats?.pendingVer || 0,
            icon: ShieldAlert,
            color: 'text-amber-600',
            bg: 'bg-amber-100'
        },

        {
            label: 'Active Property Listings',
            count: stats?.activeList || 0,
            icon: CheckCircle,
            color: 'text-emerald-600',
            bg: 'bg-emerald-100'
        },
        {
            label: 'Successful Deals',
            // Sum of Rented + Sold counts = Successful Deals
            count: (stats?.rentedCount || 0) + (stats?.soldCount || 0),
            icon: Handshake,
            color: 'text-purple-600',
            bg: 'bg-purple-100'
        },
        {
            label: 'Verified Users',
            count: stats?.verifiedUsers || 0,
            icon: UserCheck,
            color: 'text-sky-600',
            bg: 'bg-sky-100'
        },
    ];

    return (
        <div className="space-y-10 animate-in fade-in duration-500 p-4">

            {/* Welcome Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-[#344767] uppercase tracking-tight">
                    GhorBari Admin Dashboard
                </h1>
                <p className="text-[#67748e] text-sm font-medium">
                    Overview of system performance and pending administrative tasks.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center text-center">
                        <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
                            <stat.icon size={24} />
                        </div>
                        <p className="text-[#adb5bd] text-[11px] font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                        <h3 className="text-3xl font-bold text-[#344767]">{stat.count}</h3>
                    </div>
                ))}
            </div>

        </div>
    );
};

export default AdminDashboardHome;
