import { CircleSVG } from '@/lib/utils/assets/svgs/circle';
import { PointLineSVG } from '@/lib/utils/assets/svgs/point-line';
import { PolygonSVG } from '@/lib/utils/assets/svgs/polygon';
import { ICustomShapeComponentProps } from '@/lib/utils/interfaces';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

export default function CustomShape({
  selected,
  onClick,
  hidenNames = [],
}: ICustomShapeComponentProps) {
  // Hooks
  const t = useTranslations();
  const { theme } = useTheme();

  const items = [
    {
      value: 'point',
      child: (
        <>
          <PointLineSVG
            strokeColor={selected === 'point' ? 'white' : theme === `dark`? "white" :"black" }
          />
          <p className="mt-2 text-center">{t('Point')}</p>
        </>
      ),
    },
    {
      value: 'radius',
      child: (
        <>
          <CircleSVG strokeColor={selected === 'radius' ? 'white' : theme === `dark`? "white" :"black"} />
          <p className="mt-2 text-center">{t('Circle')}</p>
        </>
      ),
    },
    {
      value: 'polygon',
      child: (
        <>
         <PolygonSVG
            strokeColor={selected === 'polygon' ? 'white' : theme === `dark`? "white" :"black"}
          />
          <p className="mt-2 text-center">{t('Polygon')}</p>
        </>
      ),
    },
  ];
  const visibleItems = items.filter(
    (item) => !hidenNames.some((hidden: string) => hidden.toLowerCase() === item.value)
  );

  return (
    <div
      className={`mt-3 grid gap-3 ${visibleItems.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}
      role="group"
      aria-label={t('Delivery area shape')}
    >
      {visibleItems.map((item, index: number) => (
          <button
            key={`${item.value}-${index}`}
            aria-pressed={item.value === selected}
            className={`flex h-20 items-center justify-center gap-3 border px-4 py-3 ${
              item.value === selected
                ? 'border-primary-color bg-primary-color text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:border-dark-600 dark:bg-dark-900 dark:text-white'
            } rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-color focus:ring-offset-2 [&_p]:mt-0`}
            type="button"
            onClick={() => onClick(item.value)}
          >
            {item.child}
          </button>
      ))}
    </div>
  );
}
