import { ScanClient } from "./scan-client";

export const dynamic = "force-dynamic";

export default function ScanPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <ScanClient />
    </div>
  );
}
