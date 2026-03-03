import React from "react";
import { Bed, Bath, Square, MapPin, Star, Heart, CheckCircle, Tag, Layers, XCircle, Scale } from "lucide-react";
import useComparison from "../../Hooks/useComparison";
import useWishlist from "../../Hooks/useWishlist";

const PropertyCard = ({ property }) => {
    const comparison = useComparison();

    const {
        title,
        price,
        area,
        image,
        images = [],
        addressString,
        listingType,
        propertyType,
        owner,
        ownerRating,
        ownerNidVerified,
        isOwnerVerified,
        verified,
        isPremium,
        // Dynamic fields based on propertyType
        roomCount,
        bathrooms,
        floorCount,
        totalUnits,
        // Legacy fields for backward compatibility
        unitCount,
        baths,
    } = property;

    const imageUrl = Array.isArray(images) && images.length > 0
        ? images[0]
        : image || "https://i.ibb.co.com/zTBXMRzq/4284558.jpg";

    const displayAddress = addressString || "Unknown location";
    const priceSuffix = listingType === "sale" ? " / total" : " / month";

    const premiumFlag = typeof isPremium === "boolean"
        ? isPremium
        : (listingType === "rent" ? Number(price) > 50000 : Number(price) > 100000);

    const verifiedFlag = Boolean(ownerNidVerified ?? isOwnerVerified ?? property.isOwnerVerified ?? property.isVerified ?? verified);
    const ownerName = owner?.name || owner?.email || "Unknown";
    const isSelected = comparison.isPropertySelected(property._id);

    // wishlist state
    const { isInWishlist, toggle } = useWishlist();
    const wishlisted = isInWishlist(property._id);
    const handleWishlistClick = async (e) => {
        e.stopPropagation();
        if (wishlisted) {
            await toggle(property._id);
        } else {
            const note = prompt('Add a note for this property (optional)');
            await toggle(property._id, note || '');
        }
    };

    return (
        <div className={`max-w-sm rounded-lg overflow-hidden shadow-lg bg-white group cursor-pointer transition-all duration-300 hover:shadow-2xl border ${isSelected ? 'border-blue-500 border-2' : 'border-gray-100'} mx-auto w-full flex flex-col h-[420px]`}>
            <div className="relative h-64 overflow-hidden">
                <img src={imageUrl} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />

                <div className="absolute top-4 left-4 flex flex-wrap gap-2 items-center z-10 max-w-[calc(100%-4rem)]">
                    <span className="bg-slate-900 text-white text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-md uppercase whitespace-nowrap">
                        <Tag size={12} /> {listingType}
                    </span>

                    {premiumFlag && (
                        <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-md whitespace-nowrap">
                            <Star size={12} fill="currentColor" /> Premium
                        </span>
                    )}

                    <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 border whitespace-nowrap
                            ${verifiedFlag ? "bg-white/60 text-emerald-700 border-emerald-200" : "bg-white/40 text-red-600 border-red-100"}`}
                        style={{ backdropFilter: "saturate(120%) blur(4px)" }}
                    >
                        {verifiedFlag ? <><CheckCircle size={12} /> Verified</> : <><XCircle size={12} /> Unverified</>}
                    </span>
                </div>

                <button
                    onClick={handleWishlistClick}
                    className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm rounded-md text-gray-600 hover:text-red-500 hover:bg-white transition-colors shadow-md z-20"
                    title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                    <Heart size={20} fill={wishlisted ? 'currentColor' : 'none'} />
                </button>

                {/* Compare Button Overlay */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isSelected) {
                            comparison.removeProperty(property._id);
                        } else {
                            comparison.addProperty(property);
                        }
                    }}
                    className={`absolute bottom-4 right-4 p-2 rounded-md transition-all z-20 opacity-0 group-hover:opacity-100 flex items-center gap-1 ${
                        isSelected
                            ? 'bg-blue-500 text-white shadow-lg'
                            : 'bg-white/80 text-gray-700 hover:bg-white shadow-md'
                    }`}
                    title={isSelected ? 'Remove from comparison' : 'Add to comparison'}
                >
                    <Scale size={16} />
                    <span className="text-xs font-bold">{isSelected ? 'Added' : 'Compare'}</span>
                </button>

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <div className="flex flex-wrap justify-between gap-2 text-white text-xs font-medium">
                        {propertyType === "building" ? (
                            <>
                                <div className="flex items-center gap-1 whitespace-nowrap"><Layers size={12} className="opacity-80" /> {floorCount || unitCount || "N/A"} Floors</div>
                                <div className="flex items-center gap-1 whitespace-nowrap"><Bed size={12} className="opacity-80" /> {totalUnits || "N/A"} Units</div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-1 whitespace-nowrap"><Bed size={12} className="opacity-80" /> {roomCount || unitCount || "N/A"} Rooms</div>
                                <div className="flex items-center gap-1 whitespace-nowrap"><Bath size={12} className="opacity-80" /> {bathrooms || baths || "N/A"} Baths</div>
                            </>
                        )}
                        <div className="flex items-center gap-1 whitespace-nowrap"><Square size={12} className="opacity-80" /> {area} sqft</div>
                    </div>
                </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-base font-bold text-gray-900 leading-tight line-clamp-2">{title}</h3>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded ml-2 bg-amber-50 shrink-0">
                            <Star size={12} className="text-amber-500" fill="currentColor" />
                            <span className="text-xs font-bold text-amber-700">{ownerRating || "0"}</span>
                        </div>
                    </div>

                    <div className="text-gray-500 text-xs mb-2">
                        <p className="leading-relaxed line-clamp-2">
                            <MapPin size={12} className="inline-block mr-1 -mt-0.5" />
                            {displayAddress}
                        </p>
                    </div>

                    <hr className="border-t border-gray-200 my-2" />

                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                        <span className="font-medium">Owner:</span>
                        <span className="font-bold truncate">{ownerName}</span>
                    </div>
                </div>

                <div className="bg-gray-100 p-2.5 rounded-md">
                    <div className="flex items-baseline justify-between">
                        <div>
                            <span className="text-lg font-black text-slate-900">৳{price}</span>
                            <span className="text-gray-500 text-xs font-medium ml-1.5">{priceSuffix}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PropertyCard;