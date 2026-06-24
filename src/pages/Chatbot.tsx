import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Bot, Plus, Send, User, MessageSquare, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { buildRAGContext } from "@/lib/contextBuilder";
import { cn } from "@/lib/utils";

const STARTERS = [
  "Why did water usage spike in BLK-A yesterday?",
  "Which building has the highest electricity wastage?",
  "Show water anomalies from last week.",
  "What actions should I take for critical anomalies?",
  "Predict internet usage for BLK-B tomorrow.",
  "What is the status of all recommendations?",
];

const MAX_CHARS = 2000;

type SessionRow = { id: string; created_at: string | null; preview?: string };

function getText(m: UIMessage) {
  return m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");
}

export default function Chatbot() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [input, setInput] = useState("");
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [chatKey, setChatKey] = useState(0);
  const persistedIds = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: `chat-${chatKey}`,
    messages: initialMessages,
    transport,
    onError: (e) => {
      console.error("[chatbot]", e);
      toast.error(e.message || "Failed to reach AI assistant");
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Load past sessions
  const loadSessions = async () => {
    const { data } = await supabase
      .from("chat_sessions")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (!data) return;
    const withPreviews = await Promise.all(
      data.map(async (s) => {
        const { data: m } = await supabase
          .from("chat_messages")
          .select("content")
          .eq("session_id", s.id)
          .eq("role", "user")
          .order("created_at", { ascending: true })
          .limit(1);
        return { ...s, preview: m?.[0]?.content ?? "(empty)" };
      }),
    );
    setSessions(withPreviews);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  // Persist completed assistant messages
  useEffect(() => {
    if (!sessionId) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (status === "streaming" || status === "submitted") return;
    if (persistedIds.current.has(last.id)) return;
    const content = getText(last);
    if (!content) return;
    persistedIds.current.add(last.id);
    void supabase.from("chat_messages").insert({
      session_id: sessionId,
      role: "assistant",
      content,
    });
  }, [messages, status, sessionId]);

  const newConversation = () => {
    setSessionId(null);
    setInitialMessages([]);
    setInput("");
    persistedIds.current = new Set();
    setChatKey((k) => k + 1);
  };

  const loadSession = async (id: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("id, role, content")
      .eq("session_id", id)
      .order("created_at", { ascending: true });
    if (!data) return;
    const restored: UIMessage[] = data.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text", text: m.content }],
    }));
    persistedIds.current = new Set(restored.filter((m) => m.role === "assistant").map((m) => m.id));
    setSessionId(id);
    setInitialMessages(restored);
    setChatKey((k) => k + 1);
  };

  const handleSend = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || isLoading) return;
    setInput("");

    // Ensure session
    let sid = sessionId;
    if (!sid) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Please sign in to chat");
        return;
      }
      const { data, error: e } = await supabase
        .from("chat_sessions")
        .insert({ user_id: userData.user.id })
        .select("id")
        .single();
      if (e || !data) {
        toast.error("Could not start a new conversation");
        return;
      }
      sid = data.id;
      setSessionId(sid);
      void loadSessions();
    }

    void supabase.from("chat_messages").insert({
      session_id: sid,
      role: "user",
      content: text,
    });

    let context = "";
    try {
      context = await buildRAGContext(text);
    } catch (e) {
      console.warn("[chatbot] context build failed", e);
    }

    await sendMessage({ text }, { body: { context } });
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header strip */}
      <Card className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-foreground">
              LeakSense AI Assistant
            </h1>
            <p className="text-xs text-muted-foreground">
              Powered by Lovable AI + RAG
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent"></span>
          </span>
          Online
        </div>
      </Card>

      <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[1fr_280px]">
        {/* Chat column */}
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4"
          >
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg">
                  <Bot className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    Ask me anything about resource usage
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try one of these prompts to get started
                  </p>
                </div>
                <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => void handleSend(s)}
                      className="rounded-lg border border-surface-border bg-surface-card/60 p-3 text-left text-sm text-slate-200 transition hover:border-accent hover:bg-surface-card"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((m) => {
                  const text = getText(m);
                  const isUser = m.role === "user";
                  return (
                    <div
                      key={m.id}
                      className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
                    >
                      {!isUser && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
                          <Bot className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                      <div className={cn("max-w-[80%]", isUser ? "items-end" : "items-start", "flex flex-col gap-1")}>
                        <div
                          className={cn(
                            "rounded-xl px-4 py-2.5 text-sm leading-relaxed",
                            isUser
                              ? "bg-primary text-primary-foreground"
                              : "border border-surface-border bg-surface-card text-slate-200",
                          )}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-wrap">{text}</p>
                          ) : (
                            <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                              <ReactMarkdown>{text || "…"}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                      {isUser && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                          <User className="h-4 w-4 text-foreground" />
                        </div>
                      )}
                    </div>
                  );
                })}
                {status === "submitted" && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-card px-4 py-3">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
                    </div>
                  </div>
                )}
                {error && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {error.message}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-surface-border bg-surface-card/40 p-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={handleKey}
                rows={1}
                placeholder="Ask about consumption, anomalies, recommendations…"
                className="min-h-[44px] max-h-32 resize-none"
              />
              <Button
                onClick={() => void handleSend()}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-11 w-11 shrink-0"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <button
                onClick={newConversation}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-secondary hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> New Conversation
              </button>
              <span>
                {input.length}/{MAX_CHARS}
              </span>
            </div>
          </div>
        </Card>

        {/* History sidebar */}
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="border-b border-surface-border p-3">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
              <MessageSquare className="h-4 w-4" /> Past Conversations
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-1 p-2">
              {sessions.length === 0 && (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  No past conversations yet.
                </p>
              )}
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => void loadSession(s.id)}
                  className={cn(
                    "rounded-md border border-transparent p-2 text-left text-xs transition hover:border-surface-border hover:bg-secondary",
                    sessionId === s.id && "border-accent/60 bg-secondary",
                  )}
                >
                  <p className="line-clamp-2 text-slate-200">{s.preview}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {s.created_at ? new Date(s.created_at).toLocaleString() : ""}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}