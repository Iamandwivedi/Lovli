// Where a freshly authenticated user lands. Shared by email login and Google
// sign in on both screens so the rule lives in exactly one place: an account
// with no onboarding context goes to onboarding, everyone else to the tabs.
import type { Router } from "expo-router";
import type { User } from "@/src/api/endpoints";

export const hasOnboardingContext = (user: User | null | undefined): boolean =>
  !!user?.preferred_platform || !!user?.onboarding_complete;

export const routeAfterAuth = (user: User | null | undefined, router: Router) => {
  if (hasOnboardingContext(user)) router.replace("/(tabs)/reply");
  else router.replace("/onboarding");
};
