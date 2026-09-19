import { describe,expect,it } from "vitest";
import { friendlySignInError } from "./auth-provider";
describe("sign-in error sanitization",()=>{it("maps common Auth errors without exposing provider internals",()=>{expect(friendlySignInError({code:"invalid_credentials",message:"provider detail"})).toBe("The email or password is incorrect.");expect(friendlySignInError({code:"email_not_confirmed"})).toBe("Confirm your email before signing in.");expect(friendlySignInError({message:"sensitive upstream failure"})).toBe("Sign in could not be completed. Check your connection and try again.");});});
