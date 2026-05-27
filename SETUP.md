# CRS Pulse — Setup

## Prerequisites

- Node.js 20+
- Docker + Docker Compose
- EAS CLI: `npm install -g eas-cli`
- Expo CLI: `npm install -g expo-cli`

---

## 1. Mobile (Expo)

```bash
cd mobile
npm install

# Copy env
cp .env.example .env.local
# Set EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1  (Android emulator → host)
# Set EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1  (iOS simulator)

# Start dev server
npm start

# Android emulator
npm run android

# iOS simulator
npm run ios
```

## 2. Backend (Docker)

```bash
cd backend

# Copy env
cp .env.example .env

# Start all services
docker compose up -d

# Install dependencies (inside container)
docker compose exec app composer install

# Generate app key
docker compose exec app php artisan key:generate

# Run migrations + seeders
docker compose exec app php artisan migrate --seed

# Create Filament admin user
docker compose exec app php artisan make:filament-user

# Verify API is up
curl http://localhost:8000/api/v1/health
```

## 3. EAS Build (Android)

```bash
cd mobile

# Login to Expo account
eas login

# Configure project (first time)
eas build:configure

# Internal test build (APK)
eas build --platform android --profile preview

# Production build (AAB for Play Store)
eas build --platform android --profile production
```

## 4. Firebase Setup

1. Create project at console.firebase.google.com
2. Add Android app with package `com.crspulse.app`
3. Download `google-services.json` → `mobile/google-services.json`
4. Download service account JSON → `backend/storage/firebase-credentials.json`
5. Set `FIREBASE_PROJECT_ID` in backend `.env`

## Service URLs (local)

| Service     | URL                          |
|-------------|------------------------------|
| API         | http://localhost:8000/api/v1 |
| Admin Panel | http://localhost:8000/admin  |
| Mailpit     | http://localhost:8025        |
| MySQL       | localhost:3306               |
| Redis       | localhost:6379               |
