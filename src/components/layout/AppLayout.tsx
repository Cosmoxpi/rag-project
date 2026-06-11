import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/chat": "Chat",
  "/upload": "Upload Documents",
  "/documents": "Documents",
};

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const title = titles[pathname] || "RAG Assistant";
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setOpen(true)} title={title} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}