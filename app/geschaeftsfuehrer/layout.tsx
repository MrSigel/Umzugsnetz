import CEOLayout from '@/components/geschaeftsfuehrer/CEOLayout';

export default function CEODashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CEOLayout>{children}</CEOLayout>;
}
