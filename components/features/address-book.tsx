"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, MapPin } from "lucide-react"
import { getSavedShippingAddress, saveShippingAddress } from "@/lib/actions/orders"
import { SHIPPING_EMIRATES } from "@/lib/constants"
import { EMPTY_UAE_ADDRESS, formatUaeAddressLines, fullName, validateUaeAddress, type AddressField, type UaeShippingAddress } from "@/lib/uae"
import { cn } from "@/lib/utils"

const FIELDS: { field: AddressField; label: string; required?: boolean; type?: string; autoComplete?: string; wide?: boolean }[] = [
    { field: "firstName", label: "First name", required: true, autoComplete: "given-name" },
    { field: "lastName", label: "Last name", required: true, autoComplete: "family-name" },
    { field: "email", label: "Email", required: true, type: "email", autoComplete: "email" },
    { field: "phone", label: "Mobile number", required: true, type: "tel", autoComplete: "tel" },
    { field: "area", label: "Area / community", required: true, autoComplete: "address-level2" },
    { field: "building", label: "Building / villa", required: true, autoComplete: "address-line1" },
    { field: "apartment", label: "Apartment / floor", autoComplete: "address-line2" },
    { field: "street", label: "Street" },
    { field: "instructions", label: "Delivery instructions", wide: true },
]

/** Default delivery address used to pre-fill checkout. */
export function AddressBook() {
    const [address, setAddress] = useState<UaeShippingAddress | null>(null)
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState<UaeShippingAddress>(EMPTY_UAE_ADDRESS)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        getSavedShippingAddress()
            .then((result) => {
                if (result) setAddress({ ...EMPTY_UAE_ADDRESS, ...result })
            })
            .finally(() => setLoaded(true))
    }, [])

    const hasAddress = Boolean(address?.area && address?.building)
    const errors = validateUaeAddress(draft)

    const save = async (event: React.FormEvent) => {
        event.preventDefault()
        if (Object.keys(errors).length > 0) {
            setError(Object.values(errors)[0] ?? "Please check the address")
            return
        }
        setSaving(true)
        setError(null)
        const result = await saveShippingAddress(draft)
        setSaving(false)
        if (!result.success) {
            setError(result.error ?? "We couldn't save this address")
            return
        }
        setAddress(draft)
        setEditing(false)
        setSaved(true)
        window.setTimeout(() => setSaved(false), 2500)
    }

    return (
        <section className="mt-10 border border-border/70 p-5 md:p-6" aria-labelledby="address-heading">
            <div className="flex items-center justify-between gap-4">
                <h2 id="address-heading" className="flex items-center gap-2 font-heading text-xs font-medium uppercase tracking-[0.16em]">
                    <MapPin className="h-4 w-4 text-brand-strong" /> Delivery address
                </h2>
                {!editing && loaded && (
                    <button
                        type="button"
                        onClick={() => {
                            setDraft(address ?? EMPTY_UAE_ADDRESS)
                            setEditing(true)
                        }}
                        className="font-heading text-[10px] uppercase tracking-[0.16em] underline underline-offset-4"
                    >
                        {hasAddress ? "Edit" : "Add address"}
                    </button>
                )}
            </div>

            {saved && <p className="mt-3 flex items-center gap-1.5 text-xs text-brand-strong" role="status"><Check className="h-3.5 w-3.5" /> Address saved</p>}

            {!editing ? (
                !loaded ? (
                    <div className="mt-4 h-10 animate-pulse bg-muted" aria-hidden="true" />
                ) : hasAddress && address ? (
                    <address className="mt-4 text-sm not-italic leading-6 text-muted-foreground">
                        <span className="text-foreground">{fullName(address)}</span><br />
                        {formatUaeAddressLines(address).map((line) => <span key={line}>{line}<br /></span>)}
                        {address.phone}
                    </address>
                ) : (
                    <p className="mt-4 text-sm text-muted-foreground">Save an address to check out faster next time.</p>
                )
            ) : (
                <form onSubmit={save} noValidate className="mt-5 grid gap-4 sm:grid-cols-2">
                    {FIELDS.slice(0, 4).map(({ field, label, required, type, autoComplete }) => (
                        <div key={field} className="space-y-1.5">
                            <label htmlFor={`address-${field}`} className="font-heading text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}{required ? " *" : ""}</label>
                            <input id={`address-${field}`} type={type ?? "text"} autoComplete={autoComplete} value={(draft[field] as string) ?? ""} onChange={(e) => setDraft((current) => ({ ...current, [field]: e.target.value }))} className="h-11 w-full border border-input bg-card/60 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                        </div>
                    ))}
                    <div className="space-y-1.5">
                        <label htmlFor="address-emirate" className="font-heading text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Emirate *</label>
                        <select id="address-emirate" value={draft.emirate} onChange={(e) => setDraft((current) => ({ ...current, emirate: e.target.value }))} className="h-11 w-full border border-input bg-card/60 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                            {SHIPPING_EMIRATES.map((emirate) => <option key={emirate}>{emirate}</option>)}
                        </select>
                    </div>
                    {FIELDS.slice(4).map(({ field, label, required, autoComplete, wide }) => (
                        <div key={field} className={cn("space-y-1.5", wide && "sm:col-span-2")}>
                            <label htmlFor={`address-${field}`} className="font-heading text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}{required ? " *" : ""}</label>
                            <input id={`address-${field}`} autoComplete={autoComplete} value={(draft[field] as string) ?? ""} onChange={(e) => setDraft((current) => ({ ...current, [field]: e.target.value }))} className="h-11 w-full border border-input bg-card/60 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                        </div>
                    ))}
                    {error && <p className="text-xs text-destructive sm:col-span-2" role="alert">{error}</p>}
                    <div className="flex gap-3 sm:col-span-2">
                        <button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 bg-foreground px-6 font-heading text-[10px] uppercase tracking-[0.2em] text-background hover:bg-brand hover:text-neutral-950 disabled:opacity-60">
                            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save address
                        </button>
                        <button type="button" onClick={() => { setEditing(false); setError(null) }} className="h-11 px-4 font-heading text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground">
                            Cancel
                        </button>
                    </div>
                </form>
            )}
        </section>
    )
}
