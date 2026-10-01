import Link from "next/link";

export default function NotFound() {
  return (
    <div className="prose">
      <h1>Page not found</h1>
      <p className="muted">That page doesn&apos;t exist, or the deal may have been merged with another record.</p>
      <Link className="btn" href="/deals/">
        Browse deals
      </Link>
    </div>
  );
}
