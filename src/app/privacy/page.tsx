import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

// Draft placeholder — update when accounts, payments or analytics are added.
export default function PrivacyPage() {
  return (
    <div className="prose">
      <h1>Privacy</h1>
      <p className="muted">Draft — to be updated when accounts and payments launch.</p>
      <ul>
        <li>This site currently has no accounts, cookies or tracking.</li>
        <li>If you subscribe to the newsletter, your email is held by the newsletter provider and used only to send the digest.</li>
        <li>You can unsubscribe at any time from any email.</li>
      </ul>
    </div>
  );
}
