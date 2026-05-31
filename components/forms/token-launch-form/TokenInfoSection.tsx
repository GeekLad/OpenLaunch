"use client";

import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { TokenFormSchemaType } from "./schema";

interface TokenInfoSectionProps {
  register: UseFormRegister<TokenFormSchemaType>;
  errors: FieldErrors<TokenFormSchemaType>;
  isLoading: boolean;
  logoPreview: string | null;
  fileSizeWarning: string | null;
  handleLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function TokenInfoSection({
  register,
  errors,
  isLoading,
  logoPreview,
  fileSizeWarning,
  handleLogoChange,
}: TokenInfoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Information</CardTitle>
        <CardDescription>Basic information about your meme token</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">Token Symbol *</Label>
            <Input id="symbol" placeholder="e.g., DOGE" {...register("symbol")} disabled={isLoading} />
            {errors.symbol && <p className="text-sm text-destructive">{errors.symbol.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Token Name *</Label>
            <Input id="name" placeholder="e.g., Dogecoin" {...register("name")} disabled={isLoading} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="logoFile">Logo Image *</Label>
          <Input
            id="logoFile"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            onChange={handleLogoChange}
            disabled={isLoading}
          />
          {fileSizeWarning && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
              <p className="text-sm text-yellow-800 flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <span>{fileSizeWarning}</span>
              </p>
            </div>
          )}
          {logoPreview && (
            <div className="mt-2">
              <Image src={logoPreview} alt="Logo preview" width={96} height={96} className="h-24 w-24 rounded-lg object-cover" />
            </div>
          )}
          {errors.logoFile && <p className="text-sm text-destructive">{errors.logoFile.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Token Description</Label>
          <textarea
            id="description"
            placeholder="Describe your token..."
            {...register("description")}
            disabled={isLoading}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
