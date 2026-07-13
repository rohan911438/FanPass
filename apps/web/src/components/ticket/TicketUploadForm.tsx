"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { UploadCloud, Wallet as WalletIcon } from "lucide-react";
import { ticketUploadSchema, type Ticket, type TicketUploadInput } from "@fanpass/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/hooks/useWallet";
import { uploadTicket } from "@/lib/api/tickets";

const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function toDatetimeLocalValue(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

interface TicketUploadFormProps {
  onUploaded: (ticket: Ticket) => void;
}

export function TicketUploadForm({ onUploaded }: TicketUploadFormProps) {
  const { address, isConnected } = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<TicketUploadInput>({
    resolver: zodResolver(ticketUploadSchema),
    defaultValues: { eventName: "", eventDate: "", venue: "", seatInfo: "", sellerAddress: address ?? "" },
  });

  const eventDate = useWatch({ control, name: "eventDate" });

  useEffect(() => {
    setValue("sellerAddress", address ?? "", { shouldValidate: true });
  }, [address, setValue]);

  const mutation = useMutation({
    mutationFn: uploadTicket,
    onSuccess: onUploaded,
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    if (!picked) {
      setFile(null);
      setFileError(null);
      return;
    }
    if (!ACCEPTED_FILE_TYPES.includes(picked.type)) {
      setFile(null);
      setFileError("Use a JPEG, PNG, WebP, or PDF file.");
      return;
    }
    if (picked.size > MAX_FILE_BYTES) {
      setFile(null);
      setFileError("File must be under 8MB.");
      return;
    }
    setFile(picked);
    setFileError(null);
  }

  function onSubmit(data: TicketUploadInput) {
    if (!file) {
      setFileError("Upload your ticket (photo, PDF, or QR screenshot) to continue.");
      return;
    }
    if (!address) return;
    mutation.mutate({ ...data, sellerAddress: address, file });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket details</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="eventName">Event name</Label>
            <Input id="eventName" placeholder="World Cup 2026 — Quarterfinal, Match 63" {...register("eventName")} />
            {errors.eventName && <p className="text-xs text-destructive">{errors.eventName.message}</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="venue">Venue</Label>
              <Input id="venue" placeholder="AT&T Stadium, Arlington" {...register("venue")} />
              {errors.venue && <p className="text-xs text-destructive">{errors.venue.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eventDate">Event date &amp; time</Label>
              <Input
                id="eventDate"
                type="datetime-local"
                value={toDatetimeLocalValue(eventDate)}
                onChange={(e) =>
                  setValue("eventDate", e.target.value ? new Date(e.target.value).toISOString() : "", {
                    shouldValidate: true,
                  })
                }
              />
              {errors.eventDate && <p className="text-xs text-destructive">Enter a valid date and time.</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seatInfo">Seat info (optional)</Label>
            <Input id="seatInfo" placeholder="Section 112, Row F, Seat 23" {...register("seatInfo")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sellerAddress">Seller wallet</Label>
            <div className="flex h-9 items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
              <WalletIcon className="size-3.5" />
              {isConnected ? address : "Connect your wallet to continue"}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticketFile">Ticket file</Label>
            <label
              htmlFor="ticketFile"
              className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/30"
            >
              <UploadCloud className="size-6 text-muted-foreground" />
              <span className="text-sm font-medium">{file ? file.name : "Photo, PDF, or QR screenshot"}</span>
              <span className="text-xs text-muted-foreground">JPEG, PNG, WebP, or PDF — up to 8MB</span>
              <input
                id="ticketFile"
                type="file"
                accept={ACCEPTED_FILE_TYPES.join(",")}
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>
            {fileError && <p className="text-xs text-destructive">{fileError}</p>}
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : "Upload failed. Try again."}
            </p>
          )}

          <Button type="submit" disabled={!isConnected || mutation.isPending} className="self-start px-6">
            {mutation.isPending ? "Uploading…" : "Start verification"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
