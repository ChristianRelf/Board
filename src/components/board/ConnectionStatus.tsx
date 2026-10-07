"use client";

import { useEffect, useRef, useState } from "react";
import { Cloud, CloudOff, CloudAlert, Radio, Timer, Clock } from "lucide-react";
import { Pop } from "@/components/ui/Pop";
import { useBoard } from "./store";

type Connection = EventTarget & {
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
};

export function ConnectionStatus() {
  const { connected, latency, lastChecked } = useBoard();
  const [online, setOnline] = useState(true);
  const [slow, setSlow] = useState(false);
  const [speed, setSpeed] = useState<number | undefined>();
  const [open, setOpen] = useState(false);
  const pinned = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  function show() {
    clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function leave() {
    clearTimeout(closeTimer.current);
    if (!pinned.current)
      closeTimer.current = setTimeout(() => setOpen(false), 180);
  }
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: Connection })
      .connection;
    const update = () => {
      setOnline(navigator.onLine);
      setSpeed(connection?.downlink);
      setSlow(
        !!connection &&
          (["slow-2g", "2g"].includes(connection.effectiveType ?? "") ||
            (connection.rtt ?? 0) > 800 ||
            (connection.downlink ?? 10) < 0.5),
      );
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    connection?.addEventListener("change", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      connection?.removeEventListener("change", update);
    };
  }, []);

  const state =
    !online || latency === null
      ? "offline"
      : slow || (latency ?? 0) > 1500 || !connected
        ? "weak"
        : "connected";
  const title =
    state === "offline"
      ? "No connection"
      : state === "weak"
        ? connected
          ? "Low connection"
          : "Reconnecting…"
        : "Connected";
  const description =
    state === "offline"
      ? "The board can’t be reached. Changes cannot be saved until you reconnect."
      : state === "weak"
        ? "Your connection is taking longer than usual. Updates may arrive slowly."
        : "Your board is online and receiving live updates.";
  const Icon =
    state === "offline" ? CloudOff : state === "weak" ? CloudAlert : Cloud;
  const tone =
    state === "offline"
      ? "text-danger"
      : state === "weak"
        ? "text-warn"
        : "text-ok";

  return (
    <div className="absolute bottom-3 left-4 z-20" data-export-hide>
      <Pop
        open={open}
        onOpenChange={(value) => {
          clearTimeout(closeTimer.current);
          pinned.current = value;
          setOpen(value);
        }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        side="top"
        align="start"
        className="w-72 p-0"
        trigger={
          <button
            type="button"
            aria-label={`Connection: ${title}`}
            onPointerEnter={show}
            onPointerLeave={leave}
            onFocus={show}
            onBlur={leave}
            onClick={(e) => {
              e.preventDefault();
              clearTimeout(closeTimer.current);
              pinned.current = !pinned.current;
              setOpen(pinned.current);
            }}
            className={`panel grid size-9 place-items-center rounded-lg transition-colors hover:bg-hover ${tone}`}
          >
            <Icon size={19} strokeWidth={1.7} />
          </button>
        }
      >
        <div
          onPointerEnter={show}
          onPointerLeave={leave}
          onFocus={show}
          onBlur={leave}
          className="p-4"
        >
          <div
            role="status"
            aria-live="polite"
            className={`mb-2 flex items-center gap-2 text-sm font-semibold ${tone}`}
          >
            <Icon size={17} />
            {title}
          </div>
          <p className="text-xs leading-relaxed text-muted">{description}</p>
          <dl className="mt-3 space-y-2.5 border-t border-line-soft pt-3 text-[11px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-faint">
                <Radio size={12} /> Live updates
              </dt>
              <dd>{online && connected ? "Active" : "Reconnecting"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-faint">
                <Timer size={12} /> Response time
              </dt>
              <dd className="tabular-nums">
                {!online || latency === null
                  ? "Unavailable"
                  : lastChecked
                    ? `${Math.round(latency)} ms`
                    : "Checking…"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-faint">
                <Clock size={12} /> Last checked
              </dt>
              <dd className="tabular-nums">
                {lastChecked
                  ? new Date(lastChecked).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "Checking…"}
              </dd>
            </div>
            {speed !== undefined && online && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-faint">Estimated bandwidth</dt>
                <dd>{speed} Mbps</dd>
              </div>
            )}
          </dl>
        </div>
      </Pop>
    </div>
  );
}
