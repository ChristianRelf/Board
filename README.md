# Board

A private Trello for a handful of people. Discord for sign-in, Postgres for
everything else, no marketing page.

Runs at **trello.chrisrelf.xyz**.

## What it does

- **Boards, lists, cards** with drag and drop — cards between lists, lists
  between each other, all animated and optimistic.
- **Multiplayer.** Every board tab holds an SSE connection; writes fan out over
  Postgres `LISTEN/NOTIFY`, so edits, moves and renames land on everyone's
  screen in under a second. Avatars in the top bar show who else is in.
- **Discord sign-in only.** `ALLOWED_DISCORD_IDS` is the door: if it is set, no
  one outside the list can get an account at all.
- **Trello import.** Feed it the JSON export and it brings over lists, cards,
  descriptions, due dates, labels, checklists and comments.
- **Due dates**, start dates, and a calendar that quietly colours overdue red.
- **Attachments**, uploaded to disk and served behind the board's permissions,
  or attached as plain links.
- **Backgrounds** — flat colours or any image URL, with a dim slider so cards
  stay readable. No gradients anywhere.
- **Linked boards.** Drag one board onto another on the dashboard to link them;
  then drag it from the rail at the bottom of a board onto a list to create a
  card that points at it.
- **Export to PNG** — the whole board, background and all, chrome stripped out.
- **Public boards** at `/p/<slug>` for roadmaps: read-only, no sign-in, and
  indexed. Private boards 404 for anyone not on them.
- **Icons over words**, with a `?` bubble wherever something needs explaining.
- Dark by default, light if you want it.

## Running it

```bash
pnpm install
cp .env.example .env          # fill in the Discord app + AUTH_SECRET
docker compose up -d db       # or point DATABASE_URL anywhere
pnpm db:push                  # create the schema
pnpm dev
```

### Discord app

1. https://discord.com/developers/applications → New Application → OAuth2.
2. Redirect URI: `https://trello.chrisrelf.xyz/api/auth/callback/discord`
   (and `http://localhost:3000/api/auth/callback/discord` for local work).
3. Copy the client id/secret into `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET`.
4. Put your own and your friends' Discord user IDs in `ALLOWED_DISCORD_IDS`
   (comma-separated). Leave it empty and anyone with the link can sign up.

`AUTH_SECRET` is any 32 random bytes: `openssl rand -base64 32`.

### Deploying

```bash
docker compose up -d --build     # app + postgres
docker compose exec app node_modules/.bin/drizzle-kit push
```

Uploads live in the `uploads` volume (`UPLOAD_DIR=/data/uploads`); back that up
along with the database.

Behind nginx, the realtime stream needs buffering off:

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_buffering off;          # server-sent events
  proxy_read_timeout 1h;
  client_max_body_size 30m;     # attachments
}
```

## Layout

```
src/
  app/                 routes — pages and the JSON API
    api/boards/[id]/stream   SSE endpoint, one per open board
  components/
    board/             canvas, list, card, modal, pickers, store
    home/              dashboard and the Trello importer
    ui/                buttons, tooltip, hint, modal, popover, calendar
  lib/
    db/schema.ts       every table
    events.ts          LISTEN/NOTIFY fan-out + presence
    board-data.ts      the queries the board view runs on
    auth-helpers.ts    who can read, who can write
```

Writes go through the API, which publishes an event; the client applies its own
change optimistically and ignores the echo of its own write (`x-client-id`).

### Local demo data

`node scripts/seed-dev.mjs` makes two users, a couple of boards and a session
token you can paste into a cookie — handy for poking at the UI without a
Discord app. Development only; it writes fixed user ids.
