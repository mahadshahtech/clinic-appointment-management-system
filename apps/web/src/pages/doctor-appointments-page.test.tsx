import { QueryClient,QueryClientProvider } from "@tanstack/react-query";
import { cleanup,render,screen } from "@testing-library/react";
import { afterEach,describe,expect,it,vi } from "vitest";
vi.mock("../features/auth/auth-provider",()=>({useAuth:()=>({session:{access_token:"token"}})}));
const list=vi.hoisted(()=>vi.fn(async()=>[{id:"20000000-0000-4000-8000-000000000001",patient:{id:"30000000-0000-4000-8000-000000000001",fullName:"Patient Test",phone:"+92000"},startAt:"2030-01-07T04:00:00.000Z",endAt:"2030-01-07T04:30:00.000Z",localDate:"2030-01-07",localStartTime:"09:00",localEndTime:"09:30",status:"PENDING",createdAt:"2029-01-01T00:00:00.000Z",canConfirm:true,canReject:true,canComplete:false,canMarkNoShow:false}]));
vi.mock("../lib/api",()=>({doctorAppointmentApi:{list,confirm:vi.fn(),reject:vi.fn(),complete:vi.fn(),noShow:vi.fn()}}));
import { DoctorAppointmentsPage } from "./doctor-appointments-page";
describe("DoctorAppointmentsPage",()=>{afterEach(cleanup);it("renders pending patient requests with doctor actions",async()=>{const client=new QueryClient({defaultOptions:{queries:{retry:false}}});render(<QueryClientProvider client={client}><DoctorAppointmentsPage/></QueryClientProvider>);expect(await screen.findByText("Patient Test")).toBeInTheDocument();expect(screen.getByRole("button",{name:/confirm/i})).toBeInTheDocument();expect(screen.getByRole("button",{name:/reject/i})).toBeInTheDocument();});});
