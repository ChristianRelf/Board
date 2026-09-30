import { z } from "zod";
import { db, attachments } from "@/lib/db";
import { HttpError, requireEdit } from "@/lib/auth-helpers";
import { route, origin, type Ctx } from "@/lib/route";
import { publish } from "@/lib/events";
import { getCardDetail, loadCard } from "@/lib/board-data";
import { MAX_UPLOAD, saveUpload } from "@/lib/storage";


type P = { id: string };

export const POST = route<P, unknown>(async (req, { params }: Ctx<P>) => {
  const { id } = await params;
  const card = await loadCard(id);
  const { user } = await requireEdit(card.boardId);
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const files = form.getAll("file").filter((f): f is File => f instanceof File);
    if (!files.length) throw new HttpError(422, "No file in the request");
    for (const file of files) {
      if (file.size > MAX_UPLOAD) throw new HttpError(413, `${file.name} is over 25 MB`);
      const saved = await saveUpload(card.boardId, file);
      await db.insert(attachments).values({
        cardId: id,
        name: saved.displayName,
        url: saved.url,
        mime: file.type || null,
        size: file.size,
        kind: "file",
        uploadedBy: user.id,
      });
    }
  } else {
    const { url, name } = z
      .object({ url: z.string().url(), name: z.string().trim().max(200).optional() })
      .parse(await req.json());
    await db.insert(attachments).values({
      cardId: id,
      name: name || new URL(url).hostname,
      url,
      kind: "link",
      uploadedBy: user.id,
    });
  }

  const detail = await getCardDetail(id);
  await publish(card.boardId, { t: "card.detail", card: detail }, origin(req));
  await publish(card.boardId, { t: "card.upsert", card: detail }, origin(req));
  return detail;
});
