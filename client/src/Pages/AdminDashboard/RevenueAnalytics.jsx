import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BadgeDollarSign, CreditCard, ChartPie, WalletCards } from 'lucide-react';
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
    Line
} from 'recharts';
import useAxiosSecure from '../../Hooks/useAxiosSecure';

const PERIOD_OPTIONS = ['daily', 'weekly', 'monthly'];
const chartCardClass = 'bg-white rounded-2xl shadow-sm border border-gray-200 p-6';
const MIX_COLORS = ['#10b981', '#f97316'];
const PAYMENT_STATUS_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#94a3b8'];

const ChartHeader = ({ title, subtitle }) => (
    <div className="mb-5">
        <h3 className="text-sm font-black text-[#344767] uppercase tracking-wider">{title}</h3>
        <p className="text-xs text-[#67748e] font-medium mt-1">{subtitle}</p>
    </div>
);

const formatCurrency = (value) => `Tk ${Number(value || 0).toLocaleString('en-BD')}`;

const RevenueAnalytics = () => {
    const axiosSecure = useAxiosSecure();
    const [period, setPeriod] = useState('daily');

    const { data, isLoading } = useQuery({
        queryKey: ['admin-revenue-insights', period],
        queryFn: async () => {
            const res = await axiosSecure.get(`/admin/revenue-insights?period=${period}`);
            return res.data;
        }
    });

    const summary = data?.summary || {};

    const statCards = [
        {
            label: 'Total Revenue',
            value: formatCurrency(summary.totalRevenue),
            icon: BadgeDollarSign,
            color: 'text-emerald-600',
            bg: 'bg-emerald-100'
        },
        {
            label: 'Paid Listings',
            value: summary.paidListings || 0,
            icon: CreditCard,
            color: 'text-orange-600',
            bg: 'bg-orange-100'
        },
        {
            label: 'Free Listings',
            value: summary.freeListings || 0,
            icon: ChartPie,
            color: 'text-sky-600',
            bg: 'bg-sky-100'
        },
        {
            label: 'Payment Success Rate',
            value: `${summary.successRate || 0}%`,
            icon: WalletCards,
            color: 'text-purple-600',
            bg: 'bg-purple-100'
        }
    ];

    return (
        <div className="space-y-10 animate-in fade-in duration-500 p-4 overflow-x-hidden">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-[#344767] uppercase tracking-tight">
                    Revenue Analytics
                </h1>
                <p className="text-[#67748e] text-sm font-medium">
                    Revenue performance, payment outcomes, and listing monetization trends.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat) => (
                    <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center text-center">
                        <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
                            <stat.icon size={24} />
                        </div>
                        <p className="text-[#adb5bd] text-[11px] font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                        <h3 className="text-3xl font-bold text-[#344767]">{stat.value}</h3>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-black text-[#344767] uppercase tracking-tight">Revenue Insights</h2>
                    <p className="text-sm text-[#67748e] font-medium">Track paid listing behavior, revenue, and payment outcomes.</p>
                </div>
                <div className="flex items-center gap-2 bg-[#f8fafc] border border-gray-200 rounded-xl p-1 w-fit">
                    {PERIOD_OPTIONS.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => setPeriod(option)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                                period === option
                                    ? 'bg-[#344767] text-white shadow-sm'
                                    : 'text-[#67748e] hover:bg-white'
                            }`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className={chartCardClass}>
                    <ChartHeader
                        title="Revenue Trend"
                        subtitle={`Revenue collected and paid listings grouped ${period}.`}
                    />
                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data?.revenueTrend || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value, name) => (
                                    name === 'revenue' ? formatCurrency(value) : value
                                )} />
                                <Legend />
                                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="paidListings" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={chartCardClass}>
                    <ChartHeader
                        title="Free vs Paid Listings"
                        subtitle="Current property mix by billing type."
                    />
                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data?.listingMix || []}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={72}
                                    outerRadius={110}
                                    paddingAngle={3}
                                >
                                    {(data?.listingMix || []).map((entry, index) => (
                                        <Cell key={entry.name} fill={MIX_COLORS[index % MIX_COLORS.length]} />
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
                        title="Payment Status Breakdown"
                        subtitle="All listing payment records grouped by current status."
                    />
                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.paymentStatusBreakdown || []} barSize={42}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                                    {(data?.paymentStatusBreakdown || []).map((entry, index) => (
                                        <Cell key={entry.name} fill={PAYMENT_STATUS_COLORS[index % PAYMENT_STATUS_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={chartCardClass}>
                    <ChartHeader
                        title="Recent Transactions"
                        subtitle="Latest paid, failed, cancelled, and pending listing payments."
                    />
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wider text-[#67748e]">
                                    <th className="py-3 pr-4">Owner</th>
                                    <th className="py-3 pr-4">Amount</th>
                                    <th className="py-3 pr-4">Status</th>
                                    <th className="py-3 pr-4">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data?.recentTransactions || []).length > 0 ? (
                                    data.recentTransactions.map((transaction) => (
                                        <tr key={transaction.id} className="border-b border-gray-100 last:border-b-0">
                                            <td className="py-3 pr-4 text-[#344767] font-medium">{transaction.ownerEmail}</td>
                                            <td className="py-3 pr-4 text-[#344767] font-semibold">{formatCurrency(transaction.amount)}</td>
                                            <td className="py-3 pr-4">
                                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#67748e]">
                                                    {transaction.status}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4 text-[#67748e]">
                                                {transaction.paidAt ? new Date(transaction.paidAt).toLocaleDateString('en-GB') : 'N/A'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-[#67748e]">
                                            No payment transactions found yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isLoading && (
                <p className="text-sm font-medium text-[#67748e]">Loading revenue insights...</p>
            )}
        </div>
    );
};

export default RevenueAnalytics;
