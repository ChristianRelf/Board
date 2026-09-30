/**
 * Local-only seed: makes two users, a session cookie you can paste in, and a
 * demo board so the UI can be poked at without a Discord app.
 *   node scripts/seed-dev.mjs
 */
import { Client } from "pg";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

const me = {
  id: "dev-user-1",
  name: "Chris",
  email: "chris@example.com",
  image: "https://cdn.discordapp.com/embed/avatars/1.png",
};
const friend = {
  id: "dev-user-2",
  name: "Sam",
  email: "sam@example.com",
  image: "https://cdn.discordapp.com/embed/avatars/3.png",
};

for (const u of [me, friend]) {
  await db.query(
    `insert into "user" (id, name, email, image, discord_id) values ($1,$2,$3,$4,$5)
     on conflict (id) do update set name = excluded.name, image = excluded.image`,
    [u.id, u.name, u.email, u.image, u.id],
  );
}

const token = "dev-session-token";
await db.query(
  `insert into session ("sessionToken", "userId", expires) values ($1,$2, now() + interval '30 days')
   on conflict ("sessionToken") do update set expires = now() + interval '30 days'`,
  [token, me.id],
);

await db.query(`delete from board where slug in ('roadmap','design-system')`);

async function makeBoard({ title, slug, visibility, bg, lists }) {
  const id = randomUUID();
  await db.query(
    `insert into board (id, title, slug, owner_id, visibility, background, description)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [id, title, slug, me.id, visibility, JSON.stringify(bg), "What we are building next"],
  );
  await db.query(
    `insert into board_member (board_id, user_id, role) values ($1,$2,'owner'), ($1,$3,'editor')`,
    [id, me.id, friend.id],
  );
  const labelIds = [];
  for (const [name, color] of [
    ["bug", "#c9596d"],
    ["feature", "#5a8fd6"],
    ["chore", "#7b8290"],
    ["polish", "#6fa287"],
  ]) {
    const lid = randomUUID();
    labelIds.push(lid);
    await db.query(`insert into label (id, board_id, name, color) values ($1,$2,$3,$4)`, [
      lid,
      id,
      name,
      color,
    ]);
  }
  let lp = 0;
  for (const [listTitle, cards] of lists) {
    const listId = randomUUID();
    lp += 1024;
    await db.query(`insert into list (id, board_id, title, position) values ($1,$2,$3,$4)`, [
      listId,
      id,
      listTitle,
      lp,
    ]);
    let cp = 0;
    for (const c of cards) {
      const cid = randomUUID();
      cp += 1024;
      await db.query(
        `insert into card (id, board_id, list_id, title, description, position, due_at, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [cid, id, listId, c.title, c.desc ?? null, cp, c.due ?? null, me.id],
      );
      for (const li of c.labels ?? [])
        await db.query(`insert into card_label (card_id, label_id) values ($1,$2)`, [
          cid,
          labelIds[li],
        ]);
      if (c.members)
        await db.query(`insert into card_member (card_id, user_id) values ($1,$2)`, [cid, friend.id]);
      for (const [i, item] of (c.checks ?? []).entries())
        await db.query(
          `insert into check_item (id, card_id, text, done, position) values ($1,$2,$3,$4,$5)`,
          [randomUUID(), cid, item[0], item[1], (i + 1) * 1024],
        );
      if (c.comment)
        await db.query(
          `insert into comment (id, card_id, user_id, body) values ($1,$2,$3,$4)`,
          [randomUUID(), cid, friend.id, c.comment],
        );
    }
  }
  return id;
}

const day = 864e5;
const a = await makeBoard({
  title: "Roadmap",
  slug: "roadmap",
  visibility: "public",
  bg: { kind: "color", value: "#1c2530" },
  lists: [
    [
      "Backlog",
      [
        { title: "Keyboard shortcuts for everything", labels: [1] },
        { title: "Offline queue for card edits", labels: [1, 2] },
        { title: "Dark/light theme polish pass", labels: [3] },
      ],
    ],
    [
      "This week",
      [
        {
          title: "Drag a board onto a list to link it",
          desc: "Should feel like dragging a file into a folder.",
          labels: [1],
          due: new Date(Date.now() + 2 * day),
          members: true,
          checks: [
            ["Rail at the bottom", true],
            ["Drop target on lists", true],
            ["Card shows the link", false],
          ],
          comment: "Tried it — the drop shadow sells it.",
        },
        {
          title: "Export board as PNG",
          labels: [1],
          due: new Date(Date.now() - 1 * day),
        },
      ],
    ],
    [
      "Done",
      [
        { title: "Discord sign-in", labels: [1] },
        { title: "Trello import", labels: [1], comment: "Brought over 240 cards clean." },
      ],
    ],
  ],
});

const b = await makeBoard({
  title: "Design system",
  slug: "design-system",
  visibility: "private",
  bg: { kind: "color", value: "#1e2b26" },
  lists: [
    ["Tokens", [{ title: "One accent, no gradients", labels: [3] }]],
    ["Components", [{ title: "Tooltip + hint bubble", labels: [1] }]],
  ],
});

await db.query(
  `insert into board_link (id, from_board_id, to_board_id) values ($1,$2,$3)
   on conflict do nothing`,
  [randomUUID(), a, b],
);

console.log("seeded. session cookie:");
console.log(`authjs.session-token=${token}`);
await db.end();
