"use client";

import Image from "next/image";

type NavigationProps = {
  active: "submissions" | "application";
  mobileOpen: boolean;
  onClose: () => void;
  onNavigate: (target: "submissions" | "application") => void;
};

function Logo() {
  return (
    <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-white/10 bg-[#e11d48] shadow-[0_2px_3px_-1px_rgba(42,42,42,0.14),0_1px_1px_rgba(42,42,42,0.08),inset_0_0_0_1px_rgba(0,0,0,0.2)]">
      <Image src="/credit-analyst/icons/logo-mark.svg" alt="QVDS" width={27} height={27} />
    </div>
  );
}

function NavigationContent({ active, onNavigate, showLogo = true }: Pick<NavigationProps, "active" | "onNavigate"> & { showLogo?: boolean }) {
  return (
    <>
      <div className="flex flex-col gap-5 p-5">
        {showLogo ? <Logo /> : null}
        <label className="flex h-9 items-center gap-2 rounded-lg border border-[#d4d4d4] px-3 text-sm text-[#737373] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <Image src="/credit-analyst/icons/nav-search.svg" alt="" width={16} height={16} />
          <input className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Search" />
        </label>
      </div>

      <nav className="flex flex-col gap-1 px-4">
        <button
          onClick={() => onNavigate("submissions")}
          className={`flex h-10 items-center gap-3 rounded-md px-3 text-left text-sm font-semibold ${active === "submissions" ? "bg-[#fafafa] text-[#171717]" : "text-[#404040] hover:bg-[#fafafa]"}`}
        >
          <Image src="/credit-analyst/icons/list.svg" alt="" width={20} height={20} />
          My submissions
        </button>
        <button
          onClick={() => onNavigate("application")}
          className={`flex h-10 items-center gap-3 rounded-md px-3 text-left text-sm font-semibold ${active === "application" ? "bg-[#fafafa] text-[#171717]" : "text-[#404040] hover:bg-[#fafafa]"}`}
        >
          <Image src="/credit-analyst/icons/nav-plus.svg" alt="" width={20} height={20} />
          New application
        </button>
      </nav>

      <div className="mt-auto p-4">
        <div className="flex items-center gap-3 rounded-xl border border-[#e5e5e5] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="relative">
            <Image className="size-10 rounded-full object-cover" src="/credit-analyst/avatar-figma.png" alt="Juan Dela Cruz" width={40} height={40} />
            <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-[#22c55e]" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold text-[#171717]">Juan Dela Cruz</p>
            <p className="truncate text-sm text-[#525252]">Credit Analyst</p>
          </div>
          <Image src="/credit-analyst/icons/logout.svg" alt="" width={20} height={20} />
        </div>
      </div>
    </>
  );
}

export function DesktopNavigation(props: NavigationProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[280px] flex-col border-r border-[#e5e5e5] bg-white lg:flex">
      <NavigationContent active={props.active} onNavigate={props.onNavigate} />
    </aside>
  );
}

export function MobileHeader({ onOpen }: { onOpen: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#e5e5e5] bg-white px-4 lg:hidden">
      <Logo />
      <button onClick={onOpen} aria-label="Open navigation menu" className="flex size-9 items-center justify-center rounded-lg hover:bg-[#fafafa]"><Image src="/credit-analyst/icons/menu.svg" alt="" width={20} height={20} /></button>
    </header>
  );
}

export function MobileNavigation(props: NavigationProps) {
  if (!props.mobileOpen) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button aria-label="Close navigation menu" className="absolute inset-0 bg-black/40" onClick={props.onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-[min(320px,88vw)] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e5e5e5] p-4">
          <Logo />
          <button onClick={props.onClose} aria-label="Close navigation menu" className="size-10 rounded-lg text-2xl text-[#737373] hover:bg-[#fafafa]">×</button>
        </div>
        <NavigationContent active={props.active} onNavigate={props.onNavigate} showLogo={false} />
      </aside>
    </div>
  );
}

type InvestigatorNavigationProps = {
  active: "review" | "forwarded";
  mobileOpen: boolean;
  onClose: () => void;
  onNavigate: (target: "review" | "forwarded") => void;
};

function InvestigatorNavigationContent({ active, onNavigate, showLogo = true }: Pick<InvestigatorNavigationProps, "active" | "onNavigate"> & { showLogo?: boolean }) {
  return <>{<div className="flex flex-col gap-5 p-5">{showLogo && <Logo />}<label className="flex h-9 items-center gap-2 rounded-lg border border-[#d4d4d4] px-3 text-sm text-[#737373] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"><Image src="/credit-analyst/icons/nav-search.svg" alt="" width={16} height={16} /><input className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Search" /></label></div>}<nav className="flex flex-col gap-1 px-4"><button onClick={() => onNavigate("review")} className={`flex h-10 items-center gap-3 rounded-md px-3 text-left text-sm font-semibold ${active === "review" ? "bg-[#fafafa] text-[#171717]" : "text-[#404040] hover:bg-[#fafafa]"}`}><Image src="/credit-analyst/icons/list.svg" alt="" width={20} height={20} />To Review</button><button onClick={() => onNavigate("forwarded")} className={`flex h-10 items-center gap-3 rounded-md px-3 text-left text-sm font-semibold ${active === "forwarded" ? "bg-[#fafafa] text-[#171717]" : "text-[#404040] hover:bg-[#fafafa]"}`}><Image src="/credit-analyst/icons/upload-cloud.svg" alt="" width={20} height={20} />Forwarded</button></nav><div className="mt-auto p-4"><div className="flex items-center gap-3 rounded-xl border border-[#e5e5e5] p-3"><div className="relative"><Image className="size-10 rounded-full object-cover" src="/credit-analyst/avatar-figma.png" alt="Maria San Jose" width={40} height={40} /><span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-[#22c55e]" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">Maria San Jose</p><p className="truncate text-sm text-[#525252]">Credit Investigator</p></div><Image src="/credit-analyst/icons/logout.svg" alt="" width={20} height={20} /></div></div></>;
}

export function InvestigatorDesktopNavigation(props: InvestigatorNavigationProps) {
  return <aside className="fixed inset-y-0 left-0 z-20 hidden w-[280px] flex-col border-r border-[#e5e5e5] bg-white lg:flex"><InvestigatorNavigationContent active={props.active} onNavigate={props.onNavigate} /></aside>;
}

export function InvestigatorMobileNavigation(props: InvestigatorNavigationProps) {
  if (!props.mobileOpen) return null;
  return <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation menu" className="absolute inset-0 bg-black/40" onClick={props.onClose} /><aside className="absolute inset-y-0 right-0 flex w-[min(320px,88vw)] flex-col bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-[#e5e5e5] p-4"><Logo /><button onClick={props.onClose} aria-label="Close navigation menu" className="size-10 rounded-lg text-2xl text-[#737373]">×</button></div><InvestigatorNavigationContent active={props.active} onNavigate={props.onNavigate} showLogo={false} /></aside></div>;
}
