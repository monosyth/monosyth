import { formatDate, type MoveSetup } from "@/lib/move/model";
import styles from "./planner.module.css";

function CityName({ value }: { value: string }) {
  const [city, ...region] = value.split(",").map((part) => part.trim());
  const state = region.join(", ");
  return <>{city}{state && <span className={styles.routeState}>, {state}</span>}</>;
}

export function MoveHeading({ setup, today, saved }: { setup: MoveSetup; today: string; saved: boolean }) {
  const date = setup.date ? new Date(`${setup.date}T12:00:00Z`) : null;
  const days = date && today ? Math.round((date.getTime() - Date.parse(`${today}T12:00:00Z`)) / 86400000) : null;
  const destination = setup.destination.trim();
  const origin = setup.origin.trim();
  return (
    <div className={styles.moveHero}>
      <div className={styles.moveRoute}>
        <p className={styles.kicker}>{saved ? "Your move / A place to begin again" : "02 / Your plan preview"}</p>
        <h1 id="plan-heading" className={styles.routeHeading}>
          {destination ? <>
            {origin && <span><CityName value={origin} /></span>}
            <span className={styles.routeDestination}><span aria-hidden="true" className={styles.routeArrow}>↗</span><CityName value={destination} /></span>
          </> : "Your next chapter"}
        </h1>
        <p className={styles.muted}>{setup.origin || "Origin undecided"} → {setup.destination || "Destination undecided"}</p>
        <p className={styles.routeCaption}>{saved ? "Your details in place, your next step in view" : "A clear starting point for your move"}</p>
      </div>
      <aside className={styles.moveTicket} aria-label={`Target move: ${formatDate(setup.date)}`}>
        <div className={styles.ticketTop}><span>Moving day</span><span aria-hidden="true">↗</span></div>
        <div className={styles.ticketDate}>
          <strong>{date ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date) : "Still deciding"}</strong>
          {date && <span>{date.getUTCFullYear()}</span>}
        </div>
        <div className={styles.ticketBottom}>
          <span>{date ? new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(date) : "Set your own pace"}</span>
          {days !== null && <span>{days > 0 ? `${days} ${days === 1 ? "day" : "days"} to go` : days === 0 ? "Today" : "Settling in"}</span>}
        </div>
      </aside>
    </div>
  );
}
