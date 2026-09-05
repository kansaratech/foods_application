import Link from 'next/link';
import { ActionMenu } from '@/lib/ui/screen-components/protected/super-admin/users/view/main/ActionMenu';
import { IUserResponse } from '@/lib/utils/interfaces/users.interface';
import {
  customerDate,
  customerMethod,
  customerStatus,
} from '@/lib/ui/screens/super-admin/general/users/utils';

export const USERS_TABLE_COLUMNS = (
  openMenuId?: string | null,
  setOpenMenuId?: (id: string | null) => void
) => [
  {
    headerName: 'Customer',
    propertyName: 'name',
    body: (user: IUserResponse) => {
      const initials = (user.name || '?')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
      const tone =
        user._id.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) % 5;
      return (
        <div className="customer-identity">
          <span className={`customer-avatar tone-${tone}`}>{initials}</span>
          <div>
            <strong>{user.name || 'Unnamed customer'}</strong>
            <small title={user._id}>{user._id}</small>
          </div>
        </div>
      );
    },
  },
  {
    headerName: 'Contact',
    propertyName: 'email',
    body: (user: IUserResponse) => (
      <div className="customer-contact">
        <span title={user.email}>{user.email || '?'}</span>
        <small>{user.phone || '?'}</small>
      </div>
    ),
  },
  {
    headerName: 'Joined via',
    propertyName: 'userType',
    body: (user: IUserResponse) => {
      const method = customerMethod(user);
      const icon = (
        {
          Email: 'envelope',
          Google: 'google',
          Apple: 'apple',
          Phone: 'phone',
        } as Record<string, string>
      )[method];
      return (
        <span className="customer-method">
          {icon && <i className={`pi pi-${icon}`} aria-hidden="true" />}
          {method}
        </span>
      );
    },
  },
  {
    headerName: 'Orders',
    propertyName: 'orders',
    body: () => (
      <span title="Order totals are not available in the customer directory">
        ?
      </span>
    ),
  },
  {
    headerName: 'Total spent',
    propertyName: 'totalSpent',
    body: () => (
      <span title="Spending totals are not available in the customer directory">
        ?
      </span>
    ),
  },
  {
    headerName: 'Last active',
    propertyName: 'lastLogin',
    body: (user: IUserResponse) => {
      const date = customerDate(user.lastLogin);
      if (!date) return <span className="customer-muted">?</span>;
      const hours = Math.max(
        0,
        Math.floor((Date.now() - date.getTime()) / 3600000)
      );
      const relative =
        hours < 1
          ? 'Just now'
          : hours < 24
            ? `${hours} hour${hours === 1 ? '' : 's'} ago`
            : `${Math.floor(hours / 24)} day${Math.floor(hours / 24) === 1 ? '' : 's'} ago`;
      return (
        <div className="customer-activity">
          <span>{relative}</span>
          <small>
            {date.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </small>
        </div>
      );
    },
  },
  {
    headerName: 'Status',
    propertyName: 'status',
    body: (user: IUserResponse) => (
      <span className={`customer-status ${customerStatus(user).toLowerCase()}`}>
        <span />
        {customerStatus(user)}
      </span>
    ),
  },
  {
    headerName: 'Actions',
    propertyName: 'actions',
    body: (user: IUserResponse) => (
      <div className="customer-actions">
        <Link href={`/general/users/user-detail/${user._id}`}>
          View profile
        </Link>
        <ActionMenu
          rowData={user}
          openMenuId={openMenuId}
          setOpenMenuId={setOpenMenuId}
        />
      </div>
    ),
  },
];
