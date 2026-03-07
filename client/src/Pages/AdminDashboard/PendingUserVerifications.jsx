import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useAxiosSecure from '../../Hooks/useAxiosSecure';
import Swal from 'sweetalert2';
import { Eye, ShieldCheck, UserCheck, Inbox } from 'lucide-react';
import Loading from '../../Components/Loading';

const PendingUserVerifications = () => {
    const axiosSecure = useAxiosSecure();
    const queryClient = useQueryClient();

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['pending-users'],
        queryFn: async () => {
            const res = await axiosSecure.get('/admin/pending-verifications');
            return res.data;
        }
    });

    const verifyByRegistryMutation = useMutation({
        mutationFn: async ({ id }) => {
            return await axiosSecure.patch(`/admin/verify-user-nid/${id}`);
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries(['pending-users']);
            const matched = res?.data?.matched;
            if (matched) {
                Swal.fire('Verified!', 'User has been verified using NID registry.', 'success');
            } else {
                Swal.fire('Rejected', 'NID number not found in registry. User marked as rejected.', 'info');
            }
        }
    });

    const showNidInfo = (images) => {
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

    if (isLoading) return <Loading />;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* HEADER */}
            <div className="p-6 border-b border-gray-200 flex items-center gap-3 bg-white">
                <div className="p-2 bg-gray-100 rounded-lg text-[#344767]">
                    <ShieldCheck size={20} />
                </div>
                <h1 className="text-lg font-bold text-[#344767] uppercase tracking-tight">User Verification Management</h1>
            </div>

            {/* VISIBLE GRID TABLE */}
            <div className="overflow-x-auto overflow-y-hidden">
                <table className={`w-full ${users.length > 0 ? "min-w-[1040px]" : ""} text-center table-auto border-collapse`}>
                    {users.length > 0 && (
                        <thead className="bg-[#f8f9fa]">
                            <tr className="text-[11px] uppercase text-[#344767] font-black tracking-widest border-b border-gray-200">
                                <th className="px-4 py-4 text-left border-r border-gray-200">User Identity</th>
                                <th className="px-4 py-4 border-r border-gray-200">Contact Number</th>
                                <th className="px-4 py-4 border-r border-gray-200">Role</th>
                                <th className="px-4 py-4 border-r border-gray-200">Application Time</th>
                                <th className="px-4 py-4 border-r border-gray-200">NID Number</th>
                                <th className="px-4 py-4 border-r border-gray-200">NID Documents</th>
                                <th className="px-4 py-4">Verification Status</th>
                            </tr>
                        </thead>
                    )}
                    <tbody className="divide-y divide-gray-200">
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-4 py-16">
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                            <Inbox size={32} className="text-gray-400" />
                                        </div>
                                        <p className="text-[#67748e] font-bold text-sm uppercase tracking-wider mb-1">No Pending Verifications</p>
                                        <p className="text-gray-400 text-xs">All user verifications have been processed.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            users.map(user => (
                                <tr key={user._id} className="hover:bg-gray-50/80 transition-colors group">
                                <td className="px-4 py-5 text-left border-r border-gray-200 bg-white group-hover:bg-gray-50/80">
                                    <div className="flex items-center gap-3">
                                        <img src={user.profileImage} className="w-10 h-10 rounded-full object-cover border border-gray-100" alt="" />
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-[#344767] leading-snug">{user.name}</span>
                                            <span className="text-[11px] text-[#67748e] font-medium">{user.email}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-5 text-sm font-medium text-[#67748e] border-r border-gray-200">
                                    {user.phone || 'N/A'}
                                </td>
                                <td className="px-4 py-5 border-r border-gray-200">
                                    <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter bg-gray-100 text-[#344767]">
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-4 py-5 text-sm font-medium text-[#67748e] border-r border-gray-200">
                                    <div className="flex flex-col items-center">
                                        <span>{new Date(user.nidSubmittedAt).toLocaleDateString()}</span>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase">{new Date(user.nidSubmittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-5 text-sm font-medium text-[#67748e] border-r border-gray-200">
                                    {user.nidNumber || 'N/A'}
                                </td>
                                <td className="px-4 py-5 border-r border-gray-200">
                                    {user.nidImages && user.nidImages.length > 0 ? (
                                        <button
                                            onClick={() => showNidInfo(user.nidImages)}
                                            className="mx-auto w-fit px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-2 border border-blue-100 shadow-sm"
                                        >
                                            <Eye size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">View NID</span>
                                        </button>
                                    ) : (
                                        <span className="text-gray-400 text-xs font-medium">No Images</span>
                                    )}
                                </td>
                                <td className="px-4 py-5">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => handleVerify(user)}
                                            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-2 text-[11px] font-black uppercase tracking-widest border border-blue-100"
                                        >
                                            <UserCheck size={14} />
                                            Verify User
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PendingUserVerifications;
