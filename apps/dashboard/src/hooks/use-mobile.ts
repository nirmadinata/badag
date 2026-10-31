import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

let mobileQuery: MediaQueryList | undefined;

function getMobileQuery() {
    mobileQuery ??= window.matchMedia(MOBILE_QUERY);

    return mobileQuery;
}

function subscribe(onChange: () => void) {
    const query = getMobileQuery();

    query.addEventListener("change", onChange);

    return () => query.removeEventListener("change", onChange);
}

export function useIsMobile() {
    return React.useSyncExternalStore(
        subscribe,
        () => getMobileQuery().matches,
        () => false
    );
}
