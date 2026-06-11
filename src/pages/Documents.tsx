import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, RefreshCw, Trash2, FileText, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ragApi, DocumentItem } from "@/lib/api";

export default function Documents() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<DocumentItem | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["documents"],
    queryFn: ragApi.listDocuments,
  });

  const del = useMutation({
    mutationFn: ragApi.deleteDocument,
    onSuccess: () => {
      toast.success("Document deleted");
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["health"] });
      setToDelete(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || e?.message || "Delete failed"),
  });

  const filtered = (data || []).filter((d) => d.filename.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-1">{data?.length ?? 0} documents in your knowledge base</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card className="p-4 border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      <Card className="border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">{data?.length === 0 ? "No documents yet" : "No matches found"}</h3>
            <p className="text-sm text-muted-foreground">{data?.length === 0 ? "Upload your first PDF to get started" : "Try a different search term"}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <div className="col-span-7">Filename</div>
              <div className="col-span-2">Chunks</div>
              <div className="col-span-2">Size</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
            {filtered.map((doc) => (
              <div key={doc.filename} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-muted/30 transition-smooth">
                <div className="col-span-12 md:col-span-7 flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="font-medium truncate">{doc.filename}</span>
                </div>
                <div className="col-span-4 md:col-span-2 text-sm text-muted-foreground">{doc.chunks ?? "—"}</div>
                <div className="col-span-4 md:col-span-2 text-sm text-muted-foreground">
                  {doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : "—"}
                </div>
                <div className="col-span-4 md:col-span-1 flex justify-end">
                  <Button variant="ghost" size="icon" onClick={() => setToDelete(doc)} aria-label={`Delete ${doc.filename}`}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-mono">{toDelete?.filename}</span> from your knowledge base. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && del.mutate(toDelete.filename)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {del.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}