import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, MapPin, ChevronDown } from "lucide-react";
import { Typewriter } from "react-simple-typewriter";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";

// Swiper
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";

// Import images
import bannerImg1 from "../assets/banner-1.jpg";
import bannerImg2 from "../assets/banner-2.jpg";
import bannerImg3 from "../assets/banner-3.jpg";
import bannerImg4 from "../assets/banner-4.jpg";
import bannerImg5 from "../assets/banner-5.jpg";
import bannerImg6 from "../assets/banner-6.jpg";
import bannerImg7 from "../assets/banner-7.jpg";
import bannerImg8 from "../assets/banner-8.jpg";

const images = [
    bannerImg8,
    bannerImg2,
    bannerImg3,
    bannerImg4,
    bannerImg5,
    bannerImg6,
    bannerImg7,
    bannerImg1,
];

const Banner = () => {
    return (
        <section className="w-full flex flex-col bg-gray-100">
            {/* Image Slider */}
            <div className="relative w-full h-[30vh] md:h-[50vh] lg:h-[90vh]">
                <Swiper
                    modules={[Autoplay, EffectFade]}
                    effect="fade"
                    fadeEffect={{ crossFade: true }}
                    slidesPerView={1}
                    speed={1200}
                    autoplay={{ delay: 5000, disableOnInteraction: false }}
                    loop
                    className="h-full w-full"
                >
                    {images.map((img, index) => (
                        <SwiperSlide key={index}>
                            <div
                                className="w-full h-full bg-cover bg-center transition-transform duration-1000"
                                style={{ backgroundImage: `url(${img})` }}
                            >
                                <div className="absolute inset-0 bg-black/45" />
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>

                {/* Text Content */}
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
                    {/* Capsule */}
                    <div className="flex items-center gap-2 px-3 py-1 lg:px-4 lg:py-2 rounded-md 
              bg-orange-500/20 backdrop-blur-md border border-orange-400/30 
              text-orange-300 text-[10px] md:text-xs lg:text-sm font-semibold mb-3 lg:mb-6">
                        <Sparkles size={14} className="lg:w-[18px]" />
                        <span className="uppercase tracking-widest">Premium Real Estate</span>
                    </div>

                    {/* Title*/}
                    <h1 className="text-xl md:text-4xl lg:text-7xl font-extrabold text-white max-w-5xl leading-tight">
                        <Typewriter
                            words={["Discover Extraordinary Properties"]}
                            loop={1}
                            cursor
                            cursorStyle="|"
                            typeSpeed={70}
                        />
                    </h1>

                    {/* Subtitle */}
                    <p className="mt-2 md:mt-4 lg:mt-6 text-gray-200 text-[10px] md:text-base lg:text-xl max-w-2xl font-light">
                        <Typewriter
                            words={[
                                "Luxury living with verified properties in prestigious locations across Bangladesh",
                            ]}
                            loop={1}
                            typeSpeed={40}
                            delaySpeed={1500}
                        />
                    </p>
                </div>

                {/* Search Card - Desktop (overlapping slider) */}
                <div className="hidden lg:block absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-30 w-full max-w-5xl px-4">
                    <SearchCard />
                </div>
            </div>

            {/* Search Card - Mobile & Tablet (stacked under slider) */}
            <div className="lg:hidden w-full px-4 py-8 bg-gray-100 z-30">
                <SearchCard />
            </div>

            {/* Spacer for Desktop */}
            <div className="hidden lg:block h-36"></div>
        </section>
    );
};

const SearchCard = () => {
    const navigate = useNavigate();

    // Fetch geo data
    const { data: divisions = [] } = useQuery({
        queryKey: ["divisions"],
        queryFn: () => fetch("/divisions.json").then(res => res.json())
    });
    const { data: districts = [] } = useQuery({
        queryKey: ["districts"],
        queryFn: () => fetch("/districts.json").then(res => res.json())
    });
    const { data: upazilas = [] } = useQuery({
        queryKey: ["upazilas"],
        queryFn: () => fetch("/upzillas.json").then(res => res.json())
    });

    // Filter states
    const [selectedDivision, setSelectedDivision] = useState("");
    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [selectedUpazila, setSelectedUpazila] = useState("");
    const [listingType, setListingType] = useState("all");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [minArea, setMinArea] = useState("");
    const [maxArea, setMaxArea] = useState("");
    const [propertyType, setPropertyType] = useState("all");

    // Reset cascading selects
    useEffect(() => {
        if (selectedDivision) {
            setSelectedDistrict("");
            setSelectedUpazila("");
        }
    }, [selectedDivision]);

    useEffect(() => {
        if (selectedDistrict) {
            setSelectedUpazila("");
        }
    }, [selectedDistrict]);

    // Filter options based on selection
    const filteredDistricts = districts.filter(
        d => String(d.division_id) === String(selectedDivision)
    );
    const filteredUpazilas = upazilas.filter(
        u => String(u.district_id) === String(selectedDistrict)
    );

    // Build URL and navigate
    const handleSearch = () => {
        const params = new URLSearchParams();

        if (selectedDivision) params.append("division_id", selectedDivision);
        if (selectedDistrict) params.append("district_id", selectedDistrict);
        if (selectedUpazila) params.append("upazila_id", selectedUpazila);
        if (listingType !== "all") params.append("listingType", listingType);
        if (minPrice) params.append("minPrice", minPrice);
        if (maxPrice) params.append("maxPrice", maxPrice);
        if (minArea) params.append("minArea", minArea);
        if (maxArea) params.append("maxArea", maxArea);
        if (propertyType !== "all") params.append("propertyType", propertyType);

        const queryString = params.toString();
        navigate(`/properties${queryString ? `?${queryString}` : ""}`);
    };

    // Reusable styles
    const baseInputStyle = "w-full p-3 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all";
    const selectStyle = `${baseInputStyle} cursor-pointer appearance-none`;
    const inputStyle = `${baseInputStyle}`;

    // Reusable filter field component
    const FilterField = ({ label, children, className = "" }) => (
        <div className={className}>
            <label className="block text-xs font-semibold text-gray-700 mb-2">{label}</label>
            {children}
        </div>
    );

    // Location select component
    const LocationSelect = ({ value, onChange, options, placeholder, disabled = false, hasMapIcon = false }) => (
        <div className="relative">
            {hasMapIcon ? (
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={16} />
            ) : (
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={16} />
            )}
            <select
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={`${selectStyle} pl-10 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <option value="">{placeholder}</option>
                {options.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
            </select>
        </div>
    );

    // Regular select component with dropdown icon
    const SelectWithIcon = ({ value, onChange, children, disabled = false }) => (
        <div className="relative">
            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={16} />
            <select
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={`${selectStyle} pl-10 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {children}
            </select>
        </div>
    );

    return (
        <div className="bg-white rounded-lg shadow-2xl p-6 lg:p-8 border border-gray-100">
            {/* Desktop Layout - Two Rows */}
            <div className="hidden lg:block space-y-4">
                {/* Row 1: Location & Type Filters */}
                <div className="grid grid-cols-5 gap-4">
                    <FilterField label="Division">
                        <LocationSelect
                            value={selectedDivision}
                            onChange={(e) => setSelectedDivision(e.target.value)}
                            options={divisions}
                            placeholder="Any Division"
                            hasMapIcon={true}
                        />
                    </FilterField>

                    <FilterField label="District">
                        <LocationSelect
                            value={selectedDistrict}
                            onChange={(e) => setSelectedDistrict(e.target.value)}
                            options={filteredDistricts}
                            placeholder="Any District"
                            disabled={!selectedDivision}
                        />
                    </FilterField>

                    <FilterField label="Upazila">
                        <LocationSelect
                            value={selectedUpazila}
                            onChange={(e) => setSelectedUpazila(e.target.value)}
                            options={filteredUpazilas}
                            placeholder="Any Upazila"
                            disabled={!selectedDistrict}
                        />
                    </FilterField>

                    <FilterField label="Listing Type">
                        <SelectWithIcon
                            value={listingType}
                            onChange={(e) => setListingType(e.target.value)}
                        >
                            <option value="all">All</option>
                            <option value="sale">For Sale</option>
                            <option value="rent">For Rent</option>
                        </SelectWithIcon>
                    </FilterField>

                    <FilterField label="Property Type">
                        <SelectWithIcon
                            value={propertyType}
                            onChange={(e) => setPropertyType(e.target.value)}
                        >
                            <option value="all">All Types</option>
                            <option value="flat">Residential Apartment/Flat</option>
                            <option value="building">Building</option>
                        </SelectWithIcon>
                    </FilterField>
                </div>

                {/* Row 2: Price, Area & Search Button */}
                <div className="grid grid-cols-5 gap-4">
                    <FilterField label="Min Price (?)">
                        <input
                            type="number"
                            placeholder="Min"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            className={inputStyle}
                        />
                    </FilterField>

                    <FilterField label="Max Price (?)">
                        <input
                            type="number"
                            placeholder="Max"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            className={inputStyle}
                        />
                    </FilterField>

                    <FilterField label="Min Area (SqFt)">
                        <input
                            type="number"
                            placeholder="Min"
                            value={minArea}
                            onChange={(e) => setMinArea(e.target.value)}
                            className={inputStyle}
                        />
                    </FilterField>

                    <FilterField label="Max Area (SqFt)">
                        <input
                            type="number"
                            placeholder="Max"
                            value={maxArea}
                            onChange={(e) => setMaxArea(e.target.value)}
                            className={inputStyle}
                        />
                    </FilterField>

                    <div className="flex items-end">
                        <button
                            onClick={handleSearch}
                            className="w-full py-3 rounded-md text-white font-bold bg-gradient-to-r from-orange-500 to-yellow-500 hover:brightness-110 hover:shadow-lg transition-all active:scale-95 shadow-orange-200 flex items-center justify-center gap-2"
                        >
                            <span>Search</span>
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile/Tablet Layout */}
            <div className="lg:hidden space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FilterField label="Division">
                        <LocationSelect
                            value={selectedDivision}
                            onChange={(e) => setSelectedDivision(e.target.value)}
                            options={divisions}
                            placeholder="Any Division"
                            hasMapIcon={true}
                        />
                    </FilterField>

                    <FilterField label="District">
                        <LocationSelect
                            value={selectedDistrict}
                            onChange={(e) => setSelectedDistrict(e.target.value)}
                            options={filteredDistricts}
                            placeholder="Any District"
                            disabled={!selectedDivision}
                        />
                    </FilterField>

                    <FilterField label="Upazila">
                        <LocationSelect
                            value={selectedUpazila}
                            onChange={(e) => setSelectedUpazila(e.target.value)}
                            options={filteredUpazilas}
                            placeholder="Any Upazila"
                            disabled={!selectedDistrict}
                        />
                    </FilterField>

                    <FilterField label="Listing Type">
                        <SelectWithIcon
                            value={listingType}
                            onChange={(e) => setListingType(e.target.value)}
                        >
                            <option value="all">All</option>
                            <option value="sale">For Sale</option>
                            <option value="rent">For Rent</option>
                        </SelectWithIcon>
                    </FilterField>

                    <FilterField label="Property Type">
                        <SelectWithIcon
                            value={propertyType}
                            onChange={(e) => setPropertyType(e.target.value)}
                        >
                            <option value="all">All Types</option>
                            <option value="flat">Residential Apartment/Flat</option>
                            <option value="building">Building</option>
                        </SelectWithIcon>
                    </FilterField>

                    <FilterField label="Min Price (?)">
                        <input
                            type="number"
                            placeholder="Min Price"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            className={inputStyle}
                        />
                    </FilterField>

                    <FilterField label="Max Price (?)">
                        <input
                            type="number"
                            placeholder="Max Price"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            className={inputStyle}
                        />
                    </FilterField>

                    <FilterField label="Min Area (SqFt)">
                        <input
                            type="number"
                            placeholder="Min Area"
                            value={minArea}
                            onChange={(e) => setMinArea(e.target.value)}
                            className={inputStyle}
                        />
                    </FilterField>

                    <FilterField label="Max Area (SqFt)">
                        <input
                            type="number"
                            placeholder="Max Area"
                            value={maxArea}
                            onChange={(e) => setMaxArea(e.target.value)}
                            className={inputStyle}
                        />
                    </FilterField>
                </div>

                <button
                    onClick={handleSearch}
                    className="w-full py-4 rounded-md text-white font-bold bg-gradient-to-r from-orange-500 to-yellow-500 hover:brightness-110 hover:shadow-lg transition-all active:scale-95 shadow-orange-200 flex items-center justify-center gap-2"
                >
                    <span>Search Properties</span>
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default Banner;
