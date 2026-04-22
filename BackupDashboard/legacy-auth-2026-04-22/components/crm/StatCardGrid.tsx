type StatCard = {
  label: string;
  value: string;
  hint: string;
};

export function StatCardGrid({ items }: { items: ReadonlyArray<StatCard> }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article key={item.label} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
          <p className="mt-3 text-3xl font-black text-slate-900">{item.value}</p>
          <p className="mt-2 text-sm text-slate-600">{item.hint}</p>
        </article>
      ))}
    </section>
  );
}
