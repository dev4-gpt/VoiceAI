# TryPost instance: operations and lessons

Status: proven live on 2026-09-26. A post typed into StratosGTM went through TryPost and appeared on Bluesky
(`https://bsky.app/profile/veloce-researcher.bsky.social/post/3mwfglq4yde2r`). This records how the instance is
set up, the publish contract we verified against it, and the failures that cost the most time. It holds variable
names only; never put values or tokens in this file.

## What runs where

| Piece | Where | Notes |
|---|---|---|
| StratosGTM API and web | Vercel project `growthvoice-os` (aliases `stratosgtm.vercel.app`, `stratos-gtm.vercel.app`, `growthvoice-os.vercel.app`) | Calls TryPost over HTTP. Never links or forks it. |
| TryPost (PHP/Laravel, AGPL-3.0) | Railway project `lively-elegance`, service `trypost`, plus Postgres and Redis services | Public address `https://trypost-production-8d3b.up.railway.app`, target port 80. |
| TryPost source | Fork `dev4-gpt/trypost`, branch `main`, auto-deploy on push | Public on GitHub, which satisfies the AGPL source offer for our config changes. |
| Per-workspace API token | StratosGTM Keys panel, platform `trypost` | Stored AES-256-GCM per workspace like every other BYOK key. |

Vercel variables: `TRYPOST_BASE_URL` (instance address, Config type) and `ENABLE_REAL_PUBLISHING=true`. Note that
`ENABLE_REAL_PUBLISHING` is global and also arms Twitter and LinkedIn publishing, which still need complete credentials.

## Publish contract (verified live, not assumed)

1. `POST /api/posts` with `content` and `platforms:[{social_account_id, content_type}]` always creates a **draft**.
   Sending `scheduled_at` does not change that (verified: status stayed `draft`, nothing published).
2. `PUT /api/posts/{id}` with `{"status":"publishing"}` publishes now. Only `status` is required. TryPost stamps
   `scheduled_at` to now and dispatches the publish job. There is no separate publish endpoint.
3. `GET /api/posts/{id}` reports `publishing`, then `published`.
4. StratosGTM marks a receipt `isSimulated: false` only when step 3 says `published`. "Accepted" or "publishing" is
   reported as queued, and still `isSimulated: true`.
5. A draft can be deleted; a post that is publishing or published cannot.

Bluesky content type is `bluesky_post`. Media-first networks (Instagram and similar) are refused for text-only posts.

## Fork changes and why

| Change | Why |
|---|---|
| `railway.json` selecting the Dockerfile builder (`docker/Dockerfile`) | Railway kept reverting to Railpack, which failed on the PHP version. |
| Production stage copies the full `vendor/` (`composer-deps`), not the production-only one | The container crash-looped on `Laravel\Pail\PailServiceProvider not found`. |
| `config/horizon.php`: only `supervisor-1` (3 workers) and `social-publishing` (2) in `defaults` and production | See the memory section. |
| `docker/supervisord.prod.conf`: Reverb `autostart=false` | Realtime server is not needed for publishing and cost memory. |

## Railway variables that must be right (names only)

- `APP_KEY`, `APP_URL` (the public address), database and Redis references, `SELF_HOSTED=true`.
- `PASSPORT_PRIVATE_KEY` and `PASSPORT_PUBLIC_KEY` must be **full PEM including the `-----BEGIN ...-----` and
  `-----END ...-----` lines**. Bare base64 gives `Invalid key supplied` and a 500 when creating an API key. The
  `passport:keys --show` option no longer exists: run `php artisan passport:keys --force`, then
  `cat storage/oauth-private.key; cat storage/oauth-public.key`, and paste both blocks as multi-line values.
- `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET`, `REVERB_HOST`, `REVERB_PORT`, `REVERB_SCHEME` must be
  non-empty or boot fails on `routes/channels.php`. Random internal values are fine. Set `BROADCAST_CONNECTION=null`
  because Reverb is not started.
- Platform switches: set `*_ENABLED=false` for every platform except Bluesky (`LINKEDIN_ENABLED`,
  `LINKEDIN_PAGE_ENABLED`, `X_ENABLED`, `TIKTOK_ENABLED`, `YOUTUBE_ENABLED`, `FACEBOOK_ENABLED`, `INSTAGRAM_ENABLED`,
  `INSTAGRAM_FACEBOOK_ENABLED`, `THREADS_ENABLED`, `PINTEREST_ENABLED`, `MASTODON_ENABLED`, `TELEGRAM_ENABLED`,
  `DISCORD_ENABLED`, `GOOGLE_BUSINESS_ENABLED`). Each enabled platform adds a queue and a worker.

## First run

- The entrypoint runs the Passport seeder but **not** `UserSeeder`, so no user exists and there is no sign-up page.
  Run once in the Railway Console: `php artisan db:seed --class='Database\Seeders\UserSeeder' --force`. It creates
  `admin@trypost.it` with a default password. Change the email and password immediately; the instance is public.
- No mail is configured (`SENDKIT_API_KEY` unset). Verification emails and the "post published" notification fail.
  The failed `SendNotification` jobs are harmless.

## Memory and Horizon (the expensive lesson)

The service is capped at 1 GB. Upstream defaults assume far more. Symptoms of getting it wrong: 502s, 40-second
requests, posts stuck at `publishing`, and `oom_kill` in `/sys/fs/cgroup/memory.events` in the thousands.

- In this Horizon version every group in `defaults` runs in **every** environment. Removing a group from
  `environments.production` does not stop it; remove it from `defaults`.
- Every supervisor named in any environment block must exist in `defaults`. Otherwise Horizon crashes at startup with
  `Undefined array key "connection"` and nothing consumes any queue. supervisord does not surface this.
- With auto-balancing, a group's `maxProcesses` is divided across its queues and rounded down, and it needs runtime
  history to shift workers. A cap smaller than the queue count gives **zero workers per queue**. `supervisor-1`
  has 3 queues, so it needs `maxProcesses` of at least 3. The publishing group has one queue per enabled platform,
  which is why only Bluesky is enabled.
- The first publish step runs on the `default` queue and the platform job on `social-<platform>`. Both need a worker.

Console checks (read-only): `php artisan horizon:status`; queue depth and failed jobs via tinker
(`Queue::size('default')`, `DB::table('failed_jobs')->count()`); `ps | grep horizon:work | grep -v grep | wc -l`;
`grep oom_kill /sys/fs/cgroup/memory.events`. To run one waiting job by hand:
`php artisan queue:work redis --queue=<name> --once`. Do not click Publish repeatedly while diagnosing; a stuck job
plus a retry creates duplicates.

## Sign-in gotcha found on the way

Production sign-in uses the Neon Auth instance in the Vercel-managed database `growthvoice-db`, which is a
**different Neon project** from the one the local Neon CLI account can see. Trusted domains
(`https://stratosgtm.vercel.app`, `https://stratos-gtm.vercel.app`, `https://growthvoice-os.vercel.app`) must be added
in that project's console (Auth, Domains), not through the CLI. Google sign-in uses Neon's shared development keys,
which are not meant for production use.

## Adding another network later

Remove that platform's `*_ENABLED=false` and expect one more worker and its memory. Then connect the account inside
TryPost. Each network still needs its own developer-app registration on that network's side (Instagram needs a Meta
app and review). Watch memory after each addition.

## Known gaps

- A publish receipt can still read queued if TryPost takes longer than StratosGTM's short check window.
- No idempotency key on Publish, so a double click can post twice.
- TryPost's own notification emails do not work until a mail key is configured.
