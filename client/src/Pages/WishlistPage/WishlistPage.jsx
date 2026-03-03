import React, { useState } from 'react';
import useWishlist from '../../Hooks/useWishlist';
import useAuth from '../../Hooks/useAuth';
import PropertyCard from '../BuyOrRentPage/PropertyCard';

const WishlistPage = () => {
    const { user } = useAuth();
    const { wishlistItems, loading, remove, updateNote } = useWishlist();
    const [editingId, setEditingId] = useState(null);
    const [tempNote, setTempNote] = useState('');

    if (!user) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500 font-bold">Please login to view your wishlist</p>
            </div>
        );
    }

    const handleEdit = (item) => {
        setEditingId(item._id);
        setTempNote(item.wishlistNote || '');
    };

    const saveNote = async (id) => {
        await updateNote(id, tempNote);
        setEditingId(null);
        setTempNote('');
    };

    return (
        <div className="min-h-screen bg-gray-100 py-12">
            <div className="w-11/12 mx-auto">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-6">My Wishlist</h1>
                {loading ? (
                    <p>Loading...</p>
                ) : wishlistItems.length === 0 ? (
                    <p className="text-gray-600">Your wishlist is empty.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {wishlistItems.map((item) => (
                            <div key={item._id} className="relative">
                                <PropertyCard property={item} />
                                <div className="mt-2 p-2 bg-white rounded shadow-sm">
                                    {editingId === item._id ? (
                                        <div className="flex flex-col">
                                            <textarea
                                                value={tempNote}
                                                onChange={(e) => setTempNote(e.target.value)}
                                                className="border p-1 mb-2"
                                                rows={3}
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => saveNote(item._id)}
                                                    className="px-3 py-1 bg-blue-500 text-white rounded"
                                                >Save</button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded"
                                                >Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                                {item.wishlistNote || <span className="italic text-gray-400">no note</span>}
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="text-blue-500 text-sm"
                                                >Edit</button>
                                                <button
                                                    onClick={() => remove(item._id)}
                                                    className="text-red-500 text-sm"
                                                >Remove</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WishlistPage;