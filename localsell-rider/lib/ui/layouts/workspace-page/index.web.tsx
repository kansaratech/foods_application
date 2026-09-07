import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
export interface WorkspacePageProps {
  title: string;
  description: string;
  compact?: boolean;
  children: ReactNode;
}
export default function WorkspacePage({
  title,
  description,
  compact,
  children,
}: WorkspacePageProps) {
  const { t } = useTranslation();
  return (
    <section
      className={`rw-page ${compact ? "rw-compact" : ""}`}
      aria-label={t(title)}
    >
      <style>{`
      .rw-page{flex:1;min-height:0;display:flex;flex-direction:column;background:#f5f7fb;padding:24px var(--rider-page-gutter,20px);min-width:0;overflow:auto}
      .rw-page-heading,.rw-panel{width:100%;min-width:0;max-width:none;margin-left:0;margin-right:0;flex-shrink:0}
      .rw-page-heading{margin-bottom:24px}.rw-page-heading h1{margin:0 0 8px;font-size:28px;font-weight:700;letter-spacing:-.7px;color:#162b46}
      .rw-page-heading p{margin:0;color:#6d7e94;font-size:14px;line-height:1.6}
      .rw-panel{display:flex;flex-direction:column;flex:1;min-height:420px;background:#fff;border:1px solid #e2e9f2;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px #183f6705}
      .rw-panel>div{flex:1;min-height:0;min-width:0;max-width:100%}
      .rw-panel input{min-height:44px;border-radius:10px}.rw-panel [role=button]:focus-visible{outline:2px solid #2563eb;outline-offset:-3px}
      @media(max-width:760px){.rw-page{padding:20px var(--rider-page-gutter,12px)}.rw-page-heading{margin-bottom:18px}.rw-page-heading h1{font-size:24px}.rw-panel{border-radius:16px;min-height:400px}}
    `}</style>
      <header className="rw-page-heading">
        <h1>{t(title)}</h1>
        <p>{t(description)}</p>
      </header>
      <div className="rw-panel">{children}</div>
    </section>
  );
}
