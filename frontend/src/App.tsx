// src/App.tsx or src/routes/index.tsx
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layouts/AppLayout";

// Pages
import HomePage from "@/pages/HomePage";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import DashboardPage from "@/pages/DashboardPage";
import KeysPage from "@/pages/KeysPage";
import ViewerPage from "@/pages/ViewerPage";
import VODPlayerPage from "./pages/VODPlayerPage";
import SettingsPage from "./pages/SettingPage";
// import VODPlayerPage from "@/pages/VODPlayerPage";

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/keys" element={<KeysPage />} />
        <Route path="/watch/:streamId" element={<ViewerPage />} />
        <Route path="/vod/:vodId" element={<VODPlayerPage />} />
      </Route>

      {/* Protected Routes with Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/keys" element={<KeysPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/watch/:streamId" element={<ViewerPage />} />
          <Route path="/vod/:vodId" element={<VODPlayerPage />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-[#0b0f1a] text-white">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">404</h1>
              <p className="text-slate-400 mb-4">Trang không tồn tại</p>
              <a href="/" className="text-purple-400 hover:underline">
                Quay lại trang chủ
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  );
}
