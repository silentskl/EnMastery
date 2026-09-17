"use client";

import { usePathname, useRouter } from "next/navigation";

export function RouteBackButton({ sectionRoot }: { sectionRoot: string }) {
  const pathname = usePathname();
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(pathname === sectionRoot ? "/" : sectionRoot);
  }

  return (
    <nav className="routeBackNav" aria-label="Page navigation">
      <button className="button ghost routeBackButton" type="button" onClick={goBack}>
        <span aria-hidden="true">←</span> Back
      </button>
    </nav>
  );
}
