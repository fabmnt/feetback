import { DashboardIssueDetail } from "./issue-detail";

export const metadata = {
  title: "Feedback Issue | Feetback",
};

export default async function DashboardIssuePage({
  params,
}: {
  params: Promise<{ issueId: string }>;
}) {
  const { issueId } = await params;

  return <DashboardIssueDetail issueId={issueId} />;
}
