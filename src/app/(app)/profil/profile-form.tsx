"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Field, SubmitButton, TextArea } from "@/components/form";
import { Notice } from "@/components/notice";
import { LANGUAGES, MAX_TEXT_LENGTH, type BrandProfile } from "@/lib/brand-profile";
import { saveProfile, type SaveProfileState } from "./actions";

const INITIAL_STATE: SaveProfileState = { status: "idle" };

export function ProfileForm({ profile }: { profile: BrandProfile | null }) {
  const [state, save, pending] = useActionState(saveProfile, INITIAL_STATE);
  // «Lagret» skal forsvinne så snart noe endres igjen, så den ikke lyver.
  const [changedSinceSave, setChangedSinceSave] = useState(false);

  // Sendes manuelt, så React ikke tømmer feltene etter lagring.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setChangedSinceSave(false);
    startTransition(() => save(formData));
  }

  return (
    <form onSubmit={handleSubmit} onChange={() => setChangedSinceSave(true)} className="flex flex-col gap-5">
      <Field
        label="Nettside"
        name="website_url"
        inputMode="url"
        autoComplete="url"
        placeholder="dinbedrift.no"
        defaultValue={profile?.website_url ?? ""}
      />
      <TextArea
        label="Tone"
        name="tone"
        hint="Hvordan skal dere høres ut? For eksempel vennlig, faglig eller uformell."
        maxLength={MAX_TEXT_LENGTH}
        defaultValue={profile?.tone ?? ""}
      />
      <TextArea
        label="Målgruppe"
        name="audience"
        hint="Hvem skriver dere til?"
        maxLength={MAX_TEXT_LENGTH}
        defaultValue={profile?.audience ?? ""}
      />
      <TextArea
        label="Produkter og tjenester"
        name="products"
        hint="Det dere selger, og hva som skiller dere fra andre."
        maxLength={MAX_TEXT_LENGTH}
        defaultValue={profile?.products ?? ""}
      />
      <TextArea
        label="Unngå"
        name="avoid"
        hint="Ord, temaer eller påstander som aldri skal brukes."
        maxLength={MAX_TEXT_LENGTH}
        defaultValue={profile?.avoid ?? ""}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="language" className="text-sm font-semibold">
          Språk i innleggene
        </label>
        <select
          id="language"
          name="language"
          defaultValue={profile?.language ?? "nb"}
          className="w-full rounded-xl border border-line bg-paper px-3.5 py-3 text-base text-ink"
        >
          {LANGUAGES.map((language) => (
            <option key={language.value} value={language.value}>
              {language.label}
            </option>
          ))}
        </select>
      </div>

      {!pending && state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      {!pending && state.status === "saved" && !changedSinceSave ? (
        <Notice tone="success">
          Profilen er lagret. <Link href="/dashboard" className="underline underline-offset-2">Se hva som gjenstår på oversikten</Link>.
        </Notice>
      ) : null}

      <div>
        <SubmitButton disabled={pending}>{pending ? "Lagrer …" : "Lagre profilen"}</SubmitButton>
      </div>
    </form>
  );
}
