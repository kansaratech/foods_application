import { Chart } from 'primereact/chart';
import { useTheme } from 'next-themes';
import { IPlatformFinanceReport } from '@/lib/utils/interfaces';

const amount = (value: number) =>
  `\u20b9${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export default function FinanceCharts({
  report,
}: {
  report: IPlatformFinanceReport;
}) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const text = dark ? '#cbd5e1' : '#7183a3';
  const vendors = [...report.perVendor]
    .sort((a, b) => b.commission - a.commission)
    .slice(0, 6);
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: { parsed: { x: number } }) =>
            amount(context.parsed.x),
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: dark ? '#334155' : '#edf2f8' },
        border: { display: false },
        ticks: {
          color: text,
          callback: (value: number | string) => amount(Number(value)),
        },
      },
      y: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: text, font: { size: 11 } },
      },
    },
  };
  return (
    <div className="finance-charts">
      <section className="finance-chart-card">
        <div className="finance-chart-heading">
          <span className="finance-chart-icon">
            <i className="pi pi-chart-bar" aria-hidden="true" />
          </span>
          <div>
            <h3>Top vendor contributions</h3>
            <p>Commission earned in the selected period - Top 6</p>
          </div>
        </div>
        {vendors.length ? (
          <>
            <Chart
              type="bar"
              className="finance-chart"
              aria-label="Commission by vendor"
              data={{
                labels: vendors.map(
                  (v) => v.vendor.name || v.vendor.email || 'Vendor'
                ),
                datasets: [
                  {
                    label: 'Commission',
                    data: vendors.map((v) => v.commission),
                    backgroundColor: '#3978f6',
                    borderRadius: 5,
                    maxBarThickness: 22,
                  },
                ],
              }}
              options={options}
            />
            <details className="finance-chart-data">
              <summary>View chart values</summary>
              {vendors.map((v) => (
                <p key={v.vendor._id}>
                  {v.vendor.name || v.vendor.email}:{' '}
                  <strong>{amount(v.commission)}</strong>
                </p>
              ))}
            </details>
          </>
        ) : (
          <div className="finance-chart-empty">
            No vendor commissions in this period.
          </div>
        )}
      </section>
      <section className="finance-chart-card">
        <div className="finance-chart-heading">
          <span className="finance-chart-icon green">
            <i className="pi pi-wallet" aria-hidden="true" />
          </span>
          <div>
            <h3>Cash collected & remitted</h3>
            <p>Rider cash movements in the selected period</p>
          </div>
        </div>
        <Chart
          type="bar"
          className="finance-chart"
          aria-label="Cash collected and remitted"
          data={{
            labels: ['Collected', 'Remitted'],
            datasets: [
              {
                data: [report.codCashCollected, report.codCashRemitted],
                backgroundColor: ['#3978f6', '#16b68a'],
                borderRadius: 6,
                maxBarThickness: 34,
              },
            ],
          }}
          options={options}
        />
        <div className="finance-cash-legend">
          <span>
            <i className="blue" />
            Collected <strong>{amount(report.codCashCollected)}</strong>
          </span>
          <span>
            <i className="green" />
            Remitted <strong>{amount(report.codCashRemitted)}</strong>
          </span>
        </div>
        <p className="finance-chart-note">
          Remittances may settle cash collected before this period.
        </p>
      </section>
    </div>
  );
}
