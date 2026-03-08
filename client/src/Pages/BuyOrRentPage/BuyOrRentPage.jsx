import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import useAxios from "../../Hooks/useAxios";
import PropertyCard from "./PropertyCard";
import BuyOrRentMap from "./BuyOrRentMap";
import Loading from "../../Components/Loading";
import GhorAI from "../../Components/GhorAI";
import {
    Search,
    SlidersHorizontal,
    LayoutGrid,
    Map as MapIcon,
    RotateCcw,
    Check,
    ChevronDown
} from "lucide-react";
import useAuth from "../../Hooks/useAuth";

const PAGE_SIZE = 12;
const initialFilterState = {
    divisionId: "",
    districtId: "",
    upazilaId: "",
    minPrice: "",
    maxPrice: "",
    propertyType: "all",
    minArea: "",
    maxArea: "",
    onlyVerified: false,
    listingType: "all"
};

const buildFiltersFromSearchParams = (params) => ({
    divisionId: params.get("division_id") || "",
    districtId: params.get("district_id") || "",
    upazilaId: params.get("upazila_id") || "",
    minPrice: params.get("minPrice") || "",
    maxPrice: params.get("maxPrice") || "",
    propertyType: params.get("propertyType") || "all",
    minArea: params.get("minArea") || "",
    maxArea: params.get("maxArea") || "",
    onlyVerified: params.get("onlyVerified") === "true",
    listingType: params.get("listingType") || "all"
});

const BuyOrRentPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const axiosInstance = useAxios();
    const { user: authUser, loading: authLoading } = useAuth();

    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState("grid");
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);


    // Filter Logic States - Initialize from URL params
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
    const [sortBy, setSortBy] = useState("newest");
    const [tempFilters, setTempFilters] = useState(() => buildFiltersFromSearchParams(searchParams));
    const [appliedFilters, setAppliedFilters] = useState(() => buildFiltersFromSearchParams(searchParams));

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [divisions, setDivisions] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [upazilas, setUpazilas] = useState([]);
    const [thanas, setThanas] = useState([]);

    const fetchGeoFiles = useCallback(async () => {
        const [divisionsRes, districtsRes, upzillasRes, thanasRes] = await Promise.all([
            fetch("/divisions.json"),
            fetch("/districts.json"),
            fetch("/upzillas.json"),
            fetch("/thanas.json"),
        ]);
        const [divisions, districts, upzillas, thanas] = await Promise.all([
            divisionsRes.json(),
            districtsRes.json(),
            upzillasRes.json(),
            thanasRes.json(),
        ]);
        const divisionMap = new Map(divisions.map((d) => [d.id, d.name]));
        const districtMap = new Map(districts.map((d) => [d.id, d.name]));
        // Combine upazilas and thanas into one map
        const upzilaMap = new Map([
            ...upzillas.map((u) => [u.id, u.name]),
            ...thanas.map((t) => [t.id, t.name])
        ]);
        return { divisionMap, districtMap, upzilaMap };
    }, []);

    const fetchProperties = useCallback(async () => {
        try {
            if (!authUser) {
                setProperties([]);
                return;
            }
            const token = await authUser.getIdToken();
            const res = await axiosInstance.get("/active-properties", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!Array.isArray(res.data)) {
                setProperties([]);
                return;
            }

            const { divisionMap, districtMap, upzilaMap } = await fetchGeoFiles();
            const ownerEmails = Array.from(new Set(res.data.map((p) => p.owner?.email).filter(Boolean)));

            let ownerInfoMap = new Map();
            if (ownerEmails.length) {
                const ownersRes = await axiosInstance.get(`/users-by-emails?emails=${encodeURIComponent(ownerEmails.join(","))}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (Array.isArray(ownersRes.data)) {
                    ownersRes.data.forEach((u) => ownerInfoMap.set(u.email, u));
                }
            }

            const safeProperties = res.data.map((prop) => {
                const imageUrl = Array.isArray(prop.images) && prop.images.length > 0 ? prop.images[0] : prop.image || null;
                const area = prop.areaSqFt ?? prop.area ?? 0;
                const rating = prop.rating?.average ?? prop.rating ?? 0;
                const listingType = prop.listingType ?? "rent";
                const propertyType = prop.propertyType ?? "flat";

                // Map dynamic fields based on propertyType
                let beds, baths;
                if (propertyType === "building") {
                    // For building: use floorCount and totalUnits
                    beds = prop.floorCount ?? prop.unitCount ?? 0;
                    baths = prop.totalUnits ?? 0;
                } else {
                    // For flat: use roomCount and bathrooms
                    beds = prop.roomCount ?? prop.unitCount ?? prop.beds ?? 0;
                    baths = prop.bathrooms ?? prop.baths ?? 0;
                }

                const addressObj = prop.address || {};
                const upazilaName = upzilaMap.get(addressObj.upazila_id) || "";
                const districtName = districtMap.get(addressObj.district_id) || "";
                const divisionName = divisionMap.get(addressObj.division_id) || "";
                const addressString = [addressObj.street, upazilaName, districtName, divisionName].filter(Boolean).join(", ");

                const ownerEmail = prop.owner?.email;
                const ownerInfo = ownerInfoMap.get(ownerEmail) || {};
                const ownerRating = ownerInfo.rating?.average ?? ownerInfo.rating ?? 0;
                const ownerNidVerified = ownerInfo.nidVerified === "verified";
                const isVerified = !!prop.isOwnerVerified || ownerNidVerified;
                const isPremium = (listingType === "rent" && Number(prop.price) > 50000) || (listingType === "sale" && Number(prop.price) > 100000);

                return {
                    ...prop,
                    image: imageUrl,
                    beds, baths, area, rating, listingType, propertyType, addressString, ownerRating, ownerNidVerified, isVerified, isPremium,
                };
            });

            setProperties(safeProperties);
            setCurrentPage(1);
        } catch (error) {
            console.error("Error fetching properties:", error);
            setProperties([]);
        } finally {
            setLoading(false);
        }
    }, [authUser, axiosInstance, fetchGeoFiles]);

    useEffect(() => {
        if (!authLoading) {
            setLoading(true);
            fetchProperties();
        }
    }, [authLoading, fetchProperties]);

    useEffect(() => {
        const loadGeoData = async () => {
            try {
                const [divisionsRes, districtsRes, upzillasRes, thanasRes] = await Promise.all([
                    fetch("/divisions.json"),
                    fetch("/districts.json"),
                    fetch("/upzillas.json"),
                    fetch("/thanas.json"),
                ]);
                const [divisionsData, districtsData, upazilasData, thanasData] = await Promise.all([
                    divisionsRes.json(),
                    districtsRes.json(),
                    upzillasRes.json(),
                    thanasRes.json(),
                ]);
                setDivisions(divisionsData);
                setDistricts(districtsData);
                setUpazilas(upazilasData);
                setThanas(thanasData);
            } catch (error) {
                console.error("Failed to load geo options:", error);
            }
        };
        loadGeoData();
    }, []);

    // Keep UI filters synced with URL params (from banner and direct navigation)
    useEffect(() => {
        setSearchQuery(searchParams.get("search") || "");
        const parsedFilters = buildFiltersFromSearchParams(searchParams);
        setTempFilters(parsedFilters);
        setAppliedFilters(parsedFilters);
    }, [searchParams]);

    const filteredDistricts = useMemo(() => (
        districts.filter((d) => String(d.division_id) === String(tempFilters.divisionId))
    ), [districts, tempFilters.divisionId]);

    const filteredUpazilas = useMemo(() => {
        const upazilaItems = upazilas.filter((u) => String(u.district_id) === String(tempFilters.districtId));
        const thanaItems = thanas.filter((t) => String(t.district_id) === String(tempFilters.districtId));
        return [...upazilaItems, ...thanaItems];
    }, [upazilas, thanas, tempFilters.districtId]);

    const filteredProperties = useMemo(() => {
        let result = [...properties];
        if (appliedFilters.divisionId) result = result.filter(p => String(p.address?.division_id) === String(appliedFilters.divisionId));
        if (appliedFilters.districtId) result = result.filter(p => String(p.address?.district_id) === String(appliedFilters.districtId));
        if (appliedFilters.upazilaId) result = result.filter(p => String(p.address?.upazila_id) === String(appliedFilters.upazilaId));

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p => p.title?.toLowerCase().includes(q) || p.addressString?.toLowerCase().includes(q));
        }
        if (appliedFilters.minPrice) result = result.filter(p => Number(p.price) >= Number(appliedFilters.minPrice));
        if (appliedFilters.maxPrice) result = result.filter(p => Number(p.price) <= Number(appliedFilters.maxPrice));
        if (appliedFilters.minArea) result = result.filter(p => Number(p.area) >= Number(appliedFilters.minArea));
        if (appliedFilters.maxArea) result = result.filter(p => Number(p.area) <= Number(appliedFilters.maxArea));
        if (appliedFilters.propertyType !== "all") result = result.filter(p => p.propertyType === appliedFilters.propertyType);
        if (appliedFilters.listingType !== "all") result = result.filter(p => p.listingType === appliedFilters.listingType);
        if (appliedFilters.onlyVerified) result = result.filter(p => p.isVerified);

        result.sort((a, b) => {
            if (sortBy === "priceLow") return a.price - b.price;
            if (sortBy === "priceHigh") return b.price - a.price;
            if (sortBy === "rating") return b.rating - a.rating;
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        return result;
    }, [properties, searchQuery, appliedFilters, sortBy]);

    const handleApplyFilters = () => {
        setAppliedFilters(tempFilters);
        setCurrentPage(1);
        setShowFilters(false);
        const nextParams = new URLSearchParams();
        if (searchQuery.trim()) nextParams.set("search", searchQuery.trim());
        if (tempFilters.divisionId) nextParams.set("division_id", tempFilters.divisionId);
        if (tempFilters.districtId) nextParams.set("district_id", tempFilters.districtId);
        if (tempFilters.upazilaId) nextParams.set("upazila_id", tempFilters.upazilaId);
        if (tempFilters.listingType !== "all") nextParams.set("listingType", tempFilters.listingType);
        if (tempFilters.propertyType !== "all") nextParams.set("propertyType", tempFilters.propertyType);
        if (tempFilters.minPrice) nextParams.set("minPrice", tempFilters.minPrice);
        if (tempFilters.maxPrice) nextParams.set("maxPrice", tempFilters.maxPrice);
        if (tempFilters.minArea) nextParams.set("minArea", tempFilters.minArea);
        if (tempFilters.maxArea) nextParams.set("maxArea", tempFilters.maxArea);
        if (tempFilters.onlyVerified) nextParams.set("onlyVerified", "true");
        setSearchParams(nextParams, { replace: true });
    };

    const handleResetFilters = () => {
        setTempFilters(initialFilterState);
        setAppliedFilters(initialFilterState);
        setSearchQuery("");
        setCurrentPage(1);
        setSearchParams({}, { replace: true });
    };

    const totalItems = filteredProperties.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filteredProperties.slice(startIdx, startIdx + PAGE_SIZE);

    const renderPager = () => {
        if (totalPages <= 1) return null;
        const pages = Array.from({ length: Math.min(7, totalPages) }, (_, i) => i + 1);
        return (
            <div className="flex items-center justify-center gap-2 mt-8">
                {pages.map((p) => (
                    <button key={p} onClick={() => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className={`px-3 py-2 rounded-md ${p === currentPage ? 'bg-orange-500 text-white' : 'bg-white border'}`}>
                        {p}
                    </button>
                ))}
            </div>
        );
    };

    // LAND AT TOP & FORCED INITIAL LOADING (0.25s)
    useEffect(() => {
        window.scrollTo(0, 0);
        const timer = setTimeout(() => {
            setInitialLoading(false);
        }, 250);
        return () => clearTimeout(timer);
    }, []);

    if (loading || authLoading || initialLoading) {
        return <Loading />;
    }

    return (
        <div className="min-h-screen bg-gray-100 py-6 lg:py-10">
            {/* Ghor AI Assistant */}
            <GhorAI />
            
            <div className="w-11/12 mx-auto mb-10 space-y-6">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by location or property title..."
                            className="w-full pl-12 pr-4 py-4 rounded-md border border-gray-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all shadow-sm bg-white"
                        />
                    </div>

                    <div className="flex gap-2">
                        <div className="relative flex items-center">
                            <ChevronDown className="absolute left-3 text-gray-400 pointer-events-none" size={18} />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="pl-8 pr-3 py-4 rounded-md border border-gray-200 bg-white font-medium text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-slate-900 appearance-none cursor-pointer text-left min-w-[105px]"
                            >
                                <option value="newest">Newest</option>
                                <option value="priceLow">Price: Low to High</option>
                                <option value="priceHigh">Price: High to Low</option>
                                <option value="rating">Top Rated</option>
                            </select>
                        </div>

                        <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center justify-center gap-2 px-6 py-4 rounded-md font-medium transition-all shadow-sm border ${showFilters ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}>
                            <SlidersHorizontal size={20} /> Filters
                        </button>
                    </div>
                </div>

                {showFilters && (
                    <div className="bg-white p-6 rounded-lg shadow-2xl border border-gray-100 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-slate-700">Division</label>
                                <select
                                    className="w-full p-3 bg-slate-50 border border-gray-200 rounded-md text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all"
                                    value={tempFilters.divisionId}
                                    onChange={(e) => setTempFilters({
                                        ...tempFilters,
                                        divisionId: e.target.value,
                                        districtId: "",
                                        upazilaId: ""
                                    })}
                                >
                                    <option value="">Any Division</option>
                                    {divisions.map((division) => (
                                        <option key={division.id} value={division.id}>{division.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-slate-700">District</label>
                                <select
                                    className="w-full p-3 bg-slate-50 border border-gray-200 rounded-md text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all disabled:opacity-50"
                                    value={tempFilters.districtId}
                                    disabled={!tempFilters.divisionId}
                                    onChange={(e) => setTempFilters({
                                        ...tempFilters,
                                        districtId: e.target.value,
                                        upazilaId: ""
                                    })}
                                >
                                    <option value="">Any District</option>
                                    {filteredDistricts.map((district) => (
                                        <option key={district.id} value={district.id}>{district.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-slate-700">Upazila / Thana</label>
                                <select
                                    className="w-full p-3 bg-slate-50 border border-gray-200 rounded-md text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all disabled:opacity-50"
                                    value={tempFilters.upazilaId}
                                    disabled={!tempFilters.districtId}
                                    onChange={(e) => setTempFilters({ ...tempFilters, upazilaId: e.target.value })}
                                >
                                    <option value="">Any Upazila/Thana</option>
                                    {filteredUpazilas.map((location) => (
                                        <option key={location.id} value={location.id}>{location.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-slate-700">Price Range (৳)</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" placeholder="Min" className="w-full p-3 bg-slate-50 border border-gray-200 rounded-md text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all" value={tempFilters.minPrice} onChange={(e) => setTempFilters({ ...tempFilters, minPrice: e.target.value })} />
                                    <input type="number" placeholder="Max" className="w-full p-3 bg-slate-50 border border-gray-200 rounded-md text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all" value={tempFilters.maxPrice} onChange={(e) => setTempFilters({ ...tempFilters, maxPrice: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-slate-700">Area (SqFt)</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" placeholder="Min" className="w-full p-3 bg-slate-50 border border-gray-200 rounded-md text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all" value={tempFilters.minArea} onChange={(e) => setTempFilters({ ...tempFilters, minArea: e.target.value })} />
                                    <input type="number" placeholder="Max" className="w-full p-3 bg-slate-50 border border-gray-200 rounded-md text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all" value={tempFilters.maxArea} onChange={(e) => setTempFilters({ ...tempFilters, maxArea: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-slate-700">Property Type</label>
                                <select className="w-full p-3 bg-slate-50 border border-gray-200 rounded-md text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all" value={tempFilters.propertyType} onChange={(e) => setTempFilters({ ...tempFilters, propertyType: e.target.value })}>
                                    <option value="all">All Types</option>
                                    <option value="flat">Flat</option>
                                    <option value="building">Building</option>
                                </select>
                            </div>
                            <div className="space-y-3 lg:col-span-2">
                                <label className="text-sm font-bold text-slate-700">Listing Status</label>
                                <select className="w-full p-3 bg-slate-50 border border-gray-200 rounded-md text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all" value={tempFilters.listingType} onChange={(e) => setTempFilters({ ...tempFilters, listingType: e.target.value })}>
                                    <option value="all">Sale & Rent</option>
                                    <option value="sale">For Sale</option>
                                    <option value="rent">For Rent</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row items-center justify-between pt-4 border-t border-gray-100 gap-4">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input type="checkbox" checked={tempFilters.onlyVerified} onChange={(e) => setTempFilters({ ...tempFilters, onlyVerified: e.target.checked })} className="peer appearance-none w-6 h-6 border-2 border-gray-300 rounded-md checked:bg-orange-500 checked:border-orange-500 transition-all" />
                                    <Check className="absolute w-4 h-4 text-white left-1 opacity-0 peer-checked:opacity-100 transition-opacity" />
                                </div>
                                <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Show only verified owners</span>
                            </label>

                            <div className="flex items-center gap-3 w-full lg:w-auto">
                                <button onClick={handleResetFilters} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-gray-500 hover:text-red-600 transition-colors">
                                    <RotateCcw size={16} /> Reset
                                </button>
                                <button onClick={handleApplyFilters} className="flex-1 lg:flex-none bg-orange-500 hover:bg-orange-600 text-white px-10 py-3 rounded-md font-bold shadow-lg shadow-orange-200 transition-all active:scale-95">
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">
                            {totalItems} Properties Found
                        </h1>
                    </div>
                    <div className="flex w-fit self-start lg:self-auto bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                        <button onClick={() => setViewMode("grid")} className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-orange-500 text-white shadow-inner" : "text-gray-400 hover:text-gray-600"}`}>
                            <LayoutGrid size={20} />
                        </button>
                        <button onClick={() => setViewMode("map")} className={`p-2 rounded-md transition-all ${viewMode === "map" ? "bg-orange-500 text-white shadow-inner" : "text-gray-400 hover:text-gray-600"}`}>
                            <MapIcon size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === "grid" ? (
                <>
                    {totalItems === 0 ? (
                        <div className="w-11/12 mx-auto">
                            {/* Empty State Message */}
                            <div className="bg-white rounded-lg p-12 border border-gray-100 shadow-sm">
                                <div className="text-center">
                                    <div className="mb-6 flex justify-center">
                                        <div className="w-24 h-24 rounded-lg bg-orange-100 flex items-center justify-center">
                                            <Search className="text-orange-500" size={48} />
                                        </div>
                                    </div>
                                    <h2 className="text-3xl font-black text-gray-900">No Properties Found</h2>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="w-11/12 mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 pb-6">
                                {pageItems.map((property) => (
                                    <div key={property._id} onClick={() => navigate(`/property-details/${property._id}`)}>
                                        <PropertyCard property={property} />
                                    </div>
                                ))}
                            </div>
                            {renderPager()}
                        </>
                    )}
                </>
            ) : (
                <div className="w-11/12 mx-auto h-[600px] bg-white rounded-lg overflow-hidden border border-gray-100">
                    <BuyOrRentMap properties={filteredProperties} onMarkerClick={(id) => navigate(`/property-details/${id}`)} />
                </div>
            )}
        </div>
    );
};

export default BuyOrRentPage;
