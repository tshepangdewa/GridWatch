import * as maplibregl from "https://unpkg.com/maplibre-gl@^6.8.0/dist/maplibre-gl.mjs";

import { supabase } from "./supabase.js";

const BULAWAYO_CENTER = [28.58, -20.15];

const BULAWAYO_BOUNDARY_URL =
    "https://services.arcgis.com/7vyJMxlH6ODgjFtB/ArcGIS/rest/services/MapStudyArea2/FeatureServer/5/query?where=1%3D1&outFields=*&f=geojson";

let currentTownships = [];

let activeTownshipId = null;

let activePopup = null;

const map = new maplibregl.Map({
    container: "map",

    style: "https://tiles.openfreemap.org/styles/liberty",

    center: BULAWAYO_CENTER,

    zoom: 11,

    minZoom: 9,

    maxZoom: 16
});


map.addControl(
    new maplibregl.NavigationControl(),
    "top-right"
);


// --------------------------------
// TOWNSHIP INTERACTION
// --------------------------------

function formatDuration(start, end) {

const startTime =
    new Date(start).getTime();

const endTime =
    new Date(end).getTime();

const difference =
    endTime - startTime;

if (difference <= 0) {
    return "0m";
}

const totalMinutes =
    Math.floor(
        difference / (1000 * 60)
    );

const days =
    Math.floor(
        totalMinutes / 1440
    );

const hours =
    Math.floor(
        (totalMinutes % 1440) / 60
    );

const minutes =
    totalMinutes % 60;

const parts = [];

if (days > 0) {
    parts.push(`${days}d`);
}

if (hours > 0) {
    parts.push(`${hours}h`);
}

if (minutes > 0) {
    parts.push(`${minutes}m`);
}

return parts.join(" ") || "0m";
}

async function loadTownshipHistory(townshipId) {

const {
    data,
    error
} = await supabase
    .from("township_status_history")
    .select("*")
    .eq("township_id", townshipId)
    .order("changed_at", {
        ascending: false
    })
    .limit(10);

if (error) {

    console.error(
        "Failed to load township history:",
        error
    );

    return [];
}

return data;
}

function buildTownshipPopup(township, history) {

const statusText =
    township.status === "ON"
        ? "POWER ON"
        : "POWER OFF";

const statusColor =
    township.status === "ON"
        ? "#FFFFFF"
        : "#212121";

const lastUpdated =
    township.last_updated
        ? new Date(
            township.last_updated
        ).toLocaleString(
            "en-ZW",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        )
        : "Initial status";

const reasonSection =
    township.status === "OFF"
        ? `
            <div class="popup-reason">

                <div class="popup-reason-label">
                    REASON
                </div>

                <div class="popup-reason-text">
                    ${township.reason || "Reason not provided"}
                </div>

            </div>
        `
        : "";

const historySection =
    history.length > 0
        ? `
            <div class="popup-history">

                <div class="popup-history-label">
                    STATUS HISTORY
                </div>

                ${history.map(
                    (item, index) => {

                        const nextItem =
                            history[index + 1];

                        const duration =
                            item.status === "OFF" &&
                            nextItem &&
                            nextItem.status === "ON"
                                ? formatDuration(
                                    item.changed_at,
                                    nextItem.changed_at
                                )
                                : null;

                        return `
                            <div class="popup-history-item">

                                <div class="popup-history-status">
                                    ${item.status}
                                </div>

                                <div class="popup-history-date">
                                    ${new Date(
                                        item.changed_at
                                    ).toLocaleString(
                                        "en-ZW",
                                        {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        }
                                    )}
                                </div>

                                ${
                                    item.reason
                                        ? `
                                            <div class="popup-history-reason">
                                                ${item.reason}
                                            </div>
                                        `
                                        : ""
                                }

                                ${
                                    duration
                                        ? `
                                            <div class="popup-history-duration">
                                                DURATION
                                                <strong>
                                                    ${duration}
                                                </strong>
                                            </div>
                                        `
                                        : ""
                                }

                            </div>
                        `;
                    }
                ).join("")}

            </div>
        `
        : "";

return `
    <div class="gridwatch-popup">

        <div class="popup-township">
            ${township.name}
        </div>

        <div class="popup-status">

            <span
                class="popup-status-dot"
                style="background: ${statusColor};"
            ></span>

            <span>
                ${statusText}
            </span>

        </div>

        ${reasonSection}

        <div class="popup-updated">

            LAST UPDATED

            <strong>
                ${lastUpdated}
            </strong>

        </div>

        ${historySection}

    </div>
`;
}


map.on("load", async () => {

    const {
    data: townships,
    error
} = await supabase
    .from("townships")
    .select("*")
    .order("id");


if (error) {

    console.error(
        "Failed to load townships:",
        error
    );

    return;
}


currentTownships = townships;


console.log(
    `${currentTownships.length} townships loaded from Supabase.`
);

    map.on("click", "township-nodes", async (event) => {

        const feature =
            event.features[0];

        const name =
            feature.properties.name;

        const township =
            currentTownships.find(
                (item) =>
                    item.name === name
            );

        if (!township) {
            console.warn(
                "Township not found:",
                name
            );

            return;
        }

        activeTownshipId =
            township.id;

        const history =
            await loadTownshipHistory(
                township.id
            );

        const popup =
            new maplibregl.Popup({
                closeButton: true,
                closeOnClick: true,
                maxWidth: "280px"
            })
                .setLngLat(event.lngLat)
                .setHTML(
                    buildTownshipPopup(
                        township,
                        history
                    )
                )
                .addTo(map);

        activePopup =
            popup;

        popup.on("close", () => {

            if (activePopup === popup) {

                activePopup = null;

                activeTownshipId = null;

            }

        });
    });


    // --------------------------------
    // TOWNSHIP CURSOR
    // --------------------------------

    map.on(
        "mouseenter",
        "township-nodes",
        () => {
            map.getCanvas().style.cursor = "pointer";
        }
    );

    map.on(
        "mouseleave",
        "township-nodes",
        () => {
            map.getCanvas().style.cursor = "";
        }
    );


    // --------------------------------
    // HIDE BASEMAP
    // --------------------------------

    const baseLayers =
        map.getStyle().layers;

    for (const layer of baseLayers) {

        map.setLayoutProperty(
            layer.id,
            "visibility",
            "none"
        );
    }


    // --------------------------------
    // BULAWAYO BOUNDARY
    // --------------------------------

    map.addSource(
        "bulawayo-boundary",
        {
            type: "geojson",
            data: BULAWAYO_BOUNDARY_URL
        }
    );


    // Black area inside boundary
    map.addLayer({

        id: "bulawayo-boundary-fill",

        type: "fill",

        source: "bulawayo-boundary",

        paint: {

            "fill-color": "#000000",

            "fill-opacity": 1

        }

    });


    // Electric-white boundary
    map.addLayer({

        id: "bulawayo-boundary-line",

        type: "line",

        source: "bulawayo-boundary",

        paint: {

            "line-color": "#FFFFFF",

            "line-width": 2,

            "line-opacity": 1

        }

    });


    // --------------------------------
    // TOWNSHIP DATA
    // --------------------------------

    const townshipFeatures =
        currentTownships.map(
            (township) => ({

                type: "Feature",

                properties: {

                    name: township.name,

                    status: township.status

                },

                geometry: {

                    type: "Point",

                    coordinates: [

                        township.longitude,

                        township.latitude

                    ]

                }

            })
        );


    const townshipGeoJSON = {

        type: "FeatureCollection",

        features: townshipFeatures

    };


    map.addSource(
        "townships",
        {
            type: "geojson",

            data: townshipGeoJSON
        }
    );


    // --------------------------------
    // ELECTRICAL INDICATORS
    // --------------------------------

    map.addLayer({

        id: "township-nodes",

        type: "circle",

        source: "townships",

        paint: {

            "circle-color": [

                "match",

                ["get", "status"],

                "ON",
                "#FFFFFF",

                "OFF",
                "#212121",

                "#212121"

            ],

            "circle-radius": 4,

            "circle-opacity": 1,

            "circle-stroke-width": 1,

            "circle-stroke-color": [

                "match",

                ["get", "status"],

                "ON",
                "#FFFFFF",

                "OFF",
                "#212121",

                "#212121"

            ],

            "circle-stroke-opacity": 1

        }

    });


    // --------------------------------
    // TOWNSHIP NAMES
    // --------------------------------

    map.addLayer({

        id: "township-labels",

        type: "symbol",

        source: "townships",

        layout: {

            "text-field": [
                "get",
                "name"
            ],

            "text-size": 10,

            "text-offset": [
                0,
                1.2
            ],

            "text-anchor": "top"

        },

        paint: {

            "text-color": "#FFFFFF",

            "text-halo-color": "#000000",

            "text-halo-width": 1.5,

            "text-opacity": 1

        }

    });


    console.log(
        "GridWatch map loaded."
    );

    console.log(
        `${currentTownships.length} townships loaded.`
    );

});

supabase
    .channel("townships-realtime")
    .on(
        "postgres_changes",
        {
            event: "UPDATE",
            schema: "public",
            table: "townships"
        },
        async (payload) => {

            console.log(
                "Township realtime update:",
                payload
            );

            const updatedTownship =
                payload.new;

            const index =
                currentTownships.findIndex(
                    (township) =>
                        township.id ===
                        updatedTownship.id
                );

            if (index === -1) {
                console.warn(
                    "Township not found:",
                    updatedTownship.id
                );

                return;
            }

            currentTownships[index] =
                updatedTownship;

            const source =
                map.getSource("townships");

            if (!source) {
                console.warn(
                    "Township map source not found."
                );

                return;
            }

            const features =
                currentTownships.map(
                    (township) => ({
                        type: "Feature",

                        properties: {
                            name:
                                township.name,

                            status:
                                township.status
                        },

                        geometry: {
                            type: "Point",
                            coordinates: [
                                township.longitude,
                                township.latitude
                            ]
                        }
                    })
                );

            source.setData({
                type: "FeatureCollection",
                features: features
            });

            if (
                activeTownshipId ===
                    updatedTownship.id &&
                activePopup
            ) {

                const history =
                    await loadTownshipHistory(
                        updatedTownship.id
                    );

                if (
                    activeTownshipId !==
                        updatedTownship.id ||
                    !activePopup
                ) {
                    return;
                }

                activePopup.setHTML(
                    buildTownshipPopup(
                        updatedTownship,
                        history
                    )
                );

            }

            console.log(
                `${updatedTownship.name} updated on map.`
            );
        }
    )
    .subscribe((status) => {

        console.log(
            "Realtime connection:",
            status
        );

    });
