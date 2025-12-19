import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  return (
    <div className="min-h-screen w-full bg-[#0b0f1a] text-slate-200">
      {/* background glow chỉ đặt 1 lần */}
      <div
        className="absolute inset-0 top-0 left-40 bg-gradient-purple pointer-events-none"
      />

      {/* Topbar cố định */}
      <Navbar />

      {/* Sidebar cố định */}
      <Sidebar />

      {/* Vùng nội dung cuộn độc lập */}
      <main className="pt-14 md:ml-60 min-h-screen">
        <div className="p-4 md:p-6">
          <Outlet /> {/* <<-- các page sẽ render vào đây */}
        </div>
      </main>
    </div>
  );
}
