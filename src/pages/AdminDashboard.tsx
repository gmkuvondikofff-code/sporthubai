import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminUsers from "./admin/AdminUsers";
import AdminStress from "./admin/AdminStress";
import AdminWorkouts from "./admin/AdminWorkouts";
import AdminSettings from "./admin/AdminSettings";

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="stress" element={<AdminStress />} />
        <Route path="workouts" element={<AdminWorkouts />} />
        <Route path="settings" element={<AdminSettings />} />
      </Routes>
    </AdminLayout>
  );
}
