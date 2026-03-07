import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const FitBounds = ({ markers }) => {
    const map = useMap();
    useEffect(() => {
        const points = markers
            .filter((m) => m?.location && typeof m.location.lat === "number")
            .map((m) => [Number(m.location.lat), Number(m.location.lng)]);
        if (points.length === 0) return;
        if (points.length === 1) {
            map.setView(points[0], 14);
            return;
        }
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [60, 60] });
    }, [markers, map]);
    return null;
};

// Locate Me Button - Camera movement only, no marker placement
const LocateButton = () => {
    const map = useMap();
    const locateMe = () => {
        if (!navigator.geolocation) return alert("Geolocation not supported!");
        navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude } = pos.coords;
            map.flyTo([latitude, longitude], 16, {
                duration: 2,
                animate: true
            });
        }, () => {
            alert("Unable to retrieve your location");
        });
    };

    return (
        <button
            type="button"
            onClick={locateMe}
            className="absolute z-[1000] top-3 right-3 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded shadow text-sm font-medium hover:bg-white/80 transition-all border border-gray-200"
        >
            📍 Locate Me
        </button>
    );
};

const BuyOrRentMap = ({ properties = [], onMarkerClick = () => { } }) => {
    const markers = properties.filter((p) => p.location && p.location.lat && p.location.lng);

    return (
        <div className="relative h-full w-full">
            <MapContainer
                center={[23.6850, 90.3563]}
                zoom={7}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                <FitBounds markers={markers} />

                <LocateButton />

                {markers.map((p) => {
                    const lat = Number(p.location.lat);
                    const lng = Number(p.location.lng);
                    return (
                        <Marker key={p._id} position={[lat, lng]}>
                            <Popup>
                                <div className="max-w-xs">
                                    <div className="font-bold">{p.title}</div>
                                    <div className="text-sm text-gray-600">{p.addressString}</div>
                                    <div className="mt-2">
                                        <span className="font-black">৳{p.price}</span>
                                        <span className="text-sm text-gray-600"> {p.listingType === "sale" ? "/ total" : "/ month"}</span>
                                    </div>
                                    <div className="mt-2">
                                        <button
                                            onClick={() => onMarkerClick(p._id)}
                                            className="text-sm text-orange-600 font-medium hover:underline"
                                        >
                                            View details
                                        </button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default BuyOrRentMap;
