"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyRuleToOverlay,
  clearDemoOverlay,
  type DemoOverlay,
  readDemoOverlay,
  writeDemoOverlay,
} from "@/app/demo/demo-overlay";
import type { RuleAction, RuleMatch } from "@/utils/demo/ai/schemas";

export function useDemoOverlay() {
  const [overlay, setOverlay] = useState<DemoOverlay>({});

  // sessionStorage isn't available during SSR; hydrate after mount so the
  // server-rendered markup and first client render agree, then pick up any
  // state from earlier in this session.
  useEffect(() => {
    setOverlay(readDemoOverlay());
  }, []);

  const applyRule = useCallback(
    (matches: RuleMatch[], actions: RuleAction[]) => {
      setOverlay((current) => {
        const next = applyRuleToOverlay(current, matches, actions);
        writeDemoOverlay(next);
        return next;
      });
    },
    [],
  );

  const resetOverlay = useCallback(() => {
    clearDemoOverlay();
    setOverlay({});
  }, []);

  return { overlay, applyRule, resetOverlay };
}
