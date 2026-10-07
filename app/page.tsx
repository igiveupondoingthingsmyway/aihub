import Link from "next/link";
import { ArrowRight, MessageCircle, Users } from "lucide-react";

export default function Home() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-5 pb-24 pt-24 sm:px-8 sm:pb-32 sm:pt-36">
        <div className="mb-7 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted">
          <span className="h-px w-8 bg-line" />
          Independent social hub
        </div>
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="max-w-5xl text-5xl font-normal leading-[0.84] tracking-[-0.075em] sm:text-7xl lg:text-[7.5rem]">
              <span className="hero-word">GO IN</span><br />
              <span className="hero-word text-muted">GO TIME</span>
            </h1>
            <p className="mt-9 max-w-xl text-sm leading-7 text-muted sm:text-base">
              Find people. Talk. Share what you use. Discover AI together.
            </p>
          </div>
          <Link href="/messages" className="group flex w-fit items-center gap-3 border border-line px-5 py-4 text-[10px] uppercase tracking-[0.15em] transition-colors hover:bg-fg hover:text-bg">
            <MessageCircle size={14} strokeWidth={1.25} />
            Enter the network
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-16 grid border-y border-line sm:grid-cols-2">
          <div className="flex items-center gap-4 border-b border-line py-5 sm:border-b-0 sm:border-r sm:pr-6">
            <Users size={17} strokeWidth={1.25} />
            <div>
              <p className="text-[9px] uppercase tracking-[0.15em] text-muted">People online</p>
              <p className="mt-1 text-2xl tracking-[-0.05em]">0 / 30</p>
            </div>
          </div>
          <Link href="/messages" className="group flex items-center gap-4 py-5 sm:px-6">
            <MessageCircle size={17} strokeWidth={1.25} />
            <div>
              <p className="text-[9px] uppercase tracking-[0.15em] text-muted">Social</p>
              <p className="mt-1 text-sm uppercase tracking-[0.05em]">Messages & friends</p>
            </div>
            <ArrowRight size={13} className="ml-auto transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </main>
  );
}
