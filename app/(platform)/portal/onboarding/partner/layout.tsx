export default function PartnerOnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(2,118,200,0.16),transparent_38%),linear-gradient(135deg,#f8fafc,#eef4f8)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-start justify-center">
        {children}
      </div>
    </main>
  );
}
