import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import type { ResumeRow } from '../types/common.types';
import { supabase } from '../services/supabase/supabase';
import { MAX_FREE_RESUMES } from '../constants/options';

const BUCKET = 'resumes';

export function useResumeUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function pickResume() {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return null;
    return res.assets[0];
  }

  async function uploadResume(file: DocumentPicker.DocumentPickerAsset) {
    setError(null);
    setUploading(true);
    setProgress(0.1);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const [{ count }, { data: urow }] = await Promise.all([
        supabase
          .from('resumes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase.from('users').select('plan').eq('auth_id', user.id).maybeSingle(),
      ]);

      const plan = (urow?.plan as string) ?? 'free';
      const max = plan === 'pro' ? 999 : MAX_FREE_RESUMES;
      if ((count ?? 0) >= max) {
        throw new Error('Free plan allows 3 resumes. Delete one to upload another.');
      }

      const name = file.name ?? 'resume.pdf';
      const path = `${user.id}/${Date.now()}_${name}`;
      setProgress(0.4);

      const fileRes = await fetch(file.uri);
      const blob = await fileRes.blob();

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: 'application/pdf', upsert: false });

      if (upErr) throw upErr;
      setProgress(0.8);

      const title = name.replace(/\.pdf$/i, '') || 'My Resume';

      const { data: row, error: insErr } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          title,
          file_url: path,
          file_name: name,
          raw_text: null,
        })
        .select()
        .single();

      if (insErr) throw insErr;

      setProgress(1);
      return mapResume(row as Record<string, unknown>);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      setError(msg);
      throw e;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 650);
    }
  }

  async function deleteResume(resumeId: string, storagePath: string | null) {
    setError(null);
    try {
      if (storagePath) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
      }
      const { error: delErr } = await supabase.from('resumes').delete().eq('id', resumeId);
      if (delErr) throw delErr;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      setError(msg);
      throw e;
    }
  }

  return { uploading, progress, error, pickResume, uploadResume, deleteResume };
}

function mapResume(r: Record<string, unknown>): ResumeRow {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    title: r.title as string,
    fileUrl: (r.file_url as string) ?? null,
    fileName: (r.file_name as string) ?? null,
    rawText: (r.raw_text as string) ?? null,
    isPrimary: Boolean(r.is_primary),
    createdAt: r.created_at as string,
  };
}
