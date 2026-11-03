import styles from "@/app/app/bag-studio/bag-studio.module.css";
import { formatDecimal, formatInches, snapMeasurement } from "@/lib/sewing/bag-pattern";
import { cleanInput } from "../utils";

export function MeasurementField({
      label,
      hint,
      value,
      step = 0.125,
      min = 0,
      onChange,
    }: {
          label: string;
          hint: string;
          value: number;
          step?: number;
          min?: number;
          onChange: (value: number) => void;
        }) {
    const stepAmount = step || 0.125;
    const decrement = () => {
            onChange(Math.max(min, snapMeasurement(value - stepAmount, stepAmount)));
          };
    const increment = () => {
            onChange(snapMeasurement(value + stepAmount, stepAmount));
          };
    return (
    <div className={styles.measureField}>
      <label className={styles.measureLabel}>
        <strong>{label}</strong>
        <small>{hint}</small>
      </label>
      <div className={styles.measureControlRow}>
        <button
          type="button"
          className={styles.stepperButton}
          onClick={decrement}
          title={`Decrease by ${formatInches(stepAmount)}`}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className={styles.measureInput}>
          <input
            type="number"
            inputMode="decimal"
            value={formatDecimal(value, 3)}
            min={min}
            step={step}
            onChange={(event) => onChange(cleanInput(event.target.valueAsNumber))}
          />
          <b>in</b>
        </span>
        <button
          type="button"
          className={styles.stepperButton}
          onClick={increment}
          title={`Increase by ${formatInches(stepAmount)}`}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
    );
}
