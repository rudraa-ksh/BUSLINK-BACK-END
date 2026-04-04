import AppError from '../utils/AppError.js';

// ─── GET /geocode/search ────────────────────────────────
export const geocodeSearch = async (req, res, next) => {
  try {
    const { q, city } = req.query;
    if (!q) {
      throw new AppError('Query parameter "q" is required', 400);
    }

    // Placeholder: In production, forward to Google Maps Geocoding API
    const mockResults = [
      {
        placeId: 'mock-place-1',
        label: `${q} (Raipur)`,
        subLabel: city || 'Raipur, Chhattisgarh, India',
        lat: 21.2514 + Math.random() * 0.01,
        lng: 81.6296 + Math.random() * 0.01,
      },
    ];

    res.json(mockResults);
  } catch (err) {
    next(err);
  }
};

// ─── GET /geocode/reverse ───────────────────────────────
export const reverseGeocode = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      throw new AppError('lat and lng query parameters are required', 400);
    }

    // Placeholder: In production, forward to Google Maps Reverse Geocoding API
    res.json({
      label: 'Raipur Location',
      subLabel: 'Raipur, Chhattisgarh, India',
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /navigation/walking ────────────────────────────
export const walkingNavigation = async (req, res, next) => {
  try {
    const { originLat, originLng, stopId } = req.query;
    if (!originLat || !originLng || !stopId) {
      throw new AppError(
        'originLat, originLng, and stopId are required',
        400
      );
    }

    // Placeholder: In production, forward to Google Maps Directions API
    const distanceMetres = Math.round(300 + Math.random() * 700);
    const durationMinutes = Math.round(distanceMetres / 80); // ~80 m/min

    res.json({
      distanceMetres,
      durationMinutes,
      polyline: '', // Encoded polyline would come from Maps API
      steps: [
        {
          instruction: 'Head north on Main Road',
          distanceM: Math.round(distanceMetres * 0.6),
        },
        {
          instruction: 'Turn right onto Station Road',
          distanceM: Math.round(distanceMetres * 0.4),
        },
      ],
    });
  } catch (err) {
    next(err);
  }
};
