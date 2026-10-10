# QuantumShield AI

Autonomous, quantum-optimized cyber defense console (MVP).

- **Frontend:** one static page, `public/index.html`
- **Backend:** Vercel serverless functions in `api/`
- **Database:** PostgreSQL (Neon). Tables are created automatically on the first request. The same SQL is in `schema.sql`.
- **Accounts:** email and password, bcrypt hashes, signed session cookie
- **Saved per account:** policy settings, threat memory, incident reports, audit trail
- **Quantum optimizer:** QAOA statevector simulation running in `api/optimize.js`. Traffic, attacks and connectors are simulated.

## 1. Try it on your computer (no accounts needed)

1. Install Node.js 20 or newer from nodejs.org.
2. In this folder run:
   ```
   npm install
   npm run dev
   ```
3. Open http://localhost:3000, choose **Create account**, and use the app.
   Data is stored in a local embedded Postgres in the `.data` folder.
4. Optional: `npm test` runs the API checks (sign-up, login, rate limit, data isolation, optimizer).

## 2. Put the code on GitHub

1. Create a free account at github.com and make a **new empty repository** named `quantumshield-ai`.
2. In this folder run (replace YOUR-NAME):
   ```
   git init
   git add .
   git commit -m "QuantumShield AI MVP"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/quantumshield-ai.git
   git push -u origin main
   ```

## 3. Create the Vercel project

1. Sign up at vercel.com with your GitHub account.
2. Click **Add New → Project** and import `quantumshield-ai`.
3. Settings on the import screen:
   - Framework Preset: **Other**
   - Build Command: leave empty
   - Output Directory: `public`
4. Click **Deploy**. The first deploy will load the page, but sign-up will say the server is not configured until steps 4 and 5 are done.

## 4. Add the database

1. In your Vercel project open the **Storage** tab.
2. Click **Create Database** (or **Browse Marketplace**), choose **Neon (Postgres)**, accept the terms and pick the free plan.
3. Name it `quantumshield-db`, choose a region close to your users, and click **Create**.
4. When asked, **connect it to your project** for Production, Preview and Development.
5. Open **Settings → Environment Variables** and check that `DATABASE_URL` now exists. The code also accepts `POSTGRES_URL`.

## 5. Add the session secret

1. Generate a secret:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. In **Settings → Environment Variables** add `JWT_SECRET` with that value for Production, Preview and Development.
3. Never commit this value to GitHub.

## 6. Redeploy and check

1. Environment variables only apply to new deployments. Open **Deployments**, click **⋯** on the latest one, and choose **Redeploy**.
2. Open your `https://….vercel.app` address and choose **Create account**.
3. Click **Multi-vector assault**, wait about 15 seconds, then open **Reports**.
4. Reload the page. You should stay signed in and the reports should still be there.
5. In the Neon console open **Tables** to see rows in `users`, `incidents`, `memory` and `audit`.

## 7. Update later

Change the code, then `git add . && git commit -m "change" && git push`. Vercel deploys automatically.

## Troubleshooting

| What you see | Fix |
| --- | --- |
| "The server is not reachable here" | The page is open from a plain file or static host. Use your Vercel address or `npm run dev`. |
| 503 and "DATABASE_URL is not set" | Do step 4, then redeploy. |
| 503 and "JWT_SECRET must be set" | Do step 5, then redeploy. |
| Signed out right after sign-in | Open the site over `https://` and keep it on a single domain. |
| Tables missing | Paste `schema.sql` into the Neon **SQL Editor** and run it. |

## What is real and what is simulated

Real: accounts, sessions, saved policy and memory, incident history, audit trail, the server-side optimizer, rate limiting on login.
Simulated: network traffic, attacks, and the firewall, endpoint, identity and backup connectors.

## Next steps toward production

1. Email verification and password reset (for example with Resend).
2. Teams and roles (admin, analyst, viewer) with an organization table.
3. An ingest endpoint that accepts real flow logs, and real connector calls (firewall, EDR, identity, backup APIs).
4. A queue and scheduled jobs for long-running response workflows.
5. Send the optimizer to a real quantum backend (IBM Quantum or Amazon Braket) behind `api/optimize.js`.
6. Monitoring (Vercel logs, an error tracker) and database backups.
