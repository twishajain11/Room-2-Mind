import CaptureFlow from "@/components/CaptureFlow";

export const metadata = { title: "Snapshot — Room to Mind" };

export default function CapturePage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10 lg:py-14">
      <CaptureFlow />
    </main>
  );
}
