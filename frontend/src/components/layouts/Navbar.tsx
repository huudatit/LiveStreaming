import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Bell, Settings } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import Logout from "@/components/auth/Logout";
import logo from "@/assets/Logo.png";
import avatar from "@/assets/user.png";
import { NavLink, Link } from "react-router-dom";

export default function Navbar() {
  const { user } = useAuthStore();

  return (
    <header className="fixed top-0 right-0 left-0 z-30 border-white/10 backdrop-blur-md bg-[#0b0f1a]/70">
      <div className="flex items-center justify-between h-14 px-4 md:px-8">
        {/* Left: Logo */}
        <div className="flex items-center gap-3 ml-13">
          <Link to="/">
            <img src={logo} alt="Logo" className="h-15 w-15" />
          </Link>
        </div>

        {/* Middle: Search */}
        <div className="flex-1 max-w-lg mx-5 hidden md:flex ml-65">
          <input
            type="text"
            placeholder="Search..."
            className="w-full px-4 py-2 rounded-full bg-white/10 text-slate-200 placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* Right: Create + Bell + Avatar */}
        <div className="flex items-center gap-3">
          <NavLink
            to="/keys"
            end
            className={({ isActive }) =>
              `block px-3 py-2.5 rounded-lg text-sm transition bg-white/10 ${
                isActive
                  ? "bg-white/10 border border-white/10"
                  : "hover:bg-white/5"
              }`
            }
          >
            Create
          </NavLink>

          <button className="p-2 rounded-lg hover:bg-white/10">
            <Bell className="size-5" />
          </button>

          {/* Avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full hover:ring-2 hover:ring-white/20 transition">
                <Avatar className="w-8 h-8">
                  <AvatarImage
                    src={user?.avatarUrl || avatar}
                    alt={user?.username || "user"}
                  />
                  <AvatarFallback>
                    {user?.username?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="bg-[#1a1f2e] text-slate-200 border border-white/10 w-56"
            >
              <div className="px-3 py-2">
                <p className="text-sm font-semibold">{user?.displayName}</p>
                <p className="text-xs text-slate-400">@{user?.username}</p>
              </div>

              <DropdownMenuSeparator className="bg-white/10" />

              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/dashboard" className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="7" height="9" x="3" y="3" rx="1" />
                    <rect width="7" height="5" x="14" y="3" rx="1" />
                    <rect width="7" height="9" x="14" y="12" rx="1" />
                    <rect width="7" height="5" x="3" y="16" rx="1" />
                  </svg>
                  Dashboard
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/settings" className="flex items-center gap-2">
                  <Settings className="size-4" />
                  Cài đặt
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-white/10" />

              <DropdownMenuItem asChild>
                <Logout />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
