// hooks/useAuth.js
// Usage: const { admin, isSuper, can } = useAuth();
// can("delete_member") → true/false based on role

const PERMISSIONS = {
    super_admin: [
        "view_dashboard", "view_members", "add_member", "edit_member", "delete_member",
        "view_attendance", "mark_attendance", "delete_attendance",
        "view_trainers", "view_payments", "view_reports", "manage_admins"
    ],
    admin: [
        "view_dashboard", "view_members", "add_member", "edit_member",
        "view_attendance", "mark_attendance",
        "view_trainers", "view_payments", "view_reports"
    ]
};

export function useAuth() {
    const admin   = JSON.parse(localStorage.getItem("gym_admin") || "{}");
    const role    = admin.role || "admin";
    const isSuper = role === "super_admin";
    const perms   = PERMISSIONS[role] || PERMISSIONS.admin;

    const can = (permission) => perms.includes(permission);

    return { admin, role, isSuper, can };
}