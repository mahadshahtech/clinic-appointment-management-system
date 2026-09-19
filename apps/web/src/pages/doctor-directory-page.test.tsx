import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../features/auth/auth-provider",()=>({useAuth:()=>({session:{access_token:"token"}})}));
const doctors=vi.hoisted(()=>vi.fn(async()=>[{id:"10000000-0000-4000-8000-000000000001",fullName:"Dr Ayesha Khan",specialization:"Family Medicine",qualifications:"MBBS, FCPS",bio:"Bio",experienceYears:9,consultationLocation:"Room 1"}]));
vi.mock("../lib/api",()=>({schedulingApi:{doctors}}));
import { DoctorDirectoryPage } from "./doctor-directory-page";

describe("DoctorDirectoryPage",()=>{afterEach(cleanup);it("renders doctor data returned by the API",async()=>{const client=new QueryClient({defaultOptions:{queries:{retry:false}}});render(<QueryClientProvider client={client}><MemoryRouter><DoctorDirectoryPage/></MemoryRouter></QueryClientProvider>);expect(await screen.findByText("Dr Ayesha Khan")).toBeInTheDocument();expect(screen.getByText("Family Medicine")).toBeInTheDocument();expect(screen.getByRole("link",{name:"View times for Dr Ayesha Khan"})).toHaveAttribute("href","/patient/doctors/10000000-0000-4000-8000-000000000001");});});
