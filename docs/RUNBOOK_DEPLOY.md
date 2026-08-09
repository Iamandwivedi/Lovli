# Deploy Runbook — GitHub → Railway → Atlas

Step-by-step to bring the backend back up. Current state: `api.lovli.in` returns
`404 Application not found` (the Railway service is gone), `app.lovli.in` is
live but cannot reach the API.

Work top to bottom. Each step has a check — do not move on until it passes.

---

## Step 0 — Push the code (5 min)

Railway deploys *from GitHub*, so the repo must be current first.

```bash
cd ~/Lovli
git status                    # expect: clean, on Lovli-v2-mobile
git log --oneline -5
```

If the push has not happened yet:

```bash
git push origin Lovli-v2-mobile
```

**Check:** the new commits appear at
`https://github.com/Iamandwivedi/Lovli/commits/Lovli-v2-mobile`, and the **CI**
tab shows the workflow running (backend pytest + mobile typecheck + hygiene).

---

## Step 1 — MongoDB Atlas (15 min)

1. <https://cloud.mongodb.com> → **Create** → **M10** (Dedicated).
   *M0 free works for testing, but has no dedicated CPU and no backups — do not
   launch on it.*
2. Provider **AWS**, region **Mumbai (ap-south-1)** — closest to your users.
3. Cluster name: `lovli-prod`.
4. **Database Access** → *Add New Database User*
   - Username `lovli_app`, **Autogenerate Secure Password** → **copy it now**.
   - Role: *Read and write to any database*.
5. **Network Access** → *Add IP Address* → **Allow access from anywhere**
   (`0.0.0.0/0`), note "Railway (dynamic egress IPs)".
   Railway does not publish fixed IPs; the database is still protected by
   credentials + TLS.
6. **Connect** → *Drivers* → *Python 3.12* → copy the string, then insert the
   database name before the `?`:

```
mongodb+srv://lovli_app:<PASSWORD>@lovli-prod.xxxxx.mongodb.net/lovli?retryWrites=true&w=majority
```

7. **Backup** → enable Cloud Backup (default policy).

**Check:** *Browse Collections* loads (the database will be empty).

---

## Step 2 — Railway service from GitHub (10 min)

1. <https://railway.app> → **New Project** → **Deploy from GitHub repo**.
2. Authorise Railway for `Iamandwivedi/Lovli`, select it.
3. Pick branch **`Lovli-v2-mobile`** (switch to `main` after you merge).
4. **Settings → Source**:
   - **Root Directory**: `backend` ← *required*, or the build will not find
     `requirements.txt` / `nixpacks.toml`.
   - **Watch Paths**: `backend/**` so mobile-only commits do not redeploy.
5. **Settings → Deploy**: healthcheck path `/health`, timeout `30`.
   The start command comes from `backend/railway.json`; leave it blank.

Do **not** deploy yet — set the variables first.

---

## Step 3 — Environment variables (10 min)

**Variables → RAW Editor**, paste and fill in. Generate each secret with
`openssl rand -hex 32`:

```env
MONGO_URL=mongodb+srv://lovli_app:PASSWORD@lovli-prod.xxxxx.mongodb.net/lovli?retryWrites=true&w=majority
DB_NAME=lovli
JWT_SECRET=<openssl rand -hex 32>
ADMIN_KEY=<openssl rand -hex 32>
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
LLM_PROVIDER=auto
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_ALLOWED_REDIRECT_URIS=https://app.lovli.in/auth,https://lovli.in/auth
CORS_ORIGINS=https://app.lovli.in,https://lovli.in
ENVIRONMENT=production
ALLOW_TEST_LOGIN=false
PYTHONUNBUFFERED=1
MEMORY_ENGINE_ENABLED=false
DB_TENANT_GUARD=enforce
```

Two that must not be wrong:
- `ALLOW_TEST_LOGIN=false` — the app **refuses to boot** if this is `true` while
  `ENVIRONMENT=production`. That guard is deliberate.
- `DB_TENANT_GUARD=enforce` — anything else weakens per-user isolation.

`MEMORY_ENGINE_ENABLED=false` is intentional: the memory engine captures and
learns silently first. You flip it in Step 7.

**Deploy** → watch the build log.

**Check:** logs end with
`boot ok | schema v2 | tenant guard: enforce | memory engine: off (dark capture)`

---

## Step 4 — Domain (10 min + DNS wait)

1. **Settings → Networking → Generate Domain** → gives
   `lovli-production-xxxx.up.railway.app`.
2. Smoke test it:

```bash
curl https://lovli-production-xxxx.up.railway.app/health
# {"status":"ok","service":"lovli"}
```

3. **Custom Domain** → `api.lovli.in` → Railway shows a CNAME target.
4. At your DNS provider, point `api` at that target (delete the stale record
   that currently resolves to the dead service).

**Check** (allow up to 30 min for DNS):

```bash
curl https://api.lovli.in/health
curl -H "X-Admin-Key: $ADMIN_KEY" https://api.lovli.in/api/internal/db/health
```

The second confirms the database converged: expected vs actual schema version,
guard mode, indexes per collection.

---

## Step 5 — Reconnect the clients (10 min)

**Web (Vercel).** Project → Settings → Environment Variables →
`REACT_APP_BACKEND_URL=https://api.lovli.in` → **Redeploy**.
Check: sign in at `app.lovli.in` and generate a reply.

**Mobile.** `mobile/.env`:

```env
EXPO_PUBLIC_BACKEND_URL=https://api.lovli.in
```

(It currently points at `http://172.20.10.4:8001`, a LAN address that only works
on your machine.) Rebuild the dev client or run `npx expo start -c`.

---

## Step 6 — Verify end to end (10 min)

```bash
# 1. Health
curl https://api.lovli.in/health

# 2. Create an account
curl -X POST https://api.lovli.in/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"Smoke","email":"smoke@lovli.in","password":"SmokeTest@123"}'

# 3. Bootstrap with the returned token — the whole app state in one call
TOKEN=<access_token from step 2>
curl -H "Authorization: Bearer $TOKEN" https://api.lovli.in/api/bootstrap

# 4. Dev bypass must be closed in production
curl -X POST https://api.lovli.in/api/auth/test-login   # expect 404
```

In the app: sign in, save a person, change a setting, **delete and reinstall**,
sign in again — the person, the setting and the Ask Lovli thread should all come
back. That round trip is the point of the whole database layer.

---

## Step 7 — Turn the memory engine on (after real traffic)

Learning runs from day one; personalization stays off until the data justifies
it.

```bash
# 1. What has been captured so far
curl -H "X-Admin-Key: $ADMIN_KEY" https://api.lovli.in/api/internal/memory/stats

# 2. Learn from history that predates the engine (idempotent)
#    Railway → your service → Shell:
python -m scripts.backfill_events --dry-run
python -m scripts.backfill_events

# 3. Rebuild derived memory for everyone
curl -X POST -H "X-Admin-Key: $ADMIN_KEY" -H 'Content-Type: application/json' \
  -d '{"all": true}' https://api.lovli.in/api/internal/memory/rebuild
```

Then set `MEMORY_ENGINE_ENABLED=true` in Railway Variables. It restarts the
service — no redeploy, no code change. Watch copy rate, edit rate and memory
reset rate in `/api/internal/memory/stats`; a rising reset rate means the
personalization is wrong and you should flip it back.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `404 Application not found` | No service bound to the domain | Step 2 + Step 4 |
| Build cannot find `requirements.txt` | Root Directory not set | Set it to `backend` |
| Boot fails: `ALLOW_TEST_LOGIN must not be enabled` | Dev bypass on in production | Set `ALLOW_TEST_LOGIN=false` |
| `ServerSelectionTimeoutError` | Atlas Network Access missing `0.0.0.0/0` | Step 1.5 |
| Auth works, other calls 500 | Tenant guard caught an unscoped query | Check logs for `TENANT SCOPE VIOLATION` — a real bug, do not disable the guard |
| CORS errors on web | `CORS_ORIGINS` missing the origin | Add it, redeploy |
| Google sign-in fails | Redirect URI mismatch | `GOOGLE_ALLOWED_REDIRECT_URIS` must match Google Console exactly |

## Ongoing

- **Rotate a leaked secret**: `openssl rand -hex 32` → update in Railway.
  Rotating `JWT_SECRET` signs everyone out (intentional).
- **Roll back**: Railway → Deployments → previous → *Redeploy*.
- **Database health**: `GET /api/internal/db/health` after every deploy.
