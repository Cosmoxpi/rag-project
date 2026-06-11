import { useQuery } from "@tanstack/react-query";
import { Activity, FileText, Layers, Zap, CheckCircle2, XCircle } from "lucide-react";
import { ragApi, API_URL } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const health = useQuery({ queryKey: ["health"], queryFn: ragApi.health, refetchInterval: 15000 });
  const docs = useQuery({ queryKey: ["documents"], queryFn: ragApi.listDocuments });

  const docCount = docs.data?.length ?? 0;
  const chunkCount = docs.data?.reduce((sum, d) => sum + (Number(d.chunks) || 0), 0) ?? Number(health.data?.chunks) ?? 0;
  const isHealthy = health.data?.status === "ok" || health.data?.status === "healthy";

  const stats = [
    { label: "API Status", value: health.isLoading ? "—" : (isHealthy ? "Online" : (health.isError ? "Offline" : String(health.data?.status))), icon: Activity, color: isHealthy ? "text-success" : "text-destructive" },
    { label: "Documents", value: docs.isLoading ? "—" : docCount, icon: FileText, color: "text-primary" },
    { label: "Total Chunks", value: docs.isLoading ? "—" : chunkCount, icon: Layers, color: "text-primary-glow" },
    { label: "Endpoints", value: 5, icon: Zap, color: "text-warning" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground mt-1">Monitor your RAG system and start querying your documents.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isHealthy ? "default" : "destructive"} className="gap-1.5">
            {isHealthy ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {health.isLoading ? "Checking..." : isHealthy ? "System Healthy" : "System Down"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-6 hover:shadow-elegant transition-smooth border-border/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            {health.isLoading || docs.isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-3xl font-bold">{s.value}</p>
            )}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6 border-border/50">
          <h3 className="font-semibold mb-1">Quick Actions</h3>
          <p className="text-sm text-muted-foreground mb-4">Get started in seconds</p>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/upload"><Button variant="outline" className="w-full justify-start gap-2">Upload PDF</Button></Link>
            <Link to="/chat"><Button className="w-full justify-start gap-2">Start Chat</Button></Link>
            <Link to="/documents"><Button variant="outline" className="w-full justify-start gap-2">View Docs</Button></Link>
            <Button variant="outline" onClick={() => { health.refetch(); docs.refetch(); }}>Refresh</Button>
          </div>
        </Card>

        <Card className="p-6 border-border/50">
          <h3 className="font-semibold mb-1">System Info</h3>
          <p className="text-sm text-muted-foreground mb-4">Backend configuration</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-border/50"><span className="text-muted-foreground">API URL</span><span className="font-mono text-xs truncate ml-2">{API_URL}</span></div>
            <div className="flex justify-between py-2 border-b border-border/50"><span className="text-muted-foreground">Status</span><span className="font-mono text-xs">{String(health.data?.status ?? "unknown")}</span></div>
            <div className="flex justify-between py-2"><span className="text-muted-foreground">Auto-refresh</span><span className="font-mono text-xs">15s</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}