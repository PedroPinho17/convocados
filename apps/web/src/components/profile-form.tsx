"use client";

import { useState } from "react";
import {
  PREFERRED_FEET,
  PREFERRED_FOOT_LABELS,
  PREFERRED_POSITION_LABELS,
  PREFERRED_POSITIONS,
  type PlayerProfileDto,
  type PreferredFoot,
  type PreferredPosition,
  type UpdateProfileInput,
} from "@convocados/shared";
import { ApiError, updateMyProfile } from "@/lib/api";
import { Button, Notice, inputClass, labelClass } from "@/components/ui";

type Props = {
  profile: PlayerProfileDto;
  onSaved: (profile: PlayerProfileDto) => void;
};

export function ProfileForm({ profile, onSaved }: Props) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [preferredPosition, setPreferredPosition] = useState<PreferredPosition | "">(
    profile.preferredPosition ?? "",
  );
  const [preferredFoot, setPreferredFoot] = useState<PreferredFoot | "">(
    profile.preferredFoot ?? "",
  );
  const [city, setCity] = useState(profile.city ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    setPending(true);
    const input: UpdateProfileInput = {
      displayName: displayName.trim(),
      preferredPosition: preferredPosition === "" ? null : preferredPosition,
      preferredFoot: preferredFoot === "" ? null : preferredFoot,
      city: city.trim() === "" ? null : city.trim(),
      bio: bio.trim() === "" ? null : bio.trim(),
    };
    try {
      onSaved(await updateMyProfile(input));
      setOk(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível guardar o perfil.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className={labelClass}>
        Nome
        <input
          className={inputClass}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
          required
          autoComplete="nickname"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Posição preferida
          <select
            className={inputClass}
            value={preferredPosition}
            onChange={(e) => setPreferredPosition(e.target.value as PreferredPosition | "")}
          >
            <option value="">Sem preferência</option>
            {PREFERRED_POSITIONS.map((p) => (
              <option key={p} value={p}>
                {PREFERRED_POSITION_LABELS[p]}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Pé preferido
          <select
            className={inputClass}
            value={preferredFoot}
            onChange={(e) => setPreferredFoot(e.target.value as PreferredFoot | "")}
          >
            <option value="">Sem preferência</option>
            {PREFERRED_FEET.map((f) => (
              <option key={f} value={f}>
                {PREFERRED_FOOT_LABELS[f]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={labelClass}>
        Cidade
        <input
          className={inputClass}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          maxLength={80}
          autoComplete="address-level2"
        />
      </label>

      <label className={labelClass}>
        Bio
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={280}
          rows={3}
        />
        <span className="text-xs font-normal text-muted">{bio.length}/280</span>
      </label>

      {error ? (
        <Notice tone="danger" role="alert">
          {error}
        </Notice>
      ) : null}
      {ok ? (
        <Notice tone="ok" role="status">
          Perfil guardado.
        </Notice>
      ) : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "A guardar…" : "Guardar perfil"}
      </Button>
    </form>
  );
}
