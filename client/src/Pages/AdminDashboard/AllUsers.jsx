import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import useAxiosSecure from '../../Hooks/useAxiosSecure';
import Swal from 'sweetalert2';
import { Eye, ShieldCheck, Users, Inbox, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, Star, ExternalLink } from 'lucide-react';
import Loading from '../../Components/Loading';

const AllUsers = () => {
    const navigate = useNavigate();
    const axiosSecure = useAxiosSecure();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState('all'); // all, verified, pending, unverified, rejected
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['all-users'],
        queryFn: async () => {
            const res = await axiosSecure.get('/admin/all-users');
            return res.data;
        }
    });

    const verifyByRegistryMutation = useMutation({
        mutationFn: async ({ id }) => {
            return await axiosSecure.patch(`/admin/verify-user-nid/${id}`);
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries(['all-users']);
            const matched = res?.data?.matched;
            if (matched) {
                Swal.fire('Verified!', 'User has been verified using NID registry.', 'success');
            } else {
                Swal.fire('Rejected', 'NID number not found in registry. User marked as rejected.', 'info');
            }
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            return await axiosSecure.delete(`/admin/delete-user/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['all-users']);
            Swal.fire('Deleted!', 'User has been permanently removed.', 'success');
        }
    });

    const handleVerify = (user) => {
        Swal.fire({
            title: 'Verify this user from NID registry?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#344767',
            confirmButtonText: 'Yes, update it!'
        }).then((result) => {
            if (result.isConfirmed) {
                verifyByRegistryMutation.mutate({ id: user._id });
            }
        });
    };

    const handleDelete = (user) => {
        Swal.fire({
            title: 'Delete User Permanently?',
            text: "This action cannot be undone!",
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, Delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteMutation.mutate(user._id);
            }
        });
    };

    const showNidInfo = (images) => {
        if (!images || images.length === 0) {
            Swal.fire({
                title: 'No NID Documents',
                text: 'This user has not submitted NID documents yet.',
                icon: 'info',
                confirmButtonColor: '#67748e'
            });
            return;
        }

        Swal.fire({
            title: '<span class="text-sm font-black uppercase tracking-widest text-[#344767]">National ID Verification Documents</span>',
            html: `
                <div style="display: flex; gap: 15px; justify-content: center; align-items: center; padding: 10px;">
                    ${images.map(img => `
                        <div style="flex: 1; aspect-ratio: 1.58 / 1; overflow: hidden; border-radius: 8px; border: 1px solid #e9ecef; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                            <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;" />
                        </div>
                    `).join('')}
                </div>
            `,
            width: 800,
            showConfirmButton: true,
            confirmButtonText: 'Close',
            confirmButtonColor: '#67748e'
        });
    };

    // Filter and search logic
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesFilter = filter === 'all' 
                ? true 
                : (user.nidVerified || 'unverified') === filter;
            
            const matchesSearch = searchTerm === '' || 
                user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.phone?.toLowerCase().includes(searchTerm.toLowerCase());
            
            return matchesFilter && matchesSearch;
        });
    }, [users, filter, searchTerm]);

    // Pagination logic
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Reset to page 1 when filter or search changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [filter, searchTerm]);

    if (isLoading) return <Loading />;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* HEADER */}
            <div className="p-6 border-b border-gray-200 bg-white">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg text-[#344767]">
                            <Users size={20} />
                        </div>
                        <h1 className="text-lg font-bold text-[#344767] uppercase tracking-tight">All Users</h1>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        {/* Search */}
                        <div className="relative min-w-[200px]">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                                <Search size={14} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-[#344767] focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                            />
                        </div>

                        {/* Filter */}
                        <div className="relative group min-w-[160px]">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                                <ShieldCheck size={14} />
                            </div>
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-wider text-[#344767] appearance-none cursor-pointer focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                            >
                                <option value="all">All Users</option>
                                <option value="verified">Verified</option>
                                <option value="pending">Pending</option>
                                <option value="unverified">Unverified</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto overflow-y-hidden">
                <table className={`w-full ${paginatedUsers.length > 0 ? "min-w-[1120px]" : ""} text-center table-auto border-collapse`}>
                    {paginatedUsers.length > 0 && (
                        <thead className="bg-[#f8f9fa]">
                            <tr className="text-[11px] uppercase text-[#344767] font-black tracking-widest border-b border-gray-200">
                                <th className="px-3 py-3 text-left border-r border-gray-200 min-w-[260px]">User Identity</th>
                                <th className="px-3 py-3 border-r border-gray-200 whitespace-nowrap min-w-[100px]">Role</th>
                                <th className="px-3 py-3 border-r border-gray-200 whitespace-nowrap min-w-[88px]">Rating</th>
                                <th className="px-3 py-3 border-r border-gray-200 whitespace-nowrap min-w-[90px]">Properties</th>
                                <th className="px-3 py-3 border-r border-gray-200 whitespace-nowrap min-w-[140px]">Registration Date</th>
                                <th className="px-3 py-3 border-r border-gray-200 whitespace-nowrap min-w-[120px]">NID Documents</th>
                                <th className="px-3 py-3 border-r border-gray-200 whitespace-nowrap min-w-[150px]">Verification Status</th>
                                <th className="px-3 py-3 whitespace-nowrap min-w-[74px]">Actions</th>
                            </tr>
                        </thead>
                    )}
                    <tbody className="divide-y divide-gray-200">
                        {paginatedUsers.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-4 py-16">
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                            <Inbox size={32} className="text-gray-400" />
                                        </div>
                                        <p className="text-[#67748e] font-bold text-sm uppercase tracking-wider mb-1">No Users Found</p>
                                        <p className="text-gray-400 text-xs">
                                            {searchTerm ? 'Try adjusting your search terms.' : 'No users match the selected filter.'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginatedUsers.map(user => (
                                <tr key={user._id} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="px-3 py-3 text-left border-r border-gray-200 bg-white group-hover:bg-gray-50/80">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <img 
                                                src={user.profileImage || 'https://via.placeholder.com/40'} 
                                                className="w-9 h-9 rounded-full object-cover border border-gray-100 shrink-0" 
                                                alt="" 
                                            />
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-[13px] text-[#344767] leading-snug truncate">{user.name || 'N/A'}</span>
                                                <span className="text-[10px] text-[#67748e] font-medium break-all leading-tight">{user.email || 'N/A'}</span>
                                                <span className="text-[10px] text-[#94a3b8] font-semibold leading-tight mt-0.5">
                                                    {user.phone || 'Phone not added'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 border-r border-gray-200 whitespace-nowrap">
                                        <span
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${
                                                (user.role || 'user') === 'admin'
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : 'bg-gray-100 text-[#344767]'
                                            }`}
                                        >
                                            {user.role || 'user'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 border-r border-gray-200 whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-1">
                                            <Star size={12} className="text-amber-500" fill="currentColor" />
                                            <span className="text-[11px] font-bold text-[#344767]">
                                                {Number(user?.rating?.average ?? user?.rating ?? 0).toFixed(1)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-sm font-bold text-[#344767] border-r border-gray-200 whitespace-nowrap">
                                        {user.totalProperties || 0}
                                    </td>
                                    <td className="px-3 py-3 text-xs font-medium text-[#67748e] border-r border-gray-200 whitespace-nowrap">
                                        {user.createdAt ? (
                                            <div className="flex flex-col items-center">
                                                <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                                                <span className="text-[9px] text-gray-400 font-bold uppercase">
                                                    {new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 border-r border-gray-200 whitespace-nowrap">
                                        {user.nidImages && user.nidImages.length > 0 ? (
                                            <button
                                                onClick={() => showNidInfo(user.nidImages)}
                                                className="mx-auto w-fit px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all flex items-center gap-1.5 border border-blue-100 shadow-sm"
                                            >
                                                <Eye size={14} />
                                                <span className="text-[9px] font-black uppercase tracking-wider">View NID</span>
                                            </button>
                                        ) : (
                                            <span className="text-gray-400 text-[11px] font-medium">Not Submitted</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 border-r border-gray-200 whitespace-nowrap">
                                        <div className="flex items-center justify-center">
                                            {(() => {
                                                const status = user.nidVerified || 'unverified';
                                                if (status === 'pending') {
                                                    return (
                                                        <button
                                                            onClick={() => handleVerify(user)}
                                                            className="text-[10px] font-black uppercase border rounded-lg px-2.5 py-1.5 outline-none cursor-pointer transition-all border-blue-100 text-blue-600 bg-blue-50 hover:bg-blue-100"
                                                        >
                                                            Verify User
                                                        </button>
                                                    );
                                                }

                                                const statusClass =
                                                    status === 'verified'
                                                        ? 'border-emerald-100 text-emerald-600 bg-emerald-50'
                                                        : status === 'rejected'
                                                            ? 'border-rose-100 text-rose-600 bg-rose-50'
                                                            : 'border-amber-100 text-amber-600 bg-amber-50';

                                                return (
                                                    <span className={`text-[10px] font-black uppercase border rounded-lg px-2.5 py-1.5 ${statusClass}`}>
                                                        {status}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => navigate(`/owner-profile/${user.email}`)}
                                                className="w-8 h-8 flex items-center justify-center text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
                                                title="View Public Profile"
                                            >
                                                <ExternalLink size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user)}
                                                className="w-8 h-8 flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                                                title="Delete User"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION */}
            {filteredUsers.length > itemsPerPage && (
                <div className="p-6 border-t border-gray-200 flex items-center justify-between bg-white">
                    <div className="text-sm text-[#67748e] font-medium">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-200 text-[#344767] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            title="First Page"
                        >
                            <ChevronsLeft size={18} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-200 text-[#344767] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            title="Previous Page"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="px-4 py-2 text-sm font-bold text-[#344767]">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-200 text-[#344767] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            title="Next Page"
                        >
                            <ChevronRight size={18} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-200 text-[#344767] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            title="Last Page"
                        >
                            <ChevronsRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllUsers;
