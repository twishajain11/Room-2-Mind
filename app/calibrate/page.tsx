import CalibrateFlow from "@/components/CalibrateFlow";

export const metadata = {
  title: "Help calibrate Room to Mind",
  description:
    "One photo, five questions, about a minute. The photo is read in your browser and never uploaded.",
};

export default function CalibratePage() {
  return (
    <main className="mx-auto min-h-screen max-w-reading px-5 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Room to Mind</p>
      <CalibrateFlow />
    </main>
  );
}
