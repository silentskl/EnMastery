import type { ReactNode } from "react";
import { RouteBackButton } from "@/components/route-back-button";

export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RouteBackButton sectionRoot="/learn" />
      {children}
    </>
  );
}
