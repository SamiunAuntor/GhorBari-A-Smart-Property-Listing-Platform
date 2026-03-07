import { useForm } from "react-hook-form";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import useAxios from "../../Hooks/useAxios";
import MapPicker from "../../Components/MapPicker";
import useAuth from "../../Hooks/useAuth";
import {
    PlusCircle, Home, MapPin, Layers, CheckCircle,
    Info, Upload, X, FileText, Image as ImageIcon, Loader2, AlertCircle
} from "lucide-react";
import { uploadImageToImgBB } from "../../Utilities/UploadImage";
import { showToast } from "../../Utilities/ToastMessage";

const AMENITIES = [
    "Air Conditioning", "Parking Space", "24/7 Security", "Elevator",
    "Backup Generator", "Gas Connection", "Water Supply", "Balcony",
    "CCTV", "Fire Safety", "Playground", "Gym",
    "Electricity Connection", "Internet/WiFi", "Fully Furnished"
];

const DIVISION_COORDS = {
    dhaka: [23.8103, 90.4125],
    chattagram: [22.3569, 91.7832],
    khulna: [22.8456, 89.5403],
    barisal: [22.7010, 90.3535],
    sylhet: [24.8949, 91.8687],
    mymensingh: [24.7465, 90.4081],
    rajshahi: [24.3745, 88.6042],
    rangpur: [25.7439, 89.2752],
};

const DESCRIPTION_REQUIRED_FIELDS = [
    "title",
    "listingType",
    "propertyType",
    "price",
    "areaSqFt",
    "division_id",
    "district_id",
    "upazila_id",
    "address"
];

const getLabelById = (items, id) => items.find(item => String(item.id) === String(id))?.name || "";

const AddProperty = () => {
    const { user } = useAuth();
    const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm();
    const [mapView, setMapView] = useState({ center: [23.6850, 90.3563], zoom: 7 });
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [isEstimatingPrice, setIsEstimatingPrice] = useState(false);
    const [priceEstimate, setPriceEstimate] = useState(null);
    const lastUpdateRef = useRef({ division: null, district: null, upazila: null });
    const axios = useAxios();

    const { data: divisions = [] } = useQuery({ queryKey: ["divs"], queryFn: () => fetch("/divisions.json").then(res => res.json()) });
    const { data: districts = [] } = useQuery({ queryKey: ["dists"], queryFn: () => fetch("/districts.json").then(res => res.json()) });
    const { data: upazilas = [] } = useQuery({ queryKey: ["upzs"], queryFn: () => fetch("/upzillas.json").then(res => res.json()) });
    const { data: thanas = [] } = useQuery({ queryKey: ["thanas"], queryFn: () => fetch("/thanas.json").then(res => res.json()) });

    const listingType = watch("listingType");
    const propertyType = watch("propertyType");
    const watchDiv = watch("division_id");
    const watchDist = watch("district_id");
    const watchUpazila = watch("upazila_id");
    const watchCoords = watch("coordinates");
    const watchTitle = watch("title");
    const watchPrice = watch("price");
    const watchAreaSqFt = watch("areaSqFt");
    const watchRoomCount = watch("roomCount");
    const watchBathrooms = watch("bathrooms");
    const watchFloorCount = watch("floorCount");
    const watchTotalUnits = watch("totalUnits");
    const watchOverview = watch("overview");
    const watchAmenities = watch("amenities");

    useEffect(() => {
        if (watchDiv && lastUpdateRef.current.division !== watchDiv) {
            const div = divisions.find(d => String(d.id) === String(watchDiv));
            const coords = div ? DIVISION_COORDS[div.name.toLowerCase()] : null;
            if (coords) setMapView({ center: coords, zoom: 8 });
            setValue("district_id", "");
            setValue("upazila_id", "");
            lastUpdateRef.current.division = watchDiv;
        }
    }, [watchDiv, divisions, setValue]);

    useEffect(() => {
        if (watchDist && lastUpdateRef.current.district !== watchDist) {
            const dist = districts.find(d => String(d.id) === String(watchDist));
            if (dist?.lat && dist.lon) {
                setMapView({ center: [parseFloat(dist.lat), parseFloat(dist.lon)], zoom: 11 });
                lastUpdateRef.current.district = watchDist;
            }
            setValue("upazila_id", "");
        }
    }, [watchDist, districts, setValue]);

    useEffect(() => {
        if (watchUpazila && lastUpdateRef.current.upazila !== watchUpazila) {
            // Check upazilas first
            let location = upazilas.find(u => String(u.id) === String(watchUpazila));
            // If not found, check thanas
            if (!location) {
                location = thanas.find(t => String(t.id) === String(watchUpazila));
            }
            if (location?.lat && location.lon) {
                setMapView({ center: [parseFloat(location.lat), parseFloat(location.lon)], zoom: 13 });
                lastUpdateRef.current.upazila = watchUpazila;
            }
        }
    }, [watchUpazila, upazilas, thanas]);

    useEffect(() => {
        setPriceEstimate(null);
    }, [listingType, propertyType, watchDiv, watchDist, watchUpazila, watchAreaSqFt, watchRoomCount, watchBathrooms, watchFloorCount, watchTotalUnits, watchAmenities]);

    const handleFilesChange = (e) => {
        const files = Array.from(e.target.files);
        if (selectedFiles.length + files.length > 10) {
            return showToast("Maximum 10 images allowed", "error");
        }
        setSelectedFiles(prev => [...prev, ...files]);
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const canGenerateDescription = () => {
        const baseFieldsReady = DESCRIPTION_REQUIRED_FIELDS.every((field) => {
            const value = watch(field);
            return value !== undefined && value !== null && String(value).trim() !== "";
        });

        if (!baseFieldsReady) {
            return false;
        }

        if (Number(watchPrice) <= 0 || Number(watchAreaSqFt) <= 0) {
            return false;
        }

        if (propertyType === "flat") {
            return Number(watchRoomCount) >= 1 && Number(watchBathrooms) >= 1;
        }

        if (propertyType === "building") {
            return Number(watchFloorCount) >= 1 && Number(watchTotalUnits) >= 1;
        }

        return false;
    };

    const canEstimatePrice = () => {
        const requiredValues = [
            listingType,
            propertyType,
            watchDiv,
            watchDist,
            watchUpazila,
            watch("address")
        ];

        if (requiredValues.some((value) => value === undefined || value === null || String(value).trim() === "")) {
            return false;
        }

        if (Number(watchAreaSqFt) <= 0) {
            return false;
        }

        if (propertyType === "flat") {
            return Number(watchRoomCount) >= 1 && Number(watchBathrooms) >= 1;
        }

        if (propertyType === "building") {
            return Number(watchFloorCount) >= 1 && Number(watchTotalUnits) >= 1;
        }

        return false;
    };

    const handleEstimatePrice = async () => {
        if (!canEstimatePrice()) {
            showToast("Fill the core property details first", "error");
            return;
        }

        setIsEstimatingPrice(true);

        try {
            const token = await user?.getIdToken();
            const payload = {
                listingType,
                propertyType,
                areaSqFt: Number(watchAreaSqFt),
                roomCount: propertyType === "flat" ? Number(watchRoomCount) : undefined,
                bathrooms: propertyType === "flat" ? Number(watchBathrooms) : undefined,
                floorCount: propertyType === "building" ? Number(watchFloorCount) : undefined,
                totalUnits: propertyType === "building" ? Number(watchTotalUnits) : undefined,
                divisionName: getLabelById(divisions, watchDiv),
                districtName: getLabelById(districts, watchDist),
                upazilaName: getLabelById(upazilas, watchUpazila) || getLabelById(thanas, watchUpazila),
                address: watch("address"),
                amenities: Array.isArray(watchAmenities) ? watchAmenities : watchAmenities ? [watchAmenities] : []
            };

            const { data } = await axios.post("/api/ai/estimate-property-price", payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!data?.success || !data?.estimate) {
                throw new Error(data?.error || "Failed to estimate price");
            }

            setPriceEstimate(data.estimate);
            showToast("Price estimate generated", "success");
        } catch (error) {
            showToast(error?.response?.data?.error || "Could not estimate price right now", "error");
        } finally {
            setIsEstimatingPrice(false);
        }
    };

    const handleGenerateDescription = async () => {
        if (!canGenerateDescription()) {
            showToast("Fill the main property details first", "error");
            return;
        }

        setIsGeneratingDescription(true);

        try {
            const token = await user?.getIdToken();
            const payload = {
                title: watchTitle,
                listingType,
                propertyType,
                price: Number(watchPrice),
                areaSqFt: Number(watchAreaSqFt),
                roomCount: propertyType === "flat" ? Number(watchRoomCount) : undefined,
                bathrooms: propertyType === "flat" ? Number(watchBathrooms) : undefined,
                floorCount: propertyType === "building" ? Number(watchFloorCount) : undefined,
                totalUnits: propertyType === "building" ? Number(watchTotalUnits) : undefined,
                divisionName: getLabelById(divisions, watchDiv),
                districtName: getLabelById(districts, watchDist),
                upazilaName: getLabelById(upazilas, watchUpazila) || getLabelById(thanas, watchUpazila),
                address: watch("address"),
                amenities: Array.isArray(watchAmenities) ? watchAmenities : watchAmenities ? [watchAmenities] : []
            };

            const { data } = await axios.post("/api/ai/generate-property-description", payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!data?.success || !data?.description) {
                throw new Error(data?.error || "Failed to generate description");
            }

            setValue("overview", data.description, { shouldDirty: true, shouldValidate: true });
            showToast("Description generated successfully", "success");
        } catch (error) {
            showToast(error?.response?.data?.error || "Could not generate description right now", "error");
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    const onSubmit = async (data) => {
        if (!watchCoords) return showToast("Please pin your location on the map", "error");
        if (selectedFiles.length < 1) return showToast("Please upload at least one image", "error");

        setIsSubmitting(true);
        try {
            const uploadedUrls = [];
            for (let file of selectedFiles) {
                const url = await uploadImageToImgBB(file);
                uploadedUrls.push(url);
            }

            const token = await user?.getIdToken();
            const payload = {
                ...data,
                images: uploadedUrls,
                price: Number(data.price),
                areaSqFt: Number(data.areaSqFt),
                address: {
                    division_id: data.division_id,
                    district_id: data.district_id,
                    upazila_id: data.upazila_id,
                    street: data.address
                },
                location: data.coordinates,
                createdAt: new Date().toISOString()
            };

            // Dynamic fields based on property type
            if (data.propertyType === "building") {
                payload.floorCount = Number(data.floorCount);
                payload.totalUnits = Number(data.totalUnits);
            } else if (data.propertyType === "flat") {
                payload.roomCount = Number(data.roomCount);
                payload.bathrooms = Number(data.bathrooms);
            }

            await axios.post("/post-property", payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            showToast("Property listed successfully!", "success");
            reset();
            setSelectedFiles([]);
            setPriceEstimate(null);
            setMapView({ center: [23.6850, 90.3563], zoom: 7 });
            lastUpdateRef.current = { division: null, district: null, upazila: null };

        } catch {
            showToast("Failed to list property. Check connection.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper to render error messages
    const ErrorMsg = ({ name }) => errors[name] && (
        <span className="flex items-center gap-1 mt-1.5 text-[10px] font-bold text-red-500 uppercase tracking-tight">
            <AlertCircle size={10} /> {errors[name]?.message || "This field is required"}
        </span>
    );

    const inputStyle = (fieldName) => `w-full px-4 py-3 bg-gray-50/50 border ${errors[fieldName] ? 'border-red-300 ring-2 ring-red-50' : 'border-gray-200 focus:border-orange-500 focus:ring-orange-500/5'} rounded-md focus:bg-white focus:ring-4 outline-none transition-all text-gray-700 font-medium placeholder:text-gray-400`;
    const labelStyle = "block text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-widest";
    const sectionTitle = "text-xl font-bold text-gray-800 flex items-center gap-2 mb-6";

    return (
        <section className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-100 py-12">
            <div className="w-11/12 mx-auto">
                {/* Header Section */}
                <div className="mb-12">
                    <div className="text-center md:text-left">
                        
                        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">
                            Add New <span className="bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">Property</span>
                        </h1>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <fieldset disabled={isSubmitting} className="contents">
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-7 space-y-8">
                        <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-100">
                            <h3 className={sectionTitle}><Home className="text-orange-500" size={20} /> Property Essentials</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className={labelStyle}>Property Title</label>
                                    <input {...register("title", { required: "Title is required", minLength: { value: 10, message: "Min 10 characters required" } })} className={inputStyle("title")} placeholder="e.g. Modern 3-Bedroom Apartment" />
                                    <ErrorMsg name="title" />
                                </div>
                                <div>
                                    <label className={labelStyle}>Listing Type</label>
                                    <select {...register("listingType", { required: "Select a listing type" })} className={inputStyle("listingType")}>
                                        <option value="">Select Purpose</option>
                                        <option value="rent">Rent Out</option>
                                        <option value="sale">Sell</option>
                                    </select>
                                    <ErrorMsg name="listingType" />
                                </div>
                                <div>
                                    <label className={labelStyle}>Property Type</label>
                                    <select {...register("propertyType", { required: "Select a property type" })} className={inputStyle("propertyType")}>
                                        <option value="">Select Category</option>
                                        <option value="flat">Residential Flat</option>
                                        <option value="building">Commercial/Full Building</option>
                                    </select>
                                    <ErrorMsg name="propertyType" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-100">
                            <h3 className={sectionTitle}><MapPin className="text-orange-500" size={20} /> Location Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div>
                                    <label className={labelStyle}>Division</label>
                                    <select {...register("division_id", { required: "Required" })} className={inputStyle("division_id")}>
                                        <option value="">Select</option>
                                        {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                    <ErrorMsg name="division_id" />
                                </div>
                                <div>
                                    <label className={labelStyle}>District</label>
                                    <select {...register("district_id", { required: "Required" })} className={inputStyle("district_id")} disabled={isSubmitting || !watchDiv}>
                                        <option value="">Select</option>
                                        {districts.filter(d => String(d.division_id) === String(watchDiv)).map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                    <ErrorMsg name="district_id" />
                                </div>
                                <div>
                                    <label className={labelStyle}>Upazila/Thana</label>
                                    <select {...register("upazila_id", { required: "Required" })} className={inputStyle("upazila_id")} disabled={isSubmitting || !watchDist}>
                                        <option value="">Select</option>
                                        {upazilas.filter(u => String(u.district_id) === String(watchDist)).map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                        {thanas.filter(t => String(t.district_id) === String(watchDist)).map(t => (
                                            <option key={`thana-${t.id}`} value={t.id}>{t.name} (Thana)</option>
                                        ))}
                                    </select>
                                    <ErrorMsg name="upazila_id" />
                                </div>
                            </div>
                            <div className="mb-6">
                                <label className={labelStyle}>Street Address/Area</label>
                                <input {...register("address", { required: "Street address is required" })} className={inputStyle("address")} placeholder="House, Road, Area..." />
                                <ErrorMsg name="address" />
                            </div>
                            <div className={`rounded-lg overflow-hidden border ${!watchCoords && errors.submitCount > 0 ? 'border-red-300' : 'border-gray-100'} h-[400px] shadow-inner relative`}>
                                <MapPicker setValue={setValue} flyTo={mapView} disabled={isSubmitting} />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="lg:col-span-5 space-y-8">
                        <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-100">
                            <h3 className={sectionTitle}><Layers className="text-orange-500" size={20} /> Specifications</h3>
                            <div className="space-y-6">
                                <div className="bg-orange-50/50 p-6 rounded-md border border-orange-100">
                                    <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2 block">
                                        {listingType === "rent" ? "Monthly Rent" : "Asking Price"} (BDT)
                                    </label>
                                    <input type="number" min="0" {...register("price", { required: "Price is required", min: { value: 0, message: "Cannot be negative" } })} className="w-full bg-transparent border-none text-3xl font-black text-gray-900 outline-none placeholder:text-orange-200" placeholder="000,000" />
                                    <ErrorMsg name="price" />
                                    <div className="mt-4 flex flex-wrap items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={handleEstimatePrice}
                                            disabled={isSubmitting || isEstimatingPrice || !canEstimatePrice()}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white text-slate-700 border border-orange-200 font-bold text-xs uppercase tracking-wider hover:border-orange-300 hover:text-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isEstimatingPrice ? <Loader2 size={14} className="animate-spin" /> : <Info size={14} />}
                                            {isEstimatingPrice ? "Estimating..." : "Estimate Price"}
                                        </button>
                                        <span className="text-[10px] font-bold text-orange-700/80 uppercase tracking-wider">
                                            AI helper based on the filled property details
                                        </span>
                                    </div>
                                    {priceEstimate && (
                                        <div className="mt-4 rounded-md bg-white/80 border border-orange-200 p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-600 mb-1">Estimated Price</p>
                                                    <p className="text-2xl font-black text-slate-900">৳{Number(priceEstimate.estimatedPrice || 0).toLocaleString()}</p>
                                                    <p className="text-[11px] font-semibold text-slate-500 mt-1">
                                                        Range: ৳{Number(priceEstimate.minPrice || 0).toLocaleString()} - ৳{Number(priceEstimate.maxPrice || 0).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Confidence</p>
                                                    <p className="text-sm font-bold text-slate-700 capitalize">{priceEstimate.confidence || "medium"}</p>
                                                </div>
                                            </div>
                                            {Array.isArray(priceEstimate.reasoning) && priceEstimate.reasoning.length > 0 && (
                                                <div className="space-y-1.5">
                                                    {priceEstimate.reasoning.slice(0, 3).map((reason, index) => (
                                                        <p key={index} className="text-[11px] font-semibold text-slate-600 flex items-start gap-2">
                                                            <CheckCircle size={12} className="text-orange-500 shrink-0 mt-0.5" />
                                                            <span>{reason}</span>
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setValue("price", Number(priceEstimate.estimatedPrice || 0), { shouldDirty: true, shouldValidate: true })}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-orange-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-orange-700 transition-all"
                                            >
                                                Use This Price
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {propertyType === "flat" ? (
                                        <>
                                            <div>
                                                <label className={labelStyle}>Rooms</label>
                                                <input type="number" min="1" {...register("roomCount", { required: "Required", min: 1 })} className={inputStyle("roomCount")} placeholder="Count" />
                                                <ErrorMsg name="roomCount" />
                                            </div>
                                            <div>
                                                <label className={labelStyle}>Baths</label>
                                                <input type="number" min="1" {...register("bathrooms", { required: "Required", min: 1 })} className={inputStyle("bathrooms")} placeholder="Count" />
                                                <ErrorMsg name="bathrooms" />
                                            </div>
                                        </>
                                    ) : propertyType === "building" ? (
                                        <>
                                            <div>
                                                <label className={labelStyle}>Floors</label>
                                                <input type="number" min="1" {...register("floorCount", { required: "Required", min: 1 })} className={inputStyle("floorCount")} placeholder="Count" />
                                                <ErrorMsg name="floorCount" />
                                            </div>
                                            <div>
                                                <label className={labelStyle}>Total Units</label>
                                                <input type="number" min="1" {...register("totalUnits", { required: "Required", min: 1 })} className={inputStyle("totalUnits")} placeholder="Count" />
                                                <ErrorMsg name="totalUnits" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="col-span-2 text-sm text-gray-500">Please select a property type first</div>
                                    )}
                                </div>
                                <div>
                                    <label className={labelStyle}>Area (Sq Ft)</label>
                                    <input type="number" min="0" {...register("areaSqFt", { required: "Area is required", min: { value: 0, message: "Cannot be negative" } })} className={inputStyle("areaSqFt")} placeholder="e.g. 1500" />
                                    <ErrorMsg name="areaSqFt" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-100">
                            <h3 className={sectionTitle}><ImageIcon className="text-orange-500" size={20} /> Property Media</h3>
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-100 rounded-md cursor-pointer hover:bg-orange-50 transition-colors group">
                                <Upload className="text-gray-300 group-hover:text-orange-400 transition-colors mb-2" size={32} />
                                <span className="text-xs font-bold text-gray-400 group-hover:text-orange-500 uppercase tracking-tighter">Click to upload images</span>
                                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFilesChange} disabled={isSubmitting} />
                            </label>
                            {selectedFiles.length === 0 && <span className="block text-[10px] font-bold text-gray-400 mt-2 text-center uppercase">At least 1 image is required</span>}

                            {selectedFiles.length > 0 && (
                                <div className="mt-6">
                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                        {selectedFiles.map((file, idx) => (
                                            <div key={idx} className="relative flex-shrink-0">
                                                <img src={URL.createObjectURL(file)} alt="preview" className="w-16 h-16 object-cover rounded-md border border-gray-100" />
                                                <button type="button" onClick={() => removeFile(idx)} className="absolute -top-1 -right-1 bg-white shadow text-red-500 rounded-full p-1 border border-gray-100" disabled={isSubmitting}>
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-100">
                            <h3 className={sectionTitle}><CheckCircle className="text-orange-500" size={20} /> Amenities</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {AMENITIES.map(item => (
                                    <label key={item} className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" value={item} {...register("amenities")} className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500/20 transition-all" />
                                        <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 transition-colors">{item}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* OVERVIEW */}
                    <div className="lg:col-span-12">
                        <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-100">
                            <h3 className={sectionTitle}><Info className="text-orange-500" size={20} /> Detailed Overview</h3>
                            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <p className="text-xs font-medium text-gray-500">
                                    Let AI draft a clean property description from your filled details. You can edit it freely before posting.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleGenerateDescription}
                                    disabled={isSubmitting || isGeneratingDescription || !canGenerateDescription()}
                                    className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition-all ${
                                        isSubmitting || isGeneratingDescription || !canGenerateDescription()
                                            ? "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
                                            : "border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100"
                                    }`}
                                >
                                    {isGeneratingDescription ? (
                                        <>
                                            <Loader2 className="animate-spin" size={14} />
                                            Generating...
                                        </>
                                    ) : watchOverview?.trim() ? (
                                        "Regenerate Description"
                                    ) : (
                                        "Generate Description"
                                    )}
                                </button>
                            </div>
                            <textarea {...register("overview", { required: "Detailed description is required", minLength: { value: 20, message: "Please describe in at least 20 characters" } })} className={`${inputStyle("overview")} min-h-[150px] py-4 resize-none`} placeholder="Describe your property's best features..." />
                            <ErrorMsg name="overview" />
                        </div>
                    </div>

                    {/* SUBMIT BUTTON */}
                    <div className="lg:col-span-12 flex justify-center py-10">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`
                                flex items-center justify-center gap-3 px-20 py-5 rounded-lg font-black text-white uppercase tracking-[0.2em] transition-all
                                ${isSubmitting ? 'bg-orange-400 cursor-not-allowed scale-95' : 'bg-orange-600 hover:bg-orange-700 hover:shadow-2xl hover:shadow-orange-200 active:scale-95 shadow-xl'}
                            `}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Listing...
                                </>
                            ) : (
                                "List Your Property"
                            )}
                        </button>
                    </div>
                    </fieldset>
                </form>
            </div>
        </section>
    );
};

export default AddProperty;
