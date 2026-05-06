import { useCallback, useEffect, useState } from "react";
import { generateGeminiWithContext } from "../services/gemini/gemini";
import { buildCareerCoachSystemPrompt } from "../services/gemini/prompts";
import { supabase } from "../services/supabase/supabase";
import type { ChatMessage, User } from "../types/common.types";
import { isGreeting, RANKLY_GREETING } from "../utils/greetingDetection";
import { buildGeminiErrorToastMessage } from "../utils/geminiToastBridge";
import { useToast } from "../components/atoms/Toast";

const OUT_OF_SCOPE_REDIRECT =
  "Ha, I wish I could help with everything! 😄 But I'm built specifically to supercharge your career. Ask me anything about resumes, interviews, tech skills, or salary — let's get to work!";

const CAREER_SCOPE_KEYWORDS = [
  "career",
  "job",
  "resume",
  "cv",
  "cover letter",
  "interview",
  "salary",
  "offer",
  "negotiation",
  "promotion",
  "linkedin",
  "networking",
  "skill",
  "developer",
  "engineering",
  "frontend",
  "backend",
  "react",
  "node",
  "aws",
  "gcp",
  "azure",
  "devops",
  "ml",
  "ai",
  "certification",
  "course",
  "roadmap",
];

const OUT_OF_SCOPE_KEYWORDS = [
  "recipe",
  "cook",
  "cooking",
  "food",
  "match score",
  "cricket",
  "football",
  "movie",
  "music",
  "celebrity",
  "politics",
  "election",
  "weather",
  "horoscope",
  "relationship",
  "dating",
  "medical",
  "disease",
];

function isOutOfScopeQuestion(input: string): boolean {
  const lower = input.toLowerCase().trim();
  if (!lower) return false;

  const hasCareerSignal = CAREER_SCOPE_KEYWORDS.some((k) => lower.includes(k));
  if (hasCareerSignal) return false;

  const hasOutOfScopeSignal = OUT_OF_SCOPE_KEYWORDS.some((k) =>
    lower.includes(k),
  );
  return hasOutOfScopeSignal;
}

function makeErrorMessage(err: unknown): string {
  return buildGeminiErrorToastMessage(err, { label: "AI Chat" });
}

export function useAIChat(profile: User | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    setReady(false);

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !alive) return;

      const { data, error } = await supabase
        .from("ai_chats")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!alive) return;
      if (error) console.error("[useAIChat] fetch error:", error.message);

      const mapped = (data ?? []).map((r) => ({
        id: String(r.id),
        role: r.role as "user" | "assistant",
        content: r.content as string,
        createdAt: r.created_at as string,
      })).reverse();

      const welcomeMessage: ChatMessage = {
        id: "rankly-welcome",
        role: "assistant",
        content:
          "Hey! 👋 I'm Rankly — your AI career coach. Ask me anything about resumes, interviews, salary negotiation, or career growth. I'm here to help! 🚀",
        createdAt: new Date().toISOString(),
      };

      setMessages(mapped.length === 0 ? [welcomeMessage] : mapped);
      setReady(true);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const send = useCallback(
    async (userText: string) => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not signed in");

      const coachProfile = profile
        ? {
            role: profile.role,
            experienceLevel: profile.experienceLevel ?? null,
            industry: profile.industry ?? null,
          }
        : {
            role: "Not specified",
            experienceLevel: null as null,
            industry: null as null,
          };

      // ── 1. Handle greetings locally ──
      if (isGreeting(userText)) {
        setMessages((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            role: "user",
            content: userText,
            createdAt: new Date().toISOString(),
          },
          {
            id: `rankly-reply-${Date.now()}`,
            role: "assistant",
            content: RANKLY_GREETING,
            createdAt: new Date().toISOString(),
          },
        ]);
        return;
      }

      // ── 2. Handle clearly off-topic questions locally ──
      if (isOutOfScopeQuestion(userText)) {
        setMessages((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            role: "user",
            content: userText,
            createdAt: new Date().toISOString(),
          },
          {
            id: `rankly-reply-${Date.now()}`,
            role: "assistant",
            content: OUT_OF_SCOPE_REDIRECT,
            createdAt: new Date().toISOString(),
          },
        ]);
        return;
      }

      // ── 3. Optimistically add user message to UI only (no DB yet) ──
      const tempUserMsgId = `temp-${Date.now()}`;
      let threadSnapshot: ChatMessage[] = [];
      setMessages((prev) => {
        threadSnapshot = [
          ...prev,
          {
            id: tempUserMsgId,
            role: "user",
            content: userText,
            createdAt: new Date().toISOString(),
          },
        ];
        return threadSnapshot;
      });

      setLoading(true);
      try {
        const system = buildCareerCoachSystemPrompt(coachProfile);
        const history = threadSnapshot.slice(-10).map((m) => ({
          role: m.role === "assistant" ? ("model" as const) : ("user" as const),
          text: m.content,
        }));

        // ── 4. Call AI first, save to DB only on success ──
        const reply = await generateGeminiWithContext({
          systemInstruction: system,
          userMessage: userText,
          history,
        });

        // ── 5. Save both messages to DB now that we have a reply ──
        const { data: userRow, error: userInsertError } = await supabase
          .from("ai_chats")
          .insert({ user_id: authUser.id, role: "user", content: userText })
          .select("id, created_at")
          .single();

        if (userInsertError) throw userInsertError;

        const { data: asstRow, error: asstInsertError } = await supabase
          .from("ai_chats")
          .insert({ user_id: authUser.id, role: "assistant", content: reply })
          .select("id, created_at")
          .single();

        if (asstInsertError) throw asstInsertError;

        // ── 6. Replace temp message with real DB ids ──
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== tempUserMsgId)
            .concat([
              {
                id: String(userRow.id),
                role: "user",
                content: userText,
                createdAt: userRow.created_at,
              },
              {
                id: String(asstRow.id),
                role: "assistant",
                content: reply,
                createdAt: asstRow.created_at,
              },
            ]),
        );
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsgId));
        const errorMsg = makeErrorMessage(err);
        toast(errorMsg, "error");
        console.error("[useAIChat] send error:", err);
      } finally {
        setLoading(false);
      }
    },
    [profile, toast],
  );

  const clearChat = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) {
      await supabase.from("ai_chats").delete().eq("user_id", authUser.id);
    }
    setMessages([]);
  }, []);

  return {
    messages,
    loading,
    ready,
    send,
    isGenerating: loading,
    sendMessage: send,
    clearChat,
  };
}
