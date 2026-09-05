// Core
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

// Icons
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Interface & Types
import { ISidebarMenuItem, SubMenuItemProps } from '@/lib/utils/interfaces';

// Styles
import classes from './side-bar.module.css';
import { onUseLocalStorage } from '@/lib/utils/methods';
import { SELECTED_SIDEBAR_MENU } from '@/lib/utils/constants';

// Returns true when `route` is the current page or an ancestor of it.
// Using a segment-aware check avoids false matches like `/general` ⊂ `/general-settings`.
function isRouteActive(pathname: string, route?: string | null) {
  if (!route || route.startsWith('http')) return false;
  return pathname === route || pathname.startsWith(`${route}/`);
}

// This component is used to render the sub-menu items when hovered
function HoveredSubMenuItem({ icon, text, active }: SubMenuItemProps) {
  return (
    <div
      className={`my-3 rounded-md p-2 ${
        active
          ? 'bg-gray-300 dark:bg-dark-600 dark:text-white'
          : 'hover:bg-indigo-50 dark:hover:bg-dark-950 dark:text-white'
      }`}
    >
      <div className="flex items-center justify-center">
        {icon && (
          <span className="text-primary-500 h-6 w-6">
            <FontAwesomeIcon icon={icon} />
          </span>
        )}
        <span className="text-primary-500 ml-3 w-28 text-start">{text}</span>
        <div className="bg-primary-200 h-1" />
      </div>
    </div>
  );
}

export default function SidebarItem({
  icon,
  text,
  label,
  expanded = false,
  subMenu = null,
  route,
  isParent,
  isClickable,
  shouldOpenInNewTab, // <-- add this prop
}: ISidebarMenuItem) {
  // Hooks
  const pathname = usePathname();
  const router = useRouter();

  // Is the current page this exact item, or (for a parent) one of its children?
  const selfActive = isRouteActive(pathname, route);
  const containsActiveRoute = useMemo(
    () => !!subMenu?.some((item) => isRouteActive(pathname, item.route)),
    [subMenu, pathname]
  );
  const isActive = selfActive || containsActiveRoute;

  // States — a parent that owns the active route starts expanded so the user
  // can immediately see where they are (e.g. after a full page reload).
  const [expandSubMenu, setExpandSubMenu] = useState(containsActiveRoute);

  // Keep the group open whenever navigation lands inside it.
  useEffect(() => {
    if (containsActiveRoute) setExpandSubMenu(true);
  }, [containsActiveRoute]);

  // Collapse sub-menus when the whole sidebar collapses.
  useEffect(() => {
    if (!expanded) {
      setExpandSubMenu(false);
    }
  }, [expanded]);

  // Calculate the height of the sub-menu assuming each item is 40px tall
  const subMenuHeight = expandSubMenu
    ? `${((subMenu?.length || 0) * 41.5 + (subMenu! && 15)).toString()}px`
    : 0;

  const hasSubMenu = !!subMenu;
  // A leaf (submenu entry or a clickable top-level link) gets the solid highlight;
  // a parent that merely contains the active page gets the subtler tinted state.
  const isLeafActive = isActive && !hasSubMenu;
  const isParentHighlighted = isActive && hasSubMenu;

  const buttonStateClass = isLeafActive
    ? 'bg-primary-color text-white hover:bg-primary-dark'
    : isParentHighlighted
      ? 'bg-primary-light text-primary-color font-semibold dark:bg-dark-600 dark:text-white'
      : 'text-[#71717A] hover:bg-primary-light dark:text-white dark:hover:bg-dark-600';

  return (
    <div className={`mt-[0.4rem] flex flex-col`}>
      <div>
        <button
          aria-current={isLeafActive ? 'page' : undefined}
          aria-expanded={hasSubMenu ? expandSubMenu : undefined}
          className={`group relative flex w-full cursor-pointer items-center rounded-md px-3 py-2 transition-colors ${buttonStateClass} ${!expanded && 'hidden sm:flex'}`}
          onClick={() => {
            if (!isParent || isClickable) {
              if (
                shouldOpenInNewTab &&
                route // <-- check for shouldOpenInNewTab
              ) {
                window.open(route, '_blank');
              } else {
                router.push(route ?? '');
              }
              return;
            }

            setExpandSubMenu((curr) => expanded && !curr);
            onUseLocalStorage('save', SELECTED_SIDEBAR_MENU, text);
          }}
        >
          {/* Active accent bar on the left edge */}
          {isActive && (
            <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-primary-color dark:bg-white" />
          )}

          {icon && (
            <span className="card-h1 w-6">
              <FontAwesomeIcon icon={icon} />
            </span>
          )}

          <span
            className={`card-h2 text-${isParent ? 'md' : 'sm'} overflow-hidden text-start transition-all ${
              expanded ? 'ml-3 w-44' : 'w-0'
            }`}
          >
            {label || text}
          </span>
          {subMenu && (
            <div
              className={`absolute right-2 h-4 w-4${expanded ? '' : 'top-2'} transition-all ${expandSubMenu ? 'rotate-90' : 'rotate-0'}`}
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </div>
          )}

          {!expanded && (
            <div
              className={`text-primary-500 invisible absolute left-full ml-6 -translate-x-3 rounded-md bg-indigo-100 px-2 py-1 text-sm opacity-20 transition-all group-hover:visible group-hover:translate-x-0 group-hover:opacity-100 dark:bg-dark-950 dark:border dark:border-dark-600 dark:text-white`}
            >
              {!subMenu
                ? (label || text)
                : subMenu.map((item, index) => (
                    <HoveredSubMenuItem
                      key={index}
                      text={item.label || item.text}
                      icon={item.icon}
                      active={isRouteActive(pathname, item.route)}
                    />
                  ))}
            </div>
          )}
        </button>
      </div>
      <ul
        className={`${classes['sub-menu']} relative pl-6`}
        style={{ height: subMenuHeight }}
      >
        <div className="absolute bottom-0 left-6 top-0 w-px bg-gray-300 dark:bg-dark-600"></div>

        {(expandSubMenu ||
          onUseLocalStorage('get', SELECTED_SIDEBAR_MENU) === text) &&
          subMenu?.map((item, index) => {
            const childActive = isRouteActive(pathname, item.route);
            return (
              <li key={index} className="relative">
                {childActive && (
                  <div className="absolute -left-[0.26rem] top-1/2 z-10 h-2 w-2 -translate-y-1/2 transform rounded-full bg-primary-dark"></div>
                )}
                <SidebarItem {...item} expanded={expanded} />
              </li>
            );
          })}
      </ul>
    </div>
  );
}
