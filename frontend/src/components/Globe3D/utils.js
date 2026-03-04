/**
 * Shared coordinate utility for Globe3D components.
 * Converts geographic coordinates to Three.js 3D sphere positions.
 */

/**
 * Convert lat/lon/altitude to a Three.js Vector3 on the globe sphere.
 *
 * @param {number} lat  - Latitude in degrees [-90, 90]
 * @param {number} lon  - Longitude in degrees [-180, 180]
 * @param {number} altKm - Altitude above Earth surface in km
 * @param {number} earthRadiusNorm - Normalized Earth radius in scene units (default 1.0)
 * @returns {THREE.Vector3}
 */
export function latLonAltToVector3(lat, lon, altKm, earthRadiusNorm = 1.0) {
  const EARTH_RADIUS_KM = 6371.0;
  const r = earthRadiusNorm * (1.0 + (altKm || 0) / EARTH_RADIUS_KM);
  const phi = (90.0 - lat) * (Math.PI / 180.0);
  const theta = (lon + 180.0) * (Math.PI / 180.0);

  return {
    x: -r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.cos(phi),
    z: r * Math.sin(phi) * Math.sin(theta),
  };
}
