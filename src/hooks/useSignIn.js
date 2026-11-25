import { createContext, useContext } from "react";

/** Provided by PublicLayout: opens the sign-in pop-up from anywhere on public pages. */
export const SignInContext = createContext(() => {});

/** Provided by PublicLayout: opens the sign-up (registration) pop-up from anywhere on public pages. */
export const SignUpContext = createContext(() => {});

export function useSignIn() {
  return useContext(SignInContext);
}

export function useSignUp() {
  return useContext(SignUpContext);
}
