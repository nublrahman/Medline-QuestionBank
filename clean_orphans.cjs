const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function clean() {
  try {
    const env = fs.readFileSync('.env.local', 'utf8');
    const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
    const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
    
    const supabase = createClient(url, key);
    
    console.log("Fetching test sessions...");
    const { data: sessions, error: sessionErr } = await supabase.from('test_sessions').select('id, student_id');
    if (sessionErr) throw sessionErr;

    console.log("Fetching students...");
    const { data: students, error: studentErr } = await supabase.from('students').select('id');
    if (studentErr) throw studentErr;

    const validStudentIds = new Set(students.map(s => s.id));
    
    const orphanedSessions = sessions.filter(s => s.student_id && !validStudentIds.has(s.student_id));
    
    console.log(`Found ${orphanedSessions.length} orphaned sessions.`);
    
    if (orphanedSessions.length === 0) {
      console.log("Nothing to clean.");
      return;
    }

    const idsToDelete = orphanedSessions.map(s => s.id);
    
    console.log(`Deleting ${idsToDelete.length} sessions...`);
    const { error: deleteErr } = await supabase.from('test_sessions').delete().in('id', idsToDelete);
    if (deleteErr) throw deleteErr;
    
    console.log("Successfully cleaned up orphaned test sessions!");
  } catch (err) {
    console.error("Error during cleanup:", err);
  }
}

clean();
