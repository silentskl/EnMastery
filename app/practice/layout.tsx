import type { ReactNode } from "react";
import { RouteBackButton } from "@/components/route-back-button";

export default function PracticeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RouteBackButton sectionRoot="/practice" />
      {children}
    </>
  );
}
