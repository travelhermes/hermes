// https://github.com/pointhi/leaflet-color-markers
var blueIcon = new L.Icon({
    iconUrl: '/assets/map/marker-icon-2x-blue.png',
    shadowUrl: '/assets/map/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

var goldIcon = new L.Icon({
    iconUrl: '/assets/map/marker-icon-2x-gold.png',
    shadowUrl: '/assets/map/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

var redIcon = new L.Icon({
    iconUrl: '/assets/map/marker-icon-2x-red.png',
    shadowUrl: '/assets/map/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

var greenIcon = new L.Icon({
    iconUrl: '/assets/map/marker-icon-2x-green.png',
    shadowUrl: '/assets/map/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

var orangeIcon = new L.Icon({
    iconUrl: '/assets/map/marker-icon-2x-orange.png',
    shadowUrl: '/assets/map/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

var yellowIcon = new L.Icon({
    iconUrl: '/assets/map/marker-icon-2x-yellow.png',
    shadowUrl: '/assets/map/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

var violetIcon = new L.Icon({
    iconUrl: '/assets/map/marker-icon-2x-violet.png',
    shadowUrl: '/assets/map/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

var greyIcon = new L.Icon({
    iconUrl: '/assets/map/marker-icon-2x-grey.png',
    shadowUrl: '/assets/map/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

var blackIcon = new L.Icon({
    iconUrl: '/assets/map/marker-icon-2x-black.png',
    shadowUrl: '/assets/map/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Custom icons
var categoryIcons = {
    animals: {
        default: new L.Icon({
            iconUrl: '/assets/map/categories/animals_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
        selected: new L.Icon({
            iconUrl: '/assets/map/categories/animals_selected_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
    },
    church: {
        default: new L.Icon({
            iconUrl: '/assets/map/categories/church_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
        selected: new L.Icon({
            iconUrl: '/assets/map/categories/church_selected_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
    },
    gardens: {
        default: new L.Icon({
            iconUrl: '/assets/map/categories/gardens_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
        selected: new L.Icon({
            iconUrl: '/assets/map/categories/gardens_selected_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
    },
    government: {
        default: new L.Icon({
            iconUrl: '/assets/map/categories/government_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
        selected: new L.Icon({
            iconUrl: '/assets/map/categories/government_selected_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
    },
    lookout: {
        default: new L.Icon({
            iconUrl: '/assets/map/categories/lookout_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
        selected: new L.Icon({
            iconUrl: '/assets/map/categories/lookout_selected_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
    },
    monuments: {
        default: new L.Icon({
            iconUrl: '/assets/map/categories/monuments_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
        selected: new L.Icon({
            iconUrl: '/assets/map/categories/monuments_selected_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
    },
    museums: {
        default: new L.Icon({
            iconUrl: '/assets/map/categories/museums_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
        selected: new L.Icon({
            iconUrl: '/assets/map/categories/museums_selected_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
    },
    public: {
        default: new L.Icon({
            iconUrl: '/assets/map/categories/public_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
        selected: new L.Icon({
            iconUrl: '/assets/map/categories/public_selected_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
    },
    public_art: {
        default: new L.Icon({
            iconUrl: '/assets/map/categories/public_art_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
        selected: new L.Icon({
            iconUrl: '/assets/map/categories/public_art_selected_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
    },
    sports: {
        default: new L.Icon({
            iconUrl: '/assets/map/categories/sports_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
        selected: new L.Icon({
            iconUrl: '/assets/map/categories/sports_selected_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
    },
    theater: {
        default: new L.Icon({
            iconUrl: '/assets/map/categories/theater_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
        selected: new L.Icon({
            iconUrl: '/assets/map/categories/theater_selected_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
    },
    water: {
        default: new L.Icon({
            iconUrl: '/assets/map/categories/water_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
        selected: new L.Icon({
            iconUrl: '/assets/map/categories/water_selected_2x.png',
            shadowUrl: '/assets/map/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        }),
    },
};
