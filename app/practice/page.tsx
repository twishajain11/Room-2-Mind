import Link from "next/link";
import PracticeRoom from "@/components/PracticeRoom";
import { FACTORS, type FactorKey } from "@/lib/scoring/weights";

export const metadata = {
  title: "Practice — Room to Mind",
  description:
    "Six short traditional practices for when the load is high and the room cannot be changed right now.",
};

export default function PracticePage({
  searchParams,
}: {
  searchParams: { for?: string };
}) {
  // The result page links here with the factor that dominated the score.
  const requested = searchParams.for;
  const suggestedFor =
    requested && (FACTORS as readonly string[]).includes(requested)
      ? (requested as FactorKey)
      : null;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <Link href="/" className="text-xs uppercase tracking-[0.2em] text-muted hover:text-ink">
        Room to Mind
      </Link>
      <div className="mt-10">
        <PracticeRoom suggestedFor={suggestedFor} />
      </div>
    </main>
  );
}
