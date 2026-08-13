import Link from "next/link";
import { getFeedItems, getWatchlist } from "@/lib/data";
import { FeedRefresh } from "@/app/components/feed-refresh";
import { FeedCard } from "@/app/components/feed-card";
import { WatchlistManager } from "@/app/components/watchlist-manager";

export const dynamic = "force-dynamic";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const [{ items, error }, watchlist] = await Promise.all([getFeedItems(), getWatchlist()]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feed inbox</h1>
        <p className="text-sm text-neutral-500">
          Live web-searched business &amp; commercial developments. Every item&apos;s source is
          verified before it lands here — approve the ones worth tracking or dismiss the rest.
        </p>
      </div>

      {saved && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          Saved {saved} item{Number(saved) === 1 ? "" : "s"} from your AI scan — review and approve
          below.
        </div>
      )}

      <FeedRefresh />

      <WatchlistManager topics={watchlist} />

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center">
          <h3 className="font-medium text-neutral-800">Your feed inbox is empty</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
            Click <strong>Refresh feed</strong> above to pull today&apos;s verified developments, then
            approve the ones worth tracking. Approved items appear on the{" "}
            <Link href="/" className="text-blue-600 hover:underline">
              dashboard
            </Link>
            .
          </p>
        </div>
      ) : (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-neutral-500">
            {items.length} awaiting review
          </h2>
          <ul className="space-y-2">
            {items.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
