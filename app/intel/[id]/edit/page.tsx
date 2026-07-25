import Link from "next/link";
import { notFound } from "next/navigation";
import { getIntelItem } from "@/lib/data";
import { updateIntelItem } from "@/app/actions";
import { IntelFormFields } from "@/app/components/intel-form";

export const dynamic = "force-dynamic";

export default async function EditIntelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { item } = await getIntelItem(id);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/intel/${id}`} className="text-sm text-blue-600 hover:underline">
        ← Back to intel item
      </Link>
      <h1 className="mt-2 mb-4 text-2xl font-bold tracking-tight">Edit intel item</h1>
      <form
        action={updateIntelItem.bind(null, id)}
        className="rounded-lg border border-neutral-200 bg-white p-6"
      >
        <IntelFormFields
          item={item}
          submitLabel="Save changes"
          cancelHref={`/intel/${id}`}
          error={error}
        />
      </form>
    </div>
  );
}
