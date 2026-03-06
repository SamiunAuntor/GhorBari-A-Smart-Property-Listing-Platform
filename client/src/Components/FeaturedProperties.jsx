import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import useAxios from '../Hooks/useAxios';
import useAuth from '../Hooks/useAuth';
import Loading from './Loading';
import PropertyCard from '../Pages/BuyOrRentPage/PropertyCard';
import { ArrowRight } from 'lucide-react';

const FeaturedProperties = () => {
    const navigate = useNavigate();
    const axiosInstance = useAxios();
    const { user } = useAuth();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFeaturedProperties = async () => {
            try {
                const res = await axiosInstance.get('/featured-properties?limit=8');
                
                if (!Array.isArray(res.data)) {
                    setProperties([]);
                    return;
                }

                // Fetch geo files for address mapping
                const [divisionsRes, districtsRes, upzillasRes] = await Promise.all([
                    fetch("/divisions.json"),
                    fetch("/districts.json"),
                    fetch("/upzillas.json"),
                ]);
                const [divisions, districts, upzillas] = await Promise.all([
                    divisionsRes.json(),
                    districtsRes.json(),
                    upzillasRes.json(),
                ]);
                const divisionMap = new Map(divisions.map((d) => [d.id, d.name]));
                const districtMap = new Map(districts.map((d) => [d.id, d.name]));
                const upzilaMap = new Map(upzillas.map((u) => [u.id, u.name]));

                // Transform properties to match PropertyCard format
                const transformedProperties = res.data.map((prop) => {
                    const imageUrl = Array.isArray(prop.images) && prop.images.length > 0 ? prop.images[0] : prop.image || null;
                    const area = prop.areaSqFt ?? prop.area ?? 0;
                    const listingType = prop.listingType ?? "rent";
                    const propertyType = prop.propertyType ?? "flat";

                    // Map dynamic fields based on propertyType
                    let beds, baths;
                    if (propertyType === "building") {
                        beds = prop.floorCount ?? prop.unitCount ?? 0;
                        baths = prop.totalUnits ?? 0;
                    } else {
                        beds = prop.roomCount ?? prop.unitCount ?? prop.beds ?? 0;
                        baths = prop.bathrooms ?? prop.baths ?? 0;
                    }

                    const addressObj = prop.address || {};
                    const upazilaName = upzilaMap.get(addressObj.upazila_id) || "";
                    const districtName = districtMap.get(addressObj.district_id) || "";
                    const divisionName = divisionMap.get(addressObj.division_id) || "";
                    const addressString = [addressObj.street, upazilaName, districtName, divisionName].filter(Boolean).join(", ");

                    const rawVerified =
                        prop.ownerNidVerified ??
                        prop.isOwnerVerified ??
                        prop.owner?.nidVerified ??
                        prop.isVerified;
                    const isVerified = typeof rawVerified === "string"
                        ? rawVerified === "verified"
                        : Boolean(rawVerified);
                    const isPremium = (listingType === "rent" && Number(prop.price) > 50000) || (listingType === "sale" && Number(prop.price) > 100000);

                    return {
                        ...prop,
                        image: imageUrl,
                        beds,
                        baths,
                        area,
                        rating: 0, // Default rating for featured properties
                        listingType,
                        propertyType,
                        addressString,
                        ownerRating: 0,
                        ownerNidVerified: isVerified,
                        isVerified,
                        isPremium,
                    };
                });

                setProperties(transformedProperties);
            } catch (error) {
                console.error("Error fetching featured properties:", error);
                setProperties([]);
            } finally {
                setLoading(false);
            }
        };

        fetchFeaturedProperties();
    }, [axiosInstance]);

    const handlePropertyClick = (propertyId) => {
        // If user is not logged in, redirect to login with return path
        if (!user) {
            navigate('/login', { state: { from: `/property-details/${propertyId}` } });
        } else {
            // If logged in, go directly to property details
            navigate(`/property-details/${propertyId}`);
        }
    };

    const handleShowAll = () => {
        // If user is not logged in, redirect to login with return path
        if (!user) {
            navigate('/login', { state: { from: '/properties' } });
        } else {
            // If logged in, go directly to properties page
            navigate('/properties');
        }
    };

    if (loading) {
        return (
            <div className="py-16 bg-gray-100">
                <div className="w-11/12 mx-auto">
                    <Loading />
                </div>
            </div>
        );
    }

    if (properties.length === 0) {
        return null; // Don't show section if no properties
    }

    return (
        <div className="py-16 bg-gray-100">
            <div className="w-11/12 mx-auto">
                {/* Section Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">
                            Featured Properties
                        </h2>
                        <p className="text-gray-600 text-lg">
                            Discover our latest property listings
                        </p>
                    </div>
                    <button
                        onClick={handleShowAll}
                        className="mt-4 md:mt-0 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-md font-bold shadow-lg shadow-orange-200 transition-all active:scale-95"
                    >
                        Show All
                        <ArrowRight size={20} />
                    </button>
                </div>

                {/* Properties Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {properties.map((property) => (
                        <div
                            key={property._id}
                            onClick={() => handlePropertyClick(property._id)}
                            className="cursor-pointer"
                        >
                            <PropertyCard property={property} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FeaturedProperties;

