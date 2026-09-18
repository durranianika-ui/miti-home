"use client"

import { usePathname } from "next/navigation"
import { Navbar } from "@/app/navbar"
import type { NavigationData } from "@/lib/navigation"

/** The admin area has its own header, so the storefront chrome steps aside there. */
export function NavbarGate({ navigation }: { navigation: NavigationData }) {
    const pathname = usePathname()
    if (pathname.startsWith("/admin")) return null
    return <Navbar navigation={navigation} />
}
