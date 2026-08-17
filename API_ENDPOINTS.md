# EvoSenseFleet - Comprehensive API Endpoints

## Overview
The worker API now provides complete CRUD operations for user, device, driver, and asset management with role-based access control.

## Authentication Endpoints

### Login
- **POST** `/api/auth/login`
- Body: `{ email: string, password: string }`
- Returns: `{ token: string, user: AuthUser }`
- Status: 401 if invalid credentials

### Get Current User
- **GET** `/api/auth/me`
- Headers: `Authorization: Bearer <token>`
- Returns: `AuthUser`
- Status: 401 if unauthorized

### Logout
- **POST** `/api/auth/logout`
- Headers: `Authorization: Bearer <token>`
- Returns: `{ ok: true }`

## User Management Endpoints

### List Users
- **GET** `/api/users`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin, manager
- Returns: `User[]`

### Create User
- **POST** `/api/users`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin
- Body: `CreateUserInput { name, email, password, role, phone? }`
- Returns: `{ id, name, email, role, status, createdAt }` (201)

### Update User
- **PUT** `/api/users/:id`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin
- Body: `Partial<User> { role?, status?, name?, phone? }`
- Returns: `{ id, name, email, role, status }`

### Delete User
- **DELETE** `/api/users/:id`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin
- Returns: `{ ok: true }`

## Device Management Endpoints

### List Devices
- **GET** `/api/devices`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin, manager, operator
- Returns: `FleetDevice[]`

### Get Device Details
- **GET** `/api/devices/:id`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin, manager, operator
- Returns: `DeviceRecord` with full parameters
- Status: 404 if not found

### Create Device
- **POST** `/api/devices`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin, manager
- Body: `CreateDeviceInput { name, imei, type? }`
- Returns: `DeviceRecord` (201)

### Update Device
- **PUT** `/api/devices/:id`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin, manager
- Body: `Partial<DeviceRecord> { name?, status?, location?, parameters? }`
- Returns: `DeviceRecord`

### Delete Device
- **DELETE** `/api/devices/:id`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin
- Returns: `{ ok: true }`

## Driver Management Endpoints

### List Drivers
- **GET** `/api/drivers`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin, manager, operator
- Returns: `Driver[]`

### Create Driver
- **POST** `/api/drivers`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin, manager
- Body: `CreateDriverInput { name, email, phone, licenseNumber }`
- Returns: `Driver` (201)

### Update Driver
- **PUT** `/api/drivers/:id`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin, manager
- Body: `Partial<Driver> { name?, status?, phone?, assignedDevices? }`
- Returns: `Driver`

### Delete Driver
- **DELETE** `/api/drivers/:id`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin
- Returns: `{ ok: true }`

## Asset Management Endpoints

### List Assets
- **GET** `/api/assets`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin, manager
- Returns: `Asset[]`

### Create Asset
- **POST** `/api/assets`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin, manager
- Body: `CreateAssetInput { name, type, value? }`
- Returns: `Asset` (201)

### Update Asset
- **PUT** `/api/assets/:id`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin, manager
- Body: `Partial<Asset> { name?, status?, location?, deviceId?, value? }`
- Returns: `Asset`

### Delete Asset
- **DELETE** `/api/assets/:id`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin
- Returns: `{ ok: true }`

## Fleet Operations Endpoints

### Get Fleet Overview
- **GET** `/api/overview`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin, manager, operator
- Returns: `FleetOverview { totalVehicles, onlineVehicles, activeAlerts, averageFuelEfficiency, lastUpdated }`

### Get Alerts
- **GET** `/api/alerts`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin, manager
- Returns: `FleetAlert[]`

### Submit Telemetry
- **POST** `/api/telemetry`
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin, manager, operator
- Body: `DeviceTelemetryEvent { deviceId, battery, temperature, speed }`
- Returns: `{ ok: true, receivedAt, alert? }`
- Auto-generates alerts if battery ≤ 15% or temperature ≥ 85°C

### Live Telemetry Stream
- **GET** `/api/stream` (EventSource/SSE)
- Headers: `Authorization: Bearer <token>`
- **Required Role**: admin, manager, operator
- Streams real-time device telemetry and alerts
- Keep-alive ping every 15 seconds

## Demo Credentials

```
Admin:
- Email: admin@evosensefleet.com
- Password: admin123
- Role: admin
- Tenant: tenant-alpha

Manager:
- Email: manager@evosensefleet.com
- Password: manager123
- Role: manager
- Tenant: tenant-alpha

Operator:
- Email: operator@evosensefleet.com
- Password: operator123
- Role: operator
- Tenant: tenant-beta
```

## Device Parameters Tracking

Each device includes detailed parameters:
- `batteryVoltage`: Voltage in volts
- `batteryCurrent`: Current draw in amps
- `batteryPercentage`: Battery level 0-100%
- `temperature`: Current temperature in °C
- `imei`: International Mobile Equipment Identity
- `imsi`: International Mobile Subscriber Identity
- `iccid`: Integrated Circuit Card Identifier
- `signalStrength`: Signal strength in dBm
- `gpsSatellites`: Number of GPS satellites in view
- `firmwareVersion`: Device firmware version

## Role-Based Access Control

| Endpoint | Admin | Manager | Operator | Viewer |
|----------|-------|---------|----------|--------|
| GET /users | ✓ | ✓ | - | - |
| POST /users | ✓ | - | - | - |
| PUT /users | ✓ | - | - | - |
| DELETE /users | ✓ | - | - | - |
| GET /devices | ✓ | ✓ | ✓ | - |
| POST /devices | ✓ | ✓ | - | - |
| PUT /devices | ✓ | ✓ | - | - |
| DELETE /devices | ✓ | - | - | - |
| GET /drivers | ✓ | ✓ | ✓ | - |
| POST /drivers | ✓ | ✓ | - | - |
| PUT /drivers | ✓ | ✓ | - | - |
| DELETE /drivers | ✓ | - | - | - |
| GET /assets | ✓ | ✓ | - | - |
| POST /assets | ✓ | ✓ | - | - |
| PUT /assets | ✓ | ✓ | - | - |
| DELETE /assets | ✓ | - | - | - |
| GET /overview | ✓ | ✓ | ✓ | - |
| GET /alerts | ✓ | ✓ | - | - |
| POST /telemetry | ✓ | ✓ | ✓ | - |
| GET /stream | ✓ | ✓ | ✓ | - |

## Database Notes

Currently using **in-memory storage** with JavaScript Maps:
- `users`: Map<userId, UserRecord>
- `devices`: Map<deviceId, DeviceRecord>
- `drivers`: Map<driverId, Driver>
- `assets`: Map<assetId, Asset>
- `sessions`: Map<token, AuthUser>

**For production**, replace with:
- Cloudflare D1 (SQLite)
- PostgreSQL
- MongoDB
- Firebase Firestore
- Any other persistent datastore

## Building & Running

```bash
# Build all packages
npm run build

# Start web app (http://localhost:3001)
npm run dev:web

# Start worker API (http://127.0.0.1:8788)
npm run dev:worker

# Both servers communicate via CORS proxy on /api route
```
