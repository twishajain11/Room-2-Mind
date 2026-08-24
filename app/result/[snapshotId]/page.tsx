import Link from "next/link";
import ResultLoader from "@/components/ResultLoader";

export const metadata = { title: "Result — Room to Mind" };

export default function ResultPage({ params }: { params: { snapshotId: string } }) {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <Link href="/" className="text-xs uppercase tracking-[0.2em] text-muted hover:text-ink">
        Room to Mind
      </Link>
      <ResultLoader id={params.snapshotId} />
    </main>
  );
}
