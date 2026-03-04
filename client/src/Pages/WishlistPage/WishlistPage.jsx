import React from 'react';
import useWishlist from '../../Hooks/useWishlist';
import useAuth from '../../Hooks/useAuth';
import WishlistPropertyCard from './WishlistPropertyCard';

const WishlistPage = () => {
    const { user } = useAuth();
    const { wishlistItems, loading } = useWishlist();

    if (!user) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center bg-gray-50 px-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center border border-gray-100">
                    <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-500">Please login to view and manage your property wishlist.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-12">
            <div className="w-11/12 mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                    <div>
                        
                        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-3">
                            My <span className="bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">Wishlist</span>
                        </h1>
                        <p className="text-gray-500 font-medium">Manage your favorite properties and personal reminders.</p>
                    </div>
                    {!loading && wishlistItems.length > 0 && (
                        <div className="bg-white px-4 py-2 rounded-md shadow-sm border border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-600">
                            {wishlistItems.length} Saved Properties
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                    </div>
                ) : wishlistItems.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-400 text-lg">Your wishlist is currently empty.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {wishlistItems.map((item) => (
                            <div key={item._id} className="group flex flex-col">
                                <WishlistPropertyCard property={item} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WishlistPage;
