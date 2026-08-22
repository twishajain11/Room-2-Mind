import Link from "next/link";
import CaptureFlow from "@/components/CaptureFlow";

export const metadata = { title: "Snapshot — Room to Mind" };

export default function CapturePage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <Link href="/" className="text-xs uppercase tracking-[0.2em] text-muted hover:text-ink">
        Room to Mind
      </Link>
      <CaptureFlow />
    </main>
  );
}
