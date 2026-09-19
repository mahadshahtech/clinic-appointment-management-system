import { loadDatabaseEnvironment } from "../../config/database-env.js";
import { createDatabase } from "../client.js";
import { doctors, doctorWorkingHours, profiles } from "../schema/index.js";

const profileSeeds = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    role: "ADMIN" as const,
    fullName: "Clinic Administrator",
    phone: "+92-300-0000001",
    gender: null,
  },
  {
    id: "00000000-0000-4000-8000-000000000101",
    role: "DOCTOR" as const,
    fullName: "Dr. Ayesha Khan",
    phone: "+92-300-0000101",
    gender: "Female",
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    role: "DOCTOR" as const,
    fullName: "Dr. Hamza Shah",
    phone: "+92-300-0000102",
    gender: "Male",
  },
  {
    id: "00000000-0000-4000-8000-000000000201",
    role: "PATIENT" as const,
    fullName: "Demo Patient One",
    phone: "+92-300-0000201",
    gender: null,
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    role: "PATIENT" as const,
    fullName: "Demo Patient Two",
    phone: "+92-300-0000202",
    gender: null,
  },
];

const doctorSeeds = [
  {
    id: "10000000-0000-4000-8000-000000000101",
    profileId: profileSeeds[1]!.id,
    specialization: "Family Medicine",
    qualifications: "MBBS, FCPS",
    bio: "Family physician focused on clear, compassionate primary care.",
    experienceYears: 9,
    consultationLocation: "Consultation Room 1",
  },
  {
    id: "10000000-0000-4000-8000-000000000102",
    profileId: profileSeeds[2]!.id,
    specialization: "General Medicine",
    qualifications: "MBBS, MRCP",
    bio: "General physician with an interest in preventive care.",
    experienceYears: 7,
    consultationLocation: "Consultation Room 2",
  },
];

if (process.env.NODE_ENV === "production") {
  throw new Error("Development seed data must never run with NODE_ENV=production.");
}

const connection = createDatabase(loadDatabaseEnvironment(), { max: 1 });

try {
  await connection.db.transaction(async (transaction) => {
    for (const profile of profileSeeds) {
      await transaction
        .insert(profiles)
        .values(profile)
        .onConflictDoUpdate({
          target: profiles.id,
          set: {
            role: profile.role,
            fullName: profile.fullName,
            phone: profile.phone,
            gender: profile.gender,
            isActive: true,
          },
        });
    }

    for (const doctor of doctorSeeds) {
      await transaction
        .insert(doctors)
        .values(doctor)
        .onConflictDoUpdate({
          target: doctors.id,
          set: {
            specialization: doctor.specialization,
            qualifications: doctor.qualifications,
            bio: doctor.bio,
            experienceYears: doctor.experienceYears,
            consultationLocation: doctor.consultationLocation,
            isActive: true,
          },
        });
    }

    await transaction
      .insert(doctorWorkingHours)
      .values([
        { doctorId: doctorSeeds[0]!.id, dayOfWeek: 1, startMinute: 540, endMinute: 660 },
        { doctorId: doctorSeeds[0]!.id, dayOfWeek: 3, startMinute: 540, endMinute: 720 },
        { doctorId: doctorSeeds[1]!.id, dayOfWeek: 2, startMinute: 600, endMinute: 780 },
      ])
      .onConflictDoNothing();
  });

  console.info("Deterministic development seed completed successfully.");
} finally {
  await connection.close();
}
