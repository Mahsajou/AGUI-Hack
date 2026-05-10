import { CopilotKitProviderShell } from "@/components/copilot/CopilotKitProviderShell";
import "@copilotkit/react-core/v2/styles.css";

/**
 * CopilotKit is scoped to lead-triage (and any future routes that need the
 * runtime). Standalone IdeaLens at /workspace does not load this layout.
 */
export default function LeadsCopilotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CopilotKitProviderShell>{children}</CopilotKitProviderShell>;
}
