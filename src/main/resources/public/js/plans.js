/* The only plans this platform books. Rate, minimum and gating live here so a
   figure is edited in one place instead of drifting between the plan cards on
   the dashboard and the booking form in the admin console. */

window.GESTRON_PLANS = [
  { key: "silver", name: "Silver Plan", rate: 70, minimum: 200, requires: null },
  { key: "gold", name: "Gold Plan", rate: 75, minimum: 2000, requires: "silver" },
  { key: "diamond", name: "Diamond Plan", rate: 80, minimum: 10000, requires: "silver" },
];

/* Booking may arrive as "Silver", "silver plan" or "SILVER PLAN"; every form
   of it resolves to the one canonical entry, and anything else is null so the
   caller can refuse it rather than store a plan the dashboard cannot show. */
window.findGestronPlan = function (name) {
  let wanted = String(name == null ? "" : name)
    .trim()
    .toLowerCase()
    .replace(/\s+plan$/, "");
  if (!wanted) return null;
  let plans = window.GESTRON_PLANS;
  for (let i = 0; i < plans.length; i++) {
    if (plans[i].key === wanted) return plans[i];
    let canonical = plans[i].name
      .toLowerCase()
      .replace(/\s+plan$/, "");
    if (canonical === wanted) return plans[i];
  }
  return null;
};

window.formatPlanMinimum = function (amount) {
  return "$" + Number(amount).toLocaleString("en-US");
};
