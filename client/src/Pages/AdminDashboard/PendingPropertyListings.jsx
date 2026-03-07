import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import useAxiosSecure from '../../Hooks/useAxiosSecure';
import Swal from 'sweetalert2';
import { CheckCircle, Trash2, ExternalLink, XCircle, ChevronDown, LayoutGrid, Inbox } from 'lucide-react';
import Loading from '../../Components/Loading';

const PendingPropertyListings = () => {
    const axiosSecure = useAxiosSecure();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [filter, setFilter] = useState('all');

    const { data: properties = [], isLoading } = useQuery({
        queryKey: ['pending-properties'],
        queryFn: async () => {
            const res = await axiosSecure.get('/admin/pending-properties');
            return res.data;
        }
    });

    const filteredProperties = properties.filter(p =>
        filter === 'all' ? true : p.listingType === filter
    );

    // Mutation for approving/rejecting properties
    const statusMutation = useMutation({
        mutationFn: async ({ id, status }) => {
            return await axiosSecure.patch(`/admin/property-status/${id}`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['pending-properties']);
            Swal.fire('Updated!', 'Property status has been changed.', 'success');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            return await axiosSecure.delete(`/admin/delete-property/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['pending-properties']);
            Swal.fire('Deleted!', 'Property has been permanently removed.', 'success');
        }
    });

    const handleAction = (id, status) => {
        Swal.fire({
            title: `Are you sure you want to ${status}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: status === 'active' ? '#10b981' : '#f59e0b',
            confirmButtonText: `Yes, ${status} it!`
        }).then((result) => {
            if (result.isConfirmed) statusMutation.mutate({ id, status });
        });
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Permanently?',
            text: "This action cannot be undone!",
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, Delete it!'
        }).then((result) => {
            if (result.isConfirmed) deleteMutation.mutate(id);
        });
    };

    if (isLoading) return <Loading />;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* TOP BAR */}
            <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg text-[#344767]">
                        <LayoutGrid size={20} />
                    </div>
                    <h1 className="text-lg font-bold text-[#344767] uppercase tracking-tight">Property Approvals</h1>
                </div>

                {/* Filter */}
                <div className="relative group min-w-[160px]">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                        <ChevronDown size={14} />
                    </div>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-wider text-[#344767] appearance-none cursor-pointer focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                    >
                        <option value="all">View : All Items</option>
                        <option value="rent">Type: For Rent</option>
                        <option value="sale">Type: For Sale</option>
                    </select>
                </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto overflow-y-hidden">
                <table className={`w-full ${filteredProperties.length > 0 ? "min-w-[1120px]" : ""} text-center table-auto border-collapse`}>
                    {filteredProperties.length > 0 && (
                        <thead className="bg-[#f8f9fa]">
                            <tr className="text-[11px] uppercase text-[#344767] font-black tracking-widest border-b border-gray-200">
                                <th className="px-4 py-4 text-left border-r border-gray-200">Property Title</th>
                                <th className="px-4 py-4 border-r border-gray-200">Owner Contact</th>
                                <th className="px-4 py-4 border-r border-gray-200">Mode</th>
                                <th className="px-4 py-4 border-r border-gray-200">Category</th>
                                <th className="px-4 py-4 border-r border-gray-200">Price Structure</th>
                                <th className="px-4 py-4 border-r border-gray-200">Specifications</th>
                                <th className="px-4 py-4 border-r border-gray-200">Size</th>
                                <th className="px-4 py-4">Administrative Actions</th>
                            </tr>
                        </thead>
                    )}
                    <tbody className="divide-y divide-gray-200">
                        {filteredProperties.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-4 py-16">
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                            <Inbox size={32} className="text-gray-400" />
                                        </div>
                                        <p className="text-[#67748e] font-bold text-sm uppercase tracking-wider mb-1">No Pending Properties</p>
                                        <p className="text-gray-400 text-xs">
                                            {filter === 'all' 
                                                ? 'All property listings have been processed.' 
                                                : `No properties found for ${filter === 'rent' ? 'rent' : 'sale'}.`}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredProperties.map(prop => (
                                <tr key={prop._id} className="hover:bg-gray-50/80 transition-colors group">
                                <td className="px-4 py-5 text-left border-r border-gray-200 bg-white group-hover:bg-gray-50/80">
                                    <span className="font-bold text-sm text-[#344767] leading-snug">{prop.title}</span>
                                </td>
                                <td className="px-4 py-5 text-sm font-medium text-[#67748e] border-r border-gray-200">
                                    {prop.owner?.email}
                                </td>
                                <td className="px-4 py-5 border-r border-gray-200">
                                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter ${prop.listingType === 'rent' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                        }`}>
                                        {prop.listingType}
                                    </span>
                                </td>
                                <td className="px-4 py-5 text-sm font-bold uppercase text-[#67748e] border-r border-gray-200">
                                    {prop.propertyType}
                                </td>
                                <td className="px-4 py-5 text-sm font-black text-[#344767] border-r border-gray-200">
                                    ৳{prop.price.toLocaleString()}
                                    <span className="text-[10px] font-bold text-gray-400 block uppercase">
                                        {prop.listingType === 'rent' ? 'Per Month' : 'Asking Price'}
                                    </span>
                                </td>
                                <td className="px-4 py-5 text-sm font-bold text-[#67748e] border-r border-gray-200">
                                    {prop.propertyType === 'building' 
                                        ? `${prop.floorCount || prop.unitCount || 'N/A'} Floors, ${prop.totalUnits || 'N/A'} Units`
                                        : `${prop.roomCount || prop.unitCount || 'N/A'} Rooms, ${prop.bathrooms || 'N/A'} Baths`
                                    }
                                </td>
                                <td className="px-4 py-5 text-sm font-medium text-[#67748e] border-r border-gray-200">
                                    {prop.areaSqFt} <span className="text-[10px] font-bold">SQFT</span>
                                </td>
                                <td className="px-4 py-5">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => handleAction(prop._id, 'active')} className="w-9 h-9 flex items-center justify-center text-emerald-500 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all" title="Approve">
                                            <CheckCircle size={18} />
                                        </button>
                                        <button onClick={() => navigate(`/admin-dashboard/property-details/${prop._id}`)} className="w-9 h-9 flex items-center justify-center text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all" title="Details">
                                            <ExternalLink size={18} />
                                        </button>
                                        <button onClick={() => handleAction(prop._id, 'rejected')} className="w-9 h-9 flex items-center justify-center text-amber-500 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all" title="Reject">
                                            <XCircle size={18} />
                                        </button>
                                        <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>
                                        <button onClick={() => handleDelete(prop._id)} className="w-9 h-9 flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-all" title="Hard Delete">
                                            <Trash2 size={18} />
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

export default PendingPropertyListings;