import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../features/auth/auth-provider",()=>({useAuth:()=>({session:{access_token:"token"}})}));
const list=vi.hoisted(()=>vi.fn(async()=>[{id:"20000000-0000-4000-8000-000000000001",doctor:{id:"10000000-0000-4000-8000-000000000001",fullName:"Dr Test Doctor",specialization:"Family Medicine",consultationLocation:"Room 1"},startAt:"2030-01-07T04:00:00.000Z",endAt:"2030-01-07T04:30:00.000Z",localDate:"2030-01-07",localStartTime:"09:00",localEndTime:"09:30",status:"PENDING",createdAt:"2029-01-01T00:00:00.000Z",canCancel:true,canReschedule:true}]));
vi.mock("../lib/api",()=>({ApiClientError:class extends Error{},appointmentApi:{list,cancel:vi.fn(),reschedule:vi.fn()},schedulingApi:{availability:vi.fn()}}));
import { PatientAppointmentsPage } from "./patient-appointments-page";

describe("PatientAppointmentsPage",()=>{afterEach(cleanup);it("renders real appointment data and eligible actions",async()=>{const client=new QueryClient({defaultOptions:{queries:{retry:false}}});render(<QueryClientProvider client={client}><MemoryRouter><PatientAppointmentsPage/></MemoryRouter></QueryClientProvider>);expect(await screen.findByText("Dr Test Doctor")).toBeInTheDocument();expect(screen.getByText(/09:00–09:30/)).toBeInTheDocument();expect(screen.getByRole("button",{name:/reschedule/i})).toBeInTheDocument();expect(screen.getByRole("button",{name:/cancel/i})).toBeInTheDocument();});});
