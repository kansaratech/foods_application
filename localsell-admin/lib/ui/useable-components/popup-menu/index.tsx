'use client';
import {
  IPopupMenuComponentProps,
  IPopupMenuItem,
} from '@/lib/utils/interfaces';
// queries

//interfaces

//components

//icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

//contexts

//hooks
import { useEffect, useRef } from 'react';

export default function CustomPopupMenu<T>({
  close,
  items,
}: IPopupMenuComponentProps<T>) {
  //popup ref
  const popupRef = useRef<HTMLDivElement | null>(null);

  //handle blur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [close]);

  return (
    <div
      ref={popupRef}
      className="flex min-w-[180px] flex-col gap-1 rounded-lg border border-gray-200 dark:bg-dark-900 dark:text-white bg-white p-1 shadow-xl"
    >
      {items.map((item: IPopupMenuItem<T>, index) => {
        return (
          <button
            key={`${item.title}-${index}`}
            className="flex items-center gap-2 whitespace-nowrap rounded p-2 transition-colors hover:bg-gray-100 dark:hover:bg-dark-600"
            onClick={item.fn}
          >
            {item?.icon ? (
              <FontAwesomeIcon
                title="Edit"
                icon={item.icon}
                className={`h-4 w-4 shrink-0 ${item.color}`}
              />
            ) : null}
            {item.title ? (
              <span className={`text-sm ${item.color}`}>{item.title}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
