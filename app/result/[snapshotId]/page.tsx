import ResultLoader from "@/components/ResultLoader";

export const metadata = { title: "Result · Room to Mind" };

export default function ResultPage({ params }: { params: { snapshotId: string } }) {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 lg:py-14">
      <ResultLoader id={params.snapshotId} />
    </main>
  );
}
