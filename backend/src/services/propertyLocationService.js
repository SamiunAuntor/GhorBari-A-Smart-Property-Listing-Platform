function compactText(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
}

function uniqueValues(values = []) {
    return [...new Set(values.filter(Boolean))];
}

export function buildPropertyAddress(address = {}) {
    return {
        division_id: address.division_id || null,
        division_name: compactText(address.division_name),
        district_id: address.district_id || null,
        district_name: compactText(address.district_name),
        upazila_id: address.upazila_id || null,
        upazila_name: compactText(address.upazila_name),
        street: compactText(address.street)
    };
}

export function formatPropertyLocation(address = {}) {
    const street = compactText(address.street);
    const upazilaName = compactText(address.upazila_name) || compactText(address.upazila_id);
    const districtName = compactText(address.district_name) || compactText(address.district_id);
    const divisionName = compactText(address.division_name) || compactText(address.division_id);

    return uniqueValues([street, upazilaName, districtName, divisionName]).join(", ");
}

export function buildPropertySearchText(property = {}) {
    const address = buildPropertyAddress(property.address);
    const locationText = formatPropertyLocation(address);
    const amenities = Array.isArray(property.amenities) ? property.amenities.join(" ") : "";

    return uniqueValues([
        compactText(property.title),
        compactText(property.overview),
        compactText(property.listingType),
        compactText(property.propertyType),
        amenities,
        locationText
    ])
        .join(" ")
        .toLowerCase();
}
