;
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Bell, Database, Lock, EnvelopeSimple as Mail, FloppyDisk as Save, Shield } from "@phosphor-icons/react";
import { useState } from "react";

export default SettingsPage;

const tabs = [
  { id: "general", label: "General", icon: Database },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "email", label: "Email", icon: Mail },
];

function SettingsPage() {
  const [tab, setTab] = useState("general");
  return (
    <AdminLayout title="Settings" subtitle="Configure your platform preferences and policies.">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-border bg-card p-3">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${tab === t.id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60"}`}>
              <t.icon className="size-4" /> {t.label}
            </button>
          ))}
        </aside>

        <div className="rounded-2xl border border-border bg-card p-6">
          {tab === "general" && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold">General</h3>
              <Field label="Platform name"><input defaultValue="Medline NCLEX" className="inp" /></Field>
              <Field label="Default time zone"><select className="inp"><option>Eastern (UTC-5)</option><option>Pacific (UTC-8)</option></select></Field>
              <Field label="Default test duration (minutes)"><input type="number" defaultValue={75} className="inp" /></Field>
              <SaveBar />
            </div>
          )}
          {tab === "notifications" && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold">Notifications</h3>
              {["New student signups", "Failed test alerts", "Weekly cohort report", "Question flagged for review"].map((n) => (
                <div key={n} className="flex items-center justify-between rounded-xl border border-border bg-background p-4">
                  <div>
                    <div className="font-medium">{n}</div>
                    <div className="text-xs text-muted-foreground">Email + in-app notification</div>
                  </div>
                  <input type="checkbox" defaultChecked className="size-5 accent-primary" />
                </div>
              ))}
              <SaveBar />
            </div>
          )}
          {tab === "security" && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold">Security</h3>
              <Field label="Require 2FA for admins"><Toggle on /></Field>
              <Field label="Auto-expire invitation codes (days)"><input type="number" defaultValue={30} className="inp" /></Field>
              <Field label="Session timeout (minutes)"><input type="number" defaultValue={60} className="inp" /></Field>
              <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold"><Lock className="size-4" /> Reset all admin passwords</button>
              <SaveBar />
            </div>
          )}
          {tab === "email" && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold">Email templates</h3>
              <Field label="Sender name"><input defaultValue="Medline Admin" className="inp" /></Field>
              <Field label="Welcome email subject"><input defaultValue="Welcome to Medline NCLEX" className="inp" /></Field>
              <Field label="Welcome email body"><textarea rows={6} defaultValue={"Hi {{name}},\n\nUse invitation code {{code}} to sign up..."} className="inp font-mono text-xs" /></Field>
              <SaveBar />
            </div>
          )}
        </div>
      </div>

      <style>{`.inp{width:100%;border-radius:0.85rem;border:1px solid var(--color-border);background:var(--color-background);padding:.625rem 1rem;font-size:.875rem;outline:none}.inp:focus{border-color:var(--color-primary)}`}</style>
    </AdminLayout>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
function Toggle({ on }: { on?: boolean }) {
  const [v, setV] = useState(on ?? false);
  return (
    <button onClick={() => setV(!v)} className={`flex h-6 w-11 items-center rounded-full transition ${v ? "bg-primary" : "bg-muted"}`}>
      <span className={`size-5 rounded-full bg-white shadow transition ${v ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}
function SaveBar() {
  return (
    <div className="flex justify-end gap-2 border-t border-border pt-4">
      <button className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium">Discard</button>
      <button className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"><Save className="size-4" /> Save changes</button>
    </div>
  );
}
