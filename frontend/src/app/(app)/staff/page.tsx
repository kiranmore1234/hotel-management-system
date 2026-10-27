"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

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
  status: "Present" | "Absent" | "Leave" | "Half day";
  checkIn: string | null;
  checkOut: string | null;
  notes: string | null;
};

function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthStart() {
  const now = new Date();
  return localDateValue(new Date(now.getFullYear(), now.getMonth(), 1));
}

function monthEnd() {
  const now = new Date();
  return localDateValue(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

export default function StaffPage() {
  const { user, isManager } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(monthEnd);
  const [period, setPeriod] = useState<"month" | "year" | "custom">("month");
  const [nameFilter, setNameFilter] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(localDateValue);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceRecord["status"]>("Present");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Captain");
  const [initialAttendance, setInitialAttendance] = useState<"Present" | "Leave" | "Half day">("Present");
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function choosePeriod(value: "month" | "year" | "custom") {
    setPeriod(value);
    const now = new Date();
    if (value === "month") {
      setFromDate(localDateValue(new Date(now.getFullYear(), now.getMonth(), 1)));
      setToDate(localDateValue(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
    } else if (value === "year") {
      setFromDate(`${now.getFullYear()}-01-01`);
      setToDate(`${now.getFullYear()}-12-31`);
    }
  }

  const load = useCallback(async () => {
    const [members, records] = await Promise.all([
      api<StaffMember[]>("/api/staff"),
      api<AttendanceRecord[]>(
        `/api/staff/attendance?from=${fromDate}&to=${toDate}&name=${encodeURIComponent(nameFilter.trim())}`
      ),
    ]);
    return { members, records };
  }, [fromDate, toDate, nameFilter]);

  useEffect(() => {
    if (!isManager) return;
    let active = true;
    void load()
      .then(({ members, records }) => {
        if (!active) return;
        setError("");
        setStaff(members);
        setAttendance(records);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Staff and attendance data could not be loaded");
      });
    return () => {
      active = false;
    };
  }, [isManager, load]);

  async function refresh() {
    try {
      const result = await load();
      setStaff(result.members);
      setAttendance(result.records);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Staff and attendance data could not be loaded");
    }
  }

  async function updateAttendance(record: AttendanceRecord, status: AttendanceRecord["status"]) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/api/staff/attendance", {
        method: "PUT",
        body: JSON.stringify({ userId: record.userId, workDate: record.workDate, status }),
      });
      const result = await load();
      setStaff(result.members);
      setAttendance(result.records);
      setMessage(`${record.name} marked ${status.toLowerCase()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attendance could not be updated");
    } finally {
      setBusy(false);
    }
  }

  async function markAttendance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const member = staff.find((item) => item.id === Number(selectedStaffId));
    if (!member) {
      setError("Select a staff member before saving attendance.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/api/staff/attendance", {
        method: "PUT",
        body: JSON.stringify({
          userId: member.id,
          workDate: attendanceDate,
          status: attendanceStatus,
        }),
      });
      const result = await load();
      setStaff(result.members);
      setAttendance(result.records);
      setMessage(`${member.name} marked ${attendanceStatus.toLowerCase()} for ${attendanceDate}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attendance could not be saved");
    } finally {
      setBusy(false);
    }
  }

  async function createStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const wasEditing = editingStaffId !== null;
    let accountSaved = false;
    try {
      const request = {
        name,
        username,
        phone: phone || null,
        role,
        ...(!wasEditing
          ? { initialAttendance, attendanceDate: localDateValue() }
          : {}),
      };
      if (editingStaffId === null) {
        const created = await api<StaffMember>("/api/staff", {
          method: "POST",
          body: JSON.stringify(request),
        });
        accountSaved = true;
        if (!created.temporaryPassword) {
          throw new Error("Account was created, but its temporary password was not returned. Reset the password from Staff accounts.");
        }
        resetStaffForm();
        setMessage(`Staff account created. Temporary password: ${created.temporaryPassword} — copy it now; it will not be shown again.`);
        const result = await load();
        setStaff(result.members);
        setAttendance(result.records);
      } else {
        await api<StaffMember>(`/api/staff/${editingStaffId}`, {
          method: "PUT",
          body: JSON.stringify(request),
        });
        accountSaved = true;
        resetStaffForm();
        setMessage("Staff details updated.");
        const result = await load();
        setStaff(result.members);
        setAttendance(result.records);
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Staff account could not be saved";
      setError(accountSaved ? `Account saved, but the staff list could not be refreshed: ${detail}` : detail);
    } finally {
      setBusy(false);
    }
  }

  function resetStaffForm() {
    setEditingStaffId(null);
    setName("");
    setUsername("");
    setPhone("");
    setRole("Captain");
    setInitialAttendance("Present");
  }

  function editStaff(member: StaffMember) {
    setEditingStaffId(member.id);
    setName(member.name);
    setUsername(member.username);
    setPhone(member.phone ?? "");
    setRole(member.role);
    setInitialAttendance("Present");
    setError("");
    setMessage("");
    document.getElementById("staff-account-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function toggleActive(member: StaffMember) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(`/api/staff/${member.id}/active`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      const result = await load();
      setStaff(result.members);
      setAttendance(result.records);
      setMessage(`${member.name}'s account ${member.isActive ? "deactivated" : "activated"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Staff account could not be updated");
    } finally {
      setBusy(false);
    }
  }

  async function resetStaffPassword(member: StaffMember) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api<{ temporaryPassword: string }>(`/api/staff/${member.id}/password-reset`, {
        method: "POST",
      });
      setMessage(`Temporary password for ${member.name}: ${result.temporaryPassword} — copy it now; it will not be shown again.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Staff password could not be reset");
    } finally {
      setBusy(false);
    }
  }

  if (!isManager) return null;
  const presentCount = attendance.filter((record) => record.status === "Present").length;
  const leaveCount = attendance.filter((record) => record.status === "Leave").length;
  const halfDayCount = attendance.filter((record) => record.status === "Half day").length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#936b3f]">People & shifts</p>
          <h1 className="text-3xl font-semibold text-[#26342c]">Staff attendance</h1>
          <p className="text-sm text-stone-500">Filter attendance by date range and staff name.</p>
        </div>
      </div>

      {error ? <p role="alert" className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {message ? <p role="status" className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
        <div className="border-b border-stone-100 px-4 py-4 sm:px-5">
          <div>
            <h2 className="font-semibold text-stone-900">Attendance history</h2>
            <p className="text-xs text-stone-500">Choose a month, year, or custom range. You can update each record’s status.</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-sm font-medium text-stone-600">Period
              <select value={period} onChange={(event) => choosePeriod(event.target.value as "month" | "year" | "custom")} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3">
                <option value="month">This month</option>
                <option value="year">This year</option>
                <option value="custom">Custom range</option>
              </select>
            </label>
            <label className="text-sm font-medium text-stone-600">From
              <input type="date" value={fromDate} onChange={(event) => { setPeriod("custom"); setFromDate(event.target.value); }} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3" />
            </label>
            <label className="text-sm font-medium text-stone-600">To
              <input type="date" value={toDate} onChange={(event) => { setPeriod("custom"); setToDate(event.target.value); }} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3" />
            </label>
            <Field label="Filter by name" value={nameFilter} onChange={setNameFilter} />
            <button type="button" onClick={() => void refresh()} className="min-h-11 self-end rounded-lg border border-stone-200 px-3 text-sm font-medium hover:bg-stone-50">Refresh</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 border-b border-stone-100 p-4 sm:grid-cols-4">
          <Summary label="Records" value={String(attendance.length)} />
          <Summary label="Present" value={String(presentCount)} positive />
          <Summary label="Leave" value={String(leaveCount)} />
          <Summary label="Half day" value={String(halfDayCount)} />
        </div>
        {attendance.length === 0 ? <p className="p-5 text-sm text-stone-500">No attendance records found for this filter.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr><th className="px-4 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Staff member</th><th className="px-4 py-3 font-semibold">Role</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Check-in</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {attendance.map((record) => (
                  <tr key={`${record.userId}-${record.workDate}`}>
                    <td className="whitespace-nowrap px-4 py-3">{new Date(`${record.workDate}T00:00:00`).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3"><span className="font-semibold text-stone-900">{record.name}</span><span className="block text-xs text-stone-500">@{record.username}</span></td>
                    <td className="px-4 py-3">{record.role}</td>
                    <td className="px-4 py-3">
                      <select aria-label={`Attendance status for ${record.name} on ${record.workDate}`} disabled={busy} value={record.status} onChange={(event) => void updateAttendance(record, event.target.value as AttendanceRecord["status"])} className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 disabled:opacity-50">
                        <option value="Present">Present</option>
                        <option value="Leave">Leave</option>
                        <option value="Half day">Half day</option>
                        <option value="Absent">Absent</option>
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{record.checkIn ? new Date(record.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <form onSubmit={(event) => void markAttendance(event)} className="mt-8 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:p-5">
        <h2 className="font-semibold text-stone-900">Mark attendance</h2>
        <p className="mt-1 text-xs text-stone-500">Add or update a staff member’s record for any date.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium text-stone-600">Staff member
            <select value={selectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)} required className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3">
              <option value="">Select staff</option>
              {staff.filter((member) => member.isActive).map((member) => <option key={member.id} value={member.id}>{member.name} · {member.role}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-stone-600">Date
            <input type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} required className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3" />
          </label>
          <label className="text-sm font-medium text-stone-600">Status
            <select value={attendanceStatus} onChange={(event) => setAttendanceStatus(event.target.value as AttendanceRecord["status"])} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3">
              <option value="Present">Present</option><option value="Leave">Leave</option><option value="Half day">Half day</option><option value="Absent">Absent</option>
            </select>
          </label>
          <button type="submit" disabled={busy || staff.length === 0} className="min-h-11 self-end rounded-lg bg-[#18352c] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save attendance"}</button>
        </div>
      </form>

      {isManager ? (
        <form id="staff-account-form" onSubmit={(event) => void createStaff(event)} className="mt-8 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:p-5">
          <h2 className="font-semibold text-stone-900">{editingStaffId === null ? "Add new staff" : "Edit staff account"}</h2>
          <p className="mt-1 text-xs text-stone-500">A temporary login password is generated and shown once after account creation.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Full name" value={name} onChange={setName} required />
            <Field label="Username" value={username} onChange={setUsername} required />
            <Field label="Phone" value={phone} onChange={setPhone} />
            <label className="block text-sm font-medium text-stone-600">Role
              <input list="staff-role-options" value={role} onChange={(event) => setRole(event.target.value)} required minLength={2} maxLength={50} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3" />
              <datalist id="staff-role-options">
                <option value="Captain" /><option value="Manager" /><option value="Waiter" /><option value="Helper" /><option value="Chef" />
              </datalist>
            </label>
            {editingStaffId === null ? (
              <label className="text-sm font-medium text-stone-600">Attendance status
                <select value={initialAttendance} onChange={(event) => setInitialAttendance(event.target.value as "Present" | "Leave" | "Half day")} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3">
                  <option value="Present">Present</option><option value="Leave">Leave</option><option value="Half day">Half day</option>
                </select>
              </label>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-[#18352c] px-5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : editingStaffId === null ? "Create account" : "Save changes"}</button>
            {editingStaffId !== null ? <button type="button" disabled={busy} onClick={resetStaffForm} className="min-h-11 rounded-lg border border-stone-200 px-5 text-sm font-semibold text-stone-700 disabled:opacity-50">Cancel</button> : null}
          </div>
        </form>
      ) : null}

      <section className="mt-8 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:p-5">
        <h2 className="font-semibold text-stone-900">Staff accounts</h2>
        <div className="mt-3 divide-y divide-stone-100">
          {staff.map((member) => (
            <div key={member.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-stone-900">{member.name} <span className="font-normal text-stone-500">· {member.role}</span></p>
                <p className="text-xs text-stone-500">@{member.username}{member.phone ? ` · ${member.phone}` : ""}</p>
              </div>
              <span className={`text-xs font-semibold ${member.isActive ? "text-emerald-700" : "text-stone-400"}`}>{member.isActive ? "Active" : "Inactive"}</span>
              <button type="button" disabled={busy} onClick={() => editStaff(member)} className="min-h-9 rounded-lg border border-stone-200 px-3 text-xs font-semibold text-stone-700 disabled:opacity-50">Edit</button>
              <button type="button" disabled={busy} onClick={() => void resetStaffPassword(member)} className="min-h-9 rounded-lg border border-stone-200 px-3 text-xs font-semibold text-stone-700 disabled:opacity-50">Reset password</button>
              {user?.role === "Admin" ? <button type="button" disabled={busy} onClick={() => void toggleActive(member)} className="min-h-9 rounded-lg border border-stone-200 px-3 text-xs font-semibold text-stone-700 disabled:opacity-50">{member.isActive ? "Deactivate" : "Activate"}</button> : null}
            </div>
          ))}
          {staff.length === 0 ? <p className="py-3 text-sm text-stone-500">No staff accounts found.</p> : null}
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return <div className={`rounded-2xl p-4 shadow-sm ring-1 ring-stone-200 ${positive ? "bg-emerald-50" : "bg-white"}`}><p className="text-xs text-stone-500">{label}</p><p className="mt-1 text-2xl font-bold text-stone-900">{value}</p></div>;
}

function Field({ label, value, onChange, required = false, type = "text", minLength, maxLength, pattern }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; minLength?: number; maxLength?: number; pattern?: string }) {
  return <label className="block text-sm font-medium text-stone-600">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} minLength={minLength} maxLength={maxLength} pattern={pattern} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3" /></label>;
}
