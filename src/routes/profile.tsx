;
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { EnvelopeSimple as Mail, Phone, MapPin, FloppyDisk as Save } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default ProfilePage;

function ProfilePage() {
  const { user } = useAuth();
  
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || "Administrator";
  const defaultFirstName = fullName.split(' ')[0] || "";
  const defaultLastName = fullName.split(' ').slice(1).join(' ') || "";
  const defaultEmail = user?.email || "admin@medline.io";
  const initials = fullName.substring(0, 2).toUpperCase();

  const formatInitialPhone = (p: string) => {
    const defaultVal = "+91 ";
    if (!p) return defaultVal;
    const digits = p.replace(/^\+\d+\s*/, "").replace(/\D/g, "").slice(0, 10);
    return digits ? `+91 ${digits}` : defaultVal;
  };

  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [phone, setPhone] = useState(formatInitialPhone(user?.user_metadata?.phone));
  const [role, setRole] = useState(user?.user_metadata?.role || "Administrator");
  const [department, setDepartment] = useState(user?.user_metadata?.department || "Nursing Education");
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState({ students: 0, questions: 0, categories: 0 });
  const userRole = user?.user_metadata?.role || "Administrator";
  const Layout = userRole === "student" ? StudentLayout : AdminLayout;

  useEffect(() => {
    async function loadStats() {
      if (userRole === "student") return;
      const { count: students } = await supabase.from('students').select('*', { count: 'exact', head: true });
      const { count: questions } = await supabase.from('questions').select('*', { count: 'exact', head: true });
      const { data: qData } = await supabase.from('questions').select('category');
      const categories = new Set(qData?.map(x => x.category)).size;
      setStats({ students: students || 0, questions: questions || 0, categories });
    }
    loadStats();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedName = `${firstName} ${lastName}`.trim();
      await supabase.auth.updateUser({
        data: {
          full_name: updatedName,
          name: updatedName,
          phone,
          department,
        }
      });

      let hasError = false;

      if (user?.email) {
        const { error } = await supabase.from('students').update({
          name: updatedName
        }).eq('email', user.email);
        if (error) { toast.error("Error updating student: " + error.message); hasError = true; }
      }

      if (user?.email) {
        const { data: codes } = await supabase.from('invitation_codes').select('*');
        const myCode = (codes || []).find(c => {
          if (!c.student_name || c.student_name === "—") return false;
          const parts = c.student_name.split(' | ');
          return parts[1] === user.email;
        });
        if (myCode) {
          const { error } = await supabase.from('invitation_codes').update({
            student_name: `${updatedName} | ${user.email} | ${phone}`
          }).eq('id', myCode.id);
          if (error) { toast.error("Error updating code: " + error.message); hasError = true; }
        } else {
          const uniqueCode = 'Direct-' + Math.random().toString(36).slice(2, 8).toUpperCase();
          const { error } = await supabase.from('invitation_codes').insert({
            code: uniqueCode,
            student_name: `${updatedName} | ${user.email} | ${phone}`,
            status: 'used',
            created_date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            expires_date: 'N/A'
          });
          if (error) { toast.error("Error inserting code: " + error.message); hasError = true; }
        }
      }

      if (!hasError) {
        toast.success("Profile updated!");
      }
      setIsEditing(false);
      supabase.auth.refreshSession().catch(console.error);
    } catch (err: any) {
      console.error(err);
      toast.error("Unexpected error saving profile");
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="My Profile" subtitle="Manage your account details and preferences.">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <div className="mx-auto grid size-24 place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">{initials}</div>
          <h3 className="mt-4 text-lg font-semibold">{fullName}</h3>
          <p className="text-sm text-muted-foreground">{user?.user_metadata?.role || "Administrator"}</p>
          <div className="mt-5 space-y-2 text-left text-sm">
            <div className="flex items-center gap-2 text-muted-foreground"><Mail className="size-4" /> {defaultEmail}</div>
            <div className="flex items-center gap-2 text-muted-foreground"><Phone className="size-4" /> {formatInitialPhone(user?.user_metadata?.phone)}</div>
          </div>
          {userRole !== "student" && (
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
              <div><div className="text-lg font-bold">{stats.students}</div><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Students</div></div>
              <div><div className="text-lg font-bold">{stats.questions}</div><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Questions</div></div>
              <div><div className="text-lg font-bold">{stats.categories}</div><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Categories</div></div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Personal information</h3>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">Edit Profile</button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="First name">{isEditing ? <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="inp" /> : <div className="flex w-full items-center rounded-xl bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground">{firstName}</div>}</Field>
              <Field label="Last name">{isEditing ? <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="inp" /> : <div className="flex w-full items-center rounded-xl bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground">{lastName}</div>}</Field>
              <Field label="Email">{isEditing ? <input value={defaultEmail} readOnly className="inp opacity-70 cursor-not-allowed" /> : <div className="flex w-full items-center rounded-xl bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground">{defaultEmail}</div>}</Field>
              <Field label="Phone">
                {isEditing ? (
                  <div className="flex w-full items-center overflow-hidden rounded-xl border border-border bg-background focus-within:border-primary">
                    <div className="bg-muted/30 py-2.5 pl-3 pr-3 text-sm font-medium border-r border-border text-muted-foreground whitespace-nowrap">
                      +91
                    </div>
                    <input 
                      type="tel"
                      value={phone.replace(/^\+\d+\s*/, "").replace(/\D/g, "").slice(0, 10)} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setPhone("+91 " + val);
                      }} 
                      className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none" 
                      placeholder="10-digit mobile number"
                    />
                  </div>
                ) : (
                  <div className="flex w-full items-center rounded-xl bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground">{phone}</div>
                )}
              </Field>
              <Field label="Role"><div className="flex w-full items-center rounded-xl bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground">{role === 'admin' ? 'Administrator' : role === 'student' ? 'Student' : role}</div></Field>
              <Field label="Department">{isEditing ? <input value={department} onChange={(e) => setDepartment(e.target.value)} className="inp" /> : <div className="flex w-full items-center rounded-xl bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground">{department}</div>}</Field>
            </div>
            {isEditing && (
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => window.location.reload()} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
                <button disabled={saving} onClick={handleSave} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  <Save className="size-4" /> {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`.inp{width:100%;border-radius:0.85rem;border:1px solid var(--color-border);background:var(--color-background);padding:.625rem 1rem;font-size:.875rem;outline:none}.inp:focus{border-color:var(--color-primary)}`}</style>
    </Layout>
  );
}

function Field({ label, children }: any) {
  return <div><div className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>{children}</div>;
}
