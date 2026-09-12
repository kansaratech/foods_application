// Interfaces
import { IActionMenuProps } from '@/lib/utils/interfaces/action-menu.interface';

// Icons
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Prime React
import { Menu } from 'primereact/menu';

// Hooks
import { useRef, useEffect, useId, useState } from 'react';
import './action-menu.css';

const ActionMenu = <T,>({
  items,
  data,
  isOpen,
  onToggle = () => { },
}: IActionMenuProps<T>) => {
  const menuRef = useRef<Menu>(null);
  const menuId = useId();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (menuRef.current) {
      if (isOpen) {
        // Create a synthetic event for the show method
        const event = new Event('click') as unknown as React.SyntheticEvent;
        menuRef.current.show(event);
      } else {
        // Create a synthetic event for the hide method
        const event = new Event('click') as unknown as React.SyntheticEvent;
        menuRef.current.hide(event);
      }
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <Menu
        model={items?.map((item) => ({
          label: item.label,
          command: (e) => {
            item.command?.(data);
            menuRef.current?.hide(e.originalEvent);
            onToggle();
          },
        }))}
        popup
        ref={menuRef}
        id={menuId}
        className="admin-row-menu"
        onShow={() => setExpanded(true)}
        onHide={() => {
          setExpanded(false);
          // Only trigger onToggle if the menu was actually open
          if (isOpen) {
            onToggle();
          }
        }}
      />
      <button
        type="button"
        aria-label="Row actions"
        aria-expanded={expanded}
        aria-controls={menuId}
        aria-haspopup="true"
        onClick={(event) => {
          event.stopPropagation();
          menuRef.current?.toggle(event);
          onToggle();
        }}
        className="admin-row-menu-trigger"
      >
        <FontAwesomeIcon icon={faEllipsisV} />
      </button>
    </div>
  );
};

export default ActionMenu;
