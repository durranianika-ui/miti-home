"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Volume2, VolumeX, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { normalizeProductImage } from "@/lib/image"
import { formatPrice } from "@/lib/money"
import { buildProductPath } from "@/lib/seo"
import { ViewportPrefetchLink } from "@/components/ui/viewport-prefetch-link"

export interface SpaceProduct {
    id: string;
    name: string;
    sellingPrice: string;
    mrp: string;
    slug: string;
    images: string[];
}

export interface ShopTheSpaceItem {
    id: string;
    title: string;
    /** Still image for the card; used as the poster when a video is supplied. */
    image: string;
    /** Optional short vertical video (mp4). */
    video?: string;
    products: SpaceProduct[];
}

export function ShopTheSpace({
    spaces,
    eyebrow = "Styled at home",
    title = "Shop the Space",
}: {
    spaces: ShopTheSpaceItem[]
    eyebrow?: string
    title?: string
}) {
    const [audibleReelId, setAudibleReelId] = useState<string | null>(null)
    const scrollerRef = useRef<HTMLDivElement>(null)
    const videoRefs = useRef(new Map<string, HTMLVideoElement>())
    const reels = spaces.filter((space) => space.products.length > 0)

    const scrollByCard = (direction: 1 | -1) => {
        scrollerRef.current?.scrollBy({
            left: direction * 300,
            behavior: "smooth",
        })
    }

    const toggleAudio = (reelId: string) => {
        const nextAudibleId = audibleReelId === reelId ? null : reelId
        setAudibleReelId(nextAudibleId)

        videoRefs.current.forEach((video, id) => {
            const shouldPlayAudio = id === nextAudibleId
            video.muted = !shouldPlayAudio
            if (shouldPlayAudio) {
                video.volume = 0.65
                video.play().catch(() => {
                    video.muted = true
                    setAudibleReelId(null)
                })
            }
        })
    }

    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const intersectingIdsRef = useRef<Set<string>>(new Set())

    useEffect(() => {
        const handleMenuToggle = (e: Event) => {
            setIsMenuOpen((e as CustomEvent).detail.open)
        }
        window.addEventListener("miti-mobile-menu", handleMenuToggle)
        const timer = window.setTimeout(() => {
            setIsMenuOpen(document.body.classList.contains("mobile-menu-open"))
        }, 0)
        return () => {
            window.clearTimeout(timer)
            window.removeEventListener("miti-mobile-menu", handleMenuToggle)
        }
    }, [])

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const video = entry.target as HTMLVideoElement
                const reelId = video.getAttribute("data-reel-id") || ""
                if (entry.isIntersecting) {
                    intersectingIdsRef.current.add(reelId)
                    if (!document.body.classList.contains("mobile-menu-open")) {
                        video.play().catch(() => {
                            // ignore play interruption errors
                        })
                    }
                } else {
                    intersectingIdsRef.current.delete(reelId)
                    video.pause()
                }
            })
        }, {
            threshold: 0.1,
            rootMargin: typeof window !== "undefined" && window.innerWidth < 768 ? "50px 0px 50px 0px" : "150px 0px 150px 0px"
        })

        videoRefs.current.forEach((video) => {
            observer.observe(video)
        })

        return () => {
            observer.disconnect()
        }
    }, [])

    useEffect(() => {
        videoRefs.current.forEach((video, reelId) => {
            if (isMenuOpen) {
                video.pause()
            } else if (intersectingIdsRef.current.has(reelId)) {
                video.play().catch(() => {
                    // ignore play interruption errors
                })
            }
        })
    }, [isMenuOpen])

    if (reels.length === 0) return null

    return (
        <section className="border-t border-border/60 bg-background px-5 py-16 md:px-12 md:py-24">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 md:mb-12 text-center">
                    <p className="mb-4 font-heading text-[10px] font-medium uppercase tracking-[0.34em] text-brand-strong">
                        {eyebrow}
                    </p>
                    <h2 className="font-display text-3xl leading-tight sm:text-4xl md:text-5xl">{title}</h2>
                </div>

                <div className="relative">
                    <div
                        ref={scrollerRef}
                        className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 md:gap-5"
                    >
                        {reels.map((reel) => (
                            <div
                                key={reel.id}
                                className="group relative aspect-[3/4] w-[72vw] max-w-[300px] flex-none snap-start overflow-hidden bg-neutral-900 shadow-sm sm:w-[280px]"
                            >
                                {reel.video ? (
                                <video
                                    ref={(node) => {
                                        if (node) {
                                            videoRefs.current.set(reel.id, node)
                                        } else {
                                            videoRefs.current.delete(reel.id)
                                        }
                                    }}
                                    data-reel-id={reel.id}
                                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.025]"
                                    src={reel.video}
                                    poster={reel.image}
                                    muted={audibleReelId !== reel.id}
                                    loop
                                    playsInline
                                    preload="none"
                                />
                                ) : (
                                <Image
                                    src={normalizeProductImage(reel.image)}
                                    alt={reel.title}
                                    fill
                                    sizes="(max-width: 768px) 72vw, 300px"
                                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.035]"
                                />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-black/10" />
                                <p className="absolute left-4 top-4 z-10 font-heading text-[10px] font-medium uppercase tracking-[0.28em] text-white/90 drop-shadow">{reel.title}</p>
                                {reel.video && (
                                <button
                                    type="button"
                                    className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors duration-300 hover:bg-black/55 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
                                    onClick={() => toggleAudio(reel.id)}
                                    aria-label={audibleReelId === reel.id ? "Mute reel audio" : "Play reel audio"}
                                >
                                    {audibleReelId === reel.id ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                                </button>
                                )}
                                
                                <div className="absolute inset-x-3 bottom-3 z-10 flex flex-col gap-2">
                                    {reel.products.map((product) => (
                                        <ViewportPrefetchLink
                                            key={product.id}
                                            href={buildProductPath(product.slug)}
                                            className="relative z-10 flex items-center gap-2 bg-black/45 p-2 text-white shadow-2xl backdrop-blur-md transition-all duration-300 hover:bg-black/60 hover:scale-[1.01] active:scale-[0.99]"
                                        >
                                            <div className="relative h-12 w-12 flex-none overflow-hidden bg-white/10">
                                                <Image
                                                    src={normalizeProductImage(product.images[0])}
                                                    alt={product.name}
                                                    fill
                                                    sizes="48px"
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="line-clamp-1 font-heading text-[11px] font-medium">{product.name}</p>
                                                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold">
                                                    {Number(product.mrp) > Number(product.sellingPrice) && (
                                                        <span className="text-white/60 line-through">{formatPrice(product.mrp)}</span>
                                                    )}
                                                    <span>{formatPrice(product.sellingPrice)}</span>
                                                </div>
                                            </div>
                                            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white text-neutral-950 transition-transform duration-300 hover:scale-110">
                                                <ShoppingBag className="h-4 w-4" />
                                            </div>
                                        </ViewportPrefetchLink>
                                    ))}
                                </div>

                                {reel.products.length === 1 ? (
                                    <ViewportPrefetchLink 
                                        href={buildProductPath(reel.products[0].slug)} 
                                        className="absolute inset-0 z-0" 
                                        aria-label={`Shop ${reel.products[0].name}`} 
                                    />
                                ) : reel.video ? (
                                    <button
                                        type="button"
                                        onClick={() => toggleAudio(reel.id)}
                                        className="absolute inset-0 z-0 w-full h-full bg-transparent cursor-pointer"
                                        aria-label="Toggle audio"
                                    />
                                ) : null}
                            </div>
                        ))}
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute left-0 top-1/2 hidden h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background shadow-lg md:flex"
                        onClick={() => scrollByCard(-1)}
                        aria-label="Scroll spaces left"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-0 top-1/2 hidden h-11 w-11 -translate-y-1/2 translate-x-1/2 rounded-full bg-background shadow-lg md:flex"
                        onClick={() => scrollByCard(1)}
                        aria-label="Scroll spaces right"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </section>
    )
}
