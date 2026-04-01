# 🚌 BusLink API Documentation

> **Version:** 1.0.0  
> **Base URL:** `http://localhost:3000/api/v1`  
> **Protocol:** REST over HTTPS  
> **Content-Type:** `application/json`

---

## Table of Contents

- [Overview](#overview)
- [Authentication & Authorization](#authentication--authorization)
- [Rate Limiting](#rate-limiting)
- [Error Response Format](#error-response-format)
- [API Modules](#api-modules)
  - [1. Authentication](#1-authentication)
  - [2. User Profile](#2-user-profile)
  - [3. Buses](#3-buses)
  - [4. Schedule](#4-schedule)
  - [5. Stops](#5-stops)
  - [6. Routes](#6-routes)
  - [7. Driver](#7-driver)
  - [8. Geocoding & Navigation](#8-geocoding--navigation)
- [Data Models](#data-models)
- [Environment Variables](#environment-variables)

---

## Overview

BusLink is a real-time bus tracking and navigation REST API designed for the city of Raipur. It provides endpoints for passenger-facing features (bus tracking, route lookup, stop finding) and driver-facing features (trip management, location broadcasting).

### Health Check

```
GET /
```

**Response:**
```json
{
  "name": "BusLink API",
  "version": "1.0.0",
  "status": "running",
  "timestamp": "2026-03-26T09:25:00.000Z"
}
```

---

## Authentication & Authorization

All endpoints (except Auth module endpoints) require a valid JWT **access token** in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Token Lifecycle

| Token | Expiry | Purpose |
|-------|--------|---------|
| Access Token | 60 minutes | Short-lived, used for API requests |
| Refresh Token | 30 days | Long-lived, used to obtain new access tokens |

### Roles

| Role | Description | Access |
|------|-------------|--------|
| `passenger` | Default role for registered users | All passenger endpoints |
| `driver` | Bus driver with assignment | Passenger endpoints + Driver endpoints |
| `admin` | System administrator | All endpoints |

### Token Payload

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "passenger"
}
```

---

## Rate Limiting

The API enforces rate limits to prevent abuse. Limits are conveyed via standard `RateLimit-*` HTTP headers.

| Limiter | Window | Max Requests | Scope |
|---------|--------|-------------|-------|
| **General** | 1 minute | 200 | Per user |
| **Login** | 15 minutes | 10 | Per IP |
| **OTP** (verify / resend) | 1 hour | 5 | Per email |
| **Driver Location** | 5 seconds | 1 | Per driver |

**Rate Limit Exceeded Response (429):**
```json
{
  "status": "error",
  "code": 429,
  "message": "Too many requests. Please try again later.",
  "details": {}
}
```

---

## Error Response Format

All errors follow a consistent JSON structure:

```json
{
  "status": "error",
  "code": 400,
  "message": "Description of the error",
  "details": {}
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| `400` | Bad Request — invalid parameters or body |
| `401` | Unauthorized — missing/invalid token or credentials |
| `403` | Forbidden — insufficient permissions or unverified account |
| `404` | Not Found — resource does not exist |
| `409` | Conflict — duplicate resource (e.g., email already exists) |
| `410` | Gone — expired OTP or reset token |
| `422` | Unprocessable Entity — validation failed |
| `429` | Too Many Requests — rate limit exceeded |
| `500` | Internal Server Error |

### Validation Error (422)

```json
{
  "status": "error",
  "code": 422,
  "message": "Validation failed",
  "details": [
    { "field": "email", "message": "A valid email is required" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ]
}
```

---

## API Modules

---

### 1. Authentication

Base path: `/api/v1/auth`

#### POST `/auth/register`

Register a new user account. Sends a 4-digit OTP to the provided email for verification.

**Rate Limit:** General

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | ✅ | Non-empty, trimmed |
| `email` | string | ✅ | Valid email format |
| `password` | string | ✅ | Minimum 8 characters |
| `confirmPassword` | string | ✅ | Must match `password` |

**Request Example:**
```json
{
  "name": "Rudra Patel",
  "email": "rudra@example.com",
  "password": "SecureP@ss1",
  "confirmPassword": "SecureP@ss1"
}
```

**Response `201 Created`:**
```json
{
  "userId": "b3f1a2c4-...",
  "email": "rudra@example.com",
  "message": "Registration successful. Please verify your email with the OTP sent."
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `409` | Email already exists |
| `422` | Validation failed |

---

#### POST `/auth/verify-otp`

Verify email with the 4-digit OTP received after registration. Returns access & refresh tokens upon success.

**Rate Limit:** OTP (5 req/email/hour)

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | ✅ | Valid email |
| `otp` | string | ✅ | Exactly 4 numeric digits |

**Request Example:**
```json
{
  "email": "rudra@example.com",
  "otp": "4823"
}
```

**Response `200 OK`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "b3f1a2c4-...",
    "name": "Rudra Patel",
    "email": "rudra@example.com",
    "role": "passenger"
  }
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `400` | Account already verified / Invalid OTP / No OTP generated |
| `404` | Email not found |
| `410` | OTP expired |

---

#### POST `/auth/resend-otp`

Resend a new OTP to the user's email. Only works for accounts that are not yet verified.

**Rate Limit:** OTP (5 req/email/hour)

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | ✅ | Valid email |

**Response `200 OK`:**
```json
{
  "message": "A new OTP has been sent to your email."
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `400` | Account already verified |
| `404` | Email not found |

---

#### POST `/auth/login`

Authenticate a user with email and password. Returns JWT tokens.

**Rate Limit:** Login (10 req/IP/15 min)

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | ✅ | Valid email |
| `password` | string | ✅ | Non-empty |
| `role` | string | ❌ | `"passenger"` or `"driver"` — if provided, user's role must match |

**Request Example:**
```json
{
  "email": "rudra@example.com",
  "password": "SecureP@ss1"
}
```

**Response `200 OK`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "b3f1a2c4-...",
    "name": "Rudra Patel",
    "email": "rudra@example.com",
    "role": "passenger"
  }
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `401` | Invalid email/password or role mismatch |
| `403` | Account not verified / suspended / deleted |

---

#### POST `/auth/google`

Authenticate or register via Google OAuth. Links Google account to existing email if found.

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `idToken` | string | ✅ | Google ID token from client-side OAuth |

**Response `200 OK`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "b3f1a2c4-...",
    "name": "Rudra Patel",
    "email": "rudra@gmail.com",
    "role": "passenger"
  },
  "isNewUser": true
}
```

---

#### POST `/auth/forgot-password`

Request a password reset. Always returns success to prevent email enumeration.

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | ✅ | Valid email |

**Response `200 OK`:**
```json
{
  "message": "If that email exists, a password reset link has been sent."
}
```

---

#### POST `/auth/reset-password`

Reset password using the reset token received via email.

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | ✅ | Valid email |
| `resetToken` | string | ✅ | Non-empty |
| `newPassword` | string | ✅ | Minimum 8 characters |
| `confirmPassword` | string | ✅ | Must match `newPassword` |

**Response `200 OK`:**
```json
{
  "message": "Password has been reset successfully."
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `400` | Invalid reset token |
| `410` | Reset token expired |

---

#### POST `/auth/refresh-token`

Rotate the refresh token and obtain a new access token. The old refresh token is invalidated.

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `refreshToken` | string | ✅ | Non-empty |

**Response `200 OK`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `401` | Invalid / expired / revoked refresh token |

---

#### POST `/auth/logout`

🔒 **Requires Authentication**

Revoke the provided refresh token. The access token remains valid until it expires naturally.

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `refreshToken` | string | ❌ | If provided, the token is revoked |

**Response `200 OK`:**
```json
{
  "message": "Logged out successfully."
}
```

---

### 2. User Profile

Base path: `/api/v1/users`

🔒 **All endpoints require Authentication**

---

#### GET `/users/me`

Retrieve the authenticated user's profile.

**Response `200 OK`:**
```json
{
  "id": "b3f1a2c4-...",
  "name": "Rudra Patel",
  "email": "rudra@example.com",
  "role": "passenger",
  "avatarUrl": "https://example.com/avatar.jpg",
  "createdAt": "2026-03-26T09:00:00.000Z"
}
```

---

#### PUT `/users/me`

Update the authenticated user's profile. Only provided fields are updated.

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | ❌ | Non-empty, trimmed |
| `email` | string | ❌ | Valid email (must be unique) |

**Request Example:**
```json
{
  "name": "Rudra P."
}
```

**Response `200 OK`:**
```json
{
  "id": "b3f1a2c4-...",
  "name": "Rudra P.",
  "email": "rudra@example.com"
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `409` | Email already in use by another account |

---

#### PUT `/users/me/password`

Change the authenticated user's password. Not available for OAuth-only accounts.

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `currentPassword` | string | ✅ | Non-empty |
| `newPassword` | string | ✅ | Minimum 8 characters |
| `confirmPassword` | string | ✅ | Must match `newPassword` |

**Response `200 OK`:**
```json
{
  "message": "Password updated successfully."
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `400` | OAuth-only account (no password set) |
| `401` | Current password is incorrect |

---

#### DELETE `/users/me`

Soft-delete the authenticated user's account (sets status to `deleted`). All refresh tokens are revoked.

**Response `200 OK`:**
```json
{
  "message": "Account deleted successfully."
}
```

---

#### GET `/users/me/recents`

Retrieve the user's recent search entries (locations & routes).

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | ❌ | Filter by `"location"` or `"route"` |
| `limit` | integer | ❌ | Max results (default: `10`) |

**Response `200 OK`:**
```json
[
  {
    "id": "rc-uuid-...",
    "type": "location",
    "label": "Shankar Nagar",
    "subLabel": "Raipur, CG",
    "lat": 21.2514,
    "lng": 81.6296,
    "originId": null,
    "destId": null
  }
]
```

---

#### POST `/users/me/recents`

Create a new recent search entry.

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `type` | string | ✅ | `"location"` or `"route"` |
| `label` | string | ✅ | Non-empty, trimmed |
| `subLabel` | string | ❌ | Trimmed |
| `lat` | float | ❌ | Valid latitude |
| `lng` | float | ❌ | Valid longitude |
| `originId` | string | ❌ | Origin stop/place ID (for route type) |
| `destId` | string | ❌ | Destination stop/place ID (for route type) |

**Response `201 Created`:**
```json
{
  "id": "rc-uuid-...",
  "type": "location",
  "label": "Shankar Nagar"
}
```

---

#### DELETE `/users/me/recents/:recentId`

Delete a specific recent entry. Only the owner can delete their own entries.

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `recentId` | string (UUID) | ID of the recent entry |

**Response `200 OK`:**
```json
{
  "message": "Recent entry removed."
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `404` | Entry not found or belongs to another user |

---

### 3. Buses

Base path: `/api/v1/buses`

🔒 **All endpoints require Authentication**

---

#### GET `/buses`

List all buses with optional filters.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `routeId` | string | ❌ | Filter by route UUID |
| `status` | string | ❌ | Filter by status: `"active"`, `"idle"`, `"maintenance"`, or `"all"` |

**Response `200 OK`:**
```json
[
  {
    "busId": "bus-uuid-...",
    "plateNumber": "CG04-AB-1234",
    "routeId": "route-uuid-...",
    "status": "active",
    "currentLat": 21.2514,
    "currentLng": 81.6296
  }
]
```

---

#### GET `/buses/:busId`

Get detailed information about a specific bus.

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `busId` | string (UUID) | Bus ID |

**Response `200 OK`:**
```json
{
  "busId": "bus-uuid-...",
  "plateNumber": "CG04-AB-1234",
  "routeId": "route-uuid-...",
  "driverId": "driver-uuid-...",
  "status": "active",
  "capacity": 40
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `404` | Bus not found |

---

#### GET `/buses/:busId/location`

Get the real-time location of a specific bus.

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `busId` | string (UUID) | Bus ID |

**Response `200 OK`:**
```json
{
  "busId": "bus-uuid-...",
  "lat": 21.2514,
  "lng": 81.6296,
  "heading": 135.5,
  "speed": 28.3,
  "updatedAt": "2026-03-26T09:20:00.000Z"
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `404` | Bus not found |

---

#### GET `/buses/nearby`

Find active buses near a geographic location within a given radius. Uses Haversine formula for distance calculation.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `lat` | float | ✅ | User's latitude |
| `lng` | float | ✅ | User's longitude |
| `radius` | integer | ❌ | Search radius in metres (default: `2000`) |

**Response `200 OK`:**
```json
[
  {
    "busId": "bus-uuid-...",
    "plateNumber": "CG04-AB-1234",
    "lat": 21.2520,
    "lng": 81.6300,
    "routeId": "route-uuid-...",
    "eta": null
  }
]
```

> **Note:** The `eta` field is a placeholder; ETA calculation requires a routing engine integration.

**Errors:**
| Code | Condition |
|------|-----------|
| `400` | Missing `lat` or `lng` |

---

#### GET `/buses/search`

Search for buses that travel between two stops. Finds routes containing both stops in the correct sequence.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `originStopId` | string | ✅ | Origin stop UUID |
| `destStopId` | string | ✅ | Destination stop UUID |
| `time` | string | ❌ | Preferred departure time (reserved for future use) |

**Response `200 OK`:**
```json
[
  {
    "busId": "bus-uuid-...",
    "plateNumber": "CG04-AB-1234",
    "routeName": "Route 1 — Pandri to Telibandha",
    "departureTime": null,
    "eta": null,
    "status": "active"
  }
]
```

> Returns an empty array `[]` if no buses serve both stops in the correct order.

**Errors:**
| Code | Condition |
|------|-----------|
| `400` | Missing `originStopId` or `destStopId` |

---

### 4. Schedule

Base path: `/api/v1/buses/:busId/schedule`

🔒 **All endpoints require Authentication**

---

#### GET `/buses/:busId/schedule`

Get the full schedule for a specific bus (today and future dates).

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `busId` | string (UUID) | Bus ID |

**Response `200 OK`:**
```json
{
  "busId": "bus-uuid-...",
  "status": "active",
  "stops": [
    {
      "stopId": "stop-uuid-...",
      "name": "Pandri Bus Stand",
      "distanceFromOrigin": 0,
      "scheduledArrival": "2026-03-26T08:00:00.000Z",
      "estimatedArrival": "2026-03-26T08:02:00.000Z",
      "delayMinutes": 2,
      "passengerCount": 15,
      "isCurrent": false
    }
  ]
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `404` | Bus not found |

---

#### GET `/buses/:busId/schedule/next-stop`

Get the next upcoming stop for a specific bus.

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `busId` | string (UUID) | Bus ID |

**Response `200 OK`:**
```json
{
  "stopId": "stop-uuid-...",
  "stopName": "Shankar Nagar",
  "eta": "2026-03-26T08:15:00.000Z",
  "delayMinutes": 0,
  "status": "On Time"
}
```

> The `status` field is `"On Time"` when `delayMinutes` is `0`, and `"Delayed"` otherwise.

**Errors:**
| Code | Condition |
|------|-----------|
| `404` | Bus not found or no upcoming stops |

---

### 5. Stops

Base path: `/api/v1/stops`

🔒 **All endpoints require Authentication**

---

#### GET `/stops`

List all bus stops with optional filters.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `routeId` | string | ❌ | Filter stops by route UUID (returns stops in sequence order) |
| `city` | string | ❌ | Filter by city name |

**Response `200 OK`:**
```json
[
  {
    "stopId": "stop-uuid-...",
    "name": "Pandri Bus Stand",
    "city": "Raipur",
    "lat": 21.2354,
    "lng": 81.6267,
    "routeIds": ["route-uuid-1", "route-uuid-2"]
  }
]
```

---

#### GET `/stops/:stopId`

Get detailed information about a specific stop, including amenities.

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `stopId` | string (UUID) | Stop ID |

**Response `200 OK`:**
```json
{
  "stopId": "stop-uuid-...",
  "name": "Pandri Bus Stand",
  "city": "Raipur",
  "lat": 21.2354,
  "lng": 81.6267,
  "routeIds": ["route-uuid-1", "route-uuid-2"],
  "amenities": ["shelter", "bench", "lighting"]
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `404` | Stop not found |

---

#### GET `/stops/nearest`

Find the nearest bus stops to a given location. Uses Haversine formula for distance calculation.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `lat` | float | ✅ | User's latitude |
| `lng` | float | ✅ | User's longitude |
| `limit` | integer | ❌ | Max results (default: `3`) |

**Response `200 OK`:**
```json
[
  {
    "stopId": "stop-uuid-...",
    "name": "Pandri Bus Stand",
    "distanceMetres": 320,
    "walkingMinutes": 4,
    "lat": 21.2354,
    "lng": 81.6267
  }
]
```

> Walking time estimate assumes ~80 metres/minute walking speed.

**Errors:**
| Code | Condition |
|------|-----------|
| `400` | Missing `lat` or `lng` |

---

#### GET `/stops/search`

Search for stops by name (case-insensitive partial match).

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | ✅ | Search query |
| `limit` | integer | ❌ | Max results (default: `10`) |

**Response `200 OK`:**
```json
[
  {
    "stopId": "stop-uuid-...",
    "name": "Shankar Nagar Chowk",
    "city": "Raipur",
    "lat": 21.2514,
    "lng": 81.6296
  }
]
```

**Errors:**
| Code | Condition |
|------|-----------|
| `400` | Missing query parameter `q` |

---

### 6. Routes

Base path: `/api/v1/routes`

🔒 **All endpoints require Authentication**

---

#### GET `/routes`

List all bus routes with summary information.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | ❌ | Filter by city name |
| `active` | string | ❌ | `"true"` (default) or `"false"` — filter by active status |

**Response `200 OK`:**
```json
[
  {
    "routeId": "route-uuid-...",
    "name": "Route 1 — Pandri to Telibandha",
    "originStop": "Pandri Bus Stand",
    "terminalStop": "Telibandha",
    "totalStops": 8,
    "distanceKm": 12.5
  }
]
```

---

#### GET `/routes/:routeId`

Get detailed information about a route including its ordered list of stops.

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `routeId` | string (UUID) | Route ID |

**Response `200 OK`:**
```json
{
  "routeId": "route-uuid-...",
  "name": "Route 1 — Pandri to Telibandha",
  "stops": [
    {
      "sequence": 1,
      "stopId": "stop-uuid-...",
      "name": "Pandri Bus Stand",
      "distanceFromOrigin": 0
    },
    {
      "sequence": 2,
      "stopId": "stop-uuid-...",
      "name": "Shankar Nagar Chowk",
      "distanceFromOrigin": 2.3
    }
  ]
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `404` | Route not found |

---

### 7. Driver

Base path: `/api/v1/driver`

🔒 **Requires Authentication** + **Role: `driver`**

All driver endpoints verify that the authenticated user has the `driver` role. A `403 Forbidden` error is returned if the user is not a driver.

---

#### GET `/driver/assignment`

Get the current bus assignment for the authenticated driver.

**Response `200 OK`:**
```json
{
  "busId": "bus-uuid-...",
  "plateNumber": "CG04-AB-1234",
  "routeId": "route-uuid-...",
  "routeName": "Route 1 — Pandri to Telibandha",
  "assignedDate": "2026-03-26"
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `404` | No bus assigned to this driver |

---

#### GET `/driver/trips`

List trips for the driver's assigned bus.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | string (ISO date) | ❌ | Date to query (default: today). Format: `YYYY-MM-DD` |

**Response `200 OK`:**
```json
[
  {
    "tripId": "trip-uuid-...",
    "tripNumber": 1,
    "originStop": "Pandri Bus Stand",
    "destStop": "Telibandha",
    "distanceKm": 12.5,
    "departureTime": "2026-03-26T08:00:00.000Z",
    "status": "scheduled"
  }
]
```

**Errors:**
| Code | Condition |
|------|-----------|
| `404` | No bus assigned |

---

#### GET `/driver/trips/:tripId`

Get detailed information about a specific trip including its stop schedule.

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `tripId` | string (UUID) | Trip ID |

**Response `200 OK`:**
```json
{
  "tripId": "trip-uuid-...",
  "busId": "bus-uuid-...",
  "status": "in_progress",
  "stops": [
    {
      "stopId": "stop-uuid-...",
      "name": "Pandri Bus Stand",
      "scheduledArrival": "2026-03-26T08:00:00.000Z",
      "estimatedArrival": "2026-03-26T08:02:00.000Z",
      "delayMinutes": 2,
      "passengerCount": 15,
      "isCurrent": false
    }
  ]
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `404` | Trip not found |

---

#### POST `/driver/trips/:tripId/start`

Start a scheduled trip. Transitions trip status from `scheduled` → `in_progress` and sets bus status to `active`.

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `tripId` | string (UUID) | Trip ID |

**Response `200 OK`:**
```json
{
  "tripId": "trip-uuid-...",
  "status": "in_progress",
  "startedAt": "2026-03-26T08:00:00.000Z"
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `400` | Trip is not in `scheduled` status |
| `404` | Trip not found |

---

#### POST `/driver/trips/:tripId/complete`

Complete an in-progress trip. Transitions trip status from `in_progress` → `completed`. If no more scheduled trips exist for today, the bus status is set to `idle`.

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `tripId` | string (UUID) | Trip ID |

**Response `200 OK`:**
```json
{
  "tripId": "trip-uuid-...",
  "status": "completed",
  "completedAt": "2026-03-26T09:30:00.000Z"
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `400` | Trip is not in `in_progress` status |
| `404` | Trip not found |

---

#### PUT `/driver/location`

Update the GPS location of the driver's assigned bus. Used for real-time tracking.

**Rate Limit:** Driver Location (1 req/5s/driver)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lat` | float | ✅ | Current latitude |
| `lng` | float | ✅ | Current longitude |
| `heading` | float | ❌ | Compass heading in degrees (0–360) |
| `speed` | float | ❌ | Speed in km/h |
| `timestamp` | string (ISO) | ❌ | Client timestamp (default: server time) |

**Request Example:**
```json
{
  "lat": 21.2514,
  "lng": 81.6296,
  "heading": 135.5,
  "speed": 28.3
}
```

**Response `200 OK`:**
```json
{
  "received": true
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `400` | Missing `lat` or `lng` |
| `404` | No bus assigned to this driver |

---

#### GET `/driver/schedule`

Get today's schedule for the driver's assigned bus, including the active trip ID.

**Response `200 OK`:**
```json
{
  "tripId": "trip-uuid-...",
  "busId": "bus-uuid-...",
  "status": "active",
  "stops": [
    {
      "stopId": "stop-uuid-...",
      "name": "Pandri Bus Stand",
      "scheduledArrival": "2026-03-26T08:00:00.000Z",
      "estimatedArrival": "2026-03-26T08:02:00.000Z",
      "delayMinutes": 2,
      "passengerCount": 15,
      "isCurrent": true
    }
  ]
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `404` | No bus assigned |

---

### 8. Geocoding & Navigation

Base path: `/api/v1`

🔒 **All endpoints require Authentication**

> ⚠️ **Note:** These endpoints currently return mock/placeholder data. In production, they will proxy to Google Maps APIs.

---

#### GET `/geocode/search`

Forward geocoding — convert a text query to geographic coordinates.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | ✅ | Search query (e.g., place name, address) |
| `city` | string | ❌ | City context for the search |

**Response `200 OK`:**
```json
[
  {
    "placeId": "mock-place-1",
    "label": "Shankar Nagar (Raipur)",
    "subLabel": "Raipur, Chhattisgarh, India",
    "lat": 21.2524,
    "lng": 81.6310
  }
]
```

**Errors:**
| Code | Condition |
|------|-----------|
| `400` | Missing query parameter `q` |

---

#### GET `/geocode/reverse`

Reverse geocoding — convert geographic coordinates to a human-readable address.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `lat` | float | ✅ | Latitude |
| `lng` | float | ✅ | Longitude |

**Response `200 OK`:**
```json
{
  "label": "Raipur Location",
  "subLabel": "Raipur, Chhattisgarh, India",
  "lat": 21.2514,
  "lng": 81.6296
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `400` | Missing `lat` or `lng` |

---

#### GET `/navigation/walking`

Get walking directions from a user's location to a bus stop.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `originLat` | float | ✅ | User's current latitude |
| `originLng` | float | ✅ | User's current longitude |
| `stopId` | string | ✅ | Destination bus stop UUID |

**Response `200 OK`:**
```json
{
  "distanceMetres": 520,
  "durationMinutes": 7,
  "polyline": "",
  "steps": [
    {
      "instruction": "Head north on Main Road",
      "distanceM": 312
    },
    {
      "instruction": "Turn right onto Station Road",
      "distanceM": 208
    }
  ]
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `400` | Missing `originLat`, `originLng`, or `stopId` |

---

## Data Models

### Entity Relationship Diagram

```
┌──────────┐     1:N     ┌──────────────┐
│   User   │────────────▶│ RefreshToken  │
│          │             └──────────────┘
│          │     1:N     ┌──────────────┐
│          │────────────▶│ RecentEntry   │
│          │             └──────────────┘
│          │     1:1     ┌──────────────┐
│          │────────────▶│     Bus       │
└──────────┘             │              │
                         │              │     N:1     ┌──────────┐
                         │              │────────────▶│  Route   │
                         │              │             └──────────┘
                         │              │     1:N     ┌──────────┐
                         │              │────────────▶│   Trip   │
                         │              │             └──────────┘
                         │              │     1:N     ┌──────────┐
                         │              │────────────▶│ Schedule │◀──┐
                         └──────────────┘             └──────────┘   │
                                                                     │ N:1
                         ┌──────────────┐             ┌──────────┐   │
                         │  RouteStop   │────────────▶│   Stop   │───┘
                         │  (join)      │             └──────────┘
                         └──────────────┘
                              │
                              │ N:1
                              ▼
                         ┌──────────┐
                         │  Route   │
                         └──────────┘
```

### Enums

| Enum | Values |
|------|--------|
| `Role` | `passenger`, `driver`, `admin` |
| `AccountStatus` | `pending`, `active`, `suspended`, `deleted` |
| `BusStatus` | `active`, `idle`, `maintenance` |
| `TripStatus` | `scheduled`, `in_progress`, `completed`, `cancelled` |
| `RecentType` | `location`, `route` |

### Model Schemas

#### User
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | String | User's display name |
| `email` | String | Unique email address |
| `hashedPassword` | String? | Bcrypt hash (null for OAuth-only accounts) |
| `role` | Role | User role |
| `accountStatus` | AccountStatus | Account verification/deletion state |
| `avatarUrl` | String? | Profile picture URL |
| `googleId` | String? | Google OAuth subject ID |
| `otp` | String? | 4-digit OTP for verification |
| `otpExpiresAt` | DateTime? | OTP expiration timestamp |
| `resetToken` | String? | Password reset token |
| `resetTokenExpiry` | DateTime? | Reset token expiration |
| `createdAt` | DateTime | Account creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

#### Bus
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `plateNumber` | String | Unique vehicle registration |
| `routeId` | UUID? | Assigned route |
| `driverId` | UUID? | Assigned driver (unique) |
| `status` | BusStatus | Current operational status |
| `capacity` | Int | Passenger capacity (default: 40) |
| `currentLat` | Float? | Current GPS latitude |
| `currentLng` | Float? | Current GPS longitude |
| `heading` | Float? | Compass heading (degrees) |
| `speed` | Float? | Speed (km/h) |
| `locationUpdatedAt` | DateTime? | Last GPS update time |

#### Route
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | String | Route display name |
| `city` | String | City (default: "Raipur") |
| `active` | Boolean | Whether route is currently active |
| `distanceKm` | Float? | Total route distance |

#### Stop
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | String | Stop display name |
| `city` | String | City (default: "Raipur") |
| `lat` | Float | GPS latitude |
| `lng` | Float | GPS longitude |
| `amenities` | String[] | Available amenities |

#### RouteStop (Join Table)
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `routeId` | UUID | Route reference |
| `stopId` | UUID | Stop reference |
| `sequence` | Int | Order in the route |
| `distanceFromOrigin` | Float | Distance from first stop (km) |

#### Trip
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `tripNumber` | Int | Trip sequence number for the day |
| `busId` | UUID | Bus performing the trip |
| `originStop` | String | Starting stop name |
| `destStop` | String | Ending stop name |
| `distanceKm` | Float | Trip distance |
| `departureTime` | DateTime | Scheduled departure |
| `status` | TripStatus | Current trip state |
| `startedAt` | DateTime? | Actual start time |
| `completedAt` | DateTime? | Actual completion time |
| `date` | Date | Trip date |

#### Schedule
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `busId` | UUID | Bus reference |
| `stopId` | UUID | Stop reference |
| `scheduledArrival` | DateTime | Planned arrival time |
| `estimatedArrival` | DateTime? | Updated ETA |
| `actualArrival` | DateTime? | Actual arrival time |
| `delayMinutes` | Int | Delay in minutes (default: 0) |
| `passengerCount` | Int | Passengers at this stop (default: 0) |
| `isCurrent` | Boolean | Whether bus is currently at this stop |
| `date` | Date | Schedule date |

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/buslink` |
| `JWT_SECRET` | Access token signing secret | (random string) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | (random string) |
| `JWT_ACCESS_EXPIRY` | Access token TTL | `60m` |
| `JWT_REFRESH_EXPIRY` | Refresh token TTL | `30d` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | (from Google Cloud Console) |
| `SMTP_HOST` | Mail server host | `smtp.gmail.com` |
| `SMTP_PORT` | Mail server port | `587` |
| `SMTP_USER` | Mail account username | `app@gmail.com` |
| `SMTP_PASS` | Mail account password / app password | (app password) |
| `SMTP_FROM` | Sender display address | `"BusLink <noreply@buslink.app>"` |

---

## Quick Reference

### All Endpoints Summary

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/` | ❌ | — | Health check |
| `POST` | `/api/v1/auth/register` | ❌ | — | Register new account |
| `POST` | `/api/v1/auth/verify-otp` | ❌ | — | Verify email OTP |
| `POST` | `/api/v1/auth/resend-otp` | ❌ | — | Resend OTP |
| `POST` | `/api/v1/auth/login` | ❌ | — | Login with credentials |
| `POST` | `/api/v1/auth/google` | ❌ | — | Google OAuth login |
| `POST` | `/api/v1/auth/forgot-password` | ❌ | — | Request password reset |
| `POST` | `/api/v1/auth/reset-password` | ❌ | — | Reset password with token |
| `POST` | `/api/v1/auth/refresh-token` | ❌ | — | Rotate refresh token |
| `POST` | `/api/v1/auth/logout` | ✅ | Any | Logout / revoke token |
| `GET` | `/api/v1/users/me` | ✅ | Any | Get profile |
| `PUT` | `/api/v1/users/me` | ✅ | Any | Update profile |
| `DELETE` | `/api/v1/users/me` | ✅ | Any | Delete account |
| `PUT` | `/api/v1/users/me/password` | ✅ | Any | Change password |
| `GET` | `/api/v1/users/me/recents` | ✅ | Any | List recent searches |
| `POST` | `/api/v1/users/me/recents` | ✅ | Any | Save recent search |
| `DELETE` | `/api/v1/users/me/recents/:recentId` | ✅ | Any | Delete recent search |
| `GET` | `/api/v1/buses` | ✅ | Any | List buses |
| `GET` | `/api/v1/buses/nearby` | ✅ | Any | Find nearby buses |
| `GET` | `/api/v1/buses/search` | ✅ | Any | Search buses by stops |
| `GET` | `/api/v1/buses/:busId` | ✅ | Any | Get bus details |
| `GET` | `/api/v1/buses/:busId/location` | ✅ | Any | Get bus location |
| `GET` | `/api/v1/buses/:busId/schedule` | ✅ | Any | Get bus schedule |
| `GET` | `/api/v1/buses/:busId/schedule/next-stop` | ✅ | Any | Get next stop |
| `GET` | `/api/v1/stops` | ✅ | Any | List stops |
| `GET` | `/api/v1/stops/nearest` | ✅ | Any | Find nearest stops |
| `GET` | `/api/v1/stops/search` | ✅ | Any | Search stops |
| `GET` | `/api/v1/stops/:stopId` | ✅ | Any | Get stop details |
| `GET` | `/api/v1/routes` | ✅ | Any | List routes |
| `GET` | `/api/v1/routes/:routeId` | ✅ | Any | Get route details |
| `GET` | `/api/v1/driver/assignment` | ✅ | Driver | Get bus assignment |
| `GET` | `/api/v1/driver/trips` | ✅ | Driver | List driver trips |
| `GET` | `/api/v1/driver/trips/:tripId` | ✅ | Driver | Get trip details |
| `POST` | `/api/v1/driver/trips/:tripId/start` | ✅ | Driver | Start a trip |
| `POST` | `/api/v1/driver/trips/:tripId/complete` | ✅ | Driver | Complete a trip |
| `PUT` | `/api/v1/driver/location` | ✅ | Driver | Update bus GPS location |
| `GET` | `/api/v1/driver/schedule` | ✅ | Driver | Get driver's schedule |
| `GET` | `/api/v1/geocode/search` | ✅ | Any | Forward geocode |
| `GET` | `/api/v1/geocode/reverse` | ✅ | Any | Reverse geocode |
| `GET` | `/api/v1/navigation/walking` | ✅ | Any | Walking directions |

---

*Generated on 2026-03-26 • BusLink API v1.0.0*
