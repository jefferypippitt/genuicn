import { RightRailTarget } from "@/lib/right-rail";

export default function ReadingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-1 gap-6 p-6">
      <div className="flex min-w-0 flex-1 justify-center">
        <div className="flex w-full max-w-4xl flex-col py-10">{children}</div>
      </div>
      <aside aria-label="Page tools" className="hidden w-72 shrink-0 xl:block">
        <div className="sticky top-6 flex flex-col gap-4 py-10">
          <RightRailTarget />
        </div>
      </aside>
    </div>
  );
}
