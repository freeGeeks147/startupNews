import type { Note } from "@/lib/data";
import { formatDate } from "@/lib/format";

export default function DealNote({ note }: { note: Note }) {
  return (
    <section className="note" aria-label="Technical note">
      <h3>Technical note</h3>
      <dl>
        <dt>What they build</dt>
        <dd>{note.one_liner}</dd>
        <dt>Core tech</dt>
        <dd>{note.core_tech}</dd>
        <dt>TRL</dt>
        <dd>
          <strong>{note.trl}/9</strong> — {note.trl_reason}
        </dd>
        <dt>Technical risk</dt>
        <dd>{note.technical_risk}</dd>
        <dt>Comparables</dt>
        <dd>{note.comparables.join(", ")}</dd>
        <dt>Our take</dt>
        <dd>{note.take}</dd>
      </dl>
      <p className="muted small" style={{ marginTop: 14, marginBottom: 0 }}>
        Written {formatDate(note.written_on)}. Notes are analysis, not investment advice.
      </p>
    </section>
  );
}
