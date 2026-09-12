"use client";

import { useRouter } from "next/navigation";
import { wisOntgrendeld } from "./ontgrendel-gate";

export default function UitloggenKnop({ className }: { className?: string }) {
  const router = useRouter();

  async function uitloggen() {
    await fetch("/api/auth/logout", { method: "POST" });
    wisOntgrendeld();
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={uitloggen} className={className}>
      Uitloggen
    </button>
  );
}
