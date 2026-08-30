import CalibrateFlow from "@/components/CalibrateFlow";

export const metadata = {
  title: "Help calibrate Room to Mind",
  description:
    "One photo, five questions, about a minute. The photo is read in your browser and never uploaded.",
};

export default function CalibratePage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10 lg:py-14">
      <CalibrateFlow />
    </main>
  );
}
