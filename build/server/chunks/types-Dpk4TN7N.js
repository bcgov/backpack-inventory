const USER_ROLES = [
  "ci_specialist",
  "supervisor",
  "assistant_supervisor",
  "aaa",
  "manager",
  "director_3p"
];
const ROLE_SCOPE_MAP = {
  ci_specialist: "team",
  supervisor: "team",
  assistant_supervisor: "team",
  aaa: "region",
  manager: "region",
  director_3p: "all"
};
const INVENTORY_ACTIONS = [
  "receive",
  // Receiving an order from OSB / another office
  "remove",
  // Taking items out of storage for field distribution
  "return",
  // Returning previously removed items to storage
  "redistribute",
  // Moving items to another office
  "inventory_count"
  // Recording a physical count (no inventory change)
];
const INVENTORY_COUNT_STATUSES = [
  "pending",
  "accepted",
  "rejected"
];
const ROLE_PERMISSIONS = {
  ci_specialist: /* @__PURE__ */ new Set(["add_items", "remove_items", "inventory_count"]),
  supervisor: /* @__PURE__ */ new Set([
    "add_items",
    "remove_items",
    "record_on_behalf",
    "inventory_count",
    "reconcile_count",
    "view_audit_log",
    "view_reports",
    "manage_users"
  ]),
  assistant_supervisor: /* @__PURE__ */ new Set([
    "add_items",
    "remove_items",
    "record_on_behalf",
    "inventory_count",
    "reconcile_count",
    "view_audit_log",
    "view_reports",
    "manage_users"
  ]),
  aaa: /* @__PURE__ */ new Set([
    "add_items",
    "remove_items",
    "record_on_behalf",
    "inventory_count",
    "view_audit_log",
    "view_reports",
    "manage_users"
  ]),
  manager: /* @__PURE__ */ new Set([
    "add_items",
    "remove_items",
    "record_on_behalf",
    "inventory_count",
    "reconcile_count",
    "view_audit_log",
    "view_reports",
    "manage_users"
  ]),
  director_3p: /* @__PURE__ */ new Set(["view_reports"])
};
function hasPermission(role, permission) {
  return ROLE_PERMISSIONS[role].has(permission);
}

export { INVENTORY_ACTIONS as I, ROLE_PERMISSIONS as R, USER_ROLES as U, ROLE_SCOPE_MAP as a, INVENTORY_COUNT_STATUSES as b, hasPermission as h };
//# sourceMappingURL=types-Dpk4TN7N.js.map
