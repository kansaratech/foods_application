import { useQuery } from "@apollo/client";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { RIDER_EARNINGS_GRAPH } from "@/lib/apollo/queries/earnings.query";
import { useUserContext } from "@/lib/context/global/user.context";
import { IRiderEarningsResponse } from "@/lib/utils/interfaces/rider-earnings.interface";
import { useCurrency } from "@/lib/utils/methods/use-currency";

export default function EarningsMain() {
  const { userId, setModalVisible } = useUserContext();
  const { t, i18n } = useTranslation();
  const { format } = useCurrency();
  const { data, loading, error, refetch } = useQuery<IRiderEarningsResponse>(
    RIDER_EARNINGS_GRAPH,
    { variables: { riderId: userId }, skip: !userId },
  );
  const entries = data?.riderEarningsGraph?.earnings ?? [];
  const dateValue = (value: string) =>
    new Date(/^\d+$/.test(value) ? Number(value) : value);
  const dateLabel = (value: string) => {
    const date = dateValue(value);
    return Number.isNaN(date.getTime())
      ? t("Date unavailable")
      : date.toLocaleDateString(i18n.language, {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };
  const recent = [...entries]
    .sort((a, b) => dateValue(b.date).getTime() - dateValue(a.date).getTime())
    .slice(0, 7);
  const chart = [...recent].reverse();
  const max = Math.max(1, ...chart.map((e) => Math.max(0, e.totalEarningsSum)));
  const total = entries.reduce((sum, e) => sum + e.totalEarningsSum, 0);
  const tips = entries.reduce((sum, e) => sum + e.totalTipsSum, 0);
  const deliveries = entries.reduce(
    (sum, e) => sum + (e.totalDeliveries ?? e.earningsArray.length),
    0,
  );
  return (
    <div className="re-main">
      <style>{`
      .re-main{padding:24px;overflow:auto;color:#162b46;background:#fff}
      .re-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-bottom:28px}
      .re-summary article{padding:20px;border:1px solid #e2e9f2;border-radius:14px;background:#f8faff;min-width:0}
      .re-summary small{display:block;color:#687b93;font-size:12px;margin-bottom:12px}.re-summary strong{font-size:28px;overflow-wrap:anywhere}
      .re-main h2{font-size:18px;margin:0}.re-section-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}
      .re-main button{border:1px solid #dce6f2;background:#fff;color:#1764d8;border-radius:9px;padding:10px 14px;font-weight:600;font-size:13px}
      .re-chart{display:flex;align-items:stretch;gap:16px;min-height:240px;border-bottom:1px solid #dae4f0;padding:24px 8px 0;margin-bottom:32px;background:repeating-linear-gradient(to top,transparent,transparent 59px,#eef2f8 60px)}
      .re-bar-column{flex:1;min-width:0;display:flex;align-items:center;flex-direction:column;justify-content:flex-end;gap:10px}
      .re-bar-column strong{font-size:12px}.re-bar{width:min(56px,80%);border-radius:8px 8px 0 0;background:linear-gradient(#5096ff,#1764d8)}
      .re-bar-column small{font-size:10px;text-align:center;color:#697e98;min-height:32px;background:#fff;width:100%;padding-top:5px}
      .re-table-scroll{overflow-x:auto}.re-main table{width:100%;border-collapse:collapse;text-align:left;white-space:nowrap}
      .re-main th{font-size:11px;text-transform:uppercase;letter-spacing:.6px;background:#f7f9fc;color:#72839a;padding:14px}
      .re-main td{padding:16px 14px;border-bottom:1px solid #e9eef5;font-size:13px}.re-main td:last-child{text-align:right}
      .re-message{padding:48px 20px;text-align:center;color:#687b93;background:#f8faff;border-radius:14px;margin-bottom:24px;line-height:1.7}
      @media(max-width:600px){.re-main{padding:16px}.re-summary{gap:8px}.re-summary article{padding:12px}.re-summary strong{font-size:20px}.re-chart{gap:6px}.re-bar-column strong{font-size:10px}.re-section-head{flex-wrap:wrap}}
    `}</style>
      {loading ? (
        <div className="re-message" role="status">
          {t("Loading earnings?")}
        </div>
      ) : error ? (
        <div className="re-message" role="alert">
          <p>{t("Unable to load earnings. Please try again.")}</p>
          <button onClick={() => void refetch()}>{t("Try again")}</button>
        </div>
      ) : (
        <>
          <div className="re-summary">
            {[
              ["Recorded earnings", format(total)],
              ["Recorded tips", format(tips)],
              ["Deliveries", deliveries],
            ].map(([label, value]) => (
              <article key={label}>
                <small>{t(String(label))}</small>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <div className="re-section-head">
            <h2>{t("Recent earnings")}</h2>
            <button onClick={() => void refetch()}>{t("Refresh")}</button>
          </div>
          {chart.length ? (
            <div
              className="re-chart"
              role="img"
              aria-label={t(
                "Earnings for the latest seven recorded periods; values are listed below.",
              )}
            >
              {chart.map((e) => (
                <div className="re-bar-column" key={e._id}>
                  <strong>{format(e.totalEarningsSum)}</strong>
                  <div
                    className="re-bar"
                    style={{
                      height: `${Math.max(2, (Math.max(0, e.totalEarningsSum) / max) * 170)}px`,
                    }}
                  />
                  <small>{dateLabel(e.date)}</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="re-message">
              <h2>{t("No earnings yet")}</h2>
              <p>
                {t(
                  "Your earnings will appear here after completed deliveries.",
                )}
              </p>
            </div>
          )}
          <div className="re-section-head">
            <h2>{t("Recent Activity")}</h2>
            <button
              onClick={() => {
                setModalVisible({
                  bool: false,
                  _id: "",
                  date: "",
                  earningsArray: [],
                  totalEarningsSum: 0,
                  totalTipsSum: 0,
                  totalDeliveries: 0,
                });
                router.push("/(tabs)/earnings/(routes)/earnings-detail");
              }}
            >
              {t("View all activity")}
            </button>
          </div>
          {recent.length > 0 && (
            <div className="re-table-scroll">
              <table>
                <thead>
                  <tr>
                    {["Date", "Deliveries", "Tips", "Earnings", "Details"].map(
                      (label) => (
                        <th key={label} scope="col">
                          {t(label)}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((e) => (
                    <tr key={e._id}>
                      <td>{dateLabel(e.date)}</td>
                      <td>{e.totalDeliveries ?? e.earningsArray.length}</td>
                      <td>{format(e.totalTipsSum)}</td>
                      <td>
                        <strong>{format(e.totalEarningsSum)}</strong>
                      </td>
                      <td>
                        <button
                          aria-label={`${t("View details")} ${dateLabel(e.date)}`}
                          onClick={() =>
                            setModalVisible({
                              bool: true,
                              _id: e._id,
                              date: e.date,
                              earningsArray: e.earningsArray,
                              totalEarningsSum: e.totalEarningsSum,
                              totalTipsSum: e.totalTipsSum,
                              totalDeliveries:
                                e.totalDeliveries ?? e.earningsArray.length,
                            })
                          }
                        >
                          {t("View details")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
