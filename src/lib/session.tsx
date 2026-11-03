"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Analysis, Answer, Job, Resume, ReviewFlag, Scores, TemplateId } from "./schema";

/**
 * Client-side workflow state. Persisted to sessionStorage only (cleared when
 * the tab closes); nothing reaches the server database unless a signed-in user clicks Save.
 */
export interface Session {
  cvText: string;
  cvFileName: string;
  documentId: string | null;
  jdText: string;
  jdFileName: string;
  original: Resume | null;
  job: Job | null;
  analysis: Analysis | null;
  scores: Scores | null;
  flags: ReviewFlag[];
  answers: Answer[];
  tailored: Resume | null;
  template: TemplateId;
  savedId: string | null;
  title: string;
}

export const initialSession: Session = {
  cvText: "",
  cvFileName: "",
  documentId: null,
  jdText: "",
  jdFileName: "",
  original: null,
  job: null,
  analysis: null,
  scores: null,
  flags: [],
  answers: [],
  tailored: null,
  template: "modern",
  savedId: null,
  title: "",
};

const KEY = "cv-tailor:session:v1";

interface Ctx {
  session: Session;
  ready: boolean;
  update: (patch: Partial<Session> | ((s: Session) => Partial<Session>)) => void;
  reset: () => void;
}

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(initialSession);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage once on mount
      if (raw) setSession({ ...initialSession, ...JSON.parse(raw) });
    } catch {
      /* corrupted storage: start fresh */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify(session));
    } catch {
      /* quota exceeded: state still lives in memory */
    }
  }, [session, ready]);

  const update = useCallback<Ctx["update"]>((patch) => {
    setSession((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  }, []);

  const reset = useCallback(() => {
    sessionStorage.removeItem(KEY);
    setSession(initialSession);
  }, []);

  const value = useMemo(() => ({ session, ready, update, reset }), [session, ready, update, reset]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
