import { site } from "@/lib/site";

export default function Subscribe() {
  return (
    <section className="card" style={{ marginTop: 40 }}>
      <h3>The weekly digest</h3>
      <p className="muted">
        Every Sunday: the week&apos;s deeptech and healthtech rounds, one chart, and the most interesting technical note. Free.
      </p>
      {site.newsletterUrl ? (
        <a className="btn" href={site.newsletterUrl}>
          Subscribe free
        </a>
      ) : (
        <span className="btn" aria-disabled="true">
          Newsletter launching soon
        </span>
      )}
    </section>
  );
}
