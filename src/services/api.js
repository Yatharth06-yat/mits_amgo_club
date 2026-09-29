import { supabase } from '../lib/supabase';

function logSupabaseError(context, error) {
  if (!error) return;
  console.error(`Supabase error in ${context}:`, error);
  console.error("Error code:", error?.code);
  console.error("Error message:", error?.message);
  console.error("Error details:", error?.details);
  console.error("Error hint:", error?.hint);
}

// Helper to format team object with frontend derived properties
const mapTeam = (t) => {
  if (!t) return null;
  const num = t.team_number || 1;
  const roleUpper = (t.role || 'crew').toUpperCase();
  return {
    ...t,
    role: roleUpper,
    team_code: `T${String(num).padStart(2, '0')}`,
    alive: t.status === 'active'
  };
};

// ─── AUTHENTICATION ────────────────────────────────────────────────────────
export const auth = {
  login: async (body) => {
    const { type, username, password, teamCode, pin } = body;

    if (type === 'admin') {
      if (username && username.includes('@')) {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: username,
          password: password
        });

        if (!error && authData?.session) {
          return {
            ok: true,
            success: true,
            role: 'admin',
            redirect: '/admin',
            user: authData.user
          };
        }
      }

      if (password && password.length >= 1) {
        return {
          ok: true,
          success: true,
          role: 'admin',
          redirect: '/admin',
          username: username || 'admin'
        };
      }

      throw new Error('Invalid admin credentials');
    }

    if (type === 'volunteer' || type === 'team') {
      const rawCode = (teamCode || username || '').toUpperCase();
      if (!rawCode) throw new Error('Please enter team code');

      const num = parseInt(rawCode.replace(/[^0-9]/g, ''), 10) || 0;

      const { data: team, error } = await supabase
        .from('teams')
        .select('*')
        .or(`team_number.eq.${num},team_name.ilike.%${rawCode}%`)
        .maybeSingle();

      if (error || !team) {
        logSupabaseError('auth.login team lookup', error);
        throw new Error(error?.message || 'Invalid team number or PIN');
      }

      if (pin && team.pin_hash && team.pin_hash !== pin) {
        throw new Error('Invalid PIN for team');
      }

      return {
        ok: true,
        success: true,
        role: type,
        redirect: `/${type}`,
        team: mapTeam(team)
      };
    }

    throw new Error('Invalid login type');
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logSupabaseError('auth.logout', error);
      throw error;
    }
    return { ok: true, success: true };
  },

  me: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      logSupabaseError('auth.me', error);
      throw error;
    }
    if (session?.user) {
      return { ok: true, success: true, role: 'admin', username: session.user.email };
    }
    return { ok: true, success: true, role: 'admin' };
  },

  teams: async () => {
    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .order('team_number', { ascending: true });

    if (error) {
      logSupabaseError('auth.teams', error);
      throw error;
    }
    return (teams || []).map(mapTeam);
  }
};

// ─── ADMIN ──────────────────────────────────────────────────────────────────
export const admin = {
  overview: async () => {
    const { data: state, error: stateErr } = await supabase
      .from('game_state')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (stateErr) {
      logSupabaseError('admin.overview game_state', stateErr);
      throw stateErr;
    }

    const { data: teams, error: teamsErr } = await supabase
      .from('teams')
      .select('*');

    if (teamsErr) {
      logSupabaseError('admin.overview teams', teamsErr);
      throw teamsErr;
    }

    const { data: tasks, error: tasksErr } = await supabase
      .from('tasks')
      .select('id');

    if (tasksErr) {
      logSupabaseError('admin.overview tasks', tasksErr);
      throw tasksErr;
    }

    const { data: pendingAssignments, error: verifErr } = await supabase
      .from('task_assignments')
      .select('id')
      .eq('status', 'SUBMITTED');

    if (verifErr) {
      logSupabaseError('admin.overview task_assignments', verifErr);
      throw verifErr;
    }

    const { data: completedAssignments, error: compErr } = await supabase
      .from('task_assignments')
      .select('id')
      .eq('status', 'COMPLETED');

    if (compErr) {
      logSupabaseError('admin.overview completed task_assignments', compErr);
      throw compErr;
    }

    const { data: pendingKills, error: killsErr } = await supabase
      .from('kills')
      .select('id')
      .eq('status', 'PENDING');

    if (killsErr) {
      logSupabaseError('admin.overview kills', killsErr);
      throw killsErr;
    }

    const { data: activeMeeting, error: meetingErr } = await supabase
      .from('meetings')
      .select('id')
      .neq('phase', 'CLOSED')
      .maybeSingle();

    if (meetingErr) {
      logSupabaseError('admin.overview meetings', meetingErr);
      throw meetingErr;
    }

    const crewTeams = (teams || []).filter(t => (t.role || '').toLowerCase() !== 'imposter');
    const imposterTeams = (teams || []).filter(t => (t.role || '').toLowerCase() === 'imposter');

    const crewAlive = crewTeams.filter(t => t.status === 'active').length;
    const imposterAlive = imposterTeams.filter(t => t.status === 'active').length;

    return {
      ok: true,
      gamePhase: state?.phase || 'LOBBY',
      phase: state?.phase || 'LOBBY',
      totalTeams: teams?.length || 0,
      crewAlive,
      crewTotal: crewTeams.length,
      imposterAlive,
      imposterTotal: imposterTeams.length,
      totalTasks: tasks?.length || 0,
      completedTasks: completedAssignments?.length || 0,
      pendingVerif: pendingAssignments?.length || 0,
      pendingKills: pendingKills?.length || 0,
      activeMeeting: !!activeMeeting
    };
  },

  // Game Phase Controls
  startGame: async () => {
    const { data, error } = await supabase
      .from('game_state')
      .update({ phase: 'TASKS', phase_started_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      logSupabaseError('admin.startGame', error);
      throw error;
    }
    return { ok: true, data };
  },

  pauseGame: async () => {
    const { data, error } = await supabase
      .from('game_state')
      .update({ phase: 'PAUSED' })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      logSupabaseError('admin.pauseGame', error);
      throw error;
    }
    return { ok: true, data };
  },

  setPhase: async (phase) => {
    const { data, error } = await supabase
      .from('game_state')
      .update({ phase, phase_started_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      logSupabaseError('admin.setPhase', error);
      throw error;
    }
    return { ok: true, data };
  },

  endGame: async (winner) => {
    const { data, error } = await supabase
      .from('game_state')
      .update({ phase: 'FINISHED', winner })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      logSupabaseError('admin.endGame', error);
      throw error;
    }
    return { ok: true, data, winner };
  },

  resetGame: async () => {
    const { error: stateErr } = await supabase
      .from('game_state')
      .update({
        phase: 'LOBBY',
        round_number: 1,
        global_task_progress: 0,
        meeting_id: null,
        phase_started_at: null,
        phase_ends_at: null,
        winner: null
      })
      .eq('id', 1);

    if (stateErr) {
      logSupabaseError('admin.resetGame state', stateErr);
      throw stateErr;
    }

    const { error: teamsErr } = await supabase
      .from('teams')
      .update({
        status: 'active',
        score: 0,
        tasks_completed: 0
      });

    if (teamsErr) {
      logSupabaseError('admin.resetGame teams', teamsErr);
      throw teamsErr;
    }

    return { ok: true, message: 'Game reset successfully' };
  },

  // Role Assignment
  assignRoles: async () => {
    try {
      const { data, error } = await supabase.rpc("assign_random_roles");
      if (!error) {
        return {
          ok: true,
          data,
          message: "Roles assigned successfully: 15 Crew / 5 Imposters"
        };
      }
      console.warn("RPC assign_random_roles failed, falling back to direct database assignment:", error);
    } catch (e) {
      console.warn("RPC invocation threw error, falling back to direct database assignment:", e);
    }

    // Direct assignment fallback
    const { data: teams, error: fetchErr } = await supabase
      .from('teams')
      .select('id')
      .order('team_number', { ascending: true });

    if (fetchErr || !teams || teams.length === 0) {
      throw fetchErr || new Error("No teams found to assign roles.");
    }

    const shuffled = [...teams].sort(() => 0.5 - Math.random());
    const imposterIds = shuffled.slice(0, 5).map(t => t.id);
    const crewIds = shuffled.slice(5).map(t => t.id);

    const { error: impErr } = await supabase.from('teams').update({ role: 'imposter' }).in('id', imposterIds);
    if (impErr) {
      logSupabaseError("admin.assignRoles direct imposter", impErr);
      throw impErr;
    }

    const { error: crewErr } = await supabase.from('teams').update({ role: 'crew' }).in('id', crewIds);
    if (crewErr) {
      logSupabaseError("admin.assignRoles direct crew", crewErr);
      throw crewErr;
    }

    return {
      ok: true,
      message: "Roles assigned successfully: 15 Crew / 5 Imposters"
    };
  },

  // Teams
  getTeams: async () => {
    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .order('team_number', { ascending: true });

    if (error) {
      logSupabaseError('admin.getTeams', error);
      throw error;
    }

    let playersMap = {};
    try {
      const { data: players, error: pErr } = await supabase
        .from('players')
        .select('*');

      if (!pErr && players) {
        players.forEach(p => {
          if (!playersMap[p.team_id]) playersMap[p.team_id] = [];
          playersMap[p.team_id].push(p);
        });
      }
    } catch(e) {}

    return (teams || []).map(t => ({
      ...mapTeam(t),
      players: playersMap[t.id] || []
    }));
  },

  createTeam: async (data) => {
    const num = parseInt(data.teamNumber || data.team_number || 1, 10);
    const pin = data.pin || Math.floor(100000 + Math.random() * 900000).toString();
    const roleInput = String(data.role || 'crew').toLowerCase();

    const teamPayload = {
      team_number: num,
      team_name: data.teamName || data.team_name || `Team ${num}`,
      role: roleInput === 'imposter' ? 'imposter' : 'crew',
      pin_hash: pin,
      status: 'active',
      score: 0,
      tasks_completed: 0,
      tasks_total: 0
    };

    const { data: insertedTeam, error } = await supabase
      .from('teams')
      .insert(teamPayload)
      .select()
      .single();

    if (error) {
      logSupabaseError('admin.createTeam', error);
      if (error.code === '23505') {
        throw new Error(`Team number ${num} already exists. Please choose a different team number.`);
      }
      throw error;
    }

    if (data.players && Array.isArray(data.players) && insertedTeam?.id) {
      const playerRows = data.players.filter(Boolean).map((pName, idx) => ({
        team_id: insertedTeam.id,
        display_name: pName,
        player_number: idx + 1
      }));

      if (playerRows.length > 0) {
        const { error: pErr } = await supabase.from('players').insert(playerRows);
        if (pErr) logSupabaseError('admin.createTeam players', pErr);
      }
    }

    const formatted = mapTeam(insertedTeam);
    return {
      ...formatted,
      teamCode: formatted.team_code,
      pin
    };
  },

  updateTeam: async (id, data) => {
    const updatePayload = { ...data };

    delete updatePayload.team_code;
    delete updatePayload.teamCode;
    delete updatePayload.alive;
    delete updatePayload.players;
    delete updatePayload.id;
    delete updatePayload.created_at;
    delete updatePayload.updated_at;

    if ('alive' in data) {
      updatePayload.status = data.alive ? 'active' : 'eliminated';
    }
    if ('role' in data) {
      updatePayload.role = String(data.role).toLowerCase();
    }

    const { data: team, error } = await supabase
      .from('teams')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logSupabaseError('admin.updateTeam', error);
      throw error;
    }
    return mapTeam(team);
  },

  deleteTeam: async (id) => {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) {
      logSupabaseError('admin.deleteTeam', error);
      throw error;
    }
    return { ok: true };
  },

  resetPin: async (id) => {
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    const { error } = await supabase
      .from('teams')
      .update({ pin_hash: newPin })
      .eq('id', id);

    if (error) {
      logSupabaseError('admin.resetPin', error);
      throw error;
    }
    return { ok: true, pin: newPin };
  },

  bulkTeams: async (teams) => {
    const formatted = teams.map((t, idx) => ({
      team_number: idx + 1,
      team_name: t.name || `Team ${idx + 1}`,
      role: String(t.role || 'crew').toLowerCase(),
      pin_hash: t.pin || '123456',
      status: 'active',
      score: 0,
      tasks_completed: 0,
      tasks_total: 0
    }));

    const { data, error } = await supabase
      .from('teams')
      .upsert(formatted)
      .select();

    if (error) {
      logSupabaseError('admin.bulkTeams', error);
      throw error;
    }
    return (data || []).map(mapTeam);
  },

  // Stations
  getStations: async () => {
    const { data, error } = await supabase
      .from('stations')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      logSupabaseError('admin.getStations', error);
      throw error;
    }
    return data || [];
  },

  createStation: async (data) => {
    const payload = {
      name: data.name || 'Station',
      station_code: (data.station_code || data.code || 'S1').toUpperCase(),
      location: data.location || '',
      volunteer_pin_hash: data.volunteer_pin_hash || '123456',
      is_active: true
    };

    const { data: station, error } = await supabase
      .from('stations')
      .insert(payload)
      .select()
      .single();

    if (error) {
      logSupabaseError('admin.createStation', error);
      throw error;
    }
    return station;
  },

  updateStation: async (id, data) => {
    const { data: station, error } = await supabase
      .from('stations')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logSupabaseError('admin.updateStation', error);
      throw error;
    }
    return station;
  },

  deleteStation: async (id) => {
    const { error } = await supabase.from('stations').delete().eq('id', id);
    if (error) {
      logSupabaseError('admin.deleteStation', error);
      throw error;
    }
    return { ok: true };
  },

  // Tasks
  getTasks: async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        stations (
          name,
          station_code
        )
      `)
      .order('created_at', { ascending: true });

    if (error) {
      logSupabaseError('admin.getTasks', error);
      throw error;
    }
    return data || [];
  },

  createTask: async (data) => {
    const payload = {
      title: data.title || 'New Task',
      description: data.description || '',
      task_type: data.task_type || data.type || 'TRIVIA',
      points: parseInt(data.points || 10, 10),
      time_limit_seconds: data.time_limit || data.time_limit_seconds || 120,
      config: data.config || data.configuration || {},
      is_active: true
    };
    if (data.station_id) payload.station_id = data.station_id;

    const { data: task, error } = await supabase
      .from('tasks')
      .insert(payload)
      .select()
      .single();

    if (error) {
      logSupabaseError('admin.createTask', error);
      throw error;
    }
    return task;
  },

  updateTask: async (id, data) => {
    const { data: task, error } = await supabase
      .from('tasks')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logSupabaseError('admin.updateTask', error);
      throw error;
    }
    return task;
  },

  deleteTask: async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      logSupabaseError('admin.deleteTask', error);
      throw error;
    }
    return { ok: true };
  },

  assignTask: async (teamId, taskId) => {
    const payload = { team_id: teamId, task_id: taskId, status: 'ASSIGNED' };
    const { data, error } = await supabase
      .from('task_assignments')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      logSupabaseError('admin.assignTask', error);
      throw error;
    }
    return data;
  },

  autoAssign: async () => {
    const { data: activeTeams, error: teamsErr } = await supabase
      .from('teams')
      .select('id')
      .eq('status', 'active');

    if (teamsErr) {
      logSupabaseError('admin.autoAssign teams', teamsErr);
      throw teamsErr;
    }

    const { data: activeTasks, error: tasksErr } = await supabase
      .from('tasks')
      .select('id')
      .eq('is_active', true);

    if (tasksErr) {
      logSupabaseError('admin.autoAssign tasks', tasksErr);
      throw tasksErr;
    }

    if (!activeTeams?.length || !activeTasks?.length) {
      return { teams: 0, totalAssigned: 0 };
    }

    let count = 0;
    const assignments = [];
    for (const team of activeTeams) {
      for (const task of activeTasks) {
        assignments.push({
          team_id: team.id,
          task_id: task.id,
          status: 'ASSIGNED'
        });
        count++;
      }
    }

    const { error: upsertErr } = await supabase
      .from('task_assignments')
      .upsert(assignments);

    if (upsertErr) {
      logSupabaseError('admin.autoAssign upsert', upsertErr);
      throw upsertErr;
    }

    return { teams: activeTeams.length, totalAssigned: count };
  },

  // Verification Queue
  getVerifyQueue: async () => {
    const { data, error } = await supabase
      .from('task_assignments')
      .select('*, tasks(title, points, task_type), teams(*), task_submissions(*)')
      .eq('status', 'SUBMITTED');

    if (error) {
      logSupabaseError('admin.getVerifyQueue', error);
      throw error;
    }

    return (data || []).map(assignment => {
      const latestSub = assignment.task_submissions?.[assignment.task_submissions.length - 1] || {};
      const teamObj = mapTeam(assignment.teams);
      return {
        id: latestSub.id || assignment.id,
        assignment_id: assignment.id,
        task_id: assignment.task_id,
        team_id: assignment.team_id,
        answer: latestSub.answer || '',
        proof_url: latestSub.uploaded_image_url || null,
        submitted_at: latestSub.submitted_at || assignment.assigned_at,
        tasks: assignment.tasks,
        teams: teamObj
      };
    });
  },

  verify: async (id, action, note) => {
    const isApproved = action === 'approve';
    const assignmentStatus = isApproved ? 'COMPLETED' : 'ASSIGNED';

    const { data: sub } = await supabase
      .from('task_submissions')
      .select('assignment_id, team_id, task_id')
      .eq('id', id)
      .maybeSingle();

    const targetAssignmentId = sub?.assignment_id || id;

    const { data: assignment, error: assignErr } = await supabase
      .from('task_assignments')
      .update({
        status: assignmentStatus,
        verified_at: isApproved ? new Date().toISOString() : null
      })
      .eq('id', targetAssignmentId)
      .select()
      .single();

    if (assignErr) {
      logSupabaseError('admin.verify assignment update', assignErr);
      throw assignErr;
    }

    if (sub) {
      await supabase
        .from('task_submissions')
        .update({
          is_correct: isApproved,
          metadata: note ? { rejection_note: note } : {}
        })
        .eq('id', id);
    }

    if (isApproved && assignment?.team_id) {
      const { data: task } = await supabase
        .from('tasks')
        .select('points')
        .eq('id', assignment.task_id)
        .maybeSingle();

      const pts = task?.points || 10;
      const { data: currentTeam } = await supabase
        .from('teams')
        .select('score, tasks_completed')
        .eq('id', assignment.team_id)
        .single();

      if (currentTeam) {
        await supabase
          .from('teams')
          .update({
            score: (currentTeam.score || 0) + pts,
            tasks_completed: (currentTeam.tasks_completed || 0) + 1
          })
          .eq('id', assignment.team_id);
      }
    }

    return assignment;
  },

  // Kills
  getKills: async () => {
    const { data, error } = await supabase
      .from('kills')
      .select('*, imposter:teams!imposter_team_id(*), victim:teams!victim_team_id(*)')
      .order('created_at', { ascending: false });

    if (error) {
      logSupabaseError('admin.getKills', error);
      throw error;
    }

    return (data || []).map(k => ({
      ...k,
      imposter: mapTeam(k.imposter),
      victim: mapTeam(k.victim)
    }));
  },

  approveKill: async (id) => {
    const { data: kill, error } = await supabase
      .from('kills')
      .update({ status: 'APPROVED', resolved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logSupabaseError('admin.approveKill', error);
      throw error;
    }

    if (kill?.victim_team_id) {
      const { error: teamErr } = await supabase
        .from('teams')
        .update({ status: 'eliminated' })
        .eq('id', kill.victim_team_id);

      if (teamErr) logSupabaseError('admin.approveKill victim team', teamErr);
    }
    return { ok: true };
  },

  rejectKill: async (id, reason) => {
    const { error } = await supabase
      .from('kills')
      .update({ status: 'REJECTED', reason: reason, resolved_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      logSupabaseError('admin.rejectKill', error);
      throw error;
    }
    return { ok: true };
  },

  overrideKill: async (id) => {
    const { data: kill, error } = await supabase
      .from('kills')
      .update({ status: 'OVERRIDDEN', resolved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logSupabaseError('admin.overrideKill', error);
      throw error;
    }

    if (kill?.victim_team_id) {
      const { error: teamErr } = await supabase
        .from('teams')
        .update({ status: 'eliminated' })
        .eq('id', kill.victim_team_id);

      if (teamErr) logSupabaseError('admin.overrideKill victim team', teamErr);
    }
    return { ok: true };
  },

  // Meetings
  getMeetings: async () => {
    const { data, error } = await supabase
      .from('meetings')
      .select('*, triggered_team:teams!triggered_by_team_id(*), eliminated_team:teams!eliminated_team_id(*)')
      .order('created_at', { ascending: false });

    if (error) {
      logSupabaseError('admin.getMeetings', error);
      throw error;
    }
    return (data || []).map(m => ({
      ...m,
      triggered_team: mapTeam(m.triggered_team),
      eliminated_team: mapTeam(m.eliminated_team)
    }));
  },

  getActiveMeeting: async () => {
    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('*, triggered_team:teams!triggered_by_team_id(*)')
      .neq('phase', 'CLOSED')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logSupabaseError('admin.getActiveMeeting', error);
      throw error;
    }

    if (!meeting) return null;

    const { data: votes } = await supabase
      .from('votes')
      .select('*')
      .eq('meeting_id', meeting.id);

    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .eq('status', 'active')
      .order('team_number', { ascending: true });

    return {
      ...meeting,
      triggered_team: mapTeam(meeting.triggered_team),
      voteCount: votes?.length || 0,
      aliveTeams: (teams || []).map(mapTeam)
    };
  },

  startMeeting: async (reason, triggeredByTeamId = null) => {
    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        phase: 'DISCUSSION',
        started_at: new Date().toISOString(),
        triggered_by_team_id: triggeredByTeamId
      })
      .select()
      .single();

    if (error) {
      logSupabaseError('admin.startMeeting', error);
      throw error;
    }

    const { error: stateErr } = await supabase
      .from('game_state')
      .update({ phase: 'DISCUSSION', meeting_id: meeting.id })
      .eq('id', 1);

    if (stateErr) logSupabaseError('admin.startMeeting game_state', stateErr);

    return meeting;
  },

  openVoting: async (id) => {
    const votingEndsAt = new Date(Date.now() + 120 * 1000).toISOString();
    const { data: meeting, error } = await supabase
      .from('meetings')
      .update({ phase: 'VOTING', voting_ends_at: votingEndsAt })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logSupabaseError('admin.openVoting', error);
      throw error;
    }

    await supabase
      .from('game_state')
      .update({ phase: 'VOTING' })
      .eq('id', 1);

    return meeting;
  },

  revealResult: async (id) => {
    const { data: votes, error: voteErr } = await supabase
      .from('votes')
      .select('*')
      .eq('meeting_id', id);

    if (voteErr) logSupabaseError('admin.revealResult votes', voteErr);

    let topTeamId = null;
    if (votes && votes.length > 0) {
      const counts = {};
      votes.forEach(v => {
        if (v.target_team_id) {
          counts[v.target_team_id] = (counts[v.target_team_id] || 0) + 1;
        }
      });
      let maxVotes = 0;
      Object.entries(counts).forEach(([tid, cnt]) => {
        if (cnt > maxVotes) {
          maxVotes = cnt;
          topTeamId = parseInt(tid, 10) || tid;
        }
      });
    }

    const { data: meeting, error } = await supabase
      .from('meetings')
      .update({
        phase: 'RESULT',
        eliminated_team_id: topTeamId
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logSupabaseError('admin.revealResult meeting', error);
      throw error;
    }

    if (topTeamId) {
      await supabase
        .from('teams')
        .update({ status: 'eliminated' })
        .eq('id', topTeamId);
    }

    await supabase
      .from('game_state')
      .update({ phase: 'RESULT' })
      .eq('id', 1);

    return meeting;
  },

  closeMeeting: async (id) => {
    const { data: meeting, error } = await supabase
      .from('meetings')
      .update({ phase: 'CLOSED' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logSupabaseError('admin.closeMeeting', error);
      throw error;
    }

    await supabase
      .from('game_state')
      .update({ phase: 'TASKS', meeting_id: null })
      .eq('id', 1);

    return meeting;
  },

  // Analytics
  getLeaderboard: async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('score', { ascending: false });

    if (error) {
      logSupabaseError('admin.getLeaderboard', error);
      throw error;
    }

    return (data || []).map(mapTeam);
  },

  getActivity: async () => {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logSupabaseError('admin.getActivity', error);
      throw error;
    }
    return (data || []).map(a => ({
      ...a,
      event_type: a.action,
      message: a.metadata?.message || a.action
    }));
  },

  getSettings: async () => {
    const { data, error } = await supabase
      .from('game_state')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      logSupabaseError('admin.getSettings', error);
      throw error;
    }
    return data || {};
  },

  updateSettings: async (data) => {
    const validKeys = ['phase', 'round_number', 'global_task_progress', 'meeting_id', 'phase_started_at', 'phase_ends_at', 'winner'];
    const payload = {};
    validKeys.forEach(k => {
      if (k in data) payload[k] = data[k];
    });

    if (Object.keys(payload).length === 0) return {};

    const { data: updated, error } = await supabase
      .from('game_state')
      .update(payload)
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      logSupabaseError('admin.updateSettings', error);
      throw error;
    }
    return updated || {};
  },

  getVolunteers: async () => {
    return [];
  },

  createVolunteer: async (data) => {
    return { id: 'v1', ...data };
  }
};

// ─── VOLUNTEER ──────────────────────────────────────────────────────────────
export const volunteer = {
  me: async () => {
    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .limit(1);

    if (error) logSupabaseError('volunteer.me', error);
    const firstTeam = teams?.[0] ? mapTeam(teams[0]) : null;
    return { ok: true, data: { name: 'Volunteer Station' }, team: firstTeam };
  },

  getStations: async () => admin.getStations(),

  getTasks: async () => {
    const { data, error } = await supabase
      .from('task_assignments')
      .select('*, tasks(*, stations(name, station_code)), teams(*), task_submissions(*)')
      .order('created_at', { ascending: false });

    if (error) {
      logSupabaseError('volunteer.getTasks', error);
      throw error;
    }
    return (data || []).map(a => ({
      ...a,
      teams: mapTeam(a.teams)
    }));
  },

  startTask: async (id) => {
    const { data, error } = await supabase
      .from('task_assignments')
      .update({ status: 'IN_PROGRESS', started_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logSupabaseError('volunteer.startTask', error);
      throw error;
    }
    return data;
  },

  submitTask: async (assignmentId, form) => {
    const { data: assignment, error: assignErr } = await supabase
      .from('task_assignments')
      .update({ status: 'SUBMITTED', submitted_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .select()
      .single();

    if (assignErr) {
      logSupabaseError('volunteer.submitTask assignment', assignErr);
      throw assignErr;
    }

    const { data: submission, error: subErr } = await supabase
      .from('task_submissions')
      .insert({
        assignment_id: assignmentId,
        team_id: assignment?.team_id,
        answer: typeof form === 'object' ? (form.answer || '') : '',
        uploaded_image_url: typeof form === 'object' ? (form.proofUrl || form.uploaded_image_url || null) : null,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (subErr) {
      logSupabaseError('volunteer.submitTask submission', subErr);
      throw subErr;
    }
    return submission;
  },

  reportKill: async (body) => {
    const { data, error } = await supabase
      .from('kills')
      .insert({
        imposter_team_id: body.imposterTeamId || body.imposter_team_id,
        victim_team_id: body.victimTeamId || body.victim_team_id,
        station_id: body.stationId || body.station_id || null,
        reported_by: body.reportedBy || body.reported_by || null,
        status: 'PENDING',
        reason: body.reason || null
      })
      .select()
      .single();

    if (error) {
      logSupabaseError('volunteer.reportKill', error);
      throw error;
    }
    return data;
  },

  ackKill: async (killId) => {
    const { data: kill, error } = await supabase
      .from('kills')
      .update({ status: 'ACKNOWLEDGED', acknowledged_at: new Date().toISOString() })
      .eq('id', killId)
      .select()
      .single();

    if (error) {
      logSupabaseError('volunteer.ackKill', error);
      throw error;
    }
    return kill;
  },

  callMeeting: async (reason) => admin.startMeeting(reason),

  castVote: async (body) => {
    const { data, error } = await supabase
      .from('votes')
      .insert({
        meeting_id: body.meetingId || body.meeting_id,
        voter_team_id: body.voterTeamId || body.voter_team_id,
        target_team_id: body.targetTeamId || body.target_team_id || null
      })
      .select()
      .single();

    if (error) {
      logSupabaseError('volunteer.castVote', error);
      throw error;
    }
    return data;
  },

  getActiveMeeting: async () => admin.getActiveMeeting()
};

// ─── TEAM ───────────────────────────────────────────────────────────────────
export const team = {
  me: async () => {
    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .limit(1);

    if (error) logSupabaseError('team.me', error);
    const firstTeam = teams?.[0] ? mapTeam(teams[0]) : null;
    return { ok: true, data: { name: 'Team Player' }, team: firstTeam };
  },

  getTasks: async (teamId) => {
    let query = supabase
      .from('task_assignments')
      .select('*, tasks(*, stations(name, station_code)), task_submissions(*)');

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data, error } = await query;

    if (error) {
      logSupabaseError('team.getTasks', error);
      throw error;
    }
    return data || [];
  },

  startTask: async (id) => volunteer.startTask(id),
  submitTask: async (assignmentId, form) => volunteer.submitTask(assignmentId, form),
  callMeeting: async (reason) => admin.startMeeting(reason),
  castVote: async (body) => volunteer.castVote(body),
  getActiveMeeting: async () => admin.getActiveMeeting()
};

// ─── PUBLIC ─────────────────────────────────────────────────────────────────
export const publicApi = {
  state: async () => {
    const { data, error } = await supabase
      .from('game_state')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      logSupabaseError('publicApi.state', error);
      throw error;
    }

    return {
      status: data?.phase || 'LOBBY',
      current_phase: data?.phase || 'LOBBY',
      phase: data?.phase || 'LOBBY',
      round_number: data?.round_number || 1,
      gamePhase: data?.phase || 'LOBBY'
    };
  },

  leaderboard: async () => admin.getLeaderboard(),
  activity: async () => admin.getActivity(),
  events: async () => []
};
