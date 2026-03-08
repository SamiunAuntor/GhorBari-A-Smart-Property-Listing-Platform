import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import useAxios from '../../Hooks/useAxios';
import useAuth from '../../Hooks/useAuth';
import useComparison from '../../Hooks/useComparison';
import useWishlist from '../../Hooks/useWishlist';
import PropertyDetailsMap from './PropertyDetailsMap';
import NearbyPlaces from './NearbyPlaces';
import ApplicationModal from './ApplicationModal';
import WishlistNoteModal from '../../Components/WishlistNoteModal';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import {
    MapPin, Bed, Bath, Square, CheckCircle, XCircle,
    User, MessageSquare, ShieldCheck, Sparkles, Loader2, Layers, Star, Tag, Send, Scale, Check, Heart
} from 'lucide-react';

import useAxiosSecure from '../../Hooks/useAxiosSecure';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const PropertyDetails = ({ isAdminPreview = false }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const locationRoute = useLocation();
    // Get both axios instances
    const axiosPublic = useAxios();
    const axiosSecure = useAxiosSecure();
    const { user } = useAuth();
    const comparison = useComparison();
    const wishlist = useWishlist();

    const [geoMaps, setGeoMaps] = useState({ divisionMap: new Map(), districtMap: new Map(), upazilaMap: new Map() });
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
    const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);

    // 1. Fetch Property Data
    const { data: property, isLoading: propLoading } = useQuery({
        queryKey: ['property', id, isAdminPreview],
        enabled: !!user,
        queryFn: async () => {
            // IF admin preview, use Secure Axios + Admin Route
            // ELSE use the standard logic for public property details
            if (isAdminPreview) {
                const res = await axiosSecure.get(`/admin/property/${id}`);
                return res.data;
            }

            const token = await user.getIdToken();
            const res = await axiosPublic.get(`/property/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data;
        }
    });

    // Fetch Secure Owner Profile
    const { data: ownerProfile } = useQuery({
        queryKey: ['public-owner', property?.owner?.email],
        enabled: !!property?.owner?.email,
        queryFn: async () => {
            const token = await user.getIdToken();
            const res = await axiosPublic.get(`/public-profile/${property.owner.email}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data;
        }
    });

    // Fetch User Applications to check if already applied
    const { data: userApplications = [] } = useQuery({
        queryKey: ['my-applications', user?.email],
        enabled: !!user && !!property?._id && !isAdminPreview,
        queryFn: async () => {
            if (!user) return [];
            const token = await user.getIdToken();
            const res = await axiosPublic.get(`/my-applications?email=${user.email}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data || [];
        }
    });

    // Check if user has an active/blocking application for this property
    // Blocked statuses: pending, counter, deal-in-progress
    // Allowed to reapply: completed, rejected, withdrawn, cancelled
    const hasApplied = userApplications.some(app => {
        const matchesProperty = app.propertyId?.toString() === property?._id?.toString() || 
                               app.property?._id?.toString() === property?._id?.toString();
        const blockingStatuses = ["pending", "counter", "deal-in-progress"];
        return matchesProperty && blockingStatuses.includes(app.status);
    });

    useEffect(() => {
        const params = new URLSearchParams(locationRoute.search);
        const shouldOpenApplication = params.get('apply') === 'true';

        if (
            shouldOpenApplication &&
            property &&
            user &&
            !isAdminPreview &&
            property?.status === 'active' &&
            property?.owner?.email !== user?.email &&
            !hasApplied
        ) {
            setIsApplicationModalOpen(true);
            navigate(locationRoute.pathname, { replace: true });
        }
    }, [locationRoute.pathname, locationRoute.search, navigate, property, user, isAdminPreview, hasApplied]);

    // Fetch Nearby Places using Overpass API directly from frontend
    const { data: nearbyPlaces, isLoading: nearbyPlacesLoading } = useQuery({
        queryKey: ['nearby-places', property?.location?.lat, property?.location?.lng],
        enabled: !!property?.location?.lat && !!property?.location?.lng,
        queryFn: async () => {
            const { lat, lng } = property.location;
            const radius = 5000; // 5km radius in meters

            // Helper function to calculate distance (Haversine formula)
            const calculateDistance = (lat1, lng1, lat2, lng2) => {
                const R = 6371; // Earth's radius in km
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLng = (lng2 - lng1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
            };

            // Overpass API query - All POI types
            const overpassQuery = `
[out:json][timeout:30];
(
  node["amenity"="school"](around:${radius},${lat},${lng});
  node["amenity"="university"](around:${radius},${lat},${lng});
  node["amenity"="college"](around:${radius},${lat},${lng});
  node["amenity"="hospital"](around:${radius},${lat},${lng});
  node["amenity"="clinic"](around:${radius},${lat},${lng});
  node["amenity"="doctors"](around:${radius},${lat},${lng});
  node["healthcare"="diagnostic"](around:${radius},${lat},${lng});
  node["aeroway"="aerodrome"](around:${radius},${lat},${lng});
  node["public_transport"="station"](around:${radius},${lat},${lng});
  node["highway"="bus_stop"](around:${radius},${lat},${lng});
  node["railway"="station"](around:${radius},${lat},${lng});
  node["amenity"="marketplace"](around:${radius},${lat},${lng});
  node["shop"="mall"](around:${radius},${lat},${lng});
  node["shop"="supermarket"](around:${radius},${lat},${lng});
  node["leisure"="park"](around:${radius},${lat},${lng});
  node["amenity"="restaurant"](around:${radius},${lat},${lng});
  node["amenity"="cafe"](around:${radius},${lat},${lng});
  node["amenity"="place_of_worship"](around:${radius},${lat},${lng});
  node["amenity"="bank"](around:${radius},${lat},${lng});
  node["amenity"="atm"](around:${radius},${lat},${lng});
  node["amenity"="fuel"](around:${radius},${lat},${lng});
  node["amenity"="police"](around:${radius},${lat},${lng});
  node["tourism"="hotel"](around:${radius},${lat},${lng});
  node["leisure"="fitness_centre"](around:${radius},${lat},${lng});
  node["leisure"="gym"](around:${radius},${lat},${lng});
  way["amenity"="school"](around:${radius},${lat},${lng});
  way["amenity"="university"](around:${radius},${lat},${lng});
  way["amenity"="college"](around:${radius},${lat},${lng});
  way["amenity"="hospital"](around:${radius},${lat},${lng});
  way["amenity"="clinic"](around:${radius},${lat},${lng});
  way["amenity"="doctors"](around:${radius},${lat},${lng});
  way["healthcare"="diagnostic"](around:${radius},${lat},${lng});
  way["aeroway"="aerodrome"](around:${radius},${lat},${lng});
  way["public_transport"="station"](around:${radius},${lat},${lng});
  way["railway"="station"](around:${radius},${lat},${lng});
  way["amenity"="marketplace"](around:${radius},${lat},${lng});
  way["shop"="mall"](around:${radius},${lat},${lng});
  way["shop"="supermarket"](around:${radius},${lat},${lng});
  way["leisure"="park"](around:${radius},${lat},${lng});
  way["amenity"="restaurant"](around:${radius},${lat},${lng});
  way["amenity"="cafe"](around:${radius},${lat},${lng});
  way["amenity"="place_of_worship"](around:${radius},${lat},${lng});
  way["amenity"="bank"](around:${radius},${lat},${lng});
  way["amenity"="fuel"](around:${radius},${lat},${lng});
  way["amenity"="police"](around:${radius},${lat},${lng});
  way["tourism"="hotel"](around:${radius},${lat},${lng});
  way["leisure"="fitness_centre"](around:${radius},${lat},${lng});
  way["leisure"="gym"](around:${radius},${lat},${lng});
);
out center;
`;

            const response = await fetch("https://overpass-api.de/api/interpreter", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `data=${encodeURIComponent(overpassQuery)}`
            });

            if (!response.ok) throw new Error("Failed to fetch nearby places");

            const data = await response.json();
            if (!data.elements || data.elements.length === 0) {
                return { 
                    education: [], 
                    healthcare: [], 
                    airports: [], 
                    busStations: [], 
                    railStations: [],
                    shopping: [],
                    parks: [],
                    restaurants: [],
                    religious: [],
                    banks: [],
                    fuelStations: [],
                    police: [],
                    hotels: [],
                    gyms: []
                };
            }

            // Process and categorize (with merged categories)
            const places = data.elements.map(element => {
                const placeLat = element.lat || (element.center && element.center.lat);
                const placeLng = element.lon || (element.lng) || (element.center && element.center.lon);
                if (!placeLat || !placeLng) return null;

                const distance = calculateDistance(lat, lng, placeLat, placeLng);
                if (distance > 5) return null; // Filter out places beyond 5km
                
                const name = element.tags?.name || element.tags?.["name:en"] || "Unnamed Place";

                let category = "other";
                const tags = element.tags || {};
                
                // Education (schools, universities, colleges)
                if (tags.amenity === "school" || tags.amenity === "university" || tags.amenity === "college") {
                    category = "education";
                }
                // Healthcare (hospitals, clinics, doctors, diagnostic centers)
                else if (tags.amenity === "hospital" || tags.amenity === "clinic" || tags.amenity === "doctors" || tags.healthcare === "diagnostic") {
                    category = "healthcare";
                }
                // Airports
                else if (tags.aeroway === "aerodrome") {
                    category = "airports";
                }
                // Bus Stations
                else if (tags.public_transport === "station" || tags.highway === "bus_stop") {
                    category = "busStations";
                }
                // Rail Stations
                else if (tags.railway === "station") {
                    category = "railStations";
                }
                // Shopping
                else if (tags.amenity === "marketplace" || tags.shop === "mall" || tags.shop === "supermarket") {
                    category = "shopping";
                }
                // Parks
                else if (tags.leisure === "park") {
                    category = "parks";
                }
                // Restaurants & Cafes
                else if (tags.amenity === "restaurant" || tags.amenity === "cafe") {
                    category = "restaurants";
                }
                // Religious Places
                else if (tags.amenity === "place_of_worship") {
                    category = "religious";
                }
                // Banks & ATMs
                else if (tags.amenity === "bank" || tags.amenity === "atm") {
                    category = "banks";
                }
                // Fuel Stations
                else if (tags.amenity === "fuel") {
                    category = "fuelStations";
                }
                // Police Stations
                else if (tags.amenity === "police") {
                    category = "police";
                }
                // Hotels
                else if (tags.tourism === "hotel") {
                    category = "hotels";
                }
                // Gyms
                else if (tags.leisure === "fitness_centre" || tags.leisure === "gym") {
                    category = "gyms";
                }

                return { name, lat: placeLat, lng: placeLng, distance: parseFloat(distance.toFixed(2)), category, tags };
            }).filter(Boolean);

            // Group by category, sort by distance, and return all (no slice here - we'll handle in component)
            return {
                education: places.filter(p => p.category === "education").sort((a, b) => a.distance - b.distance),
                healthcare: places.filter(p => p.category === "healthcare").sort((a, b) => a.distance - b.distance),
                airports: places.filter(p => p.category === "airports").sort((a, b) => a.distance - b.distance),
                busStations: places.filter(p => p.category === "busStations").sort((a, b) => a.distance - b.distance),
                railStations: places.filter(p => p.category === "railStations").sort((a, b) => a.distance - b.distance),
                shopping: places.filter(p => p.category === "shopping").sort((a, b) => a.distance - b.distance),
                parks: places.filter(p => p.category === "parks").sort((a, b) => a.distance - b.distance),
                restaurants: places.filter(p => p.category === "restaurants").sort((a, b) => a.distance - b.distance),
                religious: places.filter(p => p.category === "religious").sort((a, b) => a.distance - b.distance),
                banks: places.filter(p => p.category === "banks").sort((a, b) => a.distance - b.distance),
                fuelStations: places.filter(p => p.category === "fuelStations").sort((a, b) => a.distance - b.distance),
                police: places.filter(p => p.category === "police").sort((a, b) => a.distance - b.distance),
                hotels: places.filter(p => p.category === "hotels").sort((a, b) => a.distance - b.distance),
                gyms: places.filter(p => p.category === "gyms").sort((a, b) => a.distance - b.distance)
            };
        }
    });

    useEffect(() => {
        const fetchGeoData = async () => {
            try {
                const [divR, disR, upzR, thaR] = await Promise.all([
                    fetch('/divisions.json'), 
                    fetch('/districts.json'), 
                    fetch('/upzillas.json'),
                    fetch('/thanas.json')
                ]);
                const [div, dis, upz, tha] = await Promise.all([
                    divR.json(), 
                    disR.json(), 
                    upzR.json(),
                    thaR.json()
                ]);
                setGeoMaps({
                    divisionMap: new Map(div.map(d => [String(d.id), d.name])),
                    districtMap: new Map(dis.map(d => [String(d.id), d.name])),
                    // Combine upazilas and thanas
                    upazilaMap: new Map([
                        ...upz.map(u => [String(u.id), u.name]),
                        ...tha.map(t => [String(t.id), t.name])
                    ])
                });
            } catch (err) { console.error("Geo data error", err); }
        };
        fetchGeoData();
    }, []);

    const {
        title, images, listingType, propertyType, price, address, areaSqFt, overview, amenities, location,
        // Dynamic fields based on propertyType
        roomCount,
        bathrooms,
        floorCount,
        totalUnits,
        // Legacy fields for backward compatibility
        unitCount,
    } = property || {};

    // Calculate premium flag
    const isPremium = useMemo(() => {
        if (!price || !listingType) return false;
        return (listingType === "rent" && Number(price) > 50000) || (listingType === "sale" && Number(price) > 100000);
    }, [price, listingType]);

    const decodedLocation = useMemo(() => {
        if (!address || geoMaps.divisionMap.size === 0) return address?.street || "Loading...";
        return [
            address.street,
            geoMaps.upazilaMap.get(String(address.upazila_id)),
            geoMaps.districtMap.get(String(address.district_id)),
            geoMaps.divisionMap.get(String(address.division_id))
        ].filter(Boolean).join(", ");
    }, [address, geoMaps]);

    const appraisal = property?.aiAppraisal || null;
    const appraisalFairPrice = Number(appraisal?.fairPrice) || 0;
    const appraisalMinPrice = Number(appraisal?.minPrice) || 0;
    const appraisalMaxPrice = Number(appraisal?.maxPrice) || 0;
    const appraisalConfidence = appraisal?.confidence || "medium";
    const appraisalSummary = appraisal?.summary || "AI appraisal is not available for this property yet.";
    const appraisalReasoning = Array.isArray(appraisal?.reasoning) ? appraisal.reasoning : [];
    const appraisalMarketPosition = appraisal?.marketPosition || "fairly-priced";
    const hasAppraisal = appraisalFairPrice > 0;

    // Format Date: 3 December, 2025
    const formatDate = (dateString) => {
        if (!dateString) return "Joining Date N/A";
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleDateString('en-GB', { month: 'long' });
        const year = date.getFullYear();

        return `${day} ${month}, ${year}`;
    };

    if (!user || propLoading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-white">
            <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
            <p className="font-black text-gray-400 animate-pulse uppercase text-xs tracking-widest">Loading Property...</p>
        </div>
    );

    return (
        <div className="bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-100 min-h-screen pt-10 pb-20">
            <div className="w-11/12 mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* LEFT SIDE */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="w-full h-[550px] bg-gray-200 rounded-lg overflow-hidden shadow-sm border border-gray-100">
                        <Swiper modules={[Pagination, Autoplay]} pagination={{ clickable: true }} autoplay={{ delay: 5000 }} loop={true} className="h-full w-full">
                            {images?.map((img, idx) => (
                                <SwiperSlide key={idx}><img src={img} alt={title} className="w-full h-full object-cover object-center" /></SwiperSlide>
                            ))}
                        </Swiper>
                    </div>

                    <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
                        <div className="flex flex-wrap gap-2 mb-6">
                            <span className="bg-slate-900 text-white text-sm font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-md uppercase">
                                <Tag size={14} /> {listingType}
                            </span>
                            {isPremium && (
                                <span className="bg-orange-500 text-white text-sm font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                                    <Star size={14} fill="currentColor" /> Premium
                                </span>
                            )}
                            <span
                                className={`text-sm font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border
                                    ${ownerProfile?.nidVerified === "verified" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white/40 text-red-600 border-red-100"}`}
                                style={{ backdropFilter: "saturate(120%) blur(4px)" }}
                            >
                                {ownerProfile?.nidVerified === "verified" ? <><CheckCircle size={14} /> Verified</> : <><XCircle size={14} /> Unverified</>}
                            </span>
                            <button
                                onClick={async () => {
                                    if (!property?._id) return;
                                    if (wishlist.isInWishlist(property._id)) {
                                        await wishlist.toggle(property._id);
                                    } else {
                                        setIsWishlistModalOpen(true);
                                    }
                                }}
                                className={`text-sm font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border transition ${
                                    wishlist.isInWishlist(property?._id)
                                        ? 'bg-red-50 text-red-600 border-red-200'
                                        : 'bg-white text-gray-600 border-gray-200 hover:text-red-500 hover:border-red-200'
                                }`}
                                title={wishlist.isInWishlist(property?._id) ? 'Remove from wishlist' : 'Add to wishlist'}
                            >
                                <Heart size={14} fill={wishlist.isInWishlist(property?._id) ? 'currentColor' : 'none'} />
                                Wishlist
                            </button>
                        </div>

                        <div className="mb-4">
                            <h1 className="text-4xl font-black text-gray-900 leading-tight">{title}</h1>
                        </div>

                        <div className="flex items-center gap-2 text-gray-500 mb-8">
                            <MapPin size={18} className="text-orange-500 shrink-0" />
                            <span className="font-semibold text-gray-600">{decodedLocation}</span>
                        </div>

                        <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-6 py-6 border-y border-gray-100">
                            {propertyType === "building" ? (
                                <>
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-orange-50 text-orange-500 rounded-md">
                                            <Layers size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-xl">{floorCount || unitCount || "N/A"}</p>
                                            <p className="text-[10px] uppercase font-bold text-gray-400">Floors</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-yellow-50 text-yellow-600 rounded-md"><Bed size={20} /></div>
                                        <div>
                                            <p className="font-black text-xl">{totalUnits || "N/A"}</p>
                                            <p className="text-[10px] uppercase font-bold text-gray-400">Total Units</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-orange-50 text-orange-500 rounded-md">
                                            <Bed size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-xl">{roomCount || unitCount || "N/A"}</p>
                                            <p className="text-[10px] uppercase font-bold text-gray-400">Rooms</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-yellow-50 text-yellow-600 rounded-md"><Bath size={20} /></div>
                                        <div>
                                            <p className="font-black text-xl">{bathrooms || "N/A"}</p>
                                            <p className="text-[10px] uppercase font-bold text-gray-400">Baths</p>
                                        </div>
                                    </div>
                                </>
                            )}
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-orange-50 text-orange-500 rounded-md"><Square size={20} /></div>
                                <div>
                                    <p className="font-black text-xl">{areaSqFt}</p>
                                    <p className="text-[10px] uppercase font-bold text-gray-400">Sq Ft</p>
                                </div>
                            </div>
                            <div className="col-span-2 md:ml-auto md:text-right">
                                <p className="text-4xl font-black text-gray-900">৳{price?.toLocaleString()}</p>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
                                    {listingType === 'rent' ? 'per Month' : 'Total Price'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="h-[500px] rounded-lg overflow-hidden border-[6px] border-white shadow-md bg-white">
                        <PropertyDetailsMap 
                            location={location} 
                            title={title} 
                            nearbyPlaces={nearbyPlaces}
                            selectedPlace={selectedPlace}
                            onPlaceSelect={setSelectedPlace}
                        />
                    </div>

                    <NearbyPlaces 
                        nearbyPlaces={nearbyPlaces} 
                        isLoading={nearbyPlacesLoading}
                        onPlaceClick={(place) => setSelectedPlace(place)}
                    />
                </div>

                {/* RIGHT SIDE */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
                        <h3 className="text-xs font-black mb-6 text-gray-400 uppercase tracking-[0.3em]">Property Owner</h3>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-16 h-16 rounded-md bg-orange-50 flex items-center justify-center overflow-hidden border border-orange-100">
                                {ownerProfile?.profileImage ? (
                                    <img src={ownerProfile.profileImage} className="w-full h-full object-cover" alt="owner" />
                                ) : (
                                    <User size={30} className="text-orange-200" />
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-black text-gray-900 text-xl">{ownerProfile?.name || 'Anonymous'}</h4>
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50">
                                        <Star size={12} className="text-amber-500" fill="currentColor" />
                                        <span className="text-xs font-bold text-amber-700">{ownerProfile?.rating?.average || "0"}</span>
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                                    <CheckCircle size={10} /> Member since {formatDate(ownerProfile?.createdAt)}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {/* Show Apply button only if property is active and user is not the owner */}
                            {property?.status === 'active' && 
                             property?.owner?.email !== user?.email && (
                                <>
                                    {hasApplied ? (
                                        <div className="w-full py-4 bg-blue-50 text-blue-700 rounded-md font-bold text-sm text-center flex items-center justify-center gap-2 border border-blue-200">
                                            <CheckCircle size={16} /> You have already applied for this property
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setIsApplicationModalOpen(true)}
                                            className="w-full py-4 bg-orange-600 text-white rounded-md font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-orange-700 transition-all shadow-lg shadow-orange-100"
                                        >
                                            <Send size={16} /> Apply Now
                                        </button>
                                    )}
                                </>
                            )}
                            <button onClick={() => navigate(`/owner-profile/${ownerProfile?.email}`)} className="w-full py-4 bg-gray-50 text-gray-600 rounded-md font-black uppercase text-[10px] tracking-[0.2em] hover:bg-gray-100 transition-all border border-gray-100">
                                View Full Profile
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
                        <h3 className="text-xl font-black text-gray-900 mb-4">Property Description</h3>
                        <p className="text-gray-500 leading-relaxed font-medium mb-8 text-sm">{overview}</p>
                        <h3 className="text-xs font-black text-gray-400 mb-6 border-t pt-8 uppercase tracking-[0.3em]">Key Amenities</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {amenities?.map((item, i) => (
                                <div key={i} className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-md border border-gray-100/50">
                                    <CheckCircle size={14} className="text-orange-500" />
                                    <span className="text-xs font-bold text-gray-700">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-9 rounded-lg shadow-xl text-white relative overflow-hidden border border-slate-700/80">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.14),transparent_34%)]" />
                        <Sparkles className="absolute -right-8 -top-8 opacity-10 rotate-12 text-orange-200" size={160} />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between gap-3 mb-5">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-white/8 border border-white/10">
                                        <ShieldCheck size={18} className="text-orange-200" />
                                    </div>
                                    <h3 className="font-black uppercase text-[10px] tracking-[0.2em] text-slate-100">AI Market Appraisal</h3>
                                </div>
                                {hasAppraisal && (
                                    <span className="px-2.5 py-1 rounded-full bg-emerald-400/10 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200 border border-emerald-300/20">
                                        {appraisalConfidence} Confidence
                                    </span>
                                )}
                            </div>
                            {hasAppraisal ? (
                                <>
                                    <p className="text-4xl font-black mb-2 text-white">{`৳${appraisalFairPrice.toLocaleString()}`}</p>
                                    <p className="text-xs font-bold text-slate-300 uppercase tracking-[0.18em] mb-5">
                                        Fair {listingType === 'rent' ? 'Monthly Rent' : 'Market Price'} in BDT
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="rounded-md bg-white/6 backdrop-blur-sm p-3 border border-white/10">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Estimated Range</p>
                                            <p className="text-sm font-bold text-slate-100">{`৳${appraisalMinPrice.toLocaleString()} - ৳${appraisalMaxPrice.toLocaleString()}`}</p>
                                        </div>
                                        <div className="rounded-md bg-white/6 backdrop-blur-sm p-3 border border-white/10">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Listed Price Status</p>
                                            <p className="text-sm font-bold capitalize text-slate-100">{appraisalMarketPosition.replace('-', ' ')}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-200 leading-relaxed mb-4">
                                        {appraisalSummary}
                                    </p>
                                    {appraisalReasoning.length > 0 && (
                                        <div className="space-y-2">
                                            {appraisalReasoning.map((reason, index) => (
                                                <div key={index} className="flex items-start gap-2 text-xs font-semibold text-slate-200">
                                                    <Check size={14} className="shrink-0 mt-0.5 text-emerald-300" />
                                                    <span>{reason}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm font-semibold text-slate-200 leading-relaxed max-w-[90%]">
                                    {appraisalSummary}
                                </p>
                            )}
                        </div>
                    </div>

                    <button 
                        onClick={() => {
                            comparison.addProperty(property);
                            navigate('/compare');
                        }}
                        className="w-full py-4 bg-blue-600 text-white rounded-md font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 border border-blue-500"
                    >
                        <Scale size={18} /> 
                        {comparison.isPropertySelected(property?._id) ? (
                            <>Added - Go to Comparison ({comparison.selectedCount}/5)</>
                        ) : (
                            <>Compare With Other Properties</>
                        )}
                    </button>

                </div>
            </div>

            {/* Application Modal */}
            <ApplicationModal
                isOpen={isApplicationModalOpen}
                onClose={() => setIsApplicationModalOpen(false)}
                property={property}
            />

            <WishlistNoteModal
                isOpen={isWishlistModalOpen}
                title={property?.title}
                onClose={() => setIsWishlistModalOpen(false)}
                onSave={async (note) => {
                    if (!property?._id) return;
                    await wishlist.toggle(property._id, note || '');
                }}
            />
        </div>
    );
};

export default PropertyDetails;
