import { Menu, Moon, Sun, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

export function Header({ onMenuClick, title }: { onMenuClick: () => void; title: string }) {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick} aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        <a href="https://github.com" target="_blank" rel="noreferrer" className="hidden sm:block">
          <Button variant="ghost" size="icon" aria-label="GitHub">
            <Github className="w-4 h-4" />
          </Button>
        </a>
      </div>
    </header>
  );
}