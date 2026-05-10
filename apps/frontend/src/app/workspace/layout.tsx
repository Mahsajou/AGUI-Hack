import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workspace | IdeaLens",
  description: "Paste a product idea — research and design lenses",
};

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
