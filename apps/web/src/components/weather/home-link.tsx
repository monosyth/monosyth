"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useTransition } from "react";

import { WeatherPendingOverlay } from "@/components/weather/pending-overlay";

type WeatherHomeLinkProps = {
  children: ReactNode;
  className?: string;
};

function isModifiedEvent(event: MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

export function WeatherHomeLink({
  children,
  className,
}: WeatherHomeLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const isAtWeatherHome = pathname === "/weather" && searchParams.toString() === "";
  const isLoading = isPending && !isAtWeatherHome;

  useEffect(() => {
    router.prefetch("/weather");
  }, [router]);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (isModifiedEvent(event) || isAtWeatherHome) {
      return;
    }

    event.preventDefault();

    startTransition(() => {
      router.push("/weather", { scroll: false });
    });
  }

  return (
    <>
      <Link href="/weather" className={className} onClick={handleClick}>
        {children}
      </Link>

      {isLoading ? (
        <WeatherPendingOverlay
          title="Loading Weather Dashboard"
          detail="Returning to the main station dashboard."
        />
      ) : null}
    </>
  );
}
