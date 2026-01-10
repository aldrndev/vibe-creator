# API Reference

## Base URL

- **Development:** `http://localhost:3000/api/v1`
- **Production:** `https://api.vibecreator.com/api/v1`

## Authentication

All authenticated endpoints require a Bearer token:

```
Authorization: Bearer <access_token>
```

## Endpoints

### Auth

| Method | Endpoint         | Description          |
| ------ | ---------------- | -------------------- |
| POST   | `/auth/register` | Create new account   |
| POST   | `/auth/login`    | Login and get tokens |
| POST   | `/auth/refresh`  | Refresh access token |
| POST   | `/auth/logout`   | Invalidate session   |
| GET    | `/auth/me`       | Get current user     |

### Projects

| Method | Endpoint        | Description         |
| ------ | --------------- | ------------------- |
| GET    | `/projects`     | List user projects  |
| POST   | `/projects`     | Create project      |
| GET    | `/projects/:id` | Get project details |
| PATCH  | `/projects/:id` | Update project      |
| DELETE | `/projects/:id` | Delete project      |

### Export

| Method | Endpoint           | Description       |
| ------ | ------------------ | ----------------- |
| POST   | `/exports`         | Start export job  |
| GET    | `/exports/:id`     | Get export status |
| DELETE | `/exports/:id`     | Cancel export     |
| GET    | `/exports/history` | Export history    |

### AI Director

| Method | Endpoint                         | Description    |
| ------ | -------------------------------- | -------------- |
| POST   | `/director/sessions`             | Create session |
| GET    | `/director/sessions/:id`         | Get session    |
| POST   | `/director/sessions/:id/import`  | Import video   |
| POST   | `/director/sessions/:id/analyze` | Start analysis |
| POST   | `/director/sessions/:id/export`  | Export video   |

### Download

| Method | Endpoint             | Description         |
| ------ | -------------------- | ------------------- |
| POST   | `/downloads`         | Download from URL   |
| GET    | `/downloads/:id`     | Get download status |
| GET    | `/downloads/history` | Download history    |

### Payments

| Method | Endpoint              | Description        |
| ------ | --------------------- | ------------------ |
| GET    | `/payments/plans`     | Get pricing plans  |
| POST   | `/payments/subscribe` | Start subscription |
| POST   | `/webhooks/xendit`    | Xendit webhook     |

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

## Error Codes

| Code               | HTTP | Description              |
| ------------------ | ---- | ------------------------ |
| `UNAUTHORIZED`     | 401  | Missing or invalid token |
| `FORBIDDEN`        | 403  | Insufficient permissions |
| `NOT_FOUND`        | 404  | Resource not found       |
| `VALIDATION_ERROR` | 400  | Invalid request data     |
| `RATE_LIMITED`     | 429  | Too many requests        |
| `INTERNAL_ERROR`   | 500  | Server error             |

## Pagination

List endpoints support cursor pagination:

```
GET /api/v1/projects?cursor=xxx&limit=20
```

Response includes:

```json
{
  "data": {
    "items": [...],
    "nextCursor": "xxx",
    "hasMore": true
  }
}
```

## Rate Limits

| Endpoint       | Limit        |
| -------------- | ------------ |
| Auth endpoints | 10/minute    |
| API endpoints  | 100/minute   |
| Export         | 3 concurrent |
| Download       | 10/minute    |
