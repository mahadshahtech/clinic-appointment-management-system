import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const refreshProfile=vi.fn(),signOut=vi.fn();
vi.mock("../features/auth/auth-provider",()=>({useAuth:()=>({session:{access_token:"token"},user:{email:"patient@example.test"},profile:{id:"00000000-0000-4000-8000-000000000001",role:"PATIENT",fullName:"Mahad Shah",phone:"+92-300-1111111",dateOfBirth:null,gender:null,isActive:true},refreshProfile,signOut})}));
vi.mock("../lib/api",()=>({appointmentApi:{list:vi.fn(async()=>[{id:"appointment-1",status:"COMPLETED",startAt:"2030-01-01T04:00:00.000Z"}])},profileApi:{update:vi.fn()}}));
import { PatientProfilePage } from "./patient-profile-page";

describe("PatientProfilePage",()=>{
  it("renders authenticated profile data, real appointment totals, and working actions",async()=>{const client=new QueryClient({defaultOptions:{queries:{retry:false}}});render(<QueryClientProvider client={client}><MemoryRouter><PatientProfilePage/></MemoryRouter></QueryClientProvider>);expect(screen.getByRole("heading",{name:"Your profile"})).toBeInTheDocument();expect(screen.getAllByText("Mahad Shah").length).toBeGreaterThan(0);expect(screen.getAllByText("patient@example.test").length).toBeGreaterThan(0);expect(await screen.findByText("Completed visits")).toBeInTheDocument();expect(screen.getByRole("link",{name:/find doctors/i})).toHaveAttribute("href","/patient/doctors");fireEvent.click(screen.getByRole("button",{name:/edit profile/i}));expect(screen.getByRole("dialog")).toBeInTheDocument();expect(screen.getByLabelText("Full name")).toHaveValue("Mahad Shah");expect(screen.getByText(/email is managed by your secure sign-in/i)).toBeInTheDocument();});
});
