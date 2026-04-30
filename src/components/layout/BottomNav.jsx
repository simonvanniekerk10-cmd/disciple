import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, Calendar, Target, HandHeart, ShieldCheck, Crown } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const userTabs = [
  { path: "/Home", icon: Home, label: "Home" },
  { path: "/Devotions", icon: BookOpen, label: "Devotions" },
  { path: "/Prayer", icon: HandHeart, label: "Prayer" },
  { path: "/BookCatchUp", icon: Calendar, label: "Catch-Up" },
  { path: "/Challenge", icon: Target, label: "Challenge" },
];

const adminTab = { path: "/AdminPanel", icon: ShieldCheck, label: "Admin" };
const superAdminTab = { path: "/SuperAdminPanel", icon: Crown, label: "Master" };

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  let tabs = [...userTabs];
  if (user?.role === "admin") tabs = [...userTabs, adminTab];
  if (user?.role === "super_admin") tabs = [...userTabs, adminTab, superAdminTab];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-1">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200"
              style={{ color: isActive ? '#4A80C4' : '#7A8BAA' }}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-semibold tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-safe-area-inset-bottom" />
    </nav>
  );
}