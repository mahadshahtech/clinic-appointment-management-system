import { describe, expect, it } from "vitest";
import { aggregateAdminDashboard } from "../src/admin/database-service.js";
import { clinicDayBounds, clinicToday } from "../src/scheduling/timezone.js";

describe("admin dashboard aggregation", () => {
  it("uses Asia/Karachi calendar-day UTC boundaries", () => {
    const bounds = clinicDayBounds("2026-09-18");
    expect(bounds.start.toISOString()).toBe("2026-09-17T19:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-09-18T19:00:00.000Z");
    expect(clinicToday(new Date("2026-09-18T18:59:59.999Z"))).toBe("2026-09-18");
    expect(clinicToday(new Date("2026-09-18T19:00:00.000Z"))).toBe("2026-09-19");
  });

  it("computes clinic totals and per-Doctor counts for every status", () => {
    const doctors = [
      { doctorId: "10000000-0000-4000-8000-000000000001", doctorName: "Dr One", specialization: "Medicine" },
      { doctorId: "10000000-0000-4000-8000-000000000002", doctorName: "Dr Two", specialization: "Cardiology" },
    ];
    const result = aggregateAdminDashboard("2026-09-18", doctors, [
      { doctorId: doctors[0]!.doctorId, status: "PENDING" },
      { doctorId: doctors[0]!.doctorId, status: "CONFIRMED" },
      { doctorId: doctors[0]!.doctorId, status: "COMPLETED" },
      { doctorId: doctors[1]!.doctorId, status: "NO_SHOW" },
      { doctorId: doctors[1]!.doctorId, status: "CANCELLED" },
      { doctorId: doctors[1]!.doctorId, status: "REJECTED" },
    ]);
    expect(result.totals).toEqual({ total: 6, pending: 1, confirmed: 1, completed: 1, noShow: 1, cancelled: 1, rejected: 1 });
    expect(result.doctors[0]).toMatchObject({ total: 3, pending: 1, confirmed: 1, completed: 1 });
    expect(result.doctors[1]).toMatchObject({ total: 3, noShow: 1, cancelled: 1, rejected: 1 });
  });
});
