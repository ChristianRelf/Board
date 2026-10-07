"use client";

import { useEffect, useState } from "react";
import { Shield, UserPlus, X } from "lucide-react";
import { api } from "@/lib/client";
import { Pop } from "@/components/ui/Pop";
import { Avatar } from "@/components/ui/Avatar";
import { Button, IconButton } from "@/components/ui/Button";
import { HeaderButton } from "@/components/ui/HeaderAction";
import { Input } from "@/components/ui/Field";
import { useBoard } from "./store";
import type { Member } from "@/lib/types";

type Role = "viewer" | "editor" | "admin";
const roles = {
  viewer: "Can view the board",
  editor: "Can create and edit cards",
  admin: "Can manage the board and people",
};
function RoleSelect({
  value,
  onChange,
  disabled,
  label,
}: {
  value: Role;
  onChange: (role: Role) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as Role)}
      className="h-8 rounded-md border border-line bg-raised px-2 text-[11px] font-medium uppercase outline-none"
    >
      {Object.keys(roles).map((role) => (
        <option key={role} value={role}>
          {role}
        </option>
      ))}
    </select>
  );
}
export function PeoplePicker() {
  const b = useBoard();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<Member[] | null>(null);
  const [role, setRole] = useState<Role>("editor");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!open || !b.canManage) return;
    let active = true;
    const timer = setTimeout(
      () => {
        setPeople(null);
        setError(false);
        void api
          .get<Member[]>(
            `/api/boards/${b.board.id}/members?q=${encodeURIComponent(q)}`,
          )
          .then((rows) => {
            if (active) setPeople(rows);
          })
          .catch(() => {
            if (active) setError(true);
          });
      },
      q ? 180 : 0,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [q, open, b.canManage, b.board.id]);
  async function change(id: string, role?: Role) {
    setBusy(id);
    try {
      if (role) await b.addMember(id, role);
      else await b.removeMember(id);
    } catch {
      /* store reports error */
    } finally {
      setBusy(null);
    }
  }
  return (
    <Pop
      open={open}
      onOpenChange={setOpen}
      className="w-[min(380px,92vw)]"
      align="end"
      title="People & access"
      trigger={
        <HeaderButton
          icon={<UserPlus size={16} />}
          label="People on this board"
          revealLabel="People"
        />
      }
    >
      <div className="space-y-4 p-1">
        <ul className="scroll-thin max-h-60 space-y-2 overflow-y-auto p-1">
          {b.members.map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <Avatar user={m} size={28} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">
                  {m.name ?? "Someone"}
                </p>
                <p className="text-[10px] text-faint">
                  {m.role === "owner" ? "Board owner" : roles[m.role]}
                </p>
              </div>
              {b.canManage && m.role !== "owner" ? (
                <>
                  <RoleSelect
                    value={m.role}
                    label={`Role for ${m.name ?? "member"}`}
                    disabled={!!busy}
                    onChange={(role) => void change(m.id, role)}
                  />
                  <IconButton
                    icon={<X size={12} />}
                    label={`Remove ${m.name ?? "member"}`}
                    size="sm"
                    disabled={!!busy}
                    onClick={() => void change(m.id)}
                  />
                </>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-muted">
                  {m.role === "owner" && <Shield size={11} />}
                  {m.role === "owner" ? "Admin" : m.role}
                </span>
              )}
            </li>
          ))}
        </ul>
        {b.canManage && (
          <div className="space-y-2 border-t border-line pt-3">
            <h3 className="text-xs font-semibold">Invite someone</h3>
            <p className="text-[11px] text-faint">
              People appear here after signing in with Discord.
            </p>
            <Input
              value={q}
              aria-label="Search people"
              placeholder="Search by name or email"
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted">{roles[role]}</span>
              <RoleSelect value={role} label="Invite role" onChange={setRole} />
            </div>
            <ul className="scroll-thin max-h-44 space-y-1 overflow-y-auto">
              {people
                ?.filter((p) => !b.members.some((m) => m.id === p.id))
                .map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-hover"
                  >
                    <Avatar user={p} size={24} />
                    <span className="flex-1 truncate text-xs">
                      {p.name ?? "Someone"}
                    </span>
                    <Button
                      size="sm"
                      disabled={!!busy}
                      loading={busy === p.id}
                      onClick={() => void change(p.id, role)}
                    >
                      <UserPlus size={12} /> Invite
                    </Button>
                  </li>
                ))}
            </ul>
            {error ? (
              <p role="alert" className="text-xs text-danger">
                Couldn’t load people. Try searching again.
              </p>
            ) : !people ? (
              <div className="skeleton h-10 rounded-md" />
            ) : (
              !people.filter((p) => !b.members.some((m) => m.id === p.id))
                .length && (
                <p className="text-xs text-faint">No more people to invite.</p>
              )
            )}
          </div>
        )}
      </div>
    </Pop>
  );
}
