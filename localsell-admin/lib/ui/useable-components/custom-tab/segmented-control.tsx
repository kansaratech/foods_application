'use client';

type Props = {
  options: string[];
  selectedTab?: string;
  setSelectedTab: (value: string) => void;
  label?: string;
  renderLabel?: (value: string) => string;
};

/** Native buttons support Tab, Enter and Space without trapping focus. */
export default function SegmentedControl({
  options,
  selectedTab,
  setSelectedTab,
  label = 'View options',
  renderLabel = (value) => value,
}: Props) {
  return (
    <div className="ls-segments" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={selectedTab === option}
          onClick={() => setSelectedTab(option)}
        >
          {renderLabel(option)}
        </button>
      ))}
    </div>
  );
}
