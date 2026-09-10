export default function FeaturePlaceholder({ title, description }) {
  return (
    <section className="card p-6 sm:p-8">
      <div className="dashboard-eyebrow">Portal module</div>
      <h1 className="mt-2 text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{description}</p>
      <div className="mt-6 border border-dashed border-line bg-[#f8fafb] px-4 py-3 text-xs text-muted">
        This module is visible in the navigation and ready for its data workflow to be connected.
      </div>
    </section>
  );
}
