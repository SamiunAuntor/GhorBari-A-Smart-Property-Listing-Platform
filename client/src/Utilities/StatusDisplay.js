/**
 * Centralized Status Display Utilities
 * Ensures consistent status display across the entire application
 */

/**
 * Get display text for application status
 * @param {string} status - Application status from database
 * @param {object} property - Property object (optional, needed for completed status)
 * @returns {string} - Display text for the status
 */
export const getApplicationStatusDisplay = (status, property = null) => {
    // Backward compatibility: treat 'accepted' as 'deal-in-progress'
    const normalizedStatus = status === 'accepted' ? 'deal-in-progress' : status;
    
    // CRITICAL: If property is in deal-in-progress, application should also be deal-in-progress
    // Fix any data inconsistency
    if (property?.status === 'deal-in-progress' && normalizedStatus === 'completed') {
        // Data inconsistency detected - property is in deal-in-progress but application says completed
        // This shouldn't happen, but handle it gracefully
        return 'DEAL-IN-PROGRESS';
    }
    
    // Handle each status explicitly
    switch (normalizedStatus) {
        case 'pending':
            return 'PENDING';
        case 'counter':
            return 'COUNTER';
        case 'deal-in-progress':
            // Always show DEAL-IN-PROGRESS when application is in deal-in-progress
            // regardless of property status (property should also be deal-in-progress)
            return 'DEAL-IN-PROGRESS';
        case 'completed':
            // Only show BOUGHT/CURRENTLY RENTING if property is actually sold/rented
            // If property is still deal-in-progress, it means data inconsistency - show DEAL-IN-PROGRESS
            if (property?.status === 'deal-in-progress') {
                return 'DEAL-IN-PROGRESS';
            }
            if (property?.status === 'sold' || property?.status === 'rented') {
                if (property.listingType === 'sale') {
                    return 'BOUGHT';
                } else if (property.listingType === 'rent') {
                    return 'CURRENTLY RENTING';
                }
            }
            // If application is completed but property not yet sold/rented, show COMPLETED
            return 'COMPLETED';
        case 'rejected':
            return 'REJECTED';
        case 'withdrawn':
            return 'WITHDRAWN';
        case 'cancelled':
            return 'CANCELLED';
        default:
            return status?.toUpperCase() || 'PENDING';
    }
};

/**
 * Get display text for property status
 * @param {string} status - Property status from database
 * @returns {string} - Display text for the status
 */
export const getPropertyStatusDisplay = (status) => {
    switch (status) {
        case 'pending':
            return 'PENDING';
        case 'active':
            return 'ACTIVE';
        case 'hidden':
            return 'HIDDEN';
        case 'rejected':
            return 'REJECTED';
        case 'removed':
            return 'REMOVED';
        case 'deal-in-progress':
            return 'DEAL-IN-PROGRESS';
        case 'sold':
            return 'SOLD';
        case 'rented':
            return 'RENTED';
        default:
            return status?.toUpperCase() || 'PENDING';
    }
};

/**
 * Get user-friendly message for application status
 * @param {string} status - Application status from database
 * @param {object} property - Property object (optional, needed for completed status)
 * @returns {string} - User-friendly message
 */
export const getApplicationStatusMessage = (status, property = null) => {
    // Backward compatibility: treat 'accepted' as 'deal-in-progress'
    const normalizedStatus = status === 'accepted' ? 'deal-in-progress' : status;
    
    // CRITICAL: If property is in deal-in-progress, application should also be deal-in-progress
    // Fix any data inconsistency - don't show "completed" message if property is still in progress
    if (property?.status === 'deal-in-progress' && normalizedStatus === 'completed') {
        // Data inconsistency detected - property is in deal-in-progress but application says completed
        // Show deal-in-progress message instead
        return 'Deal is in progress. You or the owner can mark it as completed when ready.';
    }
    
    // Check if property is sold/rented and application is completed
    if ((property?.status === 'sold' || property?.status === 'rented') && normalizedStatus === 'completed') {
        if (property.listingType === 'sale') {
            return 'You have bought this property.';
        } else {
            return 'You are currently renting this property.';
        }
    }
    
    switch (normalizedStatus) {
        case 'pending':
            return 'Your application is pending review by the property owner.';
        case 'counter':
            return 'The owner has sent you a counter offer. You can accept it, revise your offer, or reject it.';
        case 'deal-in-progress':
            return 'Deal is in progress. You or the owner can mark it as completed when ready.';
        case 'completed':
            // Only show bought/renting message if property is actually sold/rented
            // If property is still deal-in-progress, it means data inconsistency - show deal-in-progress message
            if (property?.status === 'deal-in-progress') {
                return 'Deal is in progress. You or the owner can mark it as completed when ready.';
            }
            if (property?.status === 'sold' || property?.status === 'rented') {
                if (property.listingType === 'sale') {
                    return 'You have bought this property.';
                } else {
                    return 'You are currently renting this property.';
                }
            }
            // If application is completed but property not yet sold/rented, show generic completed message
            return 'Deal has been completed.';
        case 'rejected':
            return 'Your application has been rejected by the property owner.';
        case 'withdrawn':
            return 'You have withdrawn this application.';
        case 'cancelled':
            return 'This deal has been cancelled.';
        default:
            return `Application status: ${status || 'unknown'}`;
    }
};

/**
 * Get color classes for application status badge
 * @param {string} status - Application status from database
 * @returns {string} - Tailwind CSS classes for styling
 */
export const getApplicationStatusColor = (status) => {
    // Backward compatibility: treat 'accepted' as 'deal-in-progress'
    const normalizedStatus = status === 'accepted' ? 'deal-in-progress' : status;
    
    switch (normalizedStatus) {
        case 'pending':
            return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        case 'counter':
            return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'deal-in-progress':
            return 'bg-orange-100 text-orange-700 border-orange-200';
        case 'completed':
            return 'bg-green-100 text-green-700 border-green-200';
        case 'rejected':
            return 'bg-red-100 text-red-700 border-red-200';
        case 'withdrawn':
            return 'bg-gray-100 text-gray-700 border-gray-200';
        case 'cancelled':
            return 'bg-orange-100 text-orange-700 border-orange-200';
        default:
            return 'bg-gray-100 text-gray-700 border-gray-200';
    }
};

/**
 * Get color classes for property status badge
 * @param {string} status - Property status from database
 * @returns {string} - Tailwind CSS classes for styling
 */
export const getPropertyStatusColor = (status) => {
    switch (status) {
        case 'pending':
            return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        case 'active':
            return 'bg-green-100 text-green-700 border-green-200';
        case 'hidden':
            return 'bg-gray-100 text-gray-700 border-gray-200';
        case 'rejected':
            return 'bg-red-100 text-red-700 border-red-200';
        case 'removed':
            return 'bg-gray-100 text-gray-700 border-gray-200';
        case 'deal-in-progress':
            return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'sold':
        case 'rented':
            return 'bg-purple-100 text-purple-700 border-purple-200';
        default:
            return 'bg-gray-100 text-gray-700 border-gray-200';
    }
};

/**
 * Get admin dashboard color classes for property status badge
 * @param {string} status - Property status from database
 * @returns {string} - Tailwind CSS classes for styling
 */
export const getPropertyStatusColorAdmin = (status) => {
    const badges = {
        pending: 'bg-yellow-50 text-yellow-600 border-yellow-100',
        active: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        rejected: 'bg-red-50 text-red-600 border-red-100',
        rented: 'bg-blue-50 text-blue-600 border-blue-100',
        sold: 'bg-purple-50 text-purple-600 border-purple-100',
        'deal-in-progress': 'bg-orange-50 text-orange-600 border-orange-100',
        hidden: 'bg-gray-50 text-gray-600 border-gray-100',
        removed: 'bg-gray-50 text-gray-600 border-gray-100'
    };
    return badges[status] || 'bg-gray-50 text-gray-600 border-gray-100';
};

/**
 * Check if application status should be considered active
 * @param {string} status - Application status
 * @returns {boolean} - True if status is active
 */
export const isActiveApplicationStatus = (status) => {
    const normalizedStatus = status === 'accepted' ? 'deal-in-progress' : status;
    return ['pending', 'counter', 'deal-in-progress'].includes(normalizedStatus);
};
