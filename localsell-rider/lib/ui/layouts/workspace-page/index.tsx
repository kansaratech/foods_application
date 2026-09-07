import { ReactNode } from "react";
export interface WorkspacePageProps {
  title: string;
  description: string;
  compact?: boolean;
  children: ReactNode;
}
export default function WorkspacePage({ children }: WorkspacePageProps) {
  return <>{children}</>;
}
