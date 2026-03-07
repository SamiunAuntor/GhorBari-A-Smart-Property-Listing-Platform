import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import useComparison from "../../Hooks/useComparison";
import useAxios from "../../Hooks/useAxios";
import useAuth from "../../Hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
import {
  X,
  MapPin,
  Bed,
  Bath,
  Square,
  Star,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Download,
  Share2,
  Loader2,
  Layers,
  Building2,
} from "lucide-react";

const ComparisonPage = () => {
  const { selectedProperties, removeProperty, clearAllProperties, addProperty } = useComparison();
  const axiosInstance = useAxios();
  const { user, loading: authLoading } = useAuth();
  const [allProperties, setAllProperties] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, sale, rent, flat, building
  const [displayCount, setDisplayCount] = useState(5); // Start with 5 properties
  const scrollContainerRef = useRef(null);

  // Fetch geo files for address mapping
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
    // Combine upazilas and thanas
    const upzilaMap = new Map([
      ...upzillas.map((u) => [u.id, u.name]),
      ...thanas.map((t) => [t.id, t.name]),
    ]);
    return { divisionMap, districtMap, upzilaMap };
  }, []);

  // Fetch all active properties
  const { data: propertiesData, isLoading } = useQuery({
    queryKey: ["all-properties-for-comparison", filterType],
    enabled: !!user && !authLoading,
    queryFn: async () => {
      const token = await user.getIdToken();
      const response = await axiosInstance.get("/active-properties", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!Array.isArray(response.data)) {
        return [];
      }

      const { divisionMap, districtMap, upzilaMap } = await fetchGeoFiles();
      const ownerEmails = Array.from(
        new Set(response.data.map((p) => p.owner?.email).filter(Boolean)),
      );

      let ownerInfoMap = new Map();
      if (ownerEmails.length) {
        const ownersRes = await axiosInstance.get(
          `/users-by-emails?emails=${encodeURIComponent(ownerEmails.join(","))}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (Array.isArray(ownersRes.data)) {
          ownersRes.data.forEach((u) => ownerInfoMap.set(u.email, u));
        }
      }

      // Process properties similar to BuyOrRentPage
      const processedProperties = response.data.map((prop) => {
        const imageUrl =
          Array.isArray(prop.images) && prop.images.length > 0
            ? prop.images[0]
            : prop.image || null;
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
        const addressString = [addressObj.street, upazilaName, districtName, divisionName]
          .filter(Boolean)
          .join(", ");

        const ownerEmail = prop.owner?.email;
        const ownerInfo = ownerInfoMap.get(ownerEmail) || {};
        const ownerRating = ownerInfo.rating?.average ?? ownerInfo.rating ?? 0;
        const ownerNidVerified = ownerInfo.nidVerified === "verified";
        const isVerified = !!prop.isOwnerVerified || ownerNidVerified;

        return {
          ...prop,
          image: imageUrl,
          beds,
          baths,
          area,
          listingType,
          propertyType,
          addressString,
          ownerRating,
          ownerNidVerified,
          isVerified,
          floorCount: prop.floorCount,
          totalUnits: prop.totalUnits,
        };
      });

      // Filter by listingType or propertyType if needed
      if (filterType !== "all") {
        if (filterType === "sale" || filterType === "rent") {
          return processedProperties.filter((p) => p.listingType === filterType);
        } else if (filterType === "flat") {
          return processedProperties.filter((p) => p.propertyType === "flat");
        } else if (filterType === "building") {
          return processedProperties.filter((p) => p.propertyType === "building");
        }
      }

      return processedProperties;
    },
  });

  useEffect(() => {
    if (propertiesData) {
      // Sort by newest first (by createdAt), then take the last 5 for initial display
      const sorted = [...propertiesData].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      setAllProperties(sorted);
    }
  }, [propertiesData]);

  // Filter properties based on search
  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) {
      return allProperties;
    }
    const query = searchQuery.toLowerCase();
    return allProperties.filter(
      (p) =>
        p.title?.toLowerCase().includes(query) || p.addressString?.toLowerCase().includes(query),
    );
  }, [allProperties, searchQuery]);

  // Get unselected properties
  const availableForComparison = useMemo(() => {
    return filteredProperties.filter((p) => !selectedProperties.find((sp) => sp._id === p._id));
  }, [filteredProperties, selectedProperties]);

  // Infinite scroll handler
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Load more when user scrolls near bottom (within 50px)
      if (scrollHeight - scrollTop - clientHeight < 50) {
        if (displayCount < availableForComparison.length) {
          setDisplayCount((prev) => Math.min(prev + 5, availableForComparison.length));
        }
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [displayCount, availableForComparison.length]);

  // Reset display count when search or filter changes
  useEffect(() => {
    setDisplayCount(5);
  }, [searchQuery, filterType]);

  const handleDownloadComparison = () => {
    // Create PDF using jsPDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const startY = 20;
    let yPos = startY;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Property Comparison", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    // Date
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, {
      align: "center",
    });
    yPos += 15;

    // Property headers
    const colWidth = (pageWidth - 2 * margin) / (selectedProperties.length + 1);
    const rowHeight = 8;
    let xPos = margin;

    // Header row
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(xPos, yPos, colWidth, rowHeight, "F");
    doc.text("Property", xPos + colWidth / 2, yPos + 5, { align: "center" });
    xPos += colWidth;

    selectedProperties.forEach((prop) => {
      doc.setFillColor(240, 240, 240);
      doc.rect(xPos, yPos, colWidth, rowHeight, "F");
      const title = doc.splitTextToSize(prop.title || "N/A", colWidth - 4);
      doc.text(title, xPos + colWidth / 2, yPos + 5, { align: "center", maxWidth: colWidth - 4 });
      xPos += colWidth;
    });

    yPos += rowHeight + 2;
    const dataRows = [
      { label: "Listing Type", getValue: (p) => p.listingType || "N/A" },
      { label: "Price", getValue: (p) => (p.price ? `${p.price.toLocaleString()} BDT` : "N/A") },
      { label: "Area", getValue: (p) => `${p.area || "N/A"} sq ft` },
      { label: "Rooms", getValue: (p) => p.roomCount || p.unitCount || "N/A" },
      { label: "Bathrooms", getValue: (p) => p.bathrooms || "N/A" },
      {
        label: "Floors",
        getValue: (p) => (p.propertyType === "building" ? p.floorCount || "N/A" : "N/A"),
      },
      {
        label: "Total Units",
        getValue: (p) => (p.propertyType === "building" ? p.totalUnits || "N/A" : "N/A"),
      },
      { label: "Location", getValue: (p) => p.addressString || "Unknown" },
      { label: "Owner", getValue: (p) => p.owner?.name || "Unknown" },
      {
        label: "Verified",
        getValue: (p) => (p.ownerNidVerified || p.isOwnerVerified || p.verified ? "Yes" : "No"),
      },
      {
        label: "AI Appraisal",
        getValue: (p) => {
          const fairPrice = Number(p?.aiAppraisal?.fairPrice) || 0;
          const minPrice = Number(p?.aiAppraisal?.minPrice) || 0;
          const maxPrice = Number(p?.aiAppraisal?.maxPrice) || 0;
          return fairPrice
            ? `${fairPrice.toLocaleString()} BDT (${minPrice.toLocaleString()}-${maxPrice.toLocaleString()})`
            : "N/A";
        },
      },
    ];

    dataRows.forEach((row) => {
      // Check if we need a new page
      if (yPos + rowHeight > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }

      xPos = margin;
      doc.setFont("helvetica", "bold");
      doc.setFillColor(240, 240, 240);
      doc.rect(xPos, yPos, colWidth, rowHeight, "F");
      doc.text(row.label, xPos + colWidth / 2, yPos + 5, { align: "center" });
      xPos += colWidth;

      selectedProperties.forEach((prop) => {
        doc.setFont("helvetica", "normal");
        doc.setFillColor(255, 255, 255);
        doc.rect(xPos, yPos, colWidth, rowHeight, "F");
        const value = row.getValue(prop);
        const text = doc.splitTextToSize(String(value), colWidth - 4);
        doc.text(text, xPos + colWidth / 2, yPos + 5, { align: "center", maxWidth: colWidth - 4 });
        xPos += colWidth;
      });

      yPos += rowHeight + 2;
    });

    // Save the PDF
    doc.save("property-comparison.pdf");
  };

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-bold">Please login to compare properties</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="w-11/12 mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">
            Property{" "}
            <span className="bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
              Comparison
            </span>
          </h1>
          <p className="text-gray-500 font-medium">Compare up to 5 properties side by side</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Side - Selected Properties for Comparison */}
          <div className="lg:col-span-3">
            {selectedProperties.length > 0 ? (
              <div className="space-y-6">
                {/* Comparison Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300">
                        <th className="px-6 py-4 text-left font-black text-gray-900 border-r border-gray-300">
                          Property
                        </th>
                        {selectedProperties.map((prop) => (
                          <th
                            key={prop._id}
                            className="px-6 py-4 text-center border-r border-gray-300 last:border-r-0"
                          >
                            <div className="relative group">
                              <button
                                onClick={() => removeProperty(prop._id)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition shadow-lg z-10"
                              >
                                <X size={14} />
                              </button>
                              <div className="text-center">
                                <p className="font-bold text-gray-900 line-clamp-2 text-xs mb-1">
                                  {prop.title}
                                </p>
                                <img
                                  src={
                                    prop.images?.[0] ||
                                    prop.image ||
                                    "https://i.ibb.co.com/zTBXMRzq/4284558.jpg"
                                  }
                                  alt={prop.title}
                                  className="w-24 h-24 object-cover rounded-md mx-auto"
                                />
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Listing Type Row */}
                      <tr className="border-b border-gray-300">
                        <td className="px-6 py-4 font-bold text-gray-900 bg-gray-50 border-r border-gray-300">
                          Listing Type
                        </td>
                        {selectedProperties.map((prop) => (
                          <td
                            key={prop._id}
                            className="px-6 py-4 text-center border-r border-gray-300 last:border-r-0"
                          >
                            <span className="inline-block bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded capitalize">
                              {prop.listingType}
                            </span>
                          </td>
                        ))}
                      </tr>

                      {/* Price Row */}
                      <tr className="border-b border-gray-300">
                        <td className="px-6 py-4 font-bold text-gray-900 bg-gray-50 border-r border-gray-300">
                          Price
                        </td>
                        {selectedProperties.map((prop) => (
                          <td
                            key={prop._id}
                            className="px-6 py-4 text-center border-r border-gray-300 last:border-r-0"
                          >
                            <div className="text-xl font-black text-gray-900">
                              ৳{prop.price?.toLocaleString()}
                            </div>
                            <p className="text-xs text-gray-500 font-medium">
                              {prop.listingType === "rent" ? "per month" : "total"}
                            </p>
                          </td>
                        ))}
                      </tr>

                      {/* Area Row */}
                      <tr className="border-b border-gray-300">
                        <td className="px-6 py-4 font-bold text-gray-900 bg-gray-50 border-r border-gray-300">
                          <div className="flex items-center gap-2">
                            <Square size={16} /> Area
                          </div>
                        </td>
                        {selectedProperties.map((prop) => (
                          <td
                            key={prop._id}
                            className="px-6 py-4 text-center border-r border-gray-300 last:border-r-0"
                          >
                            <p className="font-bold text-gray-900">{prop.area}</p>
                            <p className="text-xs text-gray-500">sq ft</p>
                          </td>
                        ))}
                      </tr>

                      {/* Rooms Row */}
                      <tr className="border-b border-gray-300">
                        <td className="px-6 py-4 font-bold text-gray-900 bg-gray-50 border-r border-gray-300">
                          <div className="flex items-center gap-2">
                            <Bed size={16} /> Rooms
                          </div>
                        </td>
                        {selectedProperties.map((prop) => (
                          <td
                            key={prop._id}
                            className="px-6 py-4 text-center border-r border-gray-300 last:border-r-0"
                          >
                            <p className="font-bold text-gray-900">
                              {prop.roomCount || prop.unitCount || "N/A"}
                            </p>
                          </td>
                        ))}
                      </tr>

                      {/* Bathrooms Row */}
                      <tr className="border-b border-gray-300">
                        <td className="px-6 py-4 font-bold text-gray-900 bg-gray-50 border-r border-gray-300">
                          <div className="flex items-center gap-2">
                            <Bath size={16} /> Bathrooms
                          </div>
                        </td>
                        {selectedProperties.map((prop) => (
                          <td
                            key={prop._id}
                            className="px-6 py-4 text-center border-r border-gray-300 last:border-r-0"
                          >
                            <p className="font-bold text-gray-900">{prop.bathrooms || "N/A"}</p>
                          </td>
                        ))}
                      </tr>

                      {/* Floors Row - For Buildings */}
                      <tr className="border-b border-gray-300">
                        <td className="px-6 py-4 font-bold text-gray-900 bg-gray-50 border-r border-gray-300">
                          <div className="flex items-center gap-2">
                            <Layers size={16} /> Floors
                          </div>
                        </td>
                        {selectedProperties.map((prop) => (
                          <td
                            key={prop._id}
                            className="px-6 py-4 text-center border-r border-gray-300 last:border-r-0"
                          >
                            <p className="font-bold text-gray-900">
                              {prop.propertyType === "building" ? prop.floorCount || "N/A" : "N/A"}
                            </p>
                          </td>
                        ))}
                      </tr>

                      {/* Total Units Row - For Buildings */}
                      <tr className="border-b border-gray-300">
                        <td className="px-6 py-4 font-bold text-gray-900 bg-gray-50 border-r border-gray-300">
                          <div className="flex items-center gap-2">
                            <Building2 size={16} /> Total Units
                          </div>
                        </td>
                        {selectedProperties.map((prop) => (
                          <td
                            key={prop._id}
                            className="px-6 py-4 text-center border-r border-gray-300 last:border-r-0"
                          >
                            <p className="font-bold text-gray-900">
                              {prop.propertyType === "building" ? prop.totalUnits || "N/A" : "N/A"}
                            </p>
                          </td>
                        ))}
                      </tr>

                      {/* Location Row */}
                      <tr className="border-b border-gray-300">
                        <td className="px-6 py-4 font-bold text-gray-900 bg-gray-50 border-r border-gray-300">
                          <div className="flex items-center gap-2">
                            <MapPin size={16} /> Location
                          </div>
                        </td>
                        {selectedProperties.map((prop) => (
                          <td
                            key={prop._id}
                            className="px-6 py-4 text-center text-xs border-r border-gray-300 last:border-r-0"
                          >
                            <p className="text-gray-700 line-clamp-2">
                              {prop.addressString || "Unknown"}
                            </p>
                          </td>
                        ))}
                      </tr>

                      {/* Owner Row */}
                      <tr className="border-b border-gray-300">
                        <td className="px-6 py-4 font-bold text-gray-900 bg-gray-50 border-r border-gray-300">
                          Owner
                        </td>
                        {selectedProperties.map((prop) => (
                          <td
                            key={prop._id}
                            className="px-6 py-4 text-center text-sm border-r border-gray-300 last:border-r-0"
                          >
                            <p className="font-bold text-gray-900">
                              {prop.owner?.name || "Unknown"}
                            </p>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <Star size={12} className="text-amber-500" fill="currentColor" />
                              <span className="text-xs font-bold text-amber-700">
                                {prop.ownerRating || "0"}
                              </span>
                            </div>
                          </td>
                        ))}
                      </tr>

                      {/* Verification Row */}
                      <tr className="border-b border-gray-300">
                        <td className="px-6 py-4 font-bold text-gray-900 bg-gray-50 border-r border-gray-300">
                          Verified
                        </td>
                        {selectedProperties.map((prop) => {
                          const rawVerified =
                            prop.ownerNidVerified ?? prop.isOwnerVerified ?? prop.verified;
                          const isVerified =
                            typeof rawVerified === "string"
                              ? rawVerified === "verified"
                              : Boolean(rawVerified);
                          return (
                            <td
                              key={prop._id}
                              className="px-6 py-4 text-center border-r border-gray-300 last:border-r-0"
                            >
                              <div className="flex items-center justify-center gap-1">
                                {isVerified ? (
                                  <>
                                    <CheckCircle size={18} className="text-emerald-500" />
                                    <span className="text-xs font-bold text-emerald-600">Yes</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle size={18} className="text-red-500" />
                                    <span className="text-xs font-bold text-red-600">No</span>
                                  </>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      {/* AI Appraisal Row */}
                      <tr>
                        <td className="px-6 py-4 font-bold text-gray-900 bg-gradient-to-r from-orange-50 to-yellow-50 border-r border-gray-300">
                          <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-orange-500" /> AI Appraisal
                          </div>
                        </td>
                        {selectedProperties.map((prop) => {
                          const fairPrice = Number(prop?.aiAppraisal?.fairPrice) || 0;
                          const minPrice = Number(prop?.aiAppraisal?.minPrice) || 0;
                          const maxPrice = Number(prop?.aiAppraisal?.maxPrice) || 0;
                          const confidence = prop?.aiAppraisal?.confidence || "";

                          return (
                            <td
                              key={prop._id}
                              className="px-6 py-4 text-center bg-gradient-to-r from-orange-50 to-yellow-50 border-r border-gray-300 last:border-r-0"
                            >
                              {fairPrice ? (
                                <>
                                  <p className="font-black text-orange-600 text-lg">
                                    {`৳${fairPrice.toLocaleString()}`}
                                  </p>
                                  <p className="text-[11px] text-gray-600 font-semibold mt-1">
                                    {`৳${minPrice.toLocaleString()} - ৳${maxPrice.toLocaleString()}`}
                                  </p>
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">
                                    {confidence} confidence
                                  </p>
                                </>
                              ) : (
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                  Not available
                                </p>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={handleDownloadComparison}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition shadow-lg shadow-green-100"
                  >
                    <Download size={18} /> Download Comparison
                  </button>
                  <button
                    onClick={() => {
                      const tableHTML = document.querySelector("table").outerHTML;
                      const blob = new Blob([tableHTML], { type: "text/html" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "comparison.html";
                      a.click();
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition shadow-lg shadow-purple-100"
                  >
                    <Share2 size={18} /> Share
                  </button>
                  <button
                    onClick={clearAllProperties}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition shadow-lg shadow-red-100 ml-auto"
                  >
                    <X size={18} /> Clear All
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
                <p className="text-gray-500 font-bold text-lg">
                  No properties selected for comparison
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Add properties from property details pages to compare
                </p>
              </div>
            )}
          </div>

          {/* Right Side - Add More Properties */}
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-orange-500">{selectedProperties.length}</span>
                <span>/ 5 Selected</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Search Properties
                  </label>
                  <input
                    type="text"
                    placeholder="Search by name or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full mt-2 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Filter by Type
                  </label>
                  <div className="relative mt-2">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 text-sm appearance-none bg-white"
                    >
                      <option value="all">All Properties</option>
                      <option value="sale">For Sale</option>
                      <option value="rent">For Rent</option>
                      <option value="flat">Residential Flat</option>
                      <option value="building">Commercial/Full Building</option>
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Available Properties */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h4 className="font-black text-gray-900 mb-4">Add More Properties</h4>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-orange-500" size={24} />
                </div>
              ) : availableForComparison.length > 0 ? (
                <div ref={scrollContainerRef} className="space-y-3 max-h-96 overflow-y-auto">
                  {availableForComparison.slice(0, displayCount).map((prop) => (
                    <div
                      key={prop._id}
                      className="p-3 border border-gray-200 rounded-lg hover:border-orange-200 hover:bg-orange-50 transition group"
                    >
                      <div className="flex gap-3">
                        <img
                          src={
                            prop.images?.[0] ||
                            prop.image ||
                            "https://i.ibb.co.com/zTBXMRzq/4284558.jpg"
                          }
                          alt={prop.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 line-clamp-1">
                            {prop.title}
                          </p>
                          <p className="text-xs text-gray-500 line-clamp-1 mt-1">
                            {prop.addressString}
                          </p>
                          <p className="text-sm font-black text-gray-900 mt-1">
                            ৳{prop.price?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => addProperty(prop)}
                        disabled={selectedProperties.length >= 5}
                        className={`w-full mt-2 py-1.5 text-xs font-bold rounded transition ${
                          selectedProperties.length >= 5
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-orange-500 text-white hover:bg-orange-600 shadow shadow-orange-200"
                        }`}
                      >
                        {selectedProperties.length >= 5 ? "Max Limit Reached" : "Add to Compare"}
                      </button>
                    </div>
                  ))}
                  {displayCount < availableForComparison.length && (
                    <div className="text-center py-2 text-xs text-gray-500">Scroll for more...</div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-6">
                  No more properties available
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonPage;
