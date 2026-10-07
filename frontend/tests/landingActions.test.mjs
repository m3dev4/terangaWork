import assert from "node:assert/strict";
import test from "node:test";
import { getLandingActions } from "../src/utils/landingActions.ts";

test("visitors can sign up and sign in, even with stale cached user data", () => {
  const actions = getLandingActions(
    { role: "freelance", onboarding_completed: true },
    false
  );
  assert.equal(actions.signedIn, false);
  assert.equal(actions.primary.to, "/register");
  assert.equal(actions.account.to, "/login");
});

test("restoring a saved session never offers registration", () => {
  for (const user of [undefined, null]) {
    const actions = getLandingActions(user, true);
    assert.equal(actions.signedIn, true);
    assert.equal(actions.primary.to, "/espace");
    assert.ok(actions.footerLinks.every((link) => link.to !== "/register"));
  }
});

test("freelances go to missions and their existing profile", () => {
  const actions = getLandingActions(
    { role: "freelance", onboarding_completed: true },
    true
  );
  assert.equal(actions.primary.label, "Trouver une mission");
  assert.equal(actions.primary.to, "/espace/missions");
  assert.ok(actions.footerLinks.some((link) => link.to === "/espace/profil"));
});

test("announcers can publish and review their candidates", () => {
  const actions = getLandingActions(
    { role: "annonceur", onboarding_completed: true },
    true
  );
  assert.equal(actions.primary.to, "/espace/publier-mission");
  assert.ok(
    actions.footerLinks.some(
      (link) => link.to === "/espace/candidatures-recues"
    )
  );
});

test("incomplete profiles resume onboarding for either role", () => {
  for (const role of ["freelance", "annonceur"]) {
    const actions = getLandingActions(
      { role, onboarding_completed: false },
      true
    );
    assert.equal(actions.primary.label, "Compléter mon profil");
    assert.equal(actions.primary.to, "/onboarding");
    assert.equal(actions.account.to, "/onboarding");
  }
});

test("admins and staff access administration without onboarding", () => {
  for (const user of [
    { role: "admin", onboarding_completed: false },
    { role: "annonceur", onboarding_completed: false, is_staff: true },
    { role: "freelance", onboarding_completed: false, is_superuser: true },
  ]) {
    const actions = getLandingActions(user, true);
    assert.equal(actions.primary.to, "/espace/admin");
    assert.equal(actions.account.to, "/espace/admin");
  }
});
