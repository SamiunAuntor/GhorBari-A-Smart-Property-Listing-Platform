import { useContext } from 'react';
import { WishlistContext } from '../context/WishlistContextValue';

const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error('useWishlist must be used within WishlistProvider');
    }
    return context;
};

export default useWishlist;