import * as maplibregl from "https://unpkg.com/maplibre-gl@^6.8.0/dist/maplibre-gl.mjs";

import { townships } from "./data/townships.js";

const BULAWAYO_CENTER = [28.58, -20.15];

const BULAWAYO_BOUNDARY_URL =
    "https://services.arcgis.com/7vyJMxlH6ODgjFtB/ArcGIS/rest/services/MapStudyArea2/FeatureServer/5/query?where=1%3D1&outFields=*&f=geojson";

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

map.on("load", () => {

    const baseLayers = map.getStyle().layers;

    for (const layer of baseLayers) {
        if (layer.type === "symbol") {
            map.setLayoutProperty(
                layer.id,
                "visibility",
                "none"
            );
        }
    }

    console.log("GridWatch map loaded.");
    console.log(`${townships.length} townships loaded.`);

    // --------------------------------
    // BULAWAYO BOUNDARY
    // --------------------------------

    map.addSource("bulawayo-boundary", {
        type: "geojson",
        data: BULAWAYO_BOUNDARY_URL
    });

    map.addLayer({
        id: "bulawayo-boundary-fill",

        type: "fill",

        source: "bulawayo-boundary",

        paint: {
            "fill-color": "#07111f",
            "fill-opacity": 0.18
        }
    });

    map.addLayer({
        id: "bulawayo-boundary-line",

        type: "line",

        source: "bulawayo-boundary",

        paint: {
            "line-color": "#ffffff",
            "line-width": 1.2,
            "line-opacity": 0.35
        }
    });

    // --------------------------------
    // TOWNSHIP LOCATIONS
    // --------------------------------

    const townshipFeatures = townships.map((township) => ({
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
    }));

    const townshipGeoJSON = {
        type: "FeatureCollection",

        features: townshipFeatures
    };

    map.addSource("townships", {
        type: "geojson",
        data: townshipGeoJSON
    });

   // --------------------------------
// GRIDWATCH ELECTRICAL NODES
// --------------------------------

map.addLayer({
    id: "township-nodes",

    type: "circle",

    source: "townships",

    paint: {
        // ON = white LED
        // OFF = dark subdued node
        "circle-color": [
            "match",
            ["get", "status"],
            "ON",
            "#ffffff",
            "OFF",
            "#18202b",
            "#18202b"
        ],

        // Every node stays the same physical size.
        "circle-radius": 4,

        // State is communicated by color, not intensity.
        "circle-opacity": 1,

        "circle-stroke-width": 1,

        "circle-stroke-color": [
            "match",
            ["get", "status"],
            "ON",
            "#ffffff",
            "OFF",
            "#394454",
            "#394454"
        ],

        "circle-stroke-opacity": 0.9
    }
});

    // Township names
    map.addLayer({
        id: "township-labels",

        type: "symbol",

        source: "townships",

        layout: {
            "text-field": ["get", "name"],

            "text-size": 10,

            "text-offset": [0, 1.2],

            "text-anchor": "top"
        },

        paint: {
            "text-color": "#ffffff",

            "text-halo-color": "#03060b",

            "text-halo-width": 1.5,

            "text-opacity": 0.85
        }
    });

    console.log("Bulawayo boundary loaded.");
    console.log("Township locations displayed.");
});