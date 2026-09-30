"use client";

import { cx, initials } from "@/lib/utils";
import { Tooltip } from "./Tooltip";

export type Person = {
  id: string;
  name?: string | null;
  image?: string | null;
  color?: string;
};

export function Avatar({
  user,
  size = 24,
  ring,
  className,
}: {
  user: Person;
  size?: number;
  ring?: string;
  className?: string;
}) {
  return (
    <span
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, size * 0.38),
        boxShadow: ring ? `0 0 0 1.5px ${ring}, 0 0 0 3px var(--color-surface)` : undefined,
      }}
      className={cx(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-hover font-medium text-muted select-none",
        className,
      )}
    >
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.image} alt="" className="size-full object-cover" />
      ) : (
        initials(user.name)
      )}
    </span>
  );
}

export function AvatarTip({ user, ...rest }: Parameters<typeof Avatar>[0]) {
  return (
    <Tooltip label={user.name ?? "Someone"}>
      <Avatar user={user} {...rest} />
    </Tooltip>
  );
}
