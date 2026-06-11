import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/hooks/use-locale";
import { t } from "@/lib/i18n";
import type { Itinerary } from "@/lib/itinerary";

type Props = {
  initialMessages?: UIMessage[];
  onItinerary?: (it: Itinerary) => void;
  onUserMessage?: (text: string) => void;
};

const ONBOARDING_KEYS = ["hoian", "hanoiFood", "sapa", "hue", "hagiang", "family"] as const;

export function ChatPanel({ initialMessages = [], onItinerary }: Props) {
  const [locale] = useLocale();
  const tr = t(locale);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { locale } }),
    [locale],
  );

  const { messages, sendMessage, status } = useChat({
    messages: initialMessages,
    transport,
    onError: (err) => {
      console.error(err);
      const msg = String(err?.message ?? "");
      if (msg.includes("429")) toast.error(tr.rateLimit);
      else if (msg.includes("402")) toast.error(tr.payment);
      else toast.error(tr.sendingError);
    },
  });

  // Extract latest itinerary from tool calls
  useEffect(() => {
    if (!onItinerary) return;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      for (const part of m.parts) {
        const anyPart = part as any;
        if (anyPart.type === "tool-build_itinerary" && anyPart.state === "output-available") {
          const it = anyPart.output?.itinerary as Itinerary | undefined;
          if (it) { onItinerary(it); return; }
        }
        if (anyPart.type === "tool-build_itinerary" && anyPart.input?.days) {
          onItinerary(anyPart.input as Itinerary);
          return;
        }
      }
    }
  }, [messages, onItinerary]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const send = (text: string) => {
    const v = text.trim();
    if (!v || status === "submitted" || status === "streaming") return;
    void sendMessage({ text: v });
    setInput("");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const busy = status === "submitted" || status === "streaming";

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        {messages.length === 0 && (
          <div className="mx-auto max-w-md animate-reveal">
            <p className="font-mono text-xs uppercase tracking-widest text-lacquer">{tr.onboarding}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ONBOARDING_KEYS.map((k) => (
                <button
                  key={k}
                  onClick={() => send(tr.chips[k])}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-lacquer hover:text-lacquer"
                >
                  {tr.chips[k]}
                </button>
              ))}
            </div>
          </div>
        )}
        <ul className="mx-auto max-w-2xl space-y-4">
          {messages.map((m) => {
            const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            const isUser = m.role === "user";
            return (
              <li key={m.id} className={isUser ? "flex justify-end" : "flex"}>
                <div
                  className={
                    isUser
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground shadow-sm"
                      : "max-w-[90%] text-foreground"
                  }
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap text-sm">{text}</p>
                  ) : (
                    <div className="prose prose-sm prose-stone max-w-none prose-headings:font-display prose-p:my-2 prose-li:my-0.5">
                      <ReactMarkdown>{text || "…"}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
          {busy && (
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> TraVy is thinking…
            </li>
          )}
        </ul>
      </div>
      <form onSubmit={onSubmit} className="border-t border-border bg-paper px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
            placeholder={tr.composerPlaceholder}
            rows={2}
            className="min-h-[56px] resize-none border-border bg-card font-sans"
            disabled={busy}
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
