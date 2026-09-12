import * as maplibregl from "https://unpkg.com/maplibre-gl@^6.8.0/dist/maplibre-gl.mjs";

import { supabase } from "./supabase.js";

const BULAWAYO_CENTER = [28.58, -20.15];

const BULAWAYO_BOUNDARY_URL =
    "https://services.arcgis.com/7vyJMxlH6ODgjFtB/ArcGIS/rest/services/MapStudyArea2/FeatureServer/5/query?where=1%3D1&outFields=*&f=geojson";

let currentTownships = [];

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

    // --------------------------------
    // TOWNSHIP INTERACTION
    // --------------------------------

    map.on("click", "township-nodes", (event) => {

        const feature = event.features[0];

        const name =
            feature.properties.name;

        const status =
            feature.properties.status;

        const statusText =
            status === "ON"
                ? "POWER ON"
                : "POWER OFF";

        const statusColor =
            status === "ON"
                ? "#FFFFFF"
                : "#212121";

        const township =
            currentTownships.find(
                (item) => item.name === name
            );

        const lastUpdated =
            township?.lastUpdated ||
            "Initial status";

        const reasonSection =
            status === "OFF"
                ? `
                    <div class="popup-reason">

                        <div class="popup-reason-label">
                            REASON
                        </div>

                        <div class="popup-reason-text">
                            ${township?.reason || "Reason not provided"}
                        </div>

                    </div>
                `
                : "";

        const popupContent = `

            <div class="gridwatch-popup">

                <div class="popup-township">
                    ${name}
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

            </div>
        `;

        new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true,
            maxWidth: "280px"
        })
            .setLngLat(event.lngLat)
            .setHTML(popupContent)
            .addTo(map);
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
            event: "*",
            schema: "public",
            table: "townships"
        },
        (payload) => {

            console.log(
                "Township realtime update:",
                payload
            );
        }
    )
    .subscribe();

