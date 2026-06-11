import { useCallback, useState } from "react";
import { Upload as UploadIcon, FileText, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ragApi } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const qc = useQueryClient();

  const onFile = (f: File | null) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are supported");
      return;
    }
    setFile(f);
    setProgress(0);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onFile(e.dataTransfer.files?.[0] || null);
  }, []);

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      await ragApi.upload(file, setProgress);
      toast.success(`${file.name} uploaded successfully`);
      setFile(null);
      setProgress(0);
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["health"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Documents</h1>
        <p className="text-muted-foreground mt-1">Drag and drop PDFs to add them to your knowledge base.</p>
      </div>

      <Card className="p-2 border-border/50">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "rounded-lg border-2 border-dashed p-12 text-center transition-smooth",
            dragging ? "border-primary bg-accent/50 scale-[1.01]" : "border-border hover:border-primary/50"
          )}
        >
          {!file ? (
            <>
              <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-glow">
                <UploadIcon className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Drop your PDF here</h3>
              <p className="text-sm text-muted-foreground mb-6">or click below to browse files</p>
              <label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0] || null)}
                />
                <Button asChild><span>Choose File</span></Button>
              </label>
              <p className="text-xs text-muted-foreground mt-4">PDF only · Max 50MB</p>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg text-left">
                <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                {!uploading && (
                  <Button variant="ghost" size="icon" onClick={() => setFile(null)} aria-label="Remove">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {uploading && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-xs text-muted-foreground text-center">{progress}% uploading...</p>
                </div>
              )}

              {!uploading && progress === 100 && (
                <div className="flex items-center justify-center gap-2 text-success">
                  <CheckCircle2 className="w-4 h-4" /> Uploaded
                </div>
              )}

              <Button onClick={upload} disabled={uploading} className="w-full">
                {uploading ? "Uploading..." : "Upload Document"}
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6 border-border/50">
        <h3 className="font-semibold mb-2">Tips for best results</h3>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>Use text-based PDFs (not scanned images) for better extraction.</li>
          <li>Smaller, focused documents yield more accurate responses.</li>
          <li>You can upload multiple documents one at a time.</li>
        </ul>
      </Card>
    </div>
  );
}