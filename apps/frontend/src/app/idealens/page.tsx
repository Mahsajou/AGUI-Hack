"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { Toaster, toast } from "sonner";
import {
  CopilotChatConfigurationProvider,
  CopilotSidebar,
  useAgent,
  useConfigureSuggestions,
  useCopilotKit,
  useDefaultRenderTool,
  useFrontendTool,
} from "@copilotkit/react-core/v2";
import { Binoculars, Sparkles } from "lucide-react";

import { ThreadsDrawer } from "@/components/threads-drawer";
import drawerStyles from "@/components/threads-drawer/threads-drawer.module.css";
import { AssumptionMap } from "@/components/idealens/AssumptionMap";
import { ConceptSketch } from "@/components/idealens/ConceptSketch";
import { ToolFallbackCard } from "@/components/copilot/ToolFallbackCard";

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

const assumptionShape = z.object({
  assumptions: z
    .array(
      z.object({
        text: z.string(),
        confidence: z.enum(["known", "guessing", "unknown"]),
      }),
    )
    .optional()
    .default([]),
  open_questions: z.array(z.string()).optional().default([]),
  risk_flags: z.array(z.string()).optional().default([]),
});

const conceptShape = z.object({
  concept_name: z.string().optional(),
  primary_surface: z.string().optional(),
  components_used: z.array(z.string()).optional().default([]),
  user_flow: z.array(z.string()).optional().default([]),
  key_interactions: z.array(z.string()).optional().default([]),
  open_design_questions: z.array(z.string()).optional().default([]),
});

function IdeaLensInner() {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  const [idea, setIdea] = useState("");

  useConfigureSuggestions({
    available: "before-first-message",
    suggestions: [
      {
        title: "Async alignment before Figma",
        message:
          "Run IdeaLens on: An async tool for product teams to align on new feature ideas before Figma.",
      },
      {
        title: "Onboarding checklist",
        message:
          "Run IdeaLens on: A guided onboarding checklist that adapts per role (PM, design, eng).",
      },
    ],
  });

  const injectPrompt = useCallback(
    (prompt: string) => {
      if (!agent) return;
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `msg-${Date.now()}`;
      agent.addMessage({ id, role: "user", content: prompt });
      void copilotkit.runAgent({ agent }).catch((error: unknown) => {
        console.error("IdeaLens runAgent failed", error);
        let hint: string | undefined;
        if (error && typeof error === "object") {
          const anyErr = error as Record<string, unknown>;
          if (typeof anyErr.hint === "string") hint = anyErr.hint;
        }
        if (hint) toast.error(hint, { duration: 8000 });
      });
    },
    [agent, copilotkit],
  );

  useFrontendTool({
    name: "render_assumption_map",
    description:
      "Render the UX research assumption map inline in chat. Pass the full assumption_map JSON from ideal_lens_run.",
    parameters: assumptionShape,
    handler: async () => "assumption map rendered",
    render: ({ args }) => <AssumptionMap data={args} />,
  });

  useFrontendTool({
    name: "render_concept_sketch",
    description:
      "Render the UX design concept sketch inline in chat. Pass the full concept_sketch JSON from ideal_lens_run.",
    parameters: conceptShape,
    handler: async () => "concept sketch rendered",
    render: ({ args }) => <ConceptSketch data={args} />,
  });

  useDefaultRenderTool({
    render: ({ name, status, result, parameters }) => (
      <ToolFallbackCard
        name={name}
        status={status}
        result={result}
        parameters={parameters}
      />
    ),
  });

  const runLens = () => {
    const text = idea.trim();
    if (!text) {
      toast.message("Paste an idea first.");
      return;
    }
    injectPrompt(
      `Run IdeaLens on this product idea. Call ideal_lens_run with the full text, then render both widgets.\n\n---\n\n${text}`,
    );
  };

  return (
    <>
      <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto bg-background px-6 py-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
            <Link
              href="/leads"
              className="text-xs font-medium uppercase tracking-wide hover:text-foreground"
            >
              ← Lead triage
            </Link>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/25">
              <Binoculars className="size-5 text-violet-600 dark:text-violet-300" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                IdeaLens
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Paste a raw idea — a researcher and a designer run in parallel on
                the server, then two generative UI widgets render in the sidebar.
              </p>
            </div>
          </div>

          <label className="mt-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Product idea
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={6}
              placeholder="e.g. An async tool for product teams to align on new feature ideas before Figma…"
              className="mt-2 w-full resize-y rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runLens}
              className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              <Sparkles className="size-4" />
              Analyze with IdeaLens
            </button>
            <p className="text-xs text-muted-foreground">
              Opens the assistant with your idea — watch both widgets appear in the
              chat.
            </p>
          </div>
        </div>
      </main>

      <CopilotSidebar
        defaultOpen
        width={440}
        input={{ disclaimer: () => null, className: "pb-6" }}
      />

      <Toaster position="bottom-right" />
    </>
  );
}

function IdeaLensPage() {
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  return (
    <div className={drawerStyles.layout}>
      <ThreadsDrawer
        agentId="idealens"
        threadId={threadId}
        onThreadChange={setThreadId}
      />
      <div className={drawerStyles.mainPanel}>
        <CopilotChatConfigurationProvider agentId="idealens" threadId={threadId}>
          <IdeaLensInner />
        </CopilotChatConfigurationProvider>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ClientOnly>
      <IdeaLensPage />
    </ClientOnly>
  );
}
