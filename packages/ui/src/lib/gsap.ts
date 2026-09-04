"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Flip is deliberately NOT registered here. It is used by exactly one
// component (SidebarNav, portal/admin only), and registering it in this shared
// module put it in the bundle of every page that touches GSAP at all —
// including marketing pages that never use it. SidebarNav registers it itself.
gsap.registerPlugin(useGSAP, ScrollTrigger);

export { gsap, useGSAP, ScrollTrigger };
