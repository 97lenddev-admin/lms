import Image from "next/image";

const reminders = [
  {
    title: "Payment intake cutoff",
    description:
      "Daily payment and release entries must be submitted before 5:00 PM.",
    icon: "/log-in/clock-warning.svg",
    iconBackground: "bg-[#fefce8]",
  },
  {
    title: "Forwarding window",
    description:
      "Daily payment and release entries must be submitted before 5:00 PM.",
    icon: "/log-in/send.svg",
    iconBackground: "bg-[#eff6ff]",
  },
  {
    title: "Late payment policy",
    description:
      "Penalties apply to any payment made after the 60-day contract period.",
    icon: "/log-in/clock-error.svg",
    iconBackground: "bg-[#fef2f2]",
  },
];

export default function DesktopReminders() {
  return (
    <aside className="desktop-reminders min-h-screen flex-1 flex-col justify-center gap-6 bg-[#fafafa] p-12">
      <div className="mx-auto w-full max-w-[640px]">
        <h2 className="mb-6 text-4xl font-medium leading-[44px] tracking-[-0.72px] text-[#404040]">
          Daily Reminders
        </h2>

        <div className="flex flex-col gap-4">
          {reminders.map((reminder) => (
            <article
              className="flex items-start gap-4 rounded-xl border border-black/10 bg-white p-4 shadow-[0_12px_16px_-4px_rgba(0,0,0,0.08),0_4px_6px_-2px_rgba(0,0,0,0.03),0_2px_2px_-1px_rgba(0,0,0,0.04)]"
              key={reminder.title}
            >
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#d4d4d4] shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_-2px_0_rgba(0,0,0,0.05)] ${reminder.iconBackground}`}
              >
                <Image
                  src={reminder.icon}
                  alt=""
                  width={20}
                  height={20}
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0 pr-8 text-sm leading-5">
                <h3 className="font-semibold text-[#171717]">
                  {reminder.title}
                </h3>
                <p className="mt-1 text-[#6b7280]">{reminder.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </aside>
  );
}
