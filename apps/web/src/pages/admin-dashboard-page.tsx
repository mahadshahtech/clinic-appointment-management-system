import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Stethoscope,
  UsersRound,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../features/auth/auth-provider";
import { adminApi } from "../lib/api";

export function AdminDashboardPage() {
  const { session } = useAuth();
  const query = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminApi.dashboard(session!.access_token),
    enabled: Boolean(session),
  });
  const data = query.data;
  const metrics: Array<[string, number, LucideIcon]> = data
    ? [
        ["Total", data.totals.total, CalendarDays],
        ["Pending", data.totals.pending, Clock3],
        ["Confirmed", data.totals.confirmed, CheckCircle2],
        ["Completed", data.totals.completed, CheckCircle2],
        ["No-show", data.totals.noShow, XCircle],
        ["Cancelled / Rejected", data.totals.cancelled + data.totals.rejected, XCircle],
      ]
    : [];

  return (
    <div>
      <div className="portal-title">
        <div>
          <p><Stethoscope size={14} /> Clinic operations</p>
          <h1>Today at the clinic</h1>
          <span>{data ? `${data.date} · Asia/Karachi` : "Live appointment oversight across the clinic."}</span>
        </div>
      </div>
      {query.isLoading && <div className="state-card">Loading today’s clinic activity…</div>}
      {query.isError && <div className="form-alert">Dashboard data could not be loaded.</div>}
      {data && (
        <>
          <div className="admin-metrics">
            {metrics.map(([label, value, Icon]) => (
              <article className="admin-metric glass-panel" key={label}>
                <Icon />
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <section className="admin-table-panel glass-panel">
            <div className="section-heading">
              <div><p>Doctor workload</p><h2>Today by Doctor</h2></div>
              <UsersRound />
            </div>
            {!data.doctors.length ? (
              <div className="state-card">No active Doctors found.</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Doctor</th><th>Total</th><th>Pending</th><th>Confirmed</th><th>Completed</th><th>No-show</th><th>Cancelled</th><th>Rejected</th></tr></thead>
                  <tbody>
                    {data.doctors.map((item) => (
                      <tr key={item.doctorId}>
                        <td><strong>{item.doctorName}</strong><small>{item.specialization}</small></td>
                        <td>{item.total}</td><td>{item.pending}</td><td>{item.confirmed}</td>
                        <td>{item.completed}</td><td>{item.noShow}</td><td>{item.cancelled}</td><td>{item.rejected}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
