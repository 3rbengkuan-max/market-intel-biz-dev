import Link from "next/link";
import { createIntelItem } from "@/app/actions";
import { IntelFormFields } from "@/app/components/intel-form";

export const dynamic = "force-dynamic";

export default async function NewIntelPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 mb-4 text-2xl font-bold tracking-tight">New intel item</h1>
      <form action={createIntelItem} className="rounded-lg border border-neutral-200 bg-white p-6">
        <IntelFormFields submitLabel="Create intel item" cancelHref="/" error={error} />
      </form>
    </div>
  );
}
