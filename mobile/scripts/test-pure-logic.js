// Unit tests for the pure gate + reminder-selection logic (final PR).
// Run: node scripts/test-pure-logic.js  (transpiles the TS modules via @babel/core)
/* eslint-disable */
const { transformSync } = require("@babel/core");
const fs = require("fs");
const path = require("path");
const assert = require("assert");

function loadTs(rel) {
  const src = fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
  const { code } = transformSync(src, {
    filename: rel,
    presets: [["@babel/preset-typescript", { allExtensions: true, isTSX: false }]],
    plugins: ["@babel/plugin-transform-modules-commonjs"],
    babelrc: false,
    configFile: false,
  });
  const module = { exports: {} };
  new Function("module", "exports", "require", code)(module, module.exports, require);
  return module.exports;
}

// ---- shouldLock -------------------------------------------------------------
const { shouldLock } = loadTs("src/utils/lock-logic.ts");
const cases = [
  // [pref, platform, transition, expected]
  [true, "ios", "launch", true],
  [true, "android", "launch", true],
  [true, "ios", "background-to-active", true],
  [true, "ios", "other", false],          // inactive→active must NOT lock (FaceID loop)
  [true, "web", "launch", false],         // web never locks
  [true, "web", "background-to-active", false],
  [false, "ios", "launch", false],        // toggle off
  [false, "ios", "background-to-active", false],
];
for (const [pref, platform, t, want] of cases) {
  assert.strictEqual(shouldLock(pref, platform, t), want, `shouldLock(${pref},${platform},${t})`);
}
console.log(`shouldLock: ${cases.length}/${cases.length} pass`);

// ---- upcomingWithDates ------------------------------------------------------
const { upcomingWithDates } = loadTs("src/utils/notification-logic.ts");
const now = new Date(2026, 5, 15, 12, 0, 0); // 15 Jun 2026 noon local
const cards = [
  {
    nickname: "Ananya",
    timeline: [
      { title: "Coffee date", date: "2026-06-20", upcoming: true },        // future → yes
      { title: "Old date", date: "2026-06-01", upcoming: true },           // past → no
      { title: "Today's plan", date: "2026-06-15", upcoming: true },       // 9AM already passed at noon → no
      { title: "Free-text only", date_label: "Coming up — August 9", upcoming: true }, // no real date → no (never parsed)
      { title: "Not upcoming", date: "2026-07-01", upcoming: false },      // not upcoming → no
      { title: "Bad date", date: "20-06-2026", upcoming: true },           // invalid format → no
    ],
  },
  { nickname: "Rohan", timeline: null },                                    // null timeline → safe
];
const out = upcomingWithDates(cards, now);
assert.strictEqual(out.length, 1, `expected 1 reminder, got ${out.length}`);
assert.strictEqual(out[0].title, "Coffee date");
assert.strictEqual(out[0].nickname, "Ananya");
assert.strictEqual(out[0].fireAt.getHours(), 9, "fires at 9:00 AM local");
assert.strictEqual(out[0].fireAt.getDate(), 20);
// same-day before 9AM → included
const early = upcomingWithDates(cards, new Date(2026, 5, 15, 8, 0, 0));
assert.strictEqual(early.length, 2, "today's 9AM reminder included when now < 9AM");
console.log("upcomingWithDates: 6/6 assertions pass");
console.log("ALL PURE-LOGIC TESTS PASS");
