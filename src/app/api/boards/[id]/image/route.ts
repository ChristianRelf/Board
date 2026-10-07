import { requireAdmin, HttpError } from "@/lib/auth-helpers";
import { route } from "@/lib/route";
import { MAX_UPLOAD, saveUpload } from "@/lib/storage";

export const POST = route<{ id: string }, unknown>(async (req, { params }) => {
  const { id } = await params;
  await requireAdmin(id);
  const file = (await req.formData()).get("file");
  if (
    !(file instanceof File) ||
    ![
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
    ].includes(file.type)
  )
    throw new HttpError(422, "Choose a JPG, PNG, WebP, GIF or AVIF image");
  if (file.size > MAX_UPLOAD)
    throw new HttpError(422, "Images must be under 25 MB");
  return saveUpload(id, file);
});
