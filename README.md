# Soleila — Gaming Lounge Management System

A full-featured web app for managing a gaming lounge: station/seat tracking, session timers, POS/cafe billing, player loyalty, WhatsApp receipts, appointment bookings, and revenue analytics.

## Stack

- **Frontend:** PHP, Tailwind CSS, vanilla JS
- **Backend:** Node.js / Express, REST API
- **Database:** MySQL / MariaDB
- **External:** WhatsApp Web (automated billing), PhonePe (payments)

## Setup

### 1. Database

Create a MySQL database and import:

```
mysql -u root -p gaming_zone < database/schema.sql
```

### 2. Backend (Node.js)

```bash
cd backend
cp .env.example .env   # edit with your DB credentials
npm install
npm start              # runs on port 8000
```

### 3. Frontend (PHP)

Serve the project root with any PHP-capable web server (Apache, Nginx, PHP built-in):

```bash
php -S localhost:1000
```

The frontend auto-detects the backend URL — works out of the box on `localhost`.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Backend server port (default: 8000) |
| `DB_HOST` | MySQL host |
| `DB_USER` | MySQL user |
| `DB_PASS` | MySQL password |
| `DB_NAME` | Database name |
| `JWT_SECRET` | Secret key for auth tokens |
| `CORS_ORIGIN` | Frontend URL for CORS |

## Directory Layout

```
├── index.php              # Public landing page
├── config.php             # Frontend settings
├── pages/                 # Admin & customer dashboards
├── js/                    # Frontend JavaScript
├── css/                   # Stylesheets
├── database/schema.sql    # DB schema
└── backend/
    ├── server.js          # Express entry point
    ├── routes/            # API routes
    ├── middleware/        # Auth middleware
    ├── utils/             # Helpers
    └── config/            # DB config, app settings
```

## License

MIT
