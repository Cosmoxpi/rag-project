import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, User, FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ragApi, Source } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

const SUGGESTIONS = [
  "Summarize my documents",
  "What are the key findings?",
  "Extract action items",
  "List important dates",
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>(() => {
    try { return JSON.parse(localStorage.getItem("chat-history") || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("chat-history", JSON.stringify(messages));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (q?: string) => {
    const question = (q ?? input).trim();
    if (!question || loading) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: question };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await ragApi.query(question);
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: res.answer || "(no response)", sources: res.sources }]);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.message || "Query failed");
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clear = () => {
    setMessages([]);
    localStorage.removeItem("chat-history");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="border-b border-border px-4 md:px-6 py-3 flex items-center justify-between bg-background/50 backdrop-blur">
        <div className="text-sm text-muted-foreground">{messages.length} messages</div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clear} className="gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1" ref={scrollRef as any}>
        <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-16 animate-fade-in">
              <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-glow">
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">How can I help today?</h2>
              <p className="text-muted-foreground mb-8">Ask questions about your uploaded documents.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="p-3 text-sm text-left rounded-lg border border-border hover:border-primary hover:bg-accent/50 transition-smooth"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {loading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex items-center gap-2 pt-1.5">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border bg-background/80 backdrop-blur p-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask a question about your documents..."
              className="resize-none min-h-[56px] max-h-40 pr-12 rounded-xl"
              rows={1}
            />
            <Button
              size="icon"
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="absolute right-2 bottom-2 h-9 w-9"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3 animate-fade-in", isUser && "flex-row-reverse")}>
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
        isUser ? "bg-muted" : "gradient-primary shadow-glow"
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-primary-foreground" />}
      </div>
      <div className={cn("flex-1 min-w-0 space-y-2", isUser && "flex flex-col items-end")}>
        <div className={cn(
          "rounded-2xl px-4 py-2.5 max-w-[85%] inline-block",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        )}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">{message.content}</p>
        </div>
        {message.sources && message.sources.length > 0 && (
          <Card className="p-3 max-w-full bg-card/50 border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
              <FileText className="w-3 h-3" /> {message.sources.length} {message.sources.length === 1 ? "source" : "sources"}
            </div>
            <div className="space-y-2">
              {message.sources.map((s, i) => (
                <div key={i} className="text-xs p-2.5 rounded-lg bg-muted/50 border border-border/30">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono font-medium truncate">{s.filename}</span>
                    <span className="text-muted-foreground flex-shrink-0">chunk #{s.chunk_index}</span>
                  </div>
                  <p className="text-muted-foreground line-clamp-3">{s.excerpt}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}