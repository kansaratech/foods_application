import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

export interface IWizardStep {
  key: string;
  label: string;
}

// A compact numbered-circle stepper header shared by every multi-step admin
// wizard (vendor registration, store registration, ...) — keeps them
// visually consistent instead of each one rolling its own.
export default function StepperHeader({
  steps,
  current,
}: {
  steps: IWizardStep[];
  current: number;
}) {
  return (
    <div className="flex items-start px-2 pb-2 pt-1">
      {steps.map((step, index) => {
        const isDone = index < current;
        const isActive = index === current;
        return (
          <div key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors ${
                  isDone
                    ? 'bg-primary-color text-white'
                    : isActive
                      ? 'bg-primary-color text-white ring-4 ring-[#e8f0fc] dark:ring-dark-900'
                      : 'border-2 border-slate-300 text-slate-400 dark:border-dark-600'
                }`}
              >
                {isDone ? <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" /> : index + 1}
              </div>
              <span
                className={`mt-2 whitespace-nowrap text-xs font-medium ${
                  isDone || isActive ? 'text-primary-color' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mx-2 mb-5 h-0.5 flex-1 self-center ${
                  index < current ? 'bg-primary-color' : 'bg-slate-200 dark:bg-dark-600'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
