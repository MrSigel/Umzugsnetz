import Link from 'next/link';

type NavItem = {
  label: string;
  description: string;
  href: string;
};

type AppShellProps = {
  title: string;
  description: string;
  nav: ReadonlyArray<NavItem>;
  children?: React.ReactNode;
};

export function AppShell({ title, description, nav, children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">CRM</p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{description}</p>

          <nav className="mt-8 space-y-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-2xl border border-slate-200 px-4 py-3 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <p className="text-sm font-bold text-slate-900">{item.label}</p>
                <p className="mt-1 text-xs text-slate-500">{item.description}</p>
              </Link>
            ))}
          </nav>
        </aside>

        <section className="space-y-6">{children}</section>
      </div>
    </main>
  );
}
