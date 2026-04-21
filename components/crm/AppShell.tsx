type AppShellProps = {
  title: string;
  description: string;
  items: ReadonlyArray<{ label: string; description: string }>;
};

export function AppShell({ title, description, items }: AppShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">CRM</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.label}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-bold text-slate-900">{item.label}</h2>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
