export const StepIndicator = ({
  steps,
  current
}: {
  steps: readonly string[];
  /** Zero-based index of the active step. */
  current: number;
}) => (
  <ol className="steps" aria-label="Progress">
    {steps.map((label, index) => {
      const state = index < current ? 'done' : index === current ? 'current' : 'todo';
      return (
        <li key={label} className={`step step-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
          <span className="step-dot" aria-hidden="true">
            {index + 1}
          </span>
          <span className="step-label">{label}</span>
        </li>
      );
    })}
  </ol>
);
