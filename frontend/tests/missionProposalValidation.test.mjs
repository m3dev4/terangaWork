import assert from "node:assert/strict";
import test from "node:test";
import {
  getTodayDate,
  MissionValidation,
} from "../src/validations/missionValidation.ts";
import { getPropositionDateError } from "../src/validations/propositionValidation.ts";

const mission = {
  title: "Mission frontend",
  description: "Créer une interface React.",
  date_deadline: getTodayDate(),
  service: 1,
  operateurMobileMoney: "WAVE",
};

test("mission budgets below 10 000 FCFA are rejected", () => {
  for (const budget of [-1, 0, 1, 9999]) {
    const result = MissionValidation.safeParse({ ...mission, budget });
    assert.equal(result.success, false);
    assert.ok(result.error.issues.some((issue) => issue.path[0] === "budget"));
  }
});

test("10 000 FCFA and higher integer budgets are accepted", () => {
  for (const budget of [10000, 10001, 500000]) {
    assert.equal(
      MissionValidation.safeParse({ ...mission, budget }).success,
      true
    );
  }
  assert.equal(
    MissionValidation.safeParse({ ...mission, budget: 10000.5 }).success,
    false
  );
});

test("keeping the announcer date requires no proposed date", () => {
  assert.equal(
    getPropositionDateError(true, "", "2026-12-31", "2026-10-07"),
    null
  );
  assert.equal(
    getPropositionDateError(true, "2027-01-02", "2026-12-31", "2026-10-07"),
    null
  );
  assert.ok(getPropositionDateError(true, "", null, "2026-10-07"));
});

test("custom dates must fall between today and the mission deadline", () => {
  for (const date of ["2026-10-07", "2026-12-15", "2026-12-31"]) {
    assert.equal(
      getPropositionDateError(false, date, "2026-12-31", "2026-10-07"),
      null
    );
  }
  for (const date of ["", "2026-10-06", "2027-01-01", "2026-11-31"]) {
    assert.ok(getPropositionDateError(false, date, "2026-12-31", "2026-10-07"));
  }
});

test("missions without a deadline allow a future custom date", () => {
  assert.equal(
    getPropositionDateError(false, "2026-12-15", null, "2026-10-07"),
    null
  );
});
