"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type AttendanceStatus = "Present" | "Absent" | "Leave" | "Half day";
type StaffMember = {
  id: number;
  name: string;
  username: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  temporaryPassword?: string | null;
};
type AttendanceRecord = {
  userId: number;
  name: string;
  username: string;
  role: string;
  workDate: string;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  markedAt: string | null;
  notes: string | null;
};
type AttendanceSummary = {
  userId: number;
  present: number;
  halfDay: number;
  leave: number;
  absent: number;
  totalRecords: number;
};
type StaffForm = {
  name: string;
  username: string;
  phone: string;
  role: string;
  password: string;
  pin: string;
};

const emptyStaffForm: StaffForm = {
  name: "",
  username: "",
  phone: "",
  role: "Captain",
  password: "",
  pin: "",
};

const inputClass =
  "mt-1.5 block min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm text-[#26342c] shadow-sm outline-none transition placeholder:text-stone-400 focus:border-[#a36f32] focus:ring-2 focus:ring-[#ead8bd]";

function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currentMonthRange() {
  const now = new Date();
  return {
    from: localDateValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: localDateValue(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function formatMarkedAt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function StaffPage() {
  const { user, isManager } = useAuth();
  const [activeTab, setActiveTab] = useState<"team" | "attendance">("team");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [staffStatus, setStaffStatus] = useState<"all" | "active" | "archived">("all");
  const [fromDate, setFromDate] = useState(() => currentMonthRange().from);
  const [toDate, setToDate] = useState(() => currentMonthRange().to);
  const [attendanceWorkDate, setAttendanceWorkDate] = useState(() => localDateValue());
  const [staffFilter, setStaffFilter] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("");
  const [staffForm, setStaffForm] = useState<StaffForm>(emptyStaffForm);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [credentials, setCredentials] = useState<{ name: string; password: string } | null>(null);

  const loadStaff = useCallback(async () => {
    const active = staffStatus === "all" ? "" : `&active=${staffStatus === "active"}`;
    return api<StaffMember[]>(`/api/staff?search=${encodeURIComponent(search.trim())}${active}`);
  }, [search, staffStatus]);

  const loadAttendance = useCallback(async () => {
    if (!fromDate || !toDate || fromDate > toDate) {
      throw new Error("Please choose a valid attendance date range.");
    }
    const staffQuery = staffFilter ? `&userId=${staffFilter}` : "";
    const [attendanceRecords, summary] = await Promise.all([
      api<AttendanceRecord[]>(
        `/api/staff/attendance?from=${fromDate}&to=${toDate}${staffQuery}`
      ),
      api<AttendanceSummary[]>(
        `/api/staff/attendance/summary?from=${fromDate}&to=${toDate}${staffQuery}`
      ),
    ]);
    return { records: attendanceRecords, summary };
  }, [fromDate, toDate, staffFilter]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [members, attendanceData] = await Promise.all([loadStaff(), loadAttendance()]);
      setStaff(members);
      setRecords(attendanceData.records);
      setAttendanceSummary(attendanceData.summary);
    } catch (loadError) {
      setError(errorText(loadError, "Staff data could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [loadAttendance, loadStaff]);

  useEffect(() => {
    if (!isManager) return;
    let active = true;
    void Promise.all([loadStaff(), loadAttendance()])
      .then(([members, attendanceData]) => {
        if (!active) return;
        setStaff(members);
        setRecords(attendanceData.records);
        setAttendanceSummary(attendanceData.summary);
        setError("");
      })
      .catch((loadError: unknown) => {
        if (active) setError(errorText(loadError, "Staff data could not be loaded."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isManager, loadAttendance, loadStaff]);

  function setPeriod(period: "thisMonth" | "lastMonth" | "thisYear") {
    const now = new Date();
    if (period === "thisMonth") {
      setFromDate(localDateValue(new Date(now.getFullYear(), now.getMonth(), 1)));
      setToDate(localDateValue(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
    } else if (period === "lastMonth") {
      setFromDate(localDateValue(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
      setToDate(localDateValue(new Date(now.getFullYear(), now.getMonth(), 0)));
    } else {
      setFromDate(`${now.getFullYear()}-01-01`);
      setToDate(`${now.getFullYear()}-12-31`);
    }
  }

  function openCreateStaff() {
    setEditingStaff(null);
    setStaffForm(emptyStaffForm);
    setStaffDialogOpen(true);
    setError("");
    setNotice("");
  }

  function openEditStaff(member: StaffMember) {
    setEditingStaff(member);
    setStaffForm({
      name: member.name,
      username: member.username,
      phone: member.phone ?? "",
      role: member.role,
      password: "",
      pin: "",
    });
    setStaffDialogOpen(true);
    setError("");
    setNotice("");
  }

  async function saveStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    let saved = false;
    try {
      const request = {
        name: staffForm.name.trim(),
        username: staffForm.username.trim(),
        phone: staffForm.phone.trim() || null,
        role: staffForm.role,
        password: staffForm.password || null,
        pin: staffForm.pin || null,
        ...(!editingStaff
          ? {
              initialAttendance: null,
              attendanceDate: null,
            }
          : {}),
      };
      const result = editingStaff
        ? await api<StaffMember>(`/api/staff/${editingStaff.id}`, {
            method: "PUT",
            body: JSON.stringify(request),
          })
        : await api<StaffMember>("/api/staff", {
            method: "POST",
            body: JSON.stringify(request),
          });
      saved = true;
      setEditingStaff(null);
      setStaffDialogOpen(false);
      setStaffForm(emptyStaffForm);
      if (result.temporaryPassword) {
        setCredentials({ name: result.name, password: result.temporaryPassword });
      } else {
        setNotice(`${result.name}'s profile was updated.`);
      }
      const members = await loadStaff();
      setStaff(members);
    } catch (saveError) {
      setError(
        saved
          ? `Staff account was saved, but the list could not be refreshed: ${errorText(saveError, "Please refresh the page.")}`
          : errorText(saveError, "Staff account could not be saved.")
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveAttendance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const userId = Number(form.get("userId"));
    const member = staff.find((item) => item.id === userId);
    if (!member) {
      setError("Choose an active staff member.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    let saved = false;
    try {
      await api<AttendanceRecord>("/api/staff/attendance", {
        method: "PUT",
        body: JSON.stringify({
          userId,
          workDate: form.get("workDate"),
          status: form.get("status"),
          checkIn: form.get("checkIn") || null,
          checkOut: form.get("checkOut") || null,
          notes: String(form.get("notes") ?? "").trim() || null,
        }),
      });
      saved = true;
      const attendanceData = await loadAttendance();
      setRecords(attendanceData.records);
      setAttendanceSummary(attendanceData.summary);
      setNotice(`${member.name}'s attendance has been saved.`);
      formElement.reset();
    } catch (saveError) {
      setError(
        saved
          ? `Attendance was saved, but the report could not be refreshed: ${errorText(saveError, "Please refresh the report.")}`
          : errorText(saveError, "Attendance could not be saved.")
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateRecordStatus(record: AttendanceRecord, status: AttendanceStatus) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api<AttendanceRecord>("/api/staff/attendance", {
        method: "PUT",
        body: JSON.stringify({
          userId: record.userId,
          workDate: record.workDate,
          status,
          checkIn: toTimeInput(record.checkIn) || null,
          checkOut: toTimeInput(record.checkOut) || null,
          notes: record.notes,
        }),
      });
      const attendanceData = await loadAttendance();
      setRecords(attendanceData.records);
      setAttendanceSummary(attendanceData.summary);
      setNotice(`${record.name}'s status was changed to ${status.toLowerCase()}.`);
    } catch (updateError) {
      setError(errorText(updateError, "Attendance could not be updated."));
    } finally {
      setBusy(false);
    }
  }

  async function markDailyAttendance(member: StaffMember, status: AttendanceStatus) {
    const now = new Date();
    const existingRecord = records.find(
      (record) => record.userId === member.id && record.workDate === attendanceWorkDate
    );
    const checkIn = status === "Present" || status === "Half day"
      ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      : null;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api<AttendanceRecord>("/api/staff/attendance", {
        method: "PUT",
        body: JSON.stringify({
          userId: member.id,
          workDate: attendanceWorkDate,
          status,
          checkIn,
          notes: existingRecord?.notes ?? null,
        }),
      });
      const attendanceData = await loadAttendance();
      setRecords(attendanceData.records);
      setAttendanceSummary(attendanceData.summary);
      setNotice(`${member.name} marked ${status.toLowerCase()} for ${formatDate(attendanceWorkDate)}.`);
    } catch (markError) {
      setError(errorText(markError, "Attendance could not be saved."));
    } finally {
      setBusy(false);
    }
  }

  async function archiveStaff(member: StaffMember) {
    if (!window.confirm(`Archive ${member.name}'s account? Login access will stop, but all staff and attendance history will be kept.`)) {
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api<void>(`/api/staff/${member.id}`, { method: "DELETE" });
      setStaff(await loadStaff());
      setNotice(`${member.name}'s account was archived. Historical records were preserved.`);
      if (staffFilter === String(member.id)) setStaffFilter("");
    } catch (archiveError) {
      setError(errorText(archiveError, "Staff account could not be archived."));
    } finally {
      setBusy(false);
    }
  }

  async function setStaffActive(member: StaffMember, isActive: boolean) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api<StaffMember>(`/api/staff/${member.id}/active`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      });
      setStaff(await loadStaff());
      setNotice(`${member.name}'s account is ${isActive ? "active" : "archived"}.`);
    } catch (statusError) {
      setError(errorText(statusError, "Staff status could not be updated."));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(member: StaffMember) {
    if (!window.confirm(`Generate a new temporary password for ${member.name}? Their current password will stop working.`)) {
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ temporaryPassword: string }>(
        `/api/staff/${member.id}/password-reset`,
        { method: "POST" }
      );
      setCredentials({ name: member.name, password: result.temporaryPassword });
    } catch (resetError) {
      setError(errorText(resetError, "Password could not be reset."));
    } finally {
      setBusy(false);
    }
  }

  const activeStaff = staff.filter((member) => member.isActive);
  const archivedStaff = staff.filter((member) => !member.isActive);
  const attendanceTotals = attendanceSummary.reduce(
    (totals, item) => ({
      present: totals.present + item.present,
      halfDay: totals.halfDay + item.halfDay,
      leave: totals.leave + item.leave,
      absent: totals.absent + item.absent,
    }),
    { present: 0, halfDay: 0, leave: 0, absent: 0 }
  );
  const visibleRecords = attendanceFilter
    ? records.filter((record) => record.status === attendanceFilter)
    : records;
  const selectedSummary = staffFilter
    ? attendanceSummary.find((item) => item.userId === Number(staffFilter))
    : null;

  if (!isManager) return null;

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a36f32]">People operations</p>
          <h1 className="mt-1 text-3xl font-semibold text-[#21372d] sm:text-4xl">Staff & attendance</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#748076]">
            Manage your team, record daily attendance, and review monthly work history.
          </p>
        </div>
        <button
          type="button"
          onClick={activeTab === "team" ? openCreateStaff : () => setActiveTab("team")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#173d32] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#245848]"
        >
          <span aria-hidden="true" className="text-lg leading-none">{activeTab === "team" ? "+" : "♙"}</span>
          {activeTab === "team" ? "Add staff member" : "Manage team"}
        </button>
      </header>

      {error ? <Alert tone="error" onDismiss={() => setError("")}>{error}</Alert> : null}
      {notice ? <Alert tone="success" onDismiss={() => setNotice("")}>{notice}</Alert> : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Active team" value={activeStaff.length} hint="Members with login access" icon="♙" />
        <Metric label="Archived" value={archivedStaff.length} hint="Historical accounts kept" icon="◷" />
        <Metric label="Present" value={attendanceTotals.present} hint="Saved days in this period" icon="✓" tone="green" />
        <Metric label="Leave & absent" value={attendanceTotals.leave + attendanceTotals.absent} hint="Saved records in this period" icon="—" tone="gold" />
      </div>

      <div className="mb-5 flex gap-2 border-b border-[#e8e2d7]">
        <TabButton active={activeTab === "team"} onClick={() => setActiveTab("team")}>
          Team <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-xs">{staff.length}</span>
        </TabButton>
        <TabButton active={activeTab === "attendance"} onClick={() => setActiveTab("attendance")}>
          Attendance
        </TabButton>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#eee8dc] bg-white p-12 text-center text-sm text-stone-500">Loading staff workspace…</div>
      ) : activeTab === "team" ? (
        <section className="overflow-hidden rounded-2xl border border-[#eee8dc] bg-white shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-100 p-4 sm:p-5">
            <div>
              <h2 className="text-lg font-semibold text-[#26342c]">Team directory</h2>
              <p className="mt-1 text-sm text-stone-500">Staff profiles, access status, and account controls.</p>
            </div>
            <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[minmax(230px,1fr)_160px]">
              <label className="text-xs font-semibold text-stone-600">Search staff
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, username, phone or role" className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-stone-600">Account status
                <select value={staffStatus} onChange={(event) => setStaffStatus(event.target.value as typeof staffStatus)} className={inputClass}>
                  <option value="all">All accounts</option><option value="active">Active</option><option value="archived">Archived</option>
                </select>
              </label>
            </div>
          </div>

          {staff.length === 0 ? (
            <EmptyState title="No team members found" detail={search ? "Try another search or clear the status filter." : "Create your first staff account to get started."} />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead className="bg-[#faf9f5] text-[11px] uppercase tracking-[0.12em] text-stone-500">
                    <tr><th className="px-5 py-3.5 font-semibold">Staff member</th><th className="px-4 py-3.5 font-semibold">Position</th><th className="px-4 py-3.5 font-semibold">Contact</th><th className="px-4 py-3.5 font-semibold">Status</th><th className="px-5 py-3.5 text-right font-semibold">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {staff.map((member) => (
                      <tr key={member.id} className="transition hover:bg-[#fcfbf8]">
                        <td className="px-5 py-4"><StaffIdentity member={member} /></td>
                        <td className="px-4 py-4 text-stone-600">{member.role}</td>
                        <td className="px-4 py-4"><span className="text-stone-700">{member.phone || "—"}</span><span className="mt-0.5 block text-xs text-stone-400">@{member.username}</span></td>
                        <td className="px-4 py-4"><StatusPill active={member.isActive} /></td>
                        <td className="px-5 py-4"><StaffActions member={member} busy={busy} isAdmin={user?.role === "Admin"} onEdit={openEditStaff} onArchive={archiveStaff} onActivate={(item) => void setStaffActive(item, true)} onResetPassword={resetPassword} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-stone-100 md:hidden">
                {staff.map((member) => (
                  <article key={member.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <StaffIdentity member={member} />
                      <StatusPill active={member.isActive} />
                    </div>
                    <p className="mt-3 text-sm text-stone-600">{member.role} <span className="text-stone-300">·</span> {member.phone || "No phone"}</p>
                    <div className="mt-4"><StaffActions member={member} busy={busy} isAdmin={user?.role === "Admin"} onEdit={openEditStaff} onArchive={archiveStaff} onActivate={(item) => void setStaffActive(item, true)} onResetPassword={resetPassword} /></div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      ) : (
        <div className="space-y-5">
          <section className="rounded-2xl border border-[#eee8dc] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[#26342c]">Attendance report</h2>
              <p className="mt-1 text-sm text-stone-500">Filter saved attendance by month, staff member, or custom dates.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <Field label="From" name="fromDate" type="date" value={fromDate} onChange={setFromDate} />
              <Field label="To" name="toDate" type="date" value={toDate} onChange={setToDate} />
              <label className="text-xs font-semibold text-stone-600">Staff member
                <select value={staffFilter} onChange={(event) => setStaffFilter(event.target.value)} className={inputClass}>
                  <option value="">All staff</option>
                  {staff.map((member) => <option key={member.id} value={member.id}>{member.name}{member.isActive ? "" : " · Archived"}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-stone-600">Attendance status
                <select value={attendanceFilter} onChange={(event) => setAttendanceFilter(event.target.value)} className={inputClass}>
                  <option value="">All statuses</option><option value="Present">Present</option><option value="Half day">Half day</option><option value="Leave">Leave</option><option value="Absent">Absent</option>
                </select>
              </label>
              <button type="button" onClick={() => setPeriod("thisMonth")} className="min-h-11 self-end rounded-xl border border-stone-200 px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50">This month</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <QuickRange onClick={() => setPeriod("lastMonth")}>Last month</QuickRange>
              <QuickRange onClick={() => setPeriod("thisYear")}>This year</QuickRange>
              <button type="button" disabled={busy} onClick={() => void refresh()} className="min-h-9 rounded-lg px-3 text-xs font-semibold text-[#8a5d2b] hover:bg-[#f8f2e8] disabled:opacity-50">Refresh report</button>
            </div>
          </section>

          <section className="rounded-2xl border border-[#eee8dc] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a36f32]">Daily register</p>
                <h3 className="mt-1 text-lg font-semibold text-[#26342c]">Mark attendance</h3>
                <p className="mt-1 text-sm text-stone-500">Present and half-day marks save the current check-in time automatically.</p>
              </div>
              <label className="text-xs font-semibold text-stone-600">Work date
                <input type="date" value={attendanceWorkDate} onChange={(event) => setAttendanceWorkDate(event.target.value)} className={inputClass} />
              </label>
            </div>
            {activeStaff.length === 0 ? (
              <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">Add an active staff member to record attendance.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activeStaff.map((member) => (
                  <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-100 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#26342c]">{member.name}</p>
                      <p className="mt-0.5 text-xs text-stone-500">{member.role}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button type="button" disabled={busy} onClick={() => void markDailyAttendance(member, "Present")} className="min-h-9 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50">Present</button>
                      <button type="button" disabled={busy} onClick={() => void markDailyAttendance(member, "Half day")} className="min-h-9 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50">Half day</button>
                      <button type="button" disabled={busy} onClick={() => void markDailyAttendance(member, "Absent")} className="min-h-9 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50">Absent</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Present" value={attendanceTotals.present} hint="Full work days" tone="green" />
            <Metric label="Half day" value={attendanceTotals.halfDay} hint="Saved half-day records" tone="gold" />
            <Metric label="Leave" value={attendanceTotals.leave} hint="Approved / recorded leave" />
            <Metric label="Absent" value={attendanceTotals.absent} hint="Saved absent records" />
          </div>

          {staffFilter ? (
            <section className="rounded-2xl border border-[#e6ddcd] bg-[#f7f2e8] p-4 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#936b3f]">Individual monthly summary</p>
                <p className="mt-1 font-semibold text-[#26342c]">{staff.find((member) => member.id === Number(staffFilter))?.name ?? "Selected staff"}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
                <MiniTotal label="Present" value={selectedSummary?.present ?? 0} />
                <MiniTotal label="Half day" value={selectedSummary?.halfDay ?? 0} />
                <MiniTotal label="Leave" value={selectedSummary?.leave ?? 0} />
                <MiniTotal label="Absent" value={selectedSummary?.absent ?? 0} />
              </div>
            </section>
          ) : null}

          <section className="overflow-hidden rounded-2xl border border-[#eee8dc] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-4 py-4 sm:px-5">
              <div>
                <h3 className="font-semibold text-[#26342c]">Saved attendance</h3>
                <p className="mt-1 text-xs text-stone-500">{visibleRecords.length} record{visibleRecords.length === 1 ? "" : "s"} · Days without a saved record are not included.</p>
              </div>
              <span className="rounded-lg bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-500">{fromDate && toDate ? `${formatDate(fromDate)} — ${formatDate(toDate)}` : "Choose dates"}</span>
            </div>
            {visibleRecords.length === 0 ? (
              <EmptyState title="No attendance records for this filter" detail="Choose another date range or record attendance below. Unrecorded days are not automatically treated as absences." />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-[#faf9f5] text-[11px] uppercase tracking-[0.12em] text-stone-500">
                      <tr><th className="px-5 py-3.5 font-semibold">Date</th><th className="px-4 py-3.5 font-semibold">Staff member</th><th className="px-4 py-3.5 font-semibold">Status</th><th className="px-4 py-3.5 font-semibold">Check-in</th><th className="px-4 py-3.5 font-semibold">Check-out</th><th className="px-4 py-3.5 font-semibold">Marked at</th><th className="px-5 py-3.5 font-semibold">Notes</th></tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {visibleRecords.map((record) => <AttendanceRow key={`${record.userId}-${record.workDate}`} record={record} busy={busy} onStatusChange={updateRecordStatus} />)}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-stone-100 md:hidden">
                  {visibleRecords.map((record) => (
                    <article key={`${record.userId}-${record.workDate}`} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div><p className="font-semibold text-[#26342c]">{record.name}</p><p className="mt-0.5 text-xs text-stone-500">{formatDate(record.workDate)} · {record.role}</p></div>
                        <AttendanceStatusSelect record={record} busy={busy} onStatusChange={updateRecordStatus} />
                      </div>
                      <p className="mt-3 text-xs text-stone-500">In {formatTime(record.checkIn)} <span className="mx-1.5 text-stone-300">·</span> Out {formatTime(record.checkOut)} <span className="mx-1.5 text-stone-300">·</span> Marked {formatMarkedAt(record.markedAt)}</p>
                      {record.notes ? <p className="mt-2 text-sm text-stone-600">{record.notes}</p> : null}
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>

          <form onSubmit={(event) => void saveAttendance(event)} className="rounded-2xl border border-[#eee8dc] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a36f32]">Daily register</p>
              <h3 className="mt-1 text-lg font-semibold text-[#26342c]">Record attendance</h3>
              <p className="mt-1 text-sm text-stone-500">Saving again for the same staff member and date updates that saved record.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-semibold text-stone-600">Staff member
                <select name="userId" required defaultValue="" className={inputClass}>
                  <option value="" disabled>Select an active team member</option>
                  {activeStaff.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.role}</option>)}
                </select>
              </label>
              <Field label="Work date" name="workDate" type="date" required defaultValue={localDateValue()} />
              <label className="text-xs font-semibold text-stone-600">Status
                <select name="status" required defaultValue="Present" className={inputClass}>
                  <option value="Present">Present</option><option value="Half day">Half day</option><option value="Leave">Leave</option><option value="Absent">Absent</option>
                </select>
              </label>
              <Field label="Check-in (optional)" name="checkIn" type="time" />
              <Field label="Check-out (optional)" name="checkOut" type="time" />
              <Field label="Notes (optional)" name="notes" maxLength={250} placeholder="Shift details or attendance note" />
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" disabled={busy || activeStaff.length === 0} className="min-h-11 rounded-xl bg-[#173d32] px-5 text-sm font-semibold text-white transition hover:bg-[#245848] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Saving…" : "Save attendance"}</button>
            </div>
          </form>
        </div>
      )}

      {staffDialogOpen ? (
        <StaffDialog
          open={staffDialogOpen}
          editing={editingStaff}
          form={staffForm}
          busy={busy}
          error={error}
          onChange={setStaffForm}
          onClose={() => {
            setEditingStaff(null);
            setStaffForm(emptyStaffForm);
            setStaffDialogOpen(false);
          }}
          onSubmit={saveStaff}
        />
      ) : null}
      {credentials ? (
        <Dialog title="Temporary sign-in details" onClose={() => setCredentials(null)}>
          <p className="text-sm leading-6 text-stone-600">
            Share these credentials securely with {credentials.name}. This password is shown once and cannot be viewed again.
          </p>
          <div className="mt-4 rounded-xl border border-[#e9e1d3] bg-[#faf8f3] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Temporary password</p>
            <p className="mt-1 break-all font-mono text-lg font-semibold text-[#173d32]">{credentials.password}</p>
          </div>
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={() => setCredentials(null)} className="min-h-10 rounded-xl bg-[#173d32] px-5 text-sm font-semibold text-white">Done</button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );

}

function StaffActions({
  member,
  busy,
  isAdmin,
  onEdit,
  onArchive,
  onActivate,
  onResetPassword,
}: {
  member: StaffMember;
  busy: boolean;
  isAdmin: boolean;
  onEdit: (member: StaffMember) => void;
  onArchive: (member: StaffMember) => void;
  onActivate: (member: StaffMember) => void;
  onResetPassword: (member: StaffMember) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button type="button" disabled={busy} onClick={() => onEdit(member)} className="min-h-9 rounded-lg border border-stone-200 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50">Edit</button>
      {member.isActive ? (
        <>
          <button type="button" disabled={busy} onClick={() => void onResetPassword(member)} className="min-h-9 rounded-lg border border-stone-200 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50">Reset password</button>
          <button type="button" disabled={busy} onClick={() => void onArchive(member)} className="min-h-9 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Archive</button>
        </>
      ) : isAdmin ? (
        <button type="button" disabled={busy} onClick={() => void onActivate(member)} className="min-h-9 rounded-lg border border-emerald-200 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">Reactivate</button>
      ) : null}
    </div>
  );
}

function StaffIdentity({ member }: { member: StaffMember }) {
  const initials = member.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className={`grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${member.isActive ? "bg-[#edf2ed] text-[#315642]" : "bg-stone-100 text-stone-400"}`}>{initials}</div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-[#26342c]">{member.name}</p>
        <p className="mt-0.5 truncate text-xs text-stone-500">@{member.username}</p>
      </div>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}><span className={`size-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-stone-400"}`} />{active ? "Active" : "Archived"}</span>;
}

function AttendanceStatusSelect({
  record,
  busy,
  onStatusChange,
}: {
  record: AttendanceRecord;
  busy: boolean;
  onStatusChange: (record: AttendanceRecord, status: AttendanceStatus) => void;
}) {
  const colors: Record<AttendanceStatus, string> = {
    Present: "border-emerald-200 bg-emerald-50 text-emerald-800",
    "Half day": "border-amber-200 bg-amber-50 text-amber-800",
    Leave: "border-sky-200 bg-sky-50 text-sky-800",
    Absent: "border-rose-200 bg-rose-50 text-rose-800",
  };
  return (
    <select aria-label={`Attendance status for ${record.name} on ${record.workDate}`} disabled={busy} value={record.status} onChange={(event) => onStatusChange(record, event.target.value as AttendanceStatus)} className={`min-h-9 rounded-lg border px-2 text-xs font-semibold outline-none disabled:opacity-50 ${colors[record.status]}`}>
      <option value="Present">Present</option><option value="Half day">Half day</option><option value="Leave">Leave</option><option value="Absent">Absent</option>
    </select>
  );
}

function AttendanceRow({
  record,
  busy,
  onStatusChange,
}: {
  record: AttendanceRecord;
  busy: boolean;
  onStatusChange: (record: AttendanceRecord, status: AttendanceStatus) => void;
}) {
  return (
    <tr className="transition hover:bg-[#fcfbf8]">
      <td className="whitespace-nowrap px-5 py-4 text-stone-600">{formatDate(record.workDate)}</td>
      <td className="px-4 py-4"><StaffIdentity member={{ ...record, id: record.userId, phone: null, isActive: true }} /></td>
      <td className="px-4 py-4"><AttendanceStatusSelect record={record} busy={busy} onStatusChange={onStatusChange} /></td>
      <td className="px-4 py-4 text-stone-600">{formatTime(record.checkIn)}</td>
      <td className="px-4 py-4 text-stone-600">{formatTime(record.checkOut)}</td>
      <td className="whitespace-nowrap px-4 py-4 text-stone-600">{formatMarkedAt(record.markedAt)}</td>
      <td className="max-w-[200px] truncate px-5 py-4 text-stone-500" title={record.notes ?? undefined}>{record.notes || "—"}</td>
    </tr>
  );
}

function StaffDialog({
  open,
  editing,
  form,
  busy,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: StaffMember | null;
  form: StaffForm;
  busy: boolean;
  error: string;
  onChange: (form: StaffForm) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!open) return null;
  return (
    <Dialog title={editing ? "Edit staff profile" : "Add a team member"} onClose={onClose}>
      <p className="mb-5 text-sm text-stone-500">{editing ? "Update profile details. Leave password and PIN blank to keep the current sign-in details." : "Create a staff login and profile. A temporary password will be generated if you leave it blank."}</p>
      {error ? <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" name="name" required minLength={2} maxLength={100} value={form.name} onChange={(value) => onChange({ ...form, name: value })} autoFocus />
          <Field label="Username" name="username" required minLength={3} maxLength={50} value={form.username} onChange={(value) => onChange({ ...form, username: value })} autoComplete="username" />
          <Field label="Phone number" name="phone" type="tel" maxLength={30} value={form.phone} onChange={(value) => onChange({ ...form, phone: value })} />
          <label className="text-xs font-semibold text-stone-600">Position
            <select value={form.role} onChange={(event) => onChange({ ...form, role: event.target.value })} className={inputClass}>
              <option value="Captain">Captain</option><option value="Waiter">Waiter</option><option value="Helper">Helper</option><option value="Chef">Chef</option><option value="Manager">Manager</option>
            </select>
          </label>
          <Field label={editing ? "New password (optional)" : "Password (optional)"} name="password" type="password" minLength={8} maxLength={100} value={form.password} onChange={(value) => onChange({ ...form, password: value })} autoComplete="new-password" />
          <Field label={editing ? "New 4-digit PIN (optional)" : "4-digit PIN (optional)"} name="pin" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={form.pin} onChange={(value) => onChange({ ...form, pin: value.replace(/\D/g, "").slice(0, 4) })} />
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-stone-100 pt-4">
          <button type="button" disabled={busy} onClick={onClose} className="min-h-10 rounded-xl border border-stone-200 px-4 text-sm font-semibold text-stone-600 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={busy} className="min-h-10 rounded-xl bg-[#173d32] px-5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : editing ? "Save changes" : "Create staff account"}</button>
        </div>
      </form>
    </Dialog>
  );
}

function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#15251e]/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label={title} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-7">
        <div className="mb-2 flex items-start justify-between gap-4">
          <h2 className="text-2xl font-semibold text-[#21372d]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="grid size-9 shrink-0 place-items-center rounded-full bg-stone-100 text-lg text-stone-600 hover:bg-stone-200">×</button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Metric({ label, value, hint, icon, tone = "default" }: { label: string; value: number; hint: string; icon?: string; tone?: "default" | "green" | "gold" }) {
  return (
    <article className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${tone === "green" ? "border-emerald-100 bg-[#f2f7f2]" : tone === "gold" ? "border-amber-100 bg-[#fbf6ec]" : "border-[#eee8dc] bg-white"}`}>
      <div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>{icon ? <span className="grid size-8 place-items-center rounded-xl bg-white/80 text-sm text-[#936b3f]" aria-hidden="true">{icon}</span> : null}</div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-[#26342c]">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{hint}</p>
    </article>
  );
}

function MiniTotal({ label, value }: { label: string; value: number }) {
  return <span className="rounded-lg border border-white/80 bg-white px-3 py-2 text-xs text-stone-500">{label} <strong className="ml-1 text-sm text-[#26342c]">{value}</strong></span>;
}

function TabButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`-mb-px min-h-11 border-b-2 px-4 text-sm font-semibold transition ${active ? "border-[#a36f32] text-[#173d32]" : "border-transparent text-stone-500 hover:text-stone-800"}`}>{children}</button>;
}

function QuickRange({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="min-h-9 rounded-lg bg-stone-50 px-3 text-xs font-semibold text-stone-600 hover:bg-stone-100">{children}</button>;
}

function Field({
  label,
  name,
  type = "text",
  value,
  defaultValue,
  onChange,
  required = false,
  minLength,
  maxLength,
  pattern,
  placeholder,
  autoComplete,
  autoFocus,
  inputMode,
}: {
  label: string;
  name: string;
  type?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  inputMode?: "numeric" | "text" | "tel" | "email" | "url" | "search" | "decimal" | "none";
}) {
  return (
    <label className="block text-xs font-semibold text-stone-600">{label}
      <input name={name} type={type} value={value} defaultValue={value === undefined ? defaultValue : undefined} onChange={onChange ? (event) => onChange(event.target.value) : undefined} required={required} minLength={minLength} maxLength={maxLength} pattern={pattern} placeholder={placeholder} autoComplete={autoComplete} autoFocus={autoFocus} inputMode={inputMode} className={inputClass} />
    </label>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="px-5 py-14 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#f5f2eb] text-lg text-[#936b3f]" aria-hidden="true">♙</div><h3 className="mt-4 font-semibold text-[#26342c]">{title}</h3><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-stone-500">{detail}</p></div>;
}

function Alert({ tone, children, onDismiss }: { tone: "error" | "success"; children: ReactNode; onDismiss: () => void }) {
  return <div role={tone === "error" ? "alert" : "status"} className={`mb-4 flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm ${tone === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}><p>{children}</p><button type="button" onClick={onDismiss} aria-label="Dismiss message" className="font-bold opacity-60 hover:opacity-100">×</button></div>;
}
