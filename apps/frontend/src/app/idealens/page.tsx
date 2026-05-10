import { redirect } from "next/navigation";

/** Legacy CopilotKit route — standalone product lives at `/workspace`. */
export default function LegacyIdeaLensPage() {
  redirect("/workspace");
}
