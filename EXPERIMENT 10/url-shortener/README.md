# PostgreSQL + Redis URL Shortener

A full-stack URL shortener built with PostgreSQL, Express, React, Node.js, and Redis. Short URLs are generated strictly with a global counter plus Base62 encoding, not hashing.

## Features

- Redis `INCR` global counter using key `url_counter`
- Redis cache for duplicate lookups and redirect resolution
- PostgreSQL duplicate detection via `longUrl -> shortId`
- Base62 short ID generation using `a-z`, `A-Z`, `0-9`
- Redis-only global counter generation
- Default and custom expiration dates for short URLs
- React frontend with loading, errors, and copy button
- Responsive UI

## Project Structure

```text
backend/
  config/
  controllers/
  routes/
  utils/
  server.js
frontend/
  src/
    components/
    App.js
```

## Environment Variables

Create these files before running the app.

### `backend/.env`

```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@127.0.0.1:5432/urlshortner
REDIS_URL=redis://default:YOUR_REDIS_PASSWORD@redis-15043.crce276.ap-south-1-3.ec2.cloud.redislabs.com:15043
REDIS_CACHE_TTL_SECONDS=3600
LOCAL_CACHE_TTL_MS=600000
ENABLE_CACHE_LOGS=false
DEFAULT_URL_EXPIRY_DAYS=30
BASE_URL=http://localhost:5000
```

If your hosted Redis instance requires TLS, use:

```env
REDIS_URL=rediss://default:YOUR_REDIS_PASSWORD@redis-15043.crce276.ap-south-1-3.ec2.cloud.redislabs.com:15043
```

### `frontend/.env`

```env
REACT_APP_API_BASE_URL=http://localhost:5000
```

If the frontend and backend are served from the same origin later, `REACT_APP_API_BASE_URL` can be left empty.

## Run Instructions

### 1. Install dependencies

```bash
cd backend
npm install
cd ../frontend
npm install
```

### 2. Start PostgreSQL and Redis

Create a local PostgreSQL database named `urlshortner`, then make sure PostgreSQL is running locally. Redis is required and uses the Redis URL from `backend/.env`.

On startup, the backend creates the required `urls` table automatically if it does not exist.

### 3. Start the backend

```bash
cd backend
npm run dev
```

### 4. Start the frontend

```bash
cd frontend
npm start
```

### 5. Use the app

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

## API Endpoints

### `POST /api/shorten`

Request:

```json
{
  "longUrl": "https://example.com/some/very/long/path",
  "customExpiryDate": "2026-05-22T18:30"
}
```

Response:

```json
{
  "shortUrl": "http://localhost:5000/b",
  "shortId": "b",
  "longUrl": "https://example.com/some/very/long/path",
  "expiresAt": "2026-05-22T13:00:00.000Z"
}
```

### `GET /:shortId`

Redirects to the original URL.

## Notes

- Short IDs are unique because each new URL gets a unique global counter value.
- Duplicate URLs reuse the previously stored `shortId`.
- If an existing short URL has expired, the same long URL is renewed with a fresh short ID and expiry time.
- The global counter lives only in Redis under key `url_counter`.
- Redis also caches `longUrl -> shortId` and `shortId -> longUrl` lookups for faster duplicate checks and redirects.
- The backend also keeps a short-lived in-process cache to reduce repeated Redis round trips on hot keys.
- If Redis is unavailable, the backend will not start because short IDs must be generated from Redis `INCR`.
- URL records are stored in PostgreSQL table `urls`.

## Requirement Mapping

- Backend stack: Node.js, Express.js, PostgreSQL, Redis
- Counter strategy: Redis `INCR` only
- Cache strategy: Redis caches duplicate detection and redirect lookups
- Duplicate detection: PostgreSQL lookup by `longUrl`
- Short URL generation: Base62 encoding of the counter value
- Redirect mapping: `shortId -> longUrl`
- Duplicate mapping: `longUrl -> shortId`
