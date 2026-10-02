"use client";

import { useState } from "react";

/** Company logo from its website's favicon, falling back to initials. */
export default function Avatar({ name, domain, size = 40 }: { name: string; domain: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (domain && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="avatar"
        style={style}
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className="avatar" style={style} aria-hidden="true">
      {initials || "?"}
    </span>
  );
}
