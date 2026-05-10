import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design system setup | IdeaLens",
  description: "Connect Figma so the design agent can ground concepts in your library",
};

export default function DesignSystemSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
