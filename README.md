# Apex Proof Finder

An internal tool for Apex franchisees. It holds the verified positive testimonials, matched to each school's fundraiser totals, participation rate, enrollment, and event years, and it builds a ready-to-send outreach email from the quotes a franchisee selects. Access requires signing in with Google, and only approved emails can get in.

## What is in this repo

- `index.html` — the tool itself, with all data embedded.
- `login.html` — the Google sign-in page. Anyone without a valid session lands here.
- `middleware.js` — checks the session on every request before anything is served.
- `api/auth.js` — verifies the Google sign-in, checks the access list, and creates the session.
- `api/config.js` — hands the login page the Google client ID.
- `api/logout.js` — signs the user out.
- `vercel.json`, `package.json`, `.gitignore` — project configuration.

## One-time setup

### Step 1: Google Cloud (you did this once before for the Research Agent)

1. Go to console.cloud.google.com and open your existing project, or create a new one.
2. Open APIs and Services, then Credentials, then Create Credentials, then OAuth client ID.
3. Choose Web application. Under Authorized JavaScript origins, add your Vercel URL, for example `https://testimonial-finder.vercel.app`. If you add a custom domain later, come back and add that origin too.
4. Create it and copy the Client ID. It ends with `.apps.googleusercontent.com`.

If the project has no OAuth consent screen yet, Google will walk you through creating one first. External user type is fine; only the emails you approve in Step 3 can access the tool regardless.

### Step 2: Vercel environment variables

In the Vercel project, open Settings, then Environment Variables, and add:

- `GOOGLE_CLIENT_ID` — the client ID from Step 1.
- `SESSION_SECRET` — a long random string. Forty or more random characters. This signs the session cookies; treat it like a password and do not reuse one from elsewhere.
- `ALLOWED_DOMAIN` — optional. If franchisees share a company email domain, set it, for example `apexleadershipco.com`, and every verified email on that domain gets in.
- `ALLOWED_EMAILS` — optional. A comma-separated list of specific addresses to allow, useful for franchisees on personal Gmail or outside the company domain.

Set at least one of `ALLOWED_DOMAIN` or `ALLOWED_EMAILS`. You can use both together.

Apply the variables to Production, Preview, and Development, then redeploy from the Deployments tab.

### Step 3: Push and deploy

Push this repository to GitHub and import it in Vercel as a project with Framework Preset set to Other, or just push if the project is already connected. Every push redeploys automatically.

## How franchisees use it

They open the URL, land on the sign-in page, and click Sign in with Google. If their email is on the access list, they are in for seven days on that browser before signing in again. The header shows who is signed in, with a sign out link. If someone not on the list signs in, they see a clear message telling them to contact the marketing team.

## Managing access

To add or remove a franchisee, edit `ALLOWED_EMAILS` (or rely on the domain rule) in Vercel's Environment Variables and redeploy. Removal stops new sign-ins immediately; an existing session can last up to seven days. If you ever need to force everyone out at once, change `SESSION_SECRET` and redeploy, which invalidates every session instantly.

## Usage and adoption tracking

The tool records activity through PostHog against each person's signed-in Google email, so adoption reporting reflects real logins. To turn it on:

1. Create a free account at posthog.com and create a project.
2. Copy the Project API key. It starts with `phc_`.
3. In `index.html`, find the line near the top of the script that reads `const POSTHOG_KEY = "";` and paste the key between the quotes.
4. Push. Vercel redeploys automatically.

The events worth watching: `tool_opened` shows visits, `quote_added` shows engagement, and `email_copied` or `email_opened_in_mail` show real outreach use. Each event carries the signed-in email, so you can build a dashboard of weekly active franchisees and a leaderboard by usage, and see who has never signed in.

## Updating the tool

Replace `index.html` with a new version and push. Nothing else changes.
