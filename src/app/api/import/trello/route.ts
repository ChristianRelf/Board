import { z } from "zod";
import {
  db,
  attachments,
  boardMembers,
  boards,
  cardLabels,
  cards,
  checkItems,
  comments,
  labels,
  lists,
} from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth-helpers";
import { route } from "@/lib/route";
import { TRELLO_BG_MAP, TRELLO_COLOR_MAP } from "@/lib/utils";
import { STEP } from "@/lib/order";
import { uniqueSlug } from "@/lib/slug";

export const maxDuration = 60;

/* Trello's export is loose about what it includes, so everything is optional. */
const Trello = z.object({
  name: z.string().default("Imported board"),
  desc: z.string().nullish(),
  prefs: z
    .object({
      backgroundColor: z.string().nullish(),
      backgroundImage: z.string().nullish(),
      backgroundTopColor: z.string().nullish(),
    })
    .partial()
    .nullish(),
  lists: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        pos: z.number().nullish(),
        closed: z.boolean().default(false),
      }),
    )
    .default([]),
  cards: z
    .array(
      z.object({
        id: z.string(),
        idList: z.string(),
        name: z.string().default("Untitled"),
        desc: z.string().nullish(),
        pos: z.number().nullish(),
        closed: z.boolean().default(false),
        due: z.string().nullish(),
        start: z.string().nullish(),
        dueComplete: z.boolean().default(false),
        labels: z
          .array(z.object({ id: z.string(), name: z.string().nullish(), color: z.string().nullish() }))
          .default([]),
        attachments: z
          .array(
            z.object({
              name: z.string().nullish(),
              url: z.string().nullish(),
              bytes: z.number().nullish(),
              mimeType: z.string().nullish(),
            }),
          )
          .default([]),
      }),
    )
    .default([]),
  checklists: z
    .array(
      z.object({
        idCard: z.string(),
        name: z.string().nullish(),
        checkItems: z
          .array(
            z.object({
              name: z.string(),
              state: z.string().default("incomplete"),
              pos: z.number().nullish(),
            }),
          )
          .default([]),
      }),
    )
    .default([]),
  actions: z
    .array(
      z.object({
        type: z.string(),
        date: z.string().nullish(),
        data: z
          .object({ text: z.string().nullish(), card: z.object({ id: z.string() }).nullish() })
          .nullish(),
        memberCreator: z.object({ fullName: z.string().nullish() }).nullish(),
      }),
    )
    .default([]),
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const raw = await readPayload(req);
  const data = Trello.parse(raw);

  const result = await db.transaction(async (tx) => {
    const [board] = await tx
      .insert(boards)
      .values({
        title: data.name,
        slug: await uniqueSlug(data.name),
        ownerId: user.id,
        description: data.desc || null,
        background: data.prefs?.backgroundImage
          ? { kind: "image", value: data.prefs.backgroundImage, dim: 0.45 }
          : {
              kind: "color",
              value: normalizeColor(
                data.prefs?.backgroundColor ?? data.prefs?.backgroundTopColor,
              ),
            },
      })
      .returning();

    await tx.insert(boardMembers).values({ boardId: board.id, userId: user.id, role: "owner" });

    /* labels: dedupe Trello's per-card copies down to one row per name+colour */
    const labelKey = (l: { name?: string | null; color?: string | null }) =>
      `${l.name ?? ""}|${l.color ?? "null"}`;
    const seen = new Map<string, { name: string | null; color: string }>();
    for (const c of data.cards)
      for (const l of c.labels)
        seen.set(labelKey(l), {
          name: l.name?.trim() || null,
          color: TRELLO_COLOR_MAP[l.color ?? "null"] ?? "#7b8290",
        });

    const labelIds = new Map<string, string>();
    if (seen.size) {
      const inserted = await tx
        .insert(labels)
        .values([...seen.values()].map((l) => ({ boardId: board.id, ...l })))
        .returning();
      [...seen.keys()].forEach((k, i) => labelIds.set(k, inserted[i].id));
    }

    /* lists */
    const openLists = data.lists.filter((l) => !l.closed).sort(byPos);
    const listIds = new Map<string, string>();
    if (openLists.length) {
      const inserted = await tx
        .insert(lists)
        .values(
          openLists.map((l, i) => ({
            boardId: board.id,
            title: l.name,
            position: (i + 1) * STEP,
          })),
        )
        .returning();
      openLists.forEach((l, i) => listIds.set(l.id, inserted[i].id));
    }

    /* cards */
    const openCards = data.cards
      .filter((c) => !c.closed && listIds.has(c.idList))
      .sort(byPos);
    const cardIds = new Map<string, string>();
    const perList = new Map<string, number>();
    if (openCards.length) {
      const inserted = await tx
        .insert(cards)
        .values(
          openCards.map((c) => {
            const n = (perList.get(c.idList) ?? 0) + 1;
            perList.set(c.idList, n);
            return {
              boardId: board.id,
              listId: listIds.get(c.idList)!,
              title: c.name,
              description: c.desc || null,
              position: n * STEP,
              dueAt: c.due ? new Date(c.due) : null,
              startAt: c.start ? new Date(c.start) : null,
              dueDone: c.dueComplete,
              createdBy: user.id,
            };
          }),
        )
        .returning();
      openCards.forEach((c, i) => cardIds.set(c.id, inserted[i].id));

      const pairs = openCards.flatMap((c) =>
        c.labels
          .map((l) => labelIds.get(labelKey(l)))
          .filter((x): x is string => !!x)
          .map((labelId) => ({ cardId: cardIds.get(c.id)!, labelId })),
      );
      if (pairs.length) await tx.insert(cardLabels).values(pairs).onConflictDoNothing();

      const atts = openCards.flatMap((c) =>
        c.attachments
          .filter((a) => a.url)
          .map((a) => ({
            cardId: cardIds.get(c.id)!,
            name: a.name || "Attachment",
            url: a.url!,
            mime: a.mimeType ?? null,
            size: a.bytes ?? null,
            kind: "link" as const,
            uploadedBy: user.id,
          })),
      );
      if (atts.length) await tx.insert(attachments).values(atts);
    }

    /* checklists flatten into a single list per card, prefixed by name */
    const checks = data.checklists
      .filter((cl) => cardIds.has(cl.idCard))
      .flatMap((cl) =>
        cl.checkItems.sort(byPos).map((it, i) => ({
          cardId: cardIds.get(cl.idCard)!,
          text: cl.name && cl.name !== "Checklist" ? `${cl.name}: ${it.name}` : it.name,
          done: it.state === "complete",
          position: (i + 1) * STEP,
        })),
      );
    if (checks.length) await tx.insert(checkItems).values(checks);

    /* comments keep their original author inline — Trello members aren't our users */
    const coms = data.actions
      .filter((a) => a.type === "commentCard" && a.data?.text && a.data.card?.id)
      .filter((a) => cardIds.has(a.data!.card!.id))
      .map((a) => ({
        cardId: cardIds.get(a.data!.card!.id)!,
        userId: user.id,
        body: `${a.memberCreator?.fullName ? `**${a.memberCreator.fullName}** (Trello): ` : ""}${a.data!.text!}`,
        createdAt: a.date ? new Date(a.date) : new Date(),
      }));
    if (coms.length) await tx.insert(comments).values(coms);

    return {
      id: board.id,
      slug: board.slug,
      counts: {
        lists: openLists.length,
        cards: openCards.length,
        labels: seen.size,
        checkItems: checks.length,
        comments: coms.length,
      },
    };
  });

  return result;
});

const byPos = (a: { pos?: number | null }, b: { pos?: number | null }) =>
  (a.pos ?? 0) - (b.pos ?? 0);

function normalizeColor(c?: string | null) {
  if (!c) return "#101113";
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  return TRELLO_BG_MAP[c.toLowerCase()] ?? "#101113";
}

async function readPayload(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(422, "Attach the Trello .json export");
    if (file.size > 40 * 1024 * 1024) throw new HttpError(413, "That export is over 40 MB");
    try {
      return JSON.parse(await file.text());
    } catch {
      throw new HttpError(422, "That file isn't valid JSON");
    }
  }
  return req.json().catch(() => {
    throw new HttpError(422, "Expected a Trello JSON export");
  });
}
