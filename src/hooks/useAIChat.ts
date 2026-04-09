import { useCallback, useEffect, useState } from "react";
import { generateGeminiWithContext } from "../services/gemini/gemini";
import { buildCareerCoachSystemPrompt } from "../services/gemini/prompts";
import { supabase } from "../services/supabase/supabase";
import type { ChatMessage, User } from "../types/common.types";

export function useAIChat(profile: User | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    setReady(false);

    (async () => {
      // ── Wait for session to be fully restored ──
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user || !alive) return;

      const { data, error } = await supabase
        .from("ai_chats")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true })
        .limit(100);

      if (!alive) return;

      if (error) {
        console.error("[useAIChat] fetch error:", error.message);
      }

      const mapped = (data ?? []).map((r) => ({
        id: r.id as string,
        role: r.role as "user" | "assistant",
        content: r.content as string,
        createdAt: r.created_at as string,
      }));

      setMessages(mapped);
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

      // ── 1. Insert user message and get back the real DB id ──
      const { data: userRow, error: userInsertError } = await supabase
        .from("ai_chats")
        .insert({ user_id: authUser.id, role: "user", content: userText })
        .select("id, created_at")
        .single();

      if (userInsertError) {
        console.error(
          "[useAIChat] user insert error:",
          userInsertError.message,
        );
        throw userInsertError;
      }

      const userMsg: ChatMessage = {
        id: userRow.id, // ← real DB id, not local-xxx
        role: "user",
        content: userText,
        createdAt: userRow.created_at,
      };

      let threadSnapshot: ChatMessage[] = [];
      setMessages((prev) => {
        threadSnapshot = [...prev, userMsg];
        return threadSnapshot;
      });

      setLoading(true);
      try {
        const system = buildCareerCoachSystemPrompt(coachProfile);
        const history = threadSnapshot.slice(-10).map((m) => ({
          role: m.role === "assistant" ? ("model" as const) : ("user" as const),
          text: m.content,
        }));

        const reply = await generateGeminiWithContext({
          systemInstruction: system,
          userMessage: userText,
          history,
        });

        // ── 2. Insert assistant message and get real id back ──
        const { data: asstRow, error: asstInsertError } = await supabase
          .from("ai_chats")
          .insert({ user_id: authUser.id, role: "assistant", content: reply })
          .select("id, created_at")
          .single();

        if (asstInsertError) {
          console.error(
            "[useAIChat] assistant insert error:",
            asstInsertError.message,
          );
          throw asstInsertError;
        }

        const asst: ChatMessage = {
          id: asstRow.id, // ← real DB id
          role: "assistant",
          content: reply,
          createdAt: asstRow.created_at,
        };

        setMessages((m) => [...m, asst]);
      } finally {
        setLoading(false);
      }
    },
    [profile],
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
