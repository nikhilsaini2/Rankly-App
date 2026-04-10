import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { generateGeminiWithContext } from "../services/gemini/gemini";
import { buildCareerCoachSystemPrompt } from "../services/gemini/prompts";
import { supabase } from "../services/supabase/supabase";
import type { ChatMessage, User } from "../types/common.types";
import { isGreeting, RANKLY_GREETING } from "../utils/greetingDetection";

function makeErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes("503") ||
    lower.includes("high demand") ||
    lower.includes("overloaded")
  ) {
    return "⚠️ Gemini is experiencing high demand right now. Please try again in a moment.";
  }
  if (
    lower.includes("429") ||
    lower.includes("quota") ||
    lower.includes("rate limit")
  ) {
    return "⚠️ AI request limit reached. Please wait a minute and try again.";
  }
  if (lower.includes("network") || lower.includes("fetch failed")) {
    return "⚠️ Network error. Please check your connection and try again.";
  }
  return "⚠️ Something went wrong. Please try again.";
}

export function useAIChat(profile: User | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    setReady(false);

    (async () => {
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
      if (error) console.error("[useAIChat] fetch error:", error.message);

      const mapped = (data ?? []).map((r) => ({
        id: r.id as string,
        role: r.role as "user" | "assistant",
        content: r.content as string,
        createdAt: r.created_at as string,
      }));

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

      // ── 2. Optimistically add user message to UI only (no DB yet) ──
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

        // ── 3. Call AI first, save to DB only on success ──
        const reply = await generateGeminiWithContext({
          systemInstruction: system,
          userMessage: userText,
          history,
        });

        // ── 4. Save both messages to DB now that we have a reply ──
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

        // ── 5. Replace temp message with real DB ids ──
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== tempUserMsgId)
            .concat([
              {
                id: userRow.id,
                role: "user",
                content: userText,
                createdAt: userRow.created_at,
              },
              {
                id: asstRow.id,
                role: "assistant",
                content: reply,
                createdAt: asstRow.created_at,
              },
            ]),
        );
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsgId));
        setLoading(false); // must set before Alert so UI unfreezes
        Alert.alert("Gemini 503 Error", makeErrorMessage(err), [
          { text: "OK", style: "cancel" },
          { text: "Retry", onPress: () => send(userText) },
        ]);
        console.error("[useAIChat] send error:", err);
        return; // prevent finally from running setLoading again
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
