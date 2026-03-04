/**
 * Comprehensive satellite database with real orbital data.
 * Used in demo mode and as fallback when backend is offline.
 */

export const ORBIT_REGIMES = {
    LEO: { label: 'Low Earth Orbit', range: '160–2000 km', color: '#4C8BF5' },
    MEO: { label: 'Medium Earth Orbit', range: '2000–35,786 km', color: '#5BA6A6' },
    GEO: { label: 'Geostationary', range: '35,786 km', color: '#F9A825' },
    HEO: { label: 'Highly Elliptical', range: 'Variable', color: '#E53935' },
};

export const SATELLITE_DATABASE = [
    // ── Space Stations ──
    { name: 'ISS (ZARYA)', norad: 25544, type: 'Station', regime: 'LEO', altitude: 408, inclination: 51.6, operator: 'NASA/Roscosmos', status: 'operational', mass: 420000 },
    { name: 'TIANGONG', norad: 48274, type: 'Station', regime: 'LEO', altitude: 390, inclination: 41.5, operator: 'CNSA', status: 'operational', mass: 66000 },

    // ── Science & Observation ──
    { name: 'HST', norad: 20580, type: 'Telescope', regime: 'LEO', altitude: 540, inclination: 28.5, operator: 'NASA/ESA', status: 'operational', mass: 11110 },
    { name: 'NOAA 19', norad: 33591, type: 'Weather', regime: 'LEO', altitude: 870, inclination: 99.2, operator: 'NOAA', status: 'operational', mass: 2232 },
    { name: 'NOAA 20', norad: 43013, type: 'Weather', regime: 'LEO', altitude: 824, inclination: 98.7, operator: 'NOAA', status: 'operational', mass: 2294 },
    { name: 'LANDSAT 9', norad: 49260, type: 'Earth Obs', regime: 'LEO', altitude: 705, inclination: 98.2, operator: 'NASA/USGS', status: 'operational', mass: 2711 },
    { name: 'SENTINEL-2A', norad: 40697, type: 'Earth Obs', regime: 'LEO', altitude: 786, inclination: 98.5, operator: 'ESA', status: 'operational', mass: 1140 },
    { name: 'TERRA', norad: 25994, type: 'Earth Obs', regime: 'LEO', altitude: 705, inclination: 98.2, operator: 'NASA', status: 'operational', mass: 5190 },
    { name: 'AQUA', norad: 27424, type: 'Earth Obs', regime: 'LEO', altitude: 705, inclination: 98.2, operator: 'NASA', status: 'operational', mass: 2934 },

    // ── Starlink (sample) ──
    { name: 'STARLINK-1007', norad: 44713, type: 'Comms', regime: 'LEO', altitude: 550, inclination: 53.0, operator: 'SpaceX', status: 'operational', mass: 260 },
    { name: 'STARLINK-1130', norad: 44914, type: 'Comms', regime: 'LEO', altitude: 550, inclination: 53.0, operator: 'SpaceX', status: 'operational', mass: 260 },
    { name: 'STARLINK-2305', norad: 48601, type: 'Comms', regime: 'LEO', altitude: 540, inclination: 53.2, operator: 'SpaceX', status: 'operational', mass: 306 },
    { name: 'STARLINK-3045', norad: 51234, type: 'Comms', regime: 'LEO', altitude: 530, inclination: 43.0, operator: 'SpaceX', status: 'operational', mass: 306 },

    // ── OneWeb ──
    { name: 'ONEWEB-0012', norad: 44057, type: 'Comms', regime: 'LEO', altitude: 1200, inclination: 87.9, operator: 'OneWeb', status: 'operational', mass: 150 },
    { name: 'ONEWEB-0036', norad: 44072, type: 'Comms', regime: 'LEO', altitude: 1200, inclination: 87.9, operator: 'OneWeb', status: 'operational', mass: 150 },

    // ── Navigation ──
    { name: 'GPS BIIR-2', norad: 24876, type: 'Navigation', regime: 'MEO', altitude: 20180, inclination: 55.0, operator: 'USSF', status: 'operational', mass: 2032 },
    { name: 'GPS BIIRM-4', norad: 29486, type: 'Navigation', regime: 'MEO', altitude: 20200, inclination: 55.0, operator: 'USSF', status: 'operational', mass: 2032 },
    { name: 'GALILEO-FM1', norad: 37846, type: 'Navigation', regime: 'MEO', altitude: 23222, inclination: 56.0, operator: 'ESA', status: 'operational', mass: 700 },
    { name: 'GLONASS-M 742', norad: 40001, type: 'Navigation', regime: 'MEO', altitude: 19100, inclination: 64.8, operator: 'Roscosmos', status: 'operational', mass: 1415 },

    // ── GEO ──
    { name: 'GOES-16', norad: 41866, type: 'Weather', regime: 'GEO', altitude: 35786, inclination: 0.04, operator: 'NOAA', status: 'operational', mass: 5192 },
    { name: 'GOES-18', norad: 51850, type: 'Weather', regime: 'GEO', altitude: 35786, inclination: 0.03, operator: 'NOAA', status: 'operational', mass: 5192 },
    { name: 'HIMAWARI-9', norad: 41836, type: 'Weather', regime: 'GEO', altitude: 35786, inclination: 0.1, operator: 'JMA', status: 'operational', mass: 3500 },

    // ── Debris & Defunct ──
    { name: 'COSMOS 2251 DEB', norad: 33446, type: 'Debris', regime: 'LEO', altitude: 790, inclination: 74.0, operator: 'N/A', status: 'debris', mass: 950 },
    { name: 'FENGYUN 1C DEB', norad: 29261, type: 'Debris', regime: 'LEO', altitude: 865, inclination: 98.6, operator: 'N/A', status: 'debris', mass: 750 },
    { name: 'IRIDIUM 33 DEB', norad: 24946, type: 'Debris', regime: 'LEO', altitude: 780, inclination: 86.4, operator: 'N/A', status: 'debris', mass: 689 },
    { name: 'ENVISAT', norad: 27386, type: 'Defunct', regime: 'LEO', altitude: 770, inclination: 98.5, operator: 'ESA', status: 'defunct', mass: 8111 },
    { name: 'SL-16 R/B', norad: 25407, type: 'Rocket Body', regime: 'LEO', altitude: 840, inclination: 71.0, operator: 'N/A', status: 'debris', mass: 8300 },

    // ── Military/Gov ──
    { name: 'USA 326', norad: 53820, type: 'Military', regime: 'LEO', altitude: 510, inclination: 97.4, operator: 'USSF', status: 'operational', mass: 0 },

    // ── HEO ──
    { name: 'MOLNIYA 3-50', norad: 28163, type: 'Comms', regime: 'HEO', altitude: 39700, inclination: 62.8, operator: 'Roscosmos', status: 'defunct', mass: 1740 },
];

export const CONSTELLATIONS = [
    { name: 'STARLINK', count: 5800, operator: 'SpaceX', regime: 'LEO', altitude: '540-570 km' },
    { name: 'ONEWEB', count: 634, operator: 'Eutelsat', regime: 'LEO', altitude: '1200 km' },
    { name: 'IRIDIUM', count: 66, operator: 'Iridium', regime: 'LEO', altitude: '780 km' },
    { name: 'GPS', count: 31, operator: 'USSF', regime: 'MEO', altitude: '20,200 km' },
    { name: 'GALILEO', count: 28, operator: 'ESA', regime: 'MEO', altitude: '23,222 km' },
    { name: 'GLONASS', count: 24, operator: 'Roscosmos', regime: 'MEO', altitude: '19,100 km' },
];

// Generate realistic mock conjunction alerts
export function generateMockAlerts() {
    const alertPairs = [
        ['ISS (ZARYA)', 'COSMOS 2251 DEB', 'LEO'],
        ['STARLINK-1007', 'FENGYUN 1C DEB', 'LEO'],
        ['NOAA 19', 'SL-16 R/B', 'LEO'],
        ['HST', 'IRIDIUM 33 DEB', 'LEO'],
        ['TIANGONG', 'ENVISAT', 'LEO'],
    ];

    return alertPairs.map(([primary, secondary, regime], i) => ({
        id: `CA-${String(i + 1).padStart(4, '0')}`,
        primary,
        secondary,
        tca: new Date(Date.now() + (Math.random() * 86400 * 3) * 1000).toISOString(),
        missDistance: (Math.random() * 5 + 0.1).toFixed(3),
        probability: Math.random() > 0.7 ? (Math.random() * 40 + 60).toFixed(1) : (Math.random() * 30).toFixed(1),
        regime,
    }));
}

// Debris flagged for conjunction warning arcs
const RED_DEBRIS = ['COSMOS 2251 DEB', 'FENGYUN 1C DEB', 'SL-16 R/B'];

// Clohessy-Wiltshire evasion computation for demo mode
const MU_EARTH = 398600.4418; // km³/s²
const R_EARTH = 6371.0;       // km
const G0 = 9.80665e-3;        // km/s²

export function computeDemoEvasion(alert, activeAssets, satDb) {
    const sat = activeAssets.find(a => a.name === alert.primary);
    const debris = activeAssets.find(a => a.name === alert.secondary);
    if (!sat || !debris || !sat.path || sat.path.length < 10) return null;

    const satInfo = satDb.find(s => s.name === alert.primary);
    const satMass = satInfo?.mass || 500;
    const alt_km = sat.alt_km || 400;
    const r = R_EARTH + alt_km;

    // Mean motion (rad/s)
    const n = Math.sqrt(MU_EARTH / (r * r * r));

    // Relative state approximation
    const dLat = (debris.lat - sat.lat) * (Math.PI / 180) * r;
    const dLon = (debris.lon - sat.lon) * (Math.PI / 180) * r * Math.cos(sat.lat * Math.PI / 180);
    const dAlt = (debris.alt_km || 400) - alt_km;
    const missKm = Math.sqrt(dLat * dLat + dLon * dLon + dAlt * dAlt);

    // Relative velocity approximation (LEO ~7.66 km/s, debris at different inclination)
    const relVel = parseFloat(alert.missDistance) < 2 ? 10.5 : 7.0; // km/s

    // Burn lead time (15 min = 900s)
    const burnLeadS = 900;
    const targetMissKm = 5.0;

    // CW state transition: position-from-velocity block (simplified)
    const nt = n * burnLeadS;
    const c = Math.cos(nt);
    const s = Math.sin(nt);

    // Simplified CW optimal ΔV: mostly along-track for LEO
    // ΔV_along ≈ target_offset / (2 * (1 - cos(nt)) / n)
    const phi_ri = 2 * (1 - c) / n; // cross-coupling radial→in-track
    const phi_ii = (4 * s - 3 * nt) / n; // in-track→in-track

    // Optimal in-track ΔV to achieve target miss
    const dvInTrack = targetMissKm / Math.abs(phi_ii || 1); // km/s
    const dvMagnitude = dvInTrack * 1000; // m/s

    // Fuel cost (Tsiolkovsky)
    const isp = 220; // seconds
    const ve = G0 * isp;
    const fuelKg = satMass * (1 - Math.exp(-dvInTrack / ve));

    // Direction classification
    const direction = dvInTrack >= 0 ? 'prograde' : 'retrograde';

    // Burn duration (assume 1N thruster)
    const burnDurationS = (satMass * dvMagnitude) / 1.0;

    // Generate evasion trajectory: offset the satellite path by the computed ΔV effect
    // The evasion shifts in-track position over time
    const evasionPath = sat.path.map(([lon, lat, alt], i) => {
        const fraction = i / sat.path.length;
        // Offset grows from burn point to TCA (linearly for visualization)
        const offsetScale = Math.min(fraction * 2, 1.0);
        // Shift perpendicular to path (cross-track for visual clarity)
        const offsetLat = offsetScale * 3.0; // degrees offset
        const offsetLon = offsetScale * -2.0;
        return [lon + offsetLon, lat + offsetLat, alt + offsetScale * 5];
    });

    // Burn point: ~1/3 along the original path
    const burnIdx = Math.floor(sat.path.length * 0.3);
    const burnPt = sat.path[burnIdx] || sat.path[0];

    return {
        primary: alert.primary,
        secondary: alert.secondary,
        original_trajectory: sat.path,
        evasion_trajectory: evasionPath,
        magnitude_m_s: parseFloat(dvMagnitude.toFixed(2)),
        fuel_kg: parseFloat(fuelKg.toFixed(2)),
        burn_duration_s: parseFloat(burnDurationS.toFixed(1)),
        new_miss_km: targetMissKm,
        original_miss_km: parseFloat(missKm.toFixed(3)),
        direction,
        burn_point: {
            lat: burnPt[1],
            lon: burnPt[0],
            alt_km: burnPt[2] || alt_km,
        },
    };
}

// Generate demo satellite positions on globe
export function generateDemoPositions(satellites, time) {
    return satellites.map((sat, i) => {
        const offset = i * 0.7;
        const speed = sat.regime === 'GEO' ? 0.01 : sat.regime === 'MEO' ? 0.3 : 0.8;
        const inc = sat.inclination || 45;
        const alt_km = sat.altitude || 400;
        const lat = Math.sin(time * speed + offset) * inc;
        const lon = ((time * speed * 20) + (offset * 50)) % 360;

        // Generate 48-point orbital path
        const path = [];
        for (let step = 0; step < 48; step++) {
            const futureTime = time + (step * 0.05);
            const pathLat = Math.sin(futureTime * speed + offset) * inc;
            const pathLon = ((futureTime * speed * 20) + (offset * 50)) % 360;
            path.push([pathLon, pathLat, alt_km]);
        }

        // Risk classification
        const isRedDebris = RED_DEBRIS.includes(sat.name);
        const isDebris = sat.status === 'debris' || sat.status === 'defunct';

        return {
            name: sat.name,
            lat,
            lon,
            alt_km,
            velocity: sat.regime === 'GEO' ? 3.07 : sat.regime === 'MEO' ? 3.9 : 7.66,
            type: sat.type,
            status: sat.status,
            risk_level: isRedDebris ? 'RED' : isDebris ? 'YELLOW' : undefined,
            path,
        };
    });
}
