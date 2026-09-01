;
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Copy, Plus, Ticket, Trash as Trash2 } from "@phosphor-icons/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default CodesPage;

function CodesPage() {
  const [count, setCount] = useState<number | "">(5);
  const [valid, setValid] = useState<number | "">(30);
  const [generated, setGenerated] = useState<string[]>([]);
  const [invitationCodes, setInvitationCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from('invitation_codes').select('*').order('created_date', { ascending: false });
    if (data) setInvitationCodes(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const generate = async () => {
    if (count === "" || valid === "") {
      toast.error("Please enter a valid number for both fields.");
      return;
    }
    
    const actualCount = Number(count);
    if (isNaN(actualCount) || actualCount <= 0) {
      toast.error("Number of codes must be greater than 0.");
      return;
    }
    const actualValidDays = Number(valid);
    if (isNaN(actualValidDays) || actualValidDays <= 0) {
      toast.error("Valid days must be greater than 0.");
      return;
    }

    const list = Array.from({ length: actualCount }).map(() => `MED-2026-${Math.random().toString(36).slice(2, 7).toUpperCase()}`);
    setGenerated(list);
    
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + actualValidDays);
    const expiresDateStr = expiresDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const createdDateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    const toInsert = list.map(code => ({
      code,
      student_name: "—",
      status: "Active",
      created_date: createdDateStr,
      expires_date: expiresDateStr
    }));

    await supabase.from('invitation_codes').insert(toInsert);
    load();
  };

  const deleteCode = async (code: string) => {
    try {
      const { error } = await supabase.from('invitation_codes').delete().eq('code', code);
      if (error) throw error;
      toast.success("Code deleted successfully.");
      load();
    } catch (err: any) {
      toast.error("Error deleting code: " + err.message);
    }
  };

  const handleExport = () => {
    if (!invitationCodes.length) {
      toast.error("No codes to export.");
      return;
    }
    const headers = ["Code", "Student", "Email", "Status", "Created", "Expires"];
    const rows = invitationCodes.map(c => {
      const student = c.student_name === "—" ? "—" : c.student_name.split(" | ")[0];
      const email = c.student_name === "—" ? "—" : (c.student_name.split(" | ")[1] || "—");
      const codeLabel = c.code.startsWith('Direct-') ? 'Direct' : c.code;
      return [codeLabel, student, email, c.status, c.created_date, c.expires_date].map(str => `"${str}"`).join(",");
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `invitation_codes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Codes exported successfully!");
  };

  if (loading) return <AdminLayout title="Loading..."><div className="p-8">Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="Invitation Codes" subtitle="Generate and manage codes that let students sign up.">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_2.5fr]">
        <div className="rounded-2xl border border-border bg-card p-6 h-fit">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-tile-amber"><Ticket className="size-5" /></div>
            <div>
              <h3 className="text-lg font-semibold">Generate Codes</h3>
              <p className="text-sm text-muted-foreground">Each code is single-use and unique.</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Number of codes</div>
              <input type="number" min={1} max={100} value={count} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }} onChange={(e) => setCount(e.target.value === "" ? "" : Math.max(1, +e.target.value))} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Valid for (days)</div>
              <input type="number" min={1} value={valid} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }} onChange={(e) => setValid(e.target.value === "" ? "" : Math.max(1, +e.target.value))} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <button onClick={generate} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus className="size-4" weight="regular" /> Generate</button>
          </div>

          {generated.length > 0 && (
            <div className="mt-5 rounded-xl border border-success/40 bg-success/5 p-4">
              <div className="mb-2 text-sm font-semibold">Newly generated</div>
              <div className="space-y-1">
                {generated.map((g) => (
                  <div key={g} className="flex items-center justify-between rounded-lg bg-card p-2 text-xs">
                    <code>{g}</code>
                    <button onClick={() => { navigator.clipboard.writeText(g); toast.success("Code copied to clipboard!"); }} className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><Copy className="size-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">All Codes</h3>
              <p className="text-sm text-muted-foreground">Track invitation usage across cohorts.</p>
            </div>
            <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">Export</button>
          </div>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <tr><th className="p-3 pl-4">Code</th><th className="p-3">Student</th><th className="p-3">Email</th><th className="p-3">Status</th><th className="p-3">Created</th><th className="p-3">Expires</th><th className="p-3 pr-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invitationCodes.map((c) => (
                  <tr key={c.code} className="bg-card">
                    <td className="p-3 pl-4"><code className="rounded-md bg-muted px-2 py-1 text-xs">{c.code.startsWith('Direct-') ? 'Direct' : c.code}</code></td>
                    <td className="p-3 font-medium">
                      {c.student_name === "—" ? "—" : c.student_name.split(" | ")[0]}
                    </td>
                    <td className="p-3 text-muted-foreground text-sm">
                      {c.student_name === "—" ? "—" : (c.student_name.split(" | ")[1] || "—")}
                    </td>
                    <td className="p-3">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider",
                        c.status === "Active" && "bg-success/15 text-success-foreground",
                        c.status === "Used" && "bg-secondary text-secondary-foreground",
                        c.status === "Expired" && "bg-destructive/10 text-destructive",
                      )}>{c.status}</span>
                    </td>
                    <td className="p-3 text-muted-foreground">{c.created_date.split(',')[0]}</td>
                    <td className="p-3 text-muted-foreground">{c.expires_date.split(',')[0]}</td>
                    <td className="p-3 pr-4">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Code copied to clipboard!"); }} className="grid size-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"><Copy className="size-4" /></button>
                        <AlertDialog>
                          <AlertDialogTrigger className="grid size-8 place-items-center rounded-lg border border-border bg-background text-destructive hover:bg-destructive/10">
                            <Trash2 className="size-4" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Invitation Code?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the code <strong className="text-foreground">{c.code}</strong>? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteCode(c.code)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
