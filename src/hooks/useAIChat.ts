import { useCallback, useEffect, useState } from 'react';
import type { ChatMessage } from '../types/common.types';
import type { User } from '../types/common.types';
import { generateGeminiWithContext } from '../services/gemini/gemini';
import { buildCareerCoachSystemPrompt } from '../services/gemini/prompts';
import { supabase } from '../services/supabase/supabase';

export function useAIChat(profile: User | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser || !alive) return;

      const { data } = await supabase
        .from('ai_chats')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (!alive) return;

      const mapped = (data ?? []).map((r) => ({
        id: r.id as string,
        role: r.role as 'user' | 'assistant',
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
      if (!authUser) throw new Error('Not signed in');

      const coachProfile: Pick<User, 'role' | 'experienceLevel' | 'industry'> = profile
        ? {
            role: profile.role,
            experienceLevel: profile.experienceLevel ?? null,
            industry: profile.industry ?? null,
          }
        : {
            role: 'Not specified',
            experienceLevel: null,
            industry: null,
          };

      const userMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        role: 'user',
        content: userText,
        createdAt: new Date().toISOString(),
      };

      let threadSnapshot: ChatMessage[] = [];
      setMessages((prev) => {
        threadSnapshot = [...prev, userMsg];
        return threadSnapshot;
      });

      setLoading(true);
      try {
        await supabase.from('ai_chats').insert({
          user_id: authUser.id,
          role: 'user',
          content: userText,
        });

        const system = buildCareerCoachSystemPrompt(coachProfile);
        const history = threadSnapshot.slice(-10).map((m) => ({
          role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
          text: m.content,
        }));

        const reply = await generateGeminiWithContext({
          systemInstruction: system,
          userMessage: userText,
          history,
        });

        await supabase.from('ai_chats').insert({
          user_id: authUser.id,
          role: 'assistant',
          content: reply,
        });

        const asst: ChatMessage = {
          id: `local-a-${Date.now()}`,
          role: 'assistant',
          content: reply,
          createdAt: new Date().toISOString(),
        };
        setMessages((m) => [...m, asst]);
      } finally {
        setLoading(false);
      }
    },
    [profile],
  );

  return { messages, loading, ready, send };
}
