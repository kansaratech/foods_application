import { ReactNode } from 'react';
export default function ManagementHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="management-heading">
      <div>
        <div className="management-breadcrumb">
          Management <span>/</span> {title}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className="management-heading-actions">{children}</div>}
    </header>
  );
}
