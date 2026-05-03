import { type ChangeEvent, useEffect, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import type { CandidateCitySlug } from "@/src/data/mockCandidates"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { CameriereTag } from "./types"
import { dispatchStaffListInvalidated } from "./staff-events"
import { uploadStaffCrmAvatar, upsertStaff } from "./staff-repository"

/** Allineato a `staff_email_format_check` in migrazione `20260501000040_create_staff.sql`. */
const STAFF_EMAIL_PG_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Ordine stabile DB/UI e per `staff_tags_subset_check`. */
const CAMERIERE_TAGS_ORDER = ["automunito", "esperienza", "multilingue", "fuori_sede"] as const satisfies readonly CameriereTag[]

const CAMERIERE_TAG_LABELS: Record<CameriereTag, string> = {
  automunito: "Automunito",
  esperienza: "Esperienza",
  multilingue: "Multilingue",
  fuori_sede: "Fuori sede",
}

const cameriereTagEnum = z.enum(CAMERIERE_TAGS_ORDER)

const createCameriereFormSchema = z.object({
  firstName: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "Il nome è obbligatorio.").max(80, "Massimo 80 caratteri.")),
  lastName: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "Il cognome è obbligatorio.").max(80, "Massimo 80 caratteri.")),
  email: z
    .string()
    .transform((s) => s.trim())
    .superRefine((val, ctx) => {
      if (val.length === 0) return
      if (!STAFF_EMAIL_PG_REGEX.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Formato email non valido.",
        })
      }
    }),
  phone: z
    .string()
    .transform((s) => s.trim())
    .superRefine((val, ctx) => {
      if (val.length === 0) return
      if (val.length < 4 || val.length > 40) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Il telefono deve avere tra 4 e 40 caratteri.",
        })
      }
    }),
  tags: z
    .array(cameriereTagEnum)
    .transform((tags) =>
      [...new Set(tags)].sort(
        (a, b) => CAMERIERE_TAGS_ORDER.indexOf(a) - CAMERIERE_TAGS_ORDER.indexOf(b),
      ),
    ),
  isActive: z.boolean(),
})

export type CreateCameriereFormValues = z.input<typeof createCameriereFormSchema>
export type CreateCameriereFormParsed = z.output<typeof createCameriereFormSchema>

const defaultValues: CreateCameriereFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  tags: [],
  isActive: true,
}

type CreateCameriereDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  city: CandidateCitySlug
}

/** Dialog creazione cameriere da CRM (`public.staff` senza candidato origine). */
export function CreateCameriereDialog({ open, onOpenChange, city }: CreateCameriereDialogProps) {
  const form = useForm<CreateCameriereFormValues, unknown, CreateCameriereFormParsed>({
    resolver: zodResolver(createCameriereFormSchema),
    defaultValues,
    mode: "onChange",
  })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  /** URL da `createObjectURL` da revocare; separato da `photoPreviewUrl` stato per cleanup su unmount. */
  const photoObjectUrlRef = useRef<string | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  useEffect(() => {
    return () => {
      if (photoObjectUrlRef.current) {
        URL.revokeObjectURL(photoObjectUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!open) {
      if (photoObjectUrlRef.current) {
        URL.revokeObjectURL(photoObjectUrlRef.current)
        photoObjectUrlRef.current = null
      }
      setPhotoPreviewUrl(null)
      setPhotoFile(null)
      form.reset(defaultValues)
      setSubmitError(null)
      if (photoInputRef.current) photoInputRef.current.value = ""
    }
  }, [open, form])

  function onAvatarFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    if (photoObjectUrlRef.current) {
      URL.revokeObjectURL(photoObjectUrlRef.current)
    }
    photoObjectUrlRef.current = objectUrl
    setPhotoPreviewUrl(objectUrl)
    setPhotoFile(file)
    setSubmitError(null)
  }

  function clearAvatarSelection() {
    if (photoObjectUrlRef.current) {
      URL.revokeObjectURL(photoObjectUrlRef.current)
      photoObjectUrlRef.current = null
    }
    setPhotoPreviewUrl(null)
    setPhotoFile(null)
    if (photoInputRef.current) photoInputRef.current.value = ""
  }

  async function onSubmit(data: CreateCameriereFormParsed) {
    setSubmitError(null)
    try {
      let avatarUrl: string | undefined
      if (photoFile) {
        try {
          avatarUrl = await uploadStaffCrmAvatar(photoFile)
        } catch (uploadErr) {
          const uploadMsg =
            uploadErr instanceof Error ? uploadErr.message : "Caricamento foto non riuscito."
          toast.error(uploadMsg)
          setSubmitError(uploadMsg)
          return
        }
      }
      await upsertStaff({
        city,
        firstName: data.firstName,
        lastName: data.lastName,
        ...(avatarUrl ? { avatarUrl } : {}),
        email: data.email || undefined,
        phone: data.phone || undefined,
        isActive: data.isActive,
        tags: data.tags,
      })
      toast.success("Cameriere creato.")
      dispatchStaffListInvalidated()
      form.reset(defaultValues)
      clearAvatarSelection()
      onOpenChange(false)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Creazione non riuscita.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-city={city}>
        <DialogHeader>
          <DialogTitle>Crea Cameriere</DialogTitle>
          <DialogDescription>
            Aggiungi un cameriere per questa sede. Puoi compilare anche i contatti ora o in seguito dal dettaglio.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
            className="flex flex-col gap-4"
            aria-label="Form creazione cameriere"
          >
            {submitError ? (
              <Alert variant="destructive">
                <AlertTitle>Operazione non completata</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">{submitError}</AlertDescription>
              </Alert>
            ) : null}
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="given-name" placeholder="Nome" aria-required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cognome</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="family-name" placeholder="Cognome" aria-required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" autoComplete="email" placeholder="nome@azienda.it" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono</FormLabel>
                  <FormControl>
                    <Input {...field} type="tel" autoComplete="tel" placeholder="+39 …" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-2">
              <Label htmlFor="create-cameriere-avatar-trigger">Foto profilo (opzionale)</Label>
              <input
                ref={photoInputRef}
                id="create-cameriere-avatar-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={onAvatarFileSelected}
                aria-label="Scegli foto profilo"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <button
                  id="create-cameriere-avatar-trigger"
                  type="button"
                  disabled={form.formState.isSubmitting}
                  onClick={() => photoInputRef.current?.click()}
                  className="relative flex h-28 w-full max-w-[11rem] shrink-0 overflow-hidden rounded-lg border bg-muted/20 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  aria-label={photoPreviewUrl ? "Sostituisci foto profilo" : "Aggiungi foto profilo"}
                >
                  {photoPreviewUrl ? (
                    <img
                      src={photoPreviewUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
                      Clicca per aggiungere
                    </span>
                  )}
                </button>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    JPEG, PNG o WebP, massimo 5 MB.
                  </p>
                  {photoFile ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={form.formState.isSubmitting}
                      onClick={clearAvatarSelection}
                      aria-label="Rimuovi foto profilo selezionata"
                    >
                      Rimuovi immagine
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tag</FormLabel>
                  <div className="grid gap-2 rounded-md border p-3">
                    {CAMERIERE_TAGS_ORDER.map((tag) => {
                      const id = `create-cameriere-tag-${tag}`
                      const selected = field.value.includes(tag)
                      return (
                        <div key={tag} className="flex items-start gap-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              id={id}
                              checked={selected}
                              onCheckedChange={(checked) => {
                                const on = checked === true
                                const nextSet = new Set<CameriereTag>(field.value)
                                if (on) nextSet.add(tag)
                                else nextSet.delete(tag)
                                field.onChange(CAMERIERE_TAGS_ORDER.filter((t) => nextSet.has(t)))
                              }}
                            />
                          </FormControl>
                          <Label htmlFor={id} className="cursor-pointer font-normal leading-snug peer-disabled:cursor-not-allowed">
                            {CAMERIERE_TAG_LABELS[tag]}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <Label htmlFor="create-cameriere-active">Profilo attivo</Label>
                      <p className="text-xs text-muted-foreground">
                        Disattiva se il dipendente non è ancora operativo in sede.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        id="create-cameriere-active"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Profilo attivo"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={form.formState.isSubmitting}
                onClick={() => onOpenChange(false)}
              >
                Chiudi
              </Button>
              <Button type="submit" disabled={!form.formState.isValid || form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creazione...
                  </>
                ) : (
                  "Crea"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
