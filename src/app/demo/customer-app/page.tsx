export const metadata = {
  title: "Demo Customer App | Feetback",
};

export default function DemoCustomerAppPage() {
  return (
    <main className="min-h-screen bg-[#f4f2ec] text-[#18201f]">
      <script
        id="feetback-settings"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Demo Customer App needs a literal preload settings snippet.
        dangerouslySetInnerHTML={{
          __html: `
          window.FeetbackSettings = {
            clientKey: "demo_customer_app",
            apiUrl: "/api/feedback",
            reporterIdentity: {
              id: "reporter_123",
              email: "reporter@example.com",
              name: "Demo Reporter"
            },
            feedbackButton: {
              enabled: true,
              position: "bottom-right"
            }
          };
        `,
        }}
      />
      <script src="/feetback.js" />
      <script
        id="feetback-demo-controls"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Demo Customer App wires a simple native control to the embedded API.
        dangerouslySetInnerHTML={{
          __html: `
          document.addEventListener("click", (event) => {
            if (!event.target.closest("[data-open-feetback]")) {
              return;
            }

            window.feetback?.open();
          });
        `,
        }}
      />

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-6 md:grid-cols-[240px_1fr] md:px-8">
        <aside className="rounded-lg border border-[#d9d3c5] bg-[#fffdf8] p-4">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-[#1f8d80]">
              Customer App
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Acme Console</h1>
          </div>
          <nav className="grid gap-2 text-sm font-medium text-[#4f5a57]">
            <span className="rounded-md bg-[#123b36] px-3 py-2 text-white">
              Overview
            </span>
            <span className="px-3 py-2">Customers</span>
            <span className="px-3 py-2">Reports</span>
            <span className="px-3 py-2">Settings</span>
          </nav>
        </aside>

        <section className="grid gap-6">
          <header className="flex flex-col gap-4 rounded-lg border border-[#d9d3c5] bg-[#fffdf8] p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1f8d80]">
                Quarterly health
              </p>
              <h2 className="mt-1 text-3xl font-semibold">
                Retention workspace
              </h2>
            </div>
            <button
              className="min-h-11 rounded-md bg-[#123b36] px-4 font-semibold text-white shadow-sm transition hover:bg-[#0d2f2b]"
              data-open-feetback
              type="button"
            >
              Open Feetback
            </button>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="rounded-lg border border-[#d9d3c5] bg-[#fffdf8] p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">Accounts at risk</h3>
                  <p className="text-sm text-[#65706d]">
                    A dense surface for testing element selection.
                  </p>
                </div>
                <button
                  className="rounded-md border border-[#cfc7b7] px-3 py-2 text-sm font-semibold"
                  type="button"
                >
                  Export
                </button>
              </div>

              <div className="overflow-hidden rounded-lg border border-[#d9d3c5]">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-[#ece7dc] text-[#4f5a57]">
                    <tr>
                      <th className="p-3 font-semibold">Account</th>
                      <th className="p-3 font-semibold">Owner</th>
                      <th className="p-3 font-semibold">Risk</th>
                      <th className="p-3 font-semibold">Next step</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e6dfd1]">
                    {[
                      [
                        "Northstar Labs",
                        "Mina",
                        "High",
                        "Schedule renewal review",
                      ],
                      ["Cobalt Bank", "Eli", "Medium", "Confirm rollout date"],
                      ["Atlas Studio", "Rae", "Low", "Send feature notes"],
                    ].map(([account, owner, risk, step]) => (
                      <tr key={account}>
                        <td className="p-3 font-semibold">{account}</td>
                        <td className="p-3">{owner}</td>
                        <td className="p-3">{risk}</td>
                        <td className="p-3">{step}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="grid gap-6">
              <section className="rounded-lg border border-[#d9d3c5] bg-[#fffdf8] p-5">
                <h3 className="text-lg font-semibold">Private billing note</h3>
                <p className="mt-2 text-sm text-[#65706d]">
                  This block uses a Privacy Mask marker.
                </p>
                <div
                  className="mt-4 rounded-md bg-[#efe6d0] p-3 text-sm"
                  data-feetback-mask
                >
                  Card ending 4242, renewal quote $18,400, internal discount
                  approved.
                </div>
              </section>

              <section className="rounded-lg border border-[#d9d3c5] bg-[#fffdf8] p-5">
                <h3 className="text-lg font-semibold">Workflow controls</h3>
                <div className="mt-4 grid gap-2">
                  <button
                    className="rounded-md border border-[#cfc7b7] px-3 py-2 text-left text-sm"
                    type="button"
                  >
                    Reassign owner
                  </button>
                  <button
                    className="rounded-md border border-[#cfc7b7] px-3 py-2 text-left text-sm"
                    type="button"
                  >
                    Create follow-up
                  </button>
                  <button
                    className="rounded-md border border-[#cfc7b7] px-3 py-2 text-left text-sm"
                    type="button"
                  >
                    Mark reviewed
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
