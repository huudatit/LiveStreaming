import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="hidden md:flex fixed left-0 top-14 h-screen w-60 flex-col border-white/10 bg-[#0b0f1a]/80 backdrop-blur-lg z-20">
      {/* Thanh điều hướng (Navigation) */}
      <nav className="p-3 space-y-2 text-sm">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `block px-3 py-2 rounded-lg transition ${
              isActive
                ? "bg-white/10 border border-white/10"
                : "hover:bg-white/5"
            }`
          }
        >
          Home
        </NavLink>

        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) =>
            `block px-3 py-2 rounded-lg transition ${
              isActive
                ? "bg-white/10 border border-white/10"
                : "hover:bg-white/5"
            }`
          }
        >
          Dashboard
        </NavLink>

        {/* Khu vực kênh đang theo dõi (Subscriptions) */}
        <div className="mt-4">
          <p className="text-xs uppercase text-slate-400 mb-2">Subscriptions</p>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {/* Danh sách streamer mà user đang theo dõi */}
            {/* TODO: thay bằng dữ liệu thật (map từ API/store) */}
            {["streamer01", "streamer02", "streamer03"].map((name) => (
              <div
                key={name}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-slate-300 text-sm"
              >
                <img
                  src="/src/assets/avatar-placeholder.png"
                  alt={name}
                  className="w-6 h-6 rounded-full"
                />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}