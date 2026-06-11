import { NavLink } from "react-router-dom";
import { LayoutDashboard, Upload, FileText, MessageSquare, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/documents", label: "Documents", icon: FileText },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && (
        <div onClick={onClose} className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" />
      )}
      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 z-50 h-screen w-64 border-r border-border bg-card flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-sm leading-tight">RAG Assistant</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">AI-Powered</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose} aria-label="Close menu">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth",
                  isActive
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="rounded-lg p-3 gradient-primary text-primary-foreground text-xs">
            <p className="font-semibold mb-1">Need help?</p>
            <p className="opacity-90">Upload PDFs, then chat with your documents.</p>
          </div>
        </div>
      </aside>
    </>
  );
}