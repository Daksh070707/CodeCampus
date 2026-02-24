# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Supabase migration (replacing backend)

This project was migrated from an Express/Mongo backend to Supabase Auth + Postgres for profiles.

Quick setup:

- Create a Supabase project at https://app.supabase.com
- In Project Settings → API, copy the `URL` and `anon` key.
- Add the following to your project root `.env` (do NOT commit this file):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- In Supabase → Authentication → Settings → External OAuth Providers, enable Google and configure OAuth credentials. Add `http://localhost:8080` and your hosting domain as redirect URLs.

- Run the SQL in `db/supabase_profiles.sql` inside the Supabase SQL editor to create a `profiles` table and RLS policies.

- Run locally:

```bash
npm i
npm run dev
```

Notes:

- Auth is handled client-side with `@supabase/supabase-js` in `src/lib/supabase.ts`.
 - Auth is handled primarily with Supabase for email/password. Google sign-in uses Firebase (client-side) — see `src/lib/firebase.ts` and `src/pages/Login.tsx`.
- Profiles are stored in the `profiles` table; the app upserts a profile row after signup.
- The old Express backend has been archived to `backend_disabled/`.

