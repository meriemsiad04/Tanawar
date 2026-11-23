import { createContext, useContext } from "react";

/** Provided by PublicLayout: opens the sign-in pop-up from anywhere on public pages. */
export const SignInContext = createContext(() => {});

export function useSignIn() {
  return useContext(SignInContext);
}
