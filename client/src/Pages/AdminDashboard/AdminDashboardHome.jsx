import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, CheckCircle, Handshake, UserCheck } from 'lucide-react';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    LineChart,
    Line,
    AreaChart,
    Area
} from 'recharts';
import useAxiosSecure from '../../Hooks/useAxiosSecure';

const STATUS_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#64748b'];
const VERIFICATION_COLORS = ['#94a3b8', '#f59e0b', '#10b981', '#ef4444'];
const PERIOD_OPTIONS = ['daily', 'weekly', 'monthly'];

const chartCardClass = 'bg-white rounded-2xl shadow-sm border border-gray-200 p-6';

const ChartHeader = ({ title, subtitle }) => (
    <div className="mb-5">
        <h3 className="text-sm font-black text-[#344767] uppercase tracking-wider">{title}</h3>
        <p className="text-xs text-[#67748e] font-medium mt-1">{subtitle}</p>
    </div>
);

const AdminDashboardHome = () => {
    const axiosSecure = useAxiosSecure();
    const [trendPeriod, setTrendPeriod] = useState('daily');

    const { data: stats } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const res = await axiosSecure.get('/admin/stats');
            return res.data;
        }
    });

    const { data: insights, isLoading: insightsLoading } = useQuery({
        queryKey: ['admin-dashboard-insights', trendPeriod],
        queryFn: async () => {
            const res = await axiosSecure.get(`/admin/dashboard-insights?period=${trendPeriod}`);
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
        }
    ];

    const renderPeriodToggle = () => (
        <div className="flex items-center gap-2 bg-[#f8fafc] border border-gray-200 rounded-xl p-1 w-fit">
            {PERIOD_OPTIONS.map((period) => (
                <button
                    key={period}
                    type="button"
                    onClick={() => setTrendPeriod(period)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                        trendPeriod === period
                            ? 'bg-[#344767] text-white shadow-sm'
                            : 'text-[#67748e] hover:bg-white'
                    }`}
                >
                    {period}
                </button>
            ))}
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in duration-500 p-4 overflow-x-hidden">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-[#344767] uppercase tracking-tight">
                    GhorBari Admin Dashboard
                </h1>
                <p className="text-[#67748e] text-sm font-medium">
                    Overview of system performance and marketplace insights.
                </p>
            </div>

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

            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-black text-[#344767] uppercase tracking-tight">System Insights</h2>
                    <p className="text-sm text-[#67748e] font-medium">Operational breakdowns and time-based platform trends.</p>
                </div>
                {renderPeriodToggle()}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className={chartCardClass}>
                    <ChartHeader
                        title="Listing Status Breakdown"
                        subtitle="Active, in-progress, sold, rented, and hidden listings."
                    />
                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={insights?.listingStatus || []}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={72}
                                    outerRadius={110}
                                    paddingAngle={3}
                                >
                                    {(insights?.listingStatus || []).map((entry, index) => (
                                        <Cell key={entry.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={chartCardClass}>
                    <ChartHeader
                        title="Verification Funnel"
                        subtitle="Current user verification state distribution."
                    />
                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={insights?.verificationStates || []} barSize={42}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                                    {(insights?.verificationStates || []).map((entry, index) => (
                                        <Cell key={entry.name} fill={VERIFICATION_COLORS[index % VERIFICATION_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={chartCardClass}>
                    <ChartHeader
                        title="Deal Trend"
                        subtitle={`Sold vs rented outcomes grouped ${trendPeriod}.`}
                    />
                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={insights?.dealTrend || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="sold" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="rented" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={chartCardClass}>
                    <ChartHeader
                        title="User Registration Trend"
                        subtitle={`New user signups grouped ${trendPeriod}.`}
                    />
                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={insights?.registrationTrend || []}>
                                <defs>
                                    <linearGradient id="registrationFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Area type="monotone" dataKey="registrations" stroke="#f97316" strokeWidth={3} fill="url(#registrationFill)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {insightsLoading && (
                <p className="text-sm font-medium text-[#67748e]">Loading chart insights...</p>
            )}
        </div>
    );
};

export default AdminDashboardHome;
