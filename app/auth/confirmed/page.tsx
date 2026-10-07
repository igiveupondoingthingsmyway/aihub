import Link from "next/link";
import { Check, ArrowRight, AlertCircle } from "lucide-react";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ConfirmedPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = params.error === "1";

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-6xl items-center px-5 py-16 sm:px-8">
      <div className="w-full max-w-md">
        <div className="mb-10 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted">
          <span className="h-px w-8 bg-line" />
          Account / Confirmation
        </div>

        {error ? (
          <>
            <AlertCircle size={30} strokeWidth={1.25} />
            <h1 className="mt-7 text-4xl tracking-[-0.05em] sm:text-5xl">CONFIRMATION FAILED.</h1>
            <p className="mt-4 text-sm leading-7 text-muted">
              This confirmation link is invalid or has expired. Try signing up again or request a new confirmation email.
            </p>
            <Link href="/signup" className="mt-8 flex h-12 items-center justify-center gap-3 bg-fg text-bg text-[11px] uppercase tracking-[0.12em]">
              Back to sign up <ArrowRight size={15} />
            </Link>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center border border-line">
              <Check size={22} strokeWidth={1.25} />
            </div>
            <h1 className="mt-7 text-4xl tracking-[-0.05em] sm:text-5xl">EMAIL VERIFIED.</h1>
            <p className="mt-4 text-sm leading-7 text-muted">
              Your AI Hub account is confirmed and ready to use.
            </p>
            <Link href="/profile" className="mt-8 flex h-12 items-center justify-center gap-3 bg-fg text-bg text-[11px] uppercase tracking-[0.12em]">
              Go to profile <ArrowRight size={15} />
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
