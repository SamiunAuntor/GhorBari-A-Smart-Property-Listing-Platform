import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router';
import {
    LayoutDashboard,
    Home,
    UserCheck,
    LogOut,
    Users,
    Layers,
    BadgeDollarSign,
    Menu,
    X
} from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import { useQuery } from '@tanstack/react-query';
import useAuth from '../Hooks/useAuth';
import useAxiosSecure from '../Hooks/useAxiosSecure';
import { showToast } from '../Utilities/ToastMessage';

const DashboardLayout = () => {
    // Destructure logoutUser
    const { user, logoutUser } = useAuth();
    const navigate = useNavigate();
    const axiosSecure = useAxiosSecure();
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [showTooltips, setShowTooltips] = useState(() => window.innerWidth >= 768);

    const { data: pendingUsers = [] } = useQuery({
        queryKey: ['pending-users'],
        queryFn: async () => {
            const res = await axiosSecure.get('/admin/pending-verifications');
            return res.data;
        },
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    const handleLogout = async () => {
        try {
            // Calling the logout function from authProvider
            await logoutUser();
            showToast("Logged out successfully", "success");
            navigate('/');
        } catch (error) {
            console.error("Logout Error:", error);
            showToast("Failed to sign out", "error");
        }
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Admin Dashboard', path: '/admin-dashboard', badge: null },
        { icon: BadgeDollarSign, label: 'Revenue Analytics', path: '/admin-dashboard/revenue', badge: null },
        { icon: UserCheck, label: 'Pending User Verifications', path: '/admin-dashboard/pending-verifications', badge: pendingUsers.length },
        { icon: Users, label: 'All Users', path: '/admin-dashboard/all-users', badge: null },
        { icon: Layers, label: 'All Property Listings', path: '/admin-dashboard/all-properties', badge: null },
    ];

    useEffect(() => {
        document.body.style.overflow = mobileSidebarOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileSidebarOpen]);

    useEffect(() => {
        const handleResize = () => setShowTooltips(window.innerWidth >= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const dismissTooltip = (event) => {
        event?.currentTarget?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            {mobileSidebarOpen && (
                <button
                    type="button"
                    aria-label="Close sidebar backdrop"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="md:hidden fixed inset-0 bg-black/40 z-40"
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed md:static inset-y-0 left-0 z-50 md:z-auto w-20 flex flex-col items-center py-8 bg-[#1A1A2E] text-white shadow-2xl shrink-0 transform transition-transform duration-300 ${
                mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}>
                

                {/* Nav Links */}
                <nav className="flex-1 flex flex-col gap-6">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end
                            data-tooltip-id={showTooltips ? 'dash-tooltip' : undefined}
                            data-tooltip-content={showTooltips ? item.label : undefined}
                            onClick={(event) => {
                                dismissTooltip(event);
                                setMobileSidebarOpen(false);
                            }}
                            className={({ isActive }) => `
                p-3 rounded-2xl transition-all duration-300 group relative
                ${isActive
                                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20 scale-110'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'}
            `}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                    {item.badge !== null && item.badge > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-[#1A1A2E]">
                                            {item.badge > 99 ? '99+' : item.badge}
                                        </span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
                {/* Footer Actions */}
                <div className="mt-auto flex flex-col gap-6 pt-6 border-t border-white/10">
                    <NavLink
                        to="/"
                        data-tooltip-id={showTooltips ? 'dash-tooltip' : undefined}
                        data-tooltip-content={showTooltips ? 'Back to Home' : undefined}
                        onClick={(event) => {
                            dismissTooltip(event);
                            setMobileSidebarOpen(false);
                        }}
                        className="p-3 text-gray-400 hover:text-emerald-400 transition-colors"
                    >
                        <Home size={24} />
                    </NavLink>

                    <button
                        onClick={handleLogout}
                        data-tooltip-id={showTooltips ? 'dash-tooltip' : undefined}
                        data-tooltip-content={showTooltips ? 'Logout Account' : undefined}
                        className="p-3 text-gray-400 hover:text-rose-500 transition-colors cursor-pointer outline-none"
                    >
                        <LogOut size={24} />
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
                <div className="md:hidden sticky top-0 z-30 bg-[#F8FAFC] border-b border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="text-2xl font-bold text-orange-500 tracking-wide"
                        >
                            GhorBari
                        </button>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/profile')}
                                aria-label="Open profile"
                                className="w-11 h-11 rounded-full overflow-hidden border border-gray-200 flex items-center justify-center bg-white shadow-sm"
                            >
                                {user?.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt={user.displayName || 'Admin Avatar'}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-lg font-semibold text-gray-500">
                                        {(user?.displayName || user?.email || 'A').charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setMobileSidebarOpen((prev) => !prev)}
                                className="inline-flex items-center justify-center p-2 rounded-lg bg-white border border-gray-200 text-gray-700 shadow-sm"
                                aria-label="Toggle admin sidebar"
                            >
                                {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="p-4 md:p-8">
                    <Outlet />
                </div>
            </main>

            {/* Tooltip Styling */}
            {showTooltips && (
                <Tooltip
                    id="dash-tooltip"
                    place="right"
                    offset={20}
                    className="!bg-gray-900 !text-white !text-[10px] !font-black !uppercase !tracking-widest !px-3 !py-2 !rounded-lg !z-[9999] !opacity-100 shadow-xl"
                />
            )}
        </div>
    );
};

export default DashboardLayout;
