# Lead Management API (MVP)

A small, beginner-friendly REST backend: **Node.js + Express + MongoDB (Mongoose)**.
Modules: users/auth, leads (with dynamic custom fields), contacts, dashboard. No frontend.

**Why JavaScript (not TypeScript)?** This is a learning project, so there is no build step or type config to
get in the way - you can read the code top to bottom and run it with `node`. Everything is plain CommonJS.
Moving to TypeScript later is straightforward because the code is already split by responsibility.

## Quick start

Requirements: Node 18+ and a MongoDB you can reach (local install, Docker, or a free Atlas cluster).

```bash
npm install
cp .env.example .env          # then edit .env (see below)
npm run seed                  # optional: sample users, contacts, leads, field definitions
npm run dev                   # or: npm start      -> http://localhost:3000/api/v1
npm test                      # runs tests against a temporary in-memory MongoDB
```

### Configure MongoDB and JWT

Edit `.env`:

| Variable | Meaning |
|---|---|
| `MONGODB_URI` | Local: `mongodb://127.0.0.1:27017/lead_management`. Atlas: paste your `mongodb+srv://...` string. Quick local DB with Docker: `docker run -d -p 27017:27017 mongo:7` |
| `JWT_SECRET` | Long random string used to sign tokens (min. 16 chars; the server refuses to start otherwise). Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `1d`, `8h` |
| `SEED_PASSWORD` | Password given to the seeded users |

Never commit `.env` (it is in `.gitignore`).

`npm run seed` **deletes** users, leads, contacts and lead fields first, then creates:
`admin@example.com`, `manager@example.com`, `agent@example.com` (password = `SEED_PASSWORD`, default `Password123!`),
3 contacts, 6 leads, and 5 dynamic field definitions.

> The first `npm test` downloads a MongoDB binary (~100 MB) for `mongodb-memory-server`, so it needs internet once.

## Folder structure

```
src/
  server.js            starts the app (connects to MongoDB, listens)
  app.js               Express app: JSON parsing, routes, error handling (used by tests too)
  config/              env.js (reads .env), db.js (Mongo connection)
  models/              User, Lead, Contact, LeadField (Mongoose schemas + indexes)
  routes/index.js      every URL in one place, with auth/role middleware
  controllers/         one file per module: auth, user, lead, contact, leadField, dashboard
  middleware/          auth.js (JWT + role checks), error.js (404 + error formatting)
  services/            customFields.js (validates dynamic lead fields)
  utils/               validate, query (pagination/sort/search), response envelope, ApiError
  seed/seed.js         sample data
tests/                 Jest + Supertest: auth, leads CRUD/pagination, dashboard
```

## How requests flow

`route -> authenticate (JWT) -> authorize (role) -> controller -> model -> response envelope`.
Controllers `throw new ApiError(status, message)`; `middleware/error.js` turns any error into the error JSON.

## Auth and roles

* `POST /auth/login` returns `{ token, user }`. Send the token as `Authorization: Bearer <token>`.
* There is no public sign-up. Accounts are created by an **admin** (`POST /users`) or by the seed script.
* `admin`: everything, including `/users`. `manager`: leads, contacts, and editing lead-field definitions.
  `agent`: leads and contacts. The user is reloaded from the DB on each request, so deactivating a user
  (`active: false`) cuts off their existing token immediately.
* Passwords are hashed with bcrypt; `passwordHash` is `select: false` and stripped in `toJSON`, so it can never be returned.

## Endpoints (all under `/api/v1`)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me` |
| Users (admin) | `GET /users`, `GET /users/:id`, `POST /users`, `PATCH /users/:id`, `DELETE /users/:id` |
| Leads | `GET /leads`, `POST /leads`, `GET /leads/:id`, `PATCH /leads/:id`, `DELETE /leads/:id` |
| Lead form | `GET /lead-fields`, `PUT /lead-fields` (admin/manager) |
| Contacts | `GET /contacts`, `POST /contacts`, `GET /contacts/:id`, `PATCH /contacts/:id`, `DELETE /contacts/:id` |
| Dashboard | `GET /dashboard/summary`, `GET /dashboard/pipeline` |

**List query params** (all list endpoints): `page` (default 1), `size` (default 20, max 100), `sortBy`
(whitelisted per endpoint, default `createdAt`), `order` (`asc` / `desc`, default `desc`), `search`.
Leads add `status`, `source`, `tag`, `assignedTo` (user id, `me`, or `unassigned`), `contactId`.
Contacts add `tag`. Users add `role`, `active`.
Dashboard endpoints accept `from`, `to` (dates, on lead `createdAt`) and `assignedTo`.

## Try it with curl

```bash
BASE=http://localhost:3000/api/v1

# 1. Log in (after `npm run seed`) and keep the token
TOKEN=$(curl -s $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"Password123!"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).data.token")

# 2. Who am I?
curl -s $BASE/auth/me -H "Authorization: Bearer $TOKEN"

# 3. Define dynamic fields (replaces the whole list)
curl -s -X PUT $BASE/lead-fields -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{
  "fields": [
    {"name":"schoolName","label":"School name","type":"text"},
    {"name":"interestedGrade","label":"Interested grade","type":"number","required":true},
    {"name":"tourScheduled","label":"Tour scheduled","type":"boolean"},
    {"name":"program","label":"Program","type":"select","options":["STEM","Arts","Sports"]}
  ]}'

# 4. Create a lead with custom fields
curl -s -X POST $BASE/leads -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{
  "firstName":"Sam","lastName":"Lee","email":"sam@example.com","status":"qualified","value":5000,
  "customFields":{"schoolName":"North High","interestedGrade":10,"tourScheduled":true}}'

# 5. List, filter, search, paginate
curl -s "$BASE/leads?status=qualified&search=sam&page=1&size=10&sortBy=value&order=desc" -H "Authorization: Bearer $TOKEN"

# 6. Dashboard
curl -s "$BASE/dashboard/summary" -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/dashboard/pipeline?from=2026-01-01&to=2026-12-31" -H "Authorization: Bearer $TOKEN"
```

### Example responses

Paginated list (`GET /leads`):

```json
{
  "success": true,
  "message": "Leads retrieved",
  "data": { "content": [ { "id": "...", "firstName": "Sam" } ], "page": 1, "size": 20, "totalElements": 1, "totalPages": 1 },
  "timestamp": "2026-11-10T12:00:00.000Z"
}
```

Single lead (`POST /leads` -> 201, `GET /leads/:id` -> 200); `data` is:

```json
{
  "id": "66f...", "firstName": "Sam", "lastName": "Lee", "email": "sam@example.com",
  "status": "qualified", "value": 5000, "tags": [],
  "assignedTo": { "id": "66a...", "name": "Alex Agent" },
  "contactId": null,
  "customFields": { "schoolName": "North High", "interestedGrade": 10, "tourScheduled": true },
  "createdAt": "2026-11-10T12:00:00.000Z", "updatedAt": "2026-11-10T12:00:00.000Z"
}
```

Pipeline (`GET /dashboard/pipeline`) always lists every status in order:

```json
{ "success": true, "message": "Pipeline retrieved",
  "data": { "stages": [ { "status": "new", "count": 2, "totalValue": 6200 }, { "status": "contacted", "count": 0, "totalValue": 0 } ] },
  "timestamp": "..." }
```

Summary (`GET /dashboard/summary`): `data` is `{ totalLeads, leadsThisMonth, openLeads, wonLeads, totalContacts }`.
"Open" = status not `won` or `lost`. Contacts are not affected by the lead filters.

Validation error (400):

```json
{ "success": false, "message": "Validation failed",
  "errors": [ { "field": "customFields.interestedGrade", "message": "Interested grade must be a number" } ],
  "timestamp": "..." }
```

Other statuses: 401 (no/invalid token or bad login), 403 (role not allowed), 404 (not found / unknown route),
409 (duplicate unique value such as email), 500 (unexpected; details are logged, not returned).

## Dynamic lead fields: how it works and its limits

* **Definitions** live in the `LeadField` collection (`name`, `label`, `type`, `required`, `options`).
  **Values** live in each lead's `customFields` object. The two are kept separate.
* `PUT /lead-fields` replaces the entire list. `name` must be camelCase (it is the key in `customFields`);
  `select` fields need at least one option. Types: `text`, `number`, `boolean`, `date`, `select`.
* On lead create/update, `customFields` is validated: unknown keys are rejected, required fields must be present,
  types are strict (`10` is a number, `"10"` is rejected), `select` values must be in `options`, dates must parse
  and are stored as ISO strings.
* `PATCH /leads/:id` **merges** `customFields` into the existing ones (send `null` to clear one). Validation
  only runs when the request includes `customFields`.

Limitations (deliberate, to keep the MVP simple):
* Changing or deleting a definition does **not** migrate existing leads. Old values for removed fields stay in
  the database and will be rejected the next time that lead's `customFields` are edited.
* A field made `required` later is not enforced on old leads until their `customFields` are next updated.
* Renaming a field = removing one and adding another (values are not carried over).
* `PUT /lead-fields` is delete-then-insert without a transaction; a crash in between could leave it empty.
* Custom fields are not indexed, so you cannot filter or sort leads by them yet.
* No per-field validation rules beyond type/required/options (no min/max, regex, etc.).

## Shortcuts taken for learning (read before reusing this for real)

* **Hard delete everywhere** (no soft delete) - simplest and clear for a first project. Deleting a user
  un-assigns their leads; deleting a contact clears `contactId` on its leads.
* **No multi-tenancy.** To extend later: add an `organizationId` to every model, put it in the JWT, and add it to
  every query (a Mongoose plugin or a base query helper is a good place).
* **Hand-written validation** (`utils/validate.js`) instead of a library like Zod/Joi. Fine for learning; consider
  a library when rules grow.
* **Search uses an escaped case-insensitive regex.** It is fine for small data but does not use indexes; switch to a
  MongoDB text index or Atlas Search for large collections.
* **Roles are coarse:** agents can edit/delete any lead or contact (the brief asked for "authenticated users").
  `GET /users` is admin-only, so an agent cannot list users to pick an assignee.
* **JWT only, no refresh tokens or logout/revocation** (deactivating the user is the kill switch). No rate limiting,
  helmet, or CORS config - add `helmet`, `express-rate-limit` and `cors` before exposing this publicly.
* Lead email is intentionally **not unique** (the same person can enquire twice); user email and contact email are
  unique (contact email only when set).
* Dashboard "this month" uses UTC month boundaries.
* Writes are not wrapped in transactions (they would need a MongoDB replica set).

## Tests

`npm test` runs Jest + Supertest against an in-memory MongoDB (no data in your real DB is touched). Coverage:
login/`me`/role checks and password-hash safety, lead CRUD with custom-field validation and merge-on-patch,
pagination/filter/search, and dashboard summary + pipeline aggregation (including filters).
