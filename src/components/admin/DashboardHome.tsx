interface Props {
  tenantName: string;
  tenantSlug: string;
}

export default function DashboardHome({ tenantName, tenantSlug }: Props) {
  return (
    <section className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Signed in to <span className="font-medium text-zinc-900">{tenantName}</span>
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        <li className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm font-medium">Public site</p>
          <a className="mt-2 inline-block text-sm text-zinc-600 underline" href={`/${tenantSlug}`}>
            /{tenantSlug}
          </a>
        </li>
        <li className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm font-medium">Pages</p>
          <a className="mt-2 inline-block text-sm text-zinc-600 underline" href="/admin/pages">
            Edit homepage
          </a>
        </li>
        <li className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm font-medium">Theme</p>
          <a className="mt-2 inline-block text-sm text-zinc-600 underline" href="/admin/settings/theme">
            Edit colors
          </a>
        </li>
      </ul>
    </section>
  );
}
