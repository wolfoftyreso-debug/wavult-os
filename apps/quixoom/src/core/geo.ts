// ============================================================================
// Geospatial Service
// Handles location operations: distance, bounding boxes, area matching.
// ============================================================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  ne: Coordinates;  // northeast corner
  sw: Coordinates;  // southwest corner
}

/**
 * Calculate distance between two points in km (Haversine).
 */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Check if a point is within a bounding box.
 */
export function isInBoundingBox(point: Coordinates, box: BoundingBox): boolean {
  return (
    point.lat >= box.sw.lat &&
    point.lat <= box.ne.lat &&
    point.lng >= box.sw.lng &&
    point.lng <= box.ne.lng
  );
}

/**
 * Create a bounding box around a center point with a given radius in km.
 */
export function boundingBoxFromCenter(center: Coordinates, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.cos(toRad(center.lat)));
  return {
    ne: { lat: center.lat + latDelta, lng: center.lng + lngDelta },
    sw: { lat: center.lat - latDelta, lng: center.lng - lngDelta },
  };
}

/**
 * Calculate the area of a bounding box in km².
 */
export function boundingBoxArea(box: BoundingBox): number {
  const width = distanceKm(
    { lat: box.sw.lat, lng: box.sw.lng },
    { lat: box.sw.lat, lng: box.ne.lng },
  );
  const height = distanceKm(
    { lat: box.sw.lat, lng: box.sw.lng },
    { lat: box.ne.lat, lng: box.sw.lng },
  );
  return width * height;
}

/**
 * Calculate coverage percentage of data points within a bounding box.
 */
export function calculateCoverage(
  points: Coordinates[],
  box: BoundingBox,
  gridSizeMeters: number = 50,
): number {
  if (points.length === 0) return 0;

  // Divide box into grid cells
  const latSpan = box.ne.lat - box.sw.lat;
  const lngSpan = box.ne.lng - box.sw.lng;
  const cellLatSize = (gridSizeMeters / 1000) / 111.32;
  const cellLngSize = (gridSizeMeters / 1000) / (111.32 * Math.cos(toRad((box.ne.lat + box.sw.lat) / 2)));

  const gridRows = Math.max(1, Math.ceil(latSpan / cellLatSize));
  const gridCols = Math.max(1, Math.ceil(lngSpan / cellLngSize));
  const totalCells = gridRows * gridCols;

  const coveredCells = new Set<string>();

  for (const p of points) {
    if (!isInBoundingBox(p, box)) continue;
    const row = Math.floor((p.lat - box.sw.lat) / cellLatSize);
    const col = Math.floor((p.lng - box.sw.lng) / cellLngSize);
    coveredCells.add(`${row},${col}`);
  }

  return Math.round((coveredCells.size / totalCells) * 10000) / 100;
}

/**
 * Find high-value zones: areas with few data points but high demand.
 */
export function findGapZones(
  existingPoints: Coordinates[],
  box: BoundingBox,
  gridSizeMeters: number = 100,
): Coordinates[] {
  const cellLatSize = (gridSizeMeters / 1000) / 111.32;
  const cellLngSize = (gridSizeMeters / 1000) / (111.32 * Math.cos(toRad((box.ne.lat + box.sw.lat) / 2)));

  const gridRows = Math.max(1, Math.ceil((box.ne.lat - box.sw.lat) / cellLatSize));
  const gridCols = Math.max(1, Math.ceil((box.ne.lng - box.sw.lng) / cellLngSize));

  const covered = new Set<string>();
  for (const p of existingPoints) {
    if (!isInBoundingBox(p, box)) continue;
    const row = Math.floor((p.lat - box.sw.lat) / cellLatSize);
    const col = Math.floor((p.lng - box.sw.lng) / cellLngSize);
    covered.add(`${row},${col}`);
  }

  // Return center coordinates of uncovered cells
  const gaps: Coordinates[] = [];
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      if (!covered.has(`${r},${c}`)) {
        gaps.push({
          lat: box.sw.lat + (r + 0.5) * cellLatSize,
          lng: box.sw.lng + (c + 0.5) * cellLngSize,
        });
      }
    }
  }

  return gaps;
}

function toRad(deg: number): number {
  return deg * Math.PI / 180;
}
