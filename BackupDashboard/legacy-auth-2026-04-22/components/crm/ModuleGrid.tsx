import Link from 'next/link';

type ModuleItem = {
  label: string;
  description: string;
  href: string;
};

export function ModuleGrid({
  eyebrow,
  title,
  description,
  items,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: ReadonlyArray<ModuleItem>;
}) {
  return (
    <>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-bold text-slate-900">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <h3 className="text-lg font-bold text-slate-900">{item.label}</h3>
            <p className="mt-2 text-sm text-slate-600">{item.description}</p>
          </Link>
        ))}
      </section>
    </>
  );
}
