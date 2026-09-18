"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Check } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { normalizeProductImage } from "@/lib/image"
import { formatPrice } from "@/lib/money"
import { DELIVERY_ESTIMATE, FREE_SHIPPING_THRESHOLD_DISPLAY } from "@/lib/constants"
import { cn } from "@/lib/utils"
import {
  ComboOptionPicker,
  buildComboCartLine,
  comboTitle,
  getComboPricing,
  productHref,
  useComboOptions,
  type Combo,
  type ComboOptions,
} from "@/components/features/combo-section"

const EASE = [0.32, 0.72, 0, 1] as const

function ComboGallery({ options }: { options: ComboOptions }) {
  const { product, selectedColor } = options
  const reduceMotion = useReducedMotion()
  const source = selectedColor?.images?.length ? selectedColor.images : product.images
  const images = (source.length > 0 ? source : [undefined]).map((image) => normalizeProductImage(image))
  const [index, setIndex] = useState(0)
  const [prevSource, setPrevSource] = useState(source)

  // Reset to the first image when the chosen colour swaps the image set.
  if (prevSource !== source) {
    setPrevSource(source)
    setIndex(0)
  }

  const current = Math.min(index, images.length - 1)
  const previous = () => setIndex((value) => Math.max(value - 1, 0))
  const next = () => setIndex((value) => Math.min(value + 1, images.length - 1))

  return (
    <div
      className="group relative overflow-hidden bg-muted"
      role="group"
      aria-roledescription="carousel"
      aria-label={`${product.name} images`}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") previous()
        if (event.key === "ArrowRight") next()
      }}
    >
      <div className="relative aspect-square w-full">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={`${current}-${images[current]}`}
            className="absolute inset-0"
            initial={{ opacity: reduceMotion ? 1 : 0.4 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reduceMotion ? 1 : 0.4 }}
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: EASE }}
          >
            <Image
              src={images[current]}
              alt={`${product.name}, image ${current + 1} of ${images.length}`}
              fill
              priority={current === 0}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-center"
              draggable={false}
            />
          </motion.div>
        </AnimatePresence>

        {images.length > 1 && (
          <>
            <motion.div
              className="absolute inset-0 z-10 touch-pan-y"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_event, info) => {
                if (info.offset.x < -40 || info.velocity.x < -300) next()
                else if (info.offset.x > 40 || info.velocity.x > 300) previous()
              }}
            />
            <button
              type="button"
              className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-background/80 text-foreground opacity-0 transition-opacity duration-300 hover:bg-background focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground group-hover:opacity-100 disabled:hidden"
              onClick={previous}
              disabled={current === 0}
              aria-label={`Previous image of ${product.name}`}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-background/80 text-foreground opacity-0 transition-opacity duration-300 hover:bg-background focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground group-hover:opacity-100 disabled:hidden"
              onClick={next}
              disabled={current === images.length - 1}
              aria-label={`Next image of ${product.name}`}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
              {images.map((image, i) => (
                <button
                  key={`${image}-${i}`}
                  type="button"
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    current === i ? "w-6 bg-brand" : "w-1.5 bg-foreground/30 hover:bg-foreground/60",
                  )}
                  onClick={() => setIndex(i)}
                  aria-label={`Show image ${i + 1} of ${product.name}`}
                  aria-current={current === i}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ComboProductPanel({ options, idPrefix }: { options: ComboOptions; idPrefix: string }) {
  const { product } = options
  const compareAt = Number(product.mrp)
  const price = Number(product.sellingPrice)

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="font-display text-2xl font-light leading-tight md:text-3xl">
          <Link href={productHref(product)} className="hover:text-brand-strong focus-visible:underline focus-visible:outline-none">
            {product.name}
          </Link>
        </h2>
        <p className="flex items-baseline gap-3 tabular-nums">
          <span className="text-base text-foreground">{formatPrice(price)}</span>
          {compareAt > price && <span className="text-sm text-muted-foreground line-through">{formatPrice(compareAt)}</span>}
        </p>
        {(product.material || product.dimensions) && (
          <dl className="space-y-1 text-xs text-muted-foreground">
            {product.material && (
              <div className="flex gap-2">
                <dt className="text-foreground">Material</dt>
                <dd>{product.material}</dd>
              </div>
            )}
            {product.dimensions && (
              <div className="flex gap-2">
                <dt className="text-foreground">Dimensions</dt>
                <dd>{product.dimensions}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
      <ComboOptionPicker options={options} idPrefix={idPrefix} size="md" />
    </div>
  )
}

function ComboDetail({ combo }: { combo: Combo }) {
  const { addCombo } = useCart()
  const optionsA = useComboOptions(combo.productA)
  const optionsB = useComboOptions(combo.productB)
  const [added, setAdded] = useState(false)
  const { total, saving, setPrice } = getComboPricing(combo)
  const canAdd = optionsA.ready && optionsB.ready

  const handleAddCombo = () => {
    if (!canAdd) return
    addCombo({
      comboId: combo.id,
      comboName: comboTitle(combo),
      maxDiscountAmount: saving,
      items: [buildComboCartLine(optionsA), buildComboCartLine(optionsB)],
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="px-6 pb-10 pt-12 text-center md:px-12 md:pt-16">
        <p className="font-heading text-[10px] font-medium uppercase tracking-[0.3em] text-brand-strong">Complete the set</p>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-3xl font-light leading-tight md:text-5xl">
          {combo.productA.name}
          <span className="mx-3 text-muted-foreground">&amp;</span>
          {combo.productB.name}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          Two pieces that belong together{saving > 0 ? `, with ${formatPrice(saving)} off when you take them home as a set` : ""}.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-px bg-border lg:grid-cols-2">
        <ComboGallery options={optionsA} />
        <ComboGallery options={optionsB} />
      </div>

      <div className="border-t border-border px-6 py-14 md:px-12 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            <ComboProductPanel options={optionsA} idPrefix={`${combo.id}-a`} />
            <ComboProductPanel options={optionsB} idPrefix={`${combo.id}-b`} />
          </div>

          <div className="mt-16 space-y-6 border-t border-border pt-12">
            <div className="space-y-3">
              <p className="font-heading text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground">The set</p>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">{combo.productA.name}</dt>
                  <dd className="tabular-nums">{formatPrice(combo.productA.sellingPrice)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">{combo.productB.name}</dt>
                  <dd className="tabular-nums">{formatPrice(combo.productB.sellingPrice)}</dd>
                </div>
                {saving > 0 && (
                  <div className="flex items-center justify-between gap-4 text-brand-strong">
                    <dt>Set saving</dt>
                    <dd className="tabular-nums">-{formatPrice(saving)}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4 border-t border-border pt-3 text-base">
                  <dt>Together</dt>
                  <dd className="tabular-nums">
                    {saving > 0 && <span className="mr-2 text-sm text-muted-foreground line-through">{formatPrice(total)}</span>}
                    {formatPrice(setPrice)}
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">
                Prices include VAT. The set saving is applied at checkout. Delivered {DELIVERY_ESTIMATE}, complimentary over {FREE_SHIPPING_THRESHOLD_DISPLAY}.
              </p>
            </div>

            <button
              type="button"
              disabled={!canAdd}
              onClick={handleAddCombo}
              className="flex h-12 w-full items-center justify-center gap-2 bg-foreground font-heading text-[11px] uppercase tracking-[0.22em] text-background transition-colors hover:bg-brand hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-foreground disabled:hover:text-background"
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Added to bag
                </>
              ) : canAdd ? (
                "Add the set to bag"
              ) : (
                "Select options for both pieces"
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-6 py-8 text-center md:px-12">
        <Link
          href="/shop"
          className="font-heading text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  )
}

export function ComboClient({ id, initialCombo }: { id: string; initialCombo?: Combo }) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  const {
    data: combo,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["combo", id],
    queryFn: async () => {
      const res = await fetch(`/api/combo/${id}`)
      if (!res.ok) throw new Error("This set is no longer available.")
      return (await res.json()) as Combo
    },
    initialData: initialCombo,
    enabled: initialCombo === undefined,
    staleTime: 1000 * 60 * 5,
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24" aria-busy="true">
        <div className="grid grid-cols-1 gap-px lg:grid-cols-2">
          <div className="aspect-square animate-pulse bg-muted" />
          <div className="aspect-square animate-pulse bg-muted/70" />
        </div>
      </div>
    )
  }

  if (error || !combo) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="space-y-4 text-center">
          <p className="font-heading text-[10px] font-medium uppercase tracking-[0.3em] text-brand-strong">Complete the set</p>
          <h1 className="font-display text-3xl font-light">This set is no longer available</h1>
          <p className="text-sm text-muted-foreground">Each piece may still be available on its own.</p>
          <Link
            href="/shop"
            className="inline-flex h-11 items-center justify-center bg-foreground px-8 font-heading text-[11px] uppercase tracking-[0.22em] text-background transition-colors hover:bg-brand hover:text-neutral-950"
          >
            Shop all
          </Link>
        </div>
      </div>
    )
  }

  return <ComboDetail key={combo.id} combo={combo} />
}
