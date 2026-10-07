/** Integration checks against a running LOCAL dev server. Uses isolated users/boards and cleans up. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}
const base = process.env.TEST_BASE_URL ?? "http://localhost:3010";
assert.ok(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "Run against a local dev server",
);
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const people = ["owner", "admin", "editor", "viewer", "outside"].map(
  (role) => ({ role, id: randomUUID(), token: randomUUID() }),
);
const [owner, admin, editor, viewer, outside] = people;
const createdBoards = [];
async function request(person, method, path, body, status = 200) {
  const response = await fetch(base + path, {
    method,
    headers: {
      cookie: `authjs.session-token=${person.token}`,
      ...(body && !(body instanceof FormData)
        ? { "content-type": "application/json" }
        : {}),
    },
    body:
      body instanceof FormData
        ? body
        : body === undefined
          ? undefined
          : JSON.stringify(body),
  });
  const data = await response.json();
  assert.equal(
    response.status,
    status,
    `${method} ${path}: ${JSON.stringify(data)}`,
  );
  return data;
}
try {
  for (const p of people) {
    await db.query('insert into "user" (id,name) values ($1,$2)', [
      p.id,
      `QA ${p.role}`,
    ]);
    await db.query(
      'insert into session ("sessionToken","userId",expires) values ($1,$2,now() + interval \'1 hour\')',
      [p.token, p.id],
    );
  }
  const board = await request(owner, "POST", "/api/boards", {
    title: `Integration QA ${randomUUID().slice(0, 8)}`,
  });
  createdBoards.push(board.id);
  const other = await request(outside, "POST", "/api/boards", {
    title: `Private QA ${randomUUID().slice(0, 8)}`,
  });
  createdBoards.push(other.id);
  const root = `/api/boards/${board.id}`;
  for (const p of [admin, editor, viewer])
    await request(owner, "POST", `${root}/members`, {
      userId: p.id,
      role: p.role,
    });
  const snapshot = await request(owner, "GET", root);
  const card = await request(editor, "POST", "/api/cards", {
    listId: snapshot.lists[0].id,
    title: "Original card",
  });
  await request(
    viewer,
    "PATCH",
    `/api/cards/${card.id}`,
    { title: "Forbidden" },
    403,
  );
  await request(viewer, "GET", `/api/cards/${card.id}`);
  await request(outside, "GET", root, undefined, 403);
  await request(editor, "PATCH", root, { title: "Forbidden" }, 403);
  await request(
    editor,
    "POST",
    `${root}/members`,
    { userId: outside.id, role: "admin" },
    403,
  );
  await request(
    editor,
    "POST",
    "/api/lists",
    { boardId: board.id, title: "Forbidden" },
    403,
  );
  await request(editor, "GET", `${root}/backups`, undefined, 403);
  await request(admin, "PATCH", root, {
    background: {
      kind: "color",
      value: "#112233",
      font: "serif",
      accent: "#445566",
      density: "compact",
    },
  });
  await request(
    admin,
    "POST",
    `${root}/members`,
    { userId: owner.id, role: "viewer" },
    422,
  );
  await request(
    admin,
    "DELETE",
    `${root}/members?userId=${owner.id}`,
    undefined,
    422,
  );
  await request(admin, "DELETE", root, undefined, 403);
  await request(
    editor,
    "PATCH",
    `/api/cards/${card.id}`,
    { linkedBoardId: other.id },
    403,
  );
  const otherSnap = await request(outside, "GET", `/api/boards/${other.id}`);
  await request(
    editor,
    "PATCH",
    `/api/cards/${card.id}`,
    { listId: otherSnap.lists[0].id },
    422,
  );
  console.log(
    "PASS roles: viewer read-only, editor card access, admin board access, owner protected",
  );

  const label = await request(editor, "POST", "/api/labels", {
    boardId: board.id,
    color: "#111111",
    name: "Priority",
  });
  await request(editor, "PATCH", `/api/labels/${label.id}`, {
    position: -1024,
  });
  await request(editor, "POST", `/api/cards/${card.id}/labels`, {
    labelId: label.id,
    on: true,
  });
  await request(
    editor,
    "POST",
    `/api/cards/${card.id}/labels`,
    { labelId: otherSnap.labels[0].id, on: true },
    422,
  );
  const checkIds = [randomUUID(), randomUUID(), randomUUID()];
  for (const [i, itemId] of checkIds.entries())
    await request(editor, "POST", `/api/cards/${card.id}/checks`, {
      text: `Check ${i}`,
      itemId,
    });
  await request(editor, "PATCH", `/api/checks/${checkIds[0]}`, { done: true });
  await request(editor, "POST", `/api/cards/${card.id}/comments`, {
    body: "Remember this",
  });
  const form = new FormData();
  form.set(
    "file",
    new Blob(
      [
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC1sAAAAASUVORK5CYII=",
          "base64",
        ),
      ],
      { type: "image/png" },
    ),
    "cover.png",
  );
  const attached = await request(
    editor,
    "POST",
    `/api/cards/${card.id}/attachments`,
    form,
  );
  const attachment = attached.attachments[0];
  await request(editor, "PATCH", `/api/cards/${card.id}`, {
    cover: attachment.url,
  });
  const before = await request(editor, "GET", `/api/cards/${card.id}`);
  assert.deepEqual(before.counts, {
    comments: 1,
    attachments: 1,
    checkDone: 1,
    checkTotal: 3,
  });
  assert.equal((await request(owner, "GET", root)).labels[0].id, label.id);
  const orderedIds = (await request(owner, "GET", root)).labels
    .map((l) => l.id)
    .reverse();
  await request(editor, "PATCH", `${root}/labels`, { ids: orderedIds });
  assert.deepEqual(
    (await request(owner, "GET", root)).labels.map((l) => l.id),
    orderedIds,
  );
  console.log(
    "PASS label ordering, checklist counts, image upload and cover persistence",
  );

  const backups = await request(admin, "POST", `${root}/backups`, {
    name: "Checkpoint",
  });
  await request(editor, "PATCH", `/api/cards/${card.id}`, {
    cover: null,
    title: "Changed",
  });
  await request(editor, "DELETE", `/api/attachments/${attachment.id}`);
  const imageResponse = await fetch(base + attachment.url, {
    headers: { cookie: `authjs.session-token=${owner.token}` },
  });
  assert.equal(
    imageResponse.status,
    200,
    "Backed-up files survive attachment deletion",
  );
  await request(editor, "DELETE", `/api/checks/${checkIds[1]}`);
  await request(admin, "POST", `${root}/members`, {
    userId: viewer.id,
    role: "editor",
  });
  const afterRestore = await request(admin, "PATCH", `${root}/backups`, {
    backupId: backups[0].id,
  });
  assert.equal(afterRestore.length, 2);
  const restored = await request(owner, "GET", `/api/cards/${card.id}`);
  assert.deepEqual(restored, before);
  assert.equal(
    (await request(owner, "GET", root)).members.find((m) => m.id === viewer.id)
      .role,
    "editor",
  );
  assert.equal(
    (await request(owner, "GET", root)).board.background.font,
    "serif",
  );
  await request(admin, "PATCH", `${root}/backups`, {
    backupId: afterRestore.find((b) => b.name === "Before restore").id,
  });
  assert.equal(
    (await request(owner, "GET", `/api/cards/${card.id}`)).title,
    "Changed",
  );
  console.log(
    "PASS atomic backup restore, restore safety backup, files retained, access unchanged",
  );

  // Large details used to exceed Postgres NOTIFY's payload limit after a successful write.
  await request(editor, "PATCH", `/api/cards/${card.id}`, {
    description: "Large card ".repeat(1200),
  });
  const large = await request(editor, "POST", `/api/cards/${card.id}/checks`, {
    text: "Large event",
  });
  assert.ok(large.description.length > 8000);
  console.log("PASS large card details and realtime event fallback");

  const controller = new AbortController();
  const stream = await fetch(base + `${root}/stream`, {
    headers: { cookie: `authjs.session-token=${viewer.token}` },
    signal: controller.signal,
  });
  assert.equal(stream.status, 200);
  const reader = stream.body.getReader();
  await reader.read();
  await request(owner, "DELETE", `${root}/members?userId=${viewer.id}`);
  const timeout = setTimeout(() => controller.abort(), 5000);
  let ended = false;
  try {
    for (let i = 0; i < 5; i++) {
      const next = await reader.read();
      if (next.done) {
        ended = true;
        break;
      }
    }
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
  assert.ok(ended, "Revoked members must lose their live stream");
  await request(viewer, "GET", root, undefined, 403);
  console.log("PASS live access revocation");
} finally {
  for (const id of createdBoards)
    rmSync(join(process.env.UPLOAD_DIR || "./uploads", id), {
      recursive: true,
      force: true,
    });
  for (const p of people)
    await db.query('delete from "user" where id=$1', [p.id]);
  await db.end();
}
