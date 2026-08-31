;
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ArrowDownRight, ArrowUpRight, Faders as Filter, DotsThree as MoreHorizontal, MagnifyingGlass as Search, Trash, Plus, Spinner } from "@phosphor-icons/react";
import { supabase, createAdminActionClient } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default StudentsPage;

function StudentsPage() {
  const [q, setQ] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [tempItemsPerPage, setTempItemsPerPage] = useState<number | string>(10);

  // Add Student State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newCode, setNewCode] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Filter State
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [trendFilter, setTrendFilter] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState<any>(null);
  const { addNotification } = useNotifications();

  useEffect(() => {
    async function loadStudents() {
      const [
        { data: studentsData },
        { data: codesData },
        { data: sessionsData }
      ] = await Promise.all([
        supabase.from('students').select('*').order('name'),
        supabase.from('invitation_codes').select('*'),
        supabase.from('test_sessions').select('id, student_id, created_at, completed_at, test_answers(is_correct)').order('created_at', { ascending: false })
      ]);

      if (studentsData) {
        // Map codes to students to extract phone and password
        const enriched = studentsData.map(s => {
          let phone = "—";
          let mappedCode = s.invitation_code;
          
          const code = (codesData || []).find(c => {
            if (c.code === s.invitation_code && c.code !== "—") return true;
            if (c.student_name && c.student_name !== "—") {
              const parts = c.student_name.split(' | ');
              if (parts[1] === s.email) return true;
            }
            return false;
          });
          
          if (code && code.student_name && code.student_name !== "—") {
            const parts = code.student_name.split(' | ');
            if (parts[2]) phone = parts[2];
            if (s.invitation_code === "—" || !s.invitation_code) {
              mappedCode = code.code;
            }
          }

          // Calculate dynamic stats based on test_sessions
          const studentSessions = (sessionsData || []).filter(session => 
            session.student_id === s.id && session.completed_at && (session.test_answers?.length || 0) > 0
          );
          
          let tests_taken = studentSessions.length;
          let avg_score = 0;
          let last_status = "-";
          let trend = "up";
          let createdDateVal = 0;
          if (code && code.created_date) {
            createdDateVal = new Date(code.created_date).getTime();
          }

          if (tests_taken > 0) {
            let totalScore = 0;
            let lastScore = -1;
            let prevScore = -1;

            studentSessions.forEach((session, i) => {
              const answers = session.test_answers || [];
              const correct = answers.filter((a: any) => a.is_correct).length;
              const score = answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0;
              totalScore += score;
              
              if (i === 0) lastScore = score;
              else if (i === 1) prevScore = score;
            });

            avg_score = Math.round(totalScore / tests_taken);
            last_status = lastScore >= 70 ? "Pass" : "Fail";
            if (prevScore !== -1) {
              trend = lastScore >= prevScore ? "up" : "down";
            }
          }

          return { ...s, phone, invitation_code: mappedCode, tests_taken, avg_score, last_status, trend, createdDateVal };
        });

        enriched.sort((a, b) => {
          if (b.createdDateVal !== a.createdDateVal) {
             return b.createdDateVal - a.createdDateVal;
          }
          return a.name.localeCompare(b.name);
        });

        setStudents(enriched);
      }
      setLoading(false);
    }
    loadStudents();
  }, []);

  const handleDelete = async (email: string) => {
    // Optimistic UI update
    setStudents(students.filter(s => s.email !== email));
    
    try {
      await supabase.from('students').delete().eq('email', email);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) return;
    setIsAdding(true);

    try {
      const adminClient = createAdminActionClient();
      const { data: authData, error: authError } = await adminClient.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: {
            role: "student",
            full_name: newName,
          }
        }
      });

      if (authError) throw authError;

      // Extract initials
      const parts = newName.trim().split(" ");
      const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].substring(0, 2);

      const isDirectAdd = !newCode || newCode === "—";
      const createdDateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      
      const uniqueDirectCode = `Direct-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const assignedCode = isDirectAdd ? uniqueDirectCode : newCode;

      const newStudent = {
        id: authData.user?.id,
        name: newName,
        email: newEmail,
        initials: initials.toUpperCase(),
        tests_taken: 0,
        avg_score: 0,
        last_status: "-",
        trend: "up",
        invitation_code: assignedCode,
        createdDateVal: Date.now()
      };

      const { error: insertError } = await supabase.from('students').insert([{
         id: newStudent.id, name: newStudent.name, email: newStudent.email, 
         initials: newStudent.initials, tests_taken: 0, avg_score: 0, 
         last_status: "-", trend: "up", invitation_code: assignedCode 
      }]);
      if (insertError) throw insertError;

      if (isDirectAdd) {
        const dbStudentName = `${newName.trim()} | ${newEmail.trim()} | —`;
        await supabase.from('invitation_codes').insert({
          code: assignedCode,
          student_name: dbStudentName,
          status: 'Used',
          created_date: createdDateStr,
          expires_date: 'N/A'
        });
      }

      setStudents(prev => [...prev, newStudent].sort((a, b) => {
        if (b.createdDateVal !== a.createdDateVal) {
           return b.createdDateVal - a.createdDateVal;
        }
        return a.name.localeCompare(b.name);
      }));
      setIsAddOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewCode("");
      toast.success("Student added successfully");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to add student");
    } finally {
      setIsAdding(false);
    }
  };


  const filtered = students.filter((s) => {
    const matchesSearch = !q ? true : s.name.toLowerCase().includes(q.toLowerCase()) || s.email.toLowerCase().includes(q.toLowerCase());
    const matchesStatus = !statusFilter ? true : s.last_status === statusFilter;
    const matchesTrend = !trendFilter ? true : s.trend === trendFilter;
    return matchesSearch && matchesStatus && matchesTrend;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [q, statusFilter, trendFilter, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <AdminLayout title="Loading..."><div className="p-8">Loading students...</div></AdminLayout>;
  return (
    <AdminLayout
      title="Student Management"
      subtitle={`${students.length.toLocaleString()} enrolled students · 412 active in the last 7 days.`}
    >
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div>
            <h3 className="text-lg font-semibold">All Students</h3>
            <p className="text-sm text-muted-foreground">Performance and invitation status</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students" className="h-10 w-72 rounded-full border border-border bg-background pl-9 pr-4 text-sm outline-none focus:border-primary" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn("inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium", (statusFilter || trendFilter) ? "border-primary bg-primary/10 text-primary" : "border-border bg-background")}>
                  <Filter className="size-4" /> Filter
                  {(statusFilter || trendFilter) && <div className="ml-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{(statusFilter ? 1 : 0) + (trendFilter ? 1 : 0)}</div>}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Result Status</DropdownMenuLabel>
                <DropdownMenuCheckboxItem checked={statusFilter === "Pass"} onCheckedChange={(c) => setStatusFilter(c ? "Pass" : null)}>Passed</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={statusFilter === "Fail"} onCheckedChange={(c) => setStatusFilter(c ? "Fail" : null)}>Failed</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={statusFilter === "-"} onCheckedChange={(c) => setStatusFilter(c ? "-" : null)}>No Result</DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Performance Trend</DropdownMenuLabel>
                <DropdownMenuCheckboxItem checked={trendFilter === "up"} onCheckedChange={(c) => setTrendFilter(c ? "up" : null)}>Improving</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={trendFilter === "down"} onCheckedChange={(c) => setTrendFilter(c ? "down" : null)}>Declining</DropdownMenuCheckboxItem>
                {(statusFilter || trendFilter) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { setStatusFilter(null); setTrendFilter(null); }} className="justify-center font-medium text-primary cursor-pointer hover:bg-muted">Clear Filters</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <button className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  <Plus className="size-4" weight="bold" /> Add Student
                </button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleAddStudent}>
                  <DialogHeader>
                    <DialogTitle>Add New Student</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" value={newName} onChange={e => setNewName(e.target.value)} required placeholder="e.g. Jane Doe" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required placeholder="jane.doe@example.com" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Initial Password</Label>
                      <Input id="password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="At least 6 characters" minLength={6} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="code">Invitation Code (Optional)</Label>
                      <Input id="code" value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="e.g. MED-2024-JD" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isAdding}>
                      {isAdding && <Spinner className="mr-2 animate-spin" />}
                      Add Student
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="p-3 pl-4">Student</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Tests</th>
                <th className="p-3">Avg Score</th>
                <th className="p-3">Last Result</th>
                <th className="p-3">Trend</th>
                <th className="p-3">Invitation Code</th>
                <th className="p-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((s) => (
                <tr key={s.email} className="bg-card hover:bg-muted/40">
                  <td className="p-3 pl-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-full bg-muted text-xs font-semibold">{s.initials}</div>
                      <div>
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{s.phone}</td>
                  <td className="p-3 font-medium">{s.tests_taken}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${s.avg_score}%` }} />
                      </div>
                      <span className="font-semibold">{s.avg_score}%</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", s.last_status === "Pass" ? "bg-success/15 text-success-foreground" : "bg-destructive/10 text-destructive")}>{s.last_status}</span>
                  </td>
                  <td className="p-3">{s.trend === "up" ? <ArrowUpRight className="size-4 text-success-foreground" /> : <ArrowDownRight className="size-4 text-destructive" />}</td>
                  <td className="p-3"><code className="rounded-md bg-muted px-2 py-1 text-xs">{s.invitation_code === '—' ? '—' : (s.invitation_code?.startsWith('Direct-') ? 'Direct' : s.invitation_code)}</code></td>
                  <td className="p-3 pr-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="grid size-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground">
                            <MoreHorizontal className="size-4" weight="regular" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => setProfileOpen(s)}>View Profile</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            addNotification({
                              type: "alert",
                              title: "Reminder",
                              desc: "Admin has sent you a reminder to complete your pending tasks.",
                              unread: true,
                              role: "student"
                            });
                            toast.success(`Reminder sent to ${s.name}`);
                          }}>Send Reminder</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="grid size-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-destructive/10 hover:border-destructive/20 hover:text-destructive">
                            <Trash className="size-4" weight="regular" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete <strong>{s.name}</strong> from the system and remove their data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(s.email)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete Student
                            </AlertDialogAction>
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

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <span className="font-medium text-muted-foreground/80">
              Showing <span className="text-foreground">{filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-foreground">{Math.min(filtered.length, currentPage * itemsPerPage)}</span> of <span className="text-foreground">{filtered.length}</span> students
            </span>
            
            <div className="flex items-center gap-2 rounded-[22px] border border-border bg-card p-1 shadow-sm">
              <input 
                type="number"
                min={1}
                max={1000}
                value={tempItemsPerPage} 
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val > 0) {
                    setTempItemsPerPage(val);
                  } else if (e.target.value === "") {
                    setTempItemsPerPage(e.target.value);
                  }
                }}
                onBlur={() => {
                  if (typeof tempItemsPerPage !== 'number' || tempItemsPerPage < 1) {
                    setTempItemsPerPage(itemsPerPage);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = typeof tempItemsPerPage === 'number' ? tempItemsPerPage : parseInt(tempItemsPerPage as string);
                    if (!isNaN(val) && val > 0) setItemsPerPage(val);
                  }
                }}
                className="h-6 w-14 rounded-[14px] border-none bg-muted/50 px-2 text-center text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => {
                  const val = typeof tempItemsPerPage === 'number' ? tempItemsPerPage : parseInt(tempItemsPerPage as string);
                  if (!isNaN(val) && val > 0) {
                    setItemsPerPage(val);
                  } else {
                    setTempItemsPerPage(itemsPerPage);
                  }
                }}
                className="h-6 rounded-[14px] bg-primary/10 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Apply
              </button>
            </div>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border px-3 py-1.5 hover:bg-muted disabled:opacity-50"
              >
                Previous
              </button>
              
              {(() => {
                const pages = [];
                if (totalPages <= 5) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (currentPage > 3) pages.push('...');
                  if (currentPage > 2) pages.push(currentPage - 1);
                  if (currentPage !== 1 && currentPage !== totalPages) pages.push(currentPage);
                  if (currentPage < totalPages - 1) pages.push(currentPage + 1);
                  if (currentPage < totalPages - 2) pages.push('...');
                  pages.push(totalPages);
                }
                return pages.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => p !== '...' && setCurrentPage(p as number)}
                    disabled={p === '...'}
                    className={cn(
                      "rounded-lg px-3 py-1.5 font-medium transition-colors", 
                      currentPage === p 
                        ? "bg-primary text-primary-foreground" 
                        : p === '...' 
                          ? "cursor-default text-muted-foreground opacity-50" 
                          : "hover:bg-muted text-foreground"
                    )}
                  >
                    {p}
                  </button>
                ));
              })()}
              
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border px-3 py-1.5 hover:bg-muted disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!profileOpen} onOpenChange={(open) => !open && setProfileOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Student Profile</DialogTitle>
          </DialogHeader>
          {profileOpen && (
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-4 border-b border-border pb-4">
                <div className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                  {profileOpen.initials}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{profileOpen.name}</h3>
                  <p className="text-sm text-muted-foreground">{profileOpen.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Phone</span>
                  <span className="font-medium">{profileOpen.phone}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Invitation Code</span>
                  <span className="font-medium"><code className="rounded-md bg-muted px-2 py-1">{profileOpen.invitation_code}</code></span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Tests Taken</span>
                  <span className="font-medium">{profileOpen.tests_taken}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Average Score</span>
                  <span className="font-medium">{profileOpen.avg_score}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Last Result</span>
                  <span className="font-medium">{profileOpen.last_status}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setProfileOpen(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
