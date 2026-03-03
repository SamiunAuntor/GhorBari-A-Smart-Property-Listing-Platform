import { useState, useCallback, useEffect } from 'react';
import useAxiosSecure from '../Hooks/useAxiosSecure';
import useAuth from '../Hooks/useAuth';
import { WishlistContext } from './WishlistContextValue';

export const WishlistProvider = ({ children }) => {
    const [wishlistItems, setWishlistItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const axiosSecure = useAxiosSecure();
    const { user } = useAuth();

    const fetchWishlist = useCallback(async () => {
        if (!user) {
            setWishlistItems([]);
            return;
        }
        setLoading(true);
        try {
            const token = await user.getIdToken();
            const res = await axiosSecure.get('/user-wishlist', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (Array.isArray(res.data)) {
                setWishlistItems(res.data);
            } else {
                setWishlistItems([]);
            }
        } catch (err) {
            console.error('Failed to fetch wishlist', err);
            setWishlistItems([]);
        } finally {
            setLoading(false);
        }
    }, [axiosSecure, user]);

    const add = useCallback(async (propertyId, note = '') => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            await axiosSecure.post('/wishlist/add', { propertyId, note }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchWishlist();
        } catch (err) {
            console.error('Failed to add to wishlist', err);
            throw err;
        }
    }, [axiosSecure, user, fetchWishlist]);

    const remove = useCallback(async (propertyId) => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            await axiosSecure.delete(`/wishlist/${propertyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // compare string forms to avoid mismatches between ObjectId and string
            setWishlistItems(prev => prev.filter(p => p._id?.toString() !== propertyId?.toString()));
        } catch (err) {
            console.error('Failed to remove from wishlist', err);
            throw err;
        }
    }, [axiosSecure, user]);

    const updateNote = useCallback(async (propertyId, note) => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            await axiosSecure.patch(`/wishlist/${propertyId}`, { note }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWishlistItems(prev => prev.map(p => {
                if (p._id?.toString() === propertyId?.toString()) {
                    return { ...p, wishlistNote: note };
                }
                return p;
            }));
        } catch (err) {
            console.error('Failed to update wishlist note', err);
            throw err;
        }
    }, [axiosSecure, user]);

    const isInWishlist = useCallback((propertyId) => {
        return wishlistItems.some(p => p._id?.toString() === propertyId?.toString());
    }, [wishlistItems]);

    const toggle = useCallback(async (propertyId, note = '') => {
        if (isInWishlist(propertyId)) {
            await remove(propertyId);
        } else {
            await add(propertyId, note);
        }
    }, [isInWishlist, add, remove]);

    useEffect(() => {
        fetchWishlist();
    }, [fetchWishlist, user]);

    const value = {
        wishlistItems,
        loading,
        fetchWishlist,
        add,
        remove,
        updateNote,
        isInWishlist,
        toggle
    };

    return (
        <WishlistContext.Provider value={value}>
            {children}
        </WishlistContext.Provider>
    );
};