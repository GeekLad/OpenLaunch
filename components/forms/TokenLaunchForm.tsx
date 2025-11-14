"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TokenFormData } from "@/types/token";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getMaxImageSizeBytes, getMaxImageSizeMB } from "@/lib/services/ipfsService";
import { validateAndParsePrivateKey } from "@/lib/utils/keypairUtils";

const tokenFormSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").max(10, "Symbol must be 10 characters or less"),
  name: z.string().min(1, "Name is required").max(32, "Name must be 32 characters or less"),
  description: z.string().optional(),
  logoFile: z.instanceof(File, { message: "Logo image is required" }),
  enableFeeScheduler: z.boolean(),
  startingFeeRate: z.number().min(0.01).max(100),
  endingFeeRate: z.number().min(0.01).max(100),
  enableTimedLaunch: z.boolean(),
  launchDateTime: z.date().nullable().optional(),
  enableCustomPrivateKey: z.boolean(),
  customPrivateKey: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  telegramUrl: z.string().url().optional().or(z.literal("")),
  discordUrl: z.string().url().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  // Validate custom private key only if enabled
  if (data.enableCustomPrivateKey) {
    const privateKey = data.customPrivateKey?.trim();

    // Check if private key is provided
    if (!privateKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Private key is required when custom key is enabled",
        path: ["customPrivateKey"],
      });
      return;
    }

    // Validate the private key format
    const result = validateAndParsePrivateKey(privateKey);
    if (!result.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || "Invalid private key format",
        path: ["customPrivateKey"],
      });
    }
  }
});

type TokenFormSchemaType = z.infer<typeof tokenFormSchema>;

interface TokenLaunchFormProps {
  onSubmit: (data: TokenFormData) => void;
  isLoading?: boolean;
}

export function TokenLaunchForm({ onSubmit, isLoading = false }: TokenLaunchFormProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [fileSizeWarning, setFileSizeWarning] = useState<string | null>(null);
  const [enableFeeScheduler, setEnableFeeScheduler] = useState(true);
  const [enableTimedLaunch, setEnableTimedLaunch] = useState(false);
  const [enableCustomPrivateKey, setEnableCustomPrivateKey] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TokenFormSchemaType>({
    resolver: zodResolver(tokenFormSchema),
    defaultValues: {
      enableFeeScheduler: true,
      startingFeeRate: 50,
      endingFeeRate: 0.25,
      enableTimedLaunch: false,
      enableCustomPrivateKey: false,
    },
  });

  const logoFile = watch("logoFile");
  const symbol = watch("symbol");
  const name = watch("name");

  // Check if all required fields are filled
  const isFormValid = !!(symbol && name && logoFile && !fileSizeWarning);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (configurable via environment variable, default 1MB)
      const maxSize = getMaxImageSizeBytes();
      const maxSizeMB = getMaxImageSizeMB();
      if (file.size > maxSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        setFileSizeWarning(`Warning: File size is ${fileSizeMB}MB. Maximum allowed size is ${maxSizeMB}MB. Please select a smaller image.`);
        setLogoPreview(null);
        return;
      }

      setFileSizeWarning(null);
      setValue("logoFile", file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (data: TokenFormSchemaType) => {
    const formData: TokenFormData = {
      symbol: data.symbol,
      name: data.name,
      description: data.description,
      logoFile: data.logoFile,
      enableFeeScheduler: data.enableFeeScheduler,
      startingFeeRate: data.startingFeeRate,
      endingFeeRate: data.endingFeeRate,
      enableTimedLaunch: data.enableTimedLaunch,
      launchDateTime: data.launchDateTime ?? null,
      enableCustomPrivateKey: data.enableCustomPrivateKey,
      customPrivateKey: data.customPrivateKey,
      websiteUrl: data.websiteUrl,
      twitterUrl: data.twitterUrl,
      telegramUrl: data.telegramUrl,
      discordUrl: data.discordUrl,
    };
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Token Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Token Information</CardTitle>
          <CardDescription>Basic information about your meme token</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Token Symbol *</Label>
              <Input
                id="symbol"
                placeholder="e.g., DOGE"
                {...register("symbol")}
                disabled={isLoading}
              />
              {errors.symbol && (
                <p className="text-sm text-destructive">{errors.symbol.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Token Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Dogecoin"
                {...register("name")}
                disabled={isLoading}
              />
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
                <img src={logoPreview} alt="Logo preview" className="h-24 w-24 rounded-lg object-cover" />
              </div>
            )}
            {errors.logoFile && (
              <p className="text-sm text-destructive">{errors.logoFile.message as string}</p>
            )}
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
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Launch Time Section */}
      <Card>
        <CardHeader>
          <CardTitle>Launch Time</CardTitle>
          <CardDescription>Schedule when your token becomes tradeable</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enableTimedLaunch"
              {...register("enableTimedLaunch")}
              checked={enableTimedLaunch}
              onChange={(e) => setEnableTimedLaunch(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4"
            />
            <Label htmlFor="enableTimedLaunch">Enable Timed Launch</Label>
          </div>

          {enableTimedLaunch && (
            <div className="space-y-2">
              <Label htmlFor="launchDateTime">Launch Date & Time</Label>
              <Input
                id="launchDateTime"
                type="datetime-local"
                {...register("launchDateTime", {
                  valueAsDate: true,
                })}
                disabled={isLoading}
              />
              {errors.launchDateTime && (
                <p className="text-sm text-destructive">{errors.launchDateTime.message}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fee Schedule Section */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Schedule</CardTitle>
          <CardDescription>Configure dynamic fee scheduling for your token</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enableFeeScheduler"
              {...register("enableFeeScheduler")}
              checked={enableFeeScheduler}
              onChange={(e) => setEnableFeeScheduler(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4"
            />
            <Label htmlFor="enableFeeScheduler">Enable Fee Scheduler</Label>
          </div>

          {enableFeeScheduler && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startingFeeRate">Starting Fee Rate (%)</Label>
                <Input
                  id="startingFeeRate"
                  type="number"
                  step="0.01"
                  {...register("startingFeeRate", { valueAsNumber: true })}
                  disabled={isLoading}
                />
                {errors.startingFeeRate && (
                  <p className="text-sm text-destructive">{errors.startingFeeRate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endingFeeRate">Ending Fee Rate (%)</Label>
                <Input
                  id="endingFeeRate"
                  type="number"
                  step="0.01"
                  {...register("endingFeeRate", { valueAsNumber: true })}
                  disabled={isLoading}
                />
                {errors.endingFeeRate && (
                  <p className="text-sm text-destructive">{errors.endingFeeRate.message}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Socials Section */}
      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
          <CardDescription>Optional social media links for your token</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website URL</Label>
            <Input
              id="websiteUrl"
              type="url"
              placeholder="https://your-website.com"
              {...register("websiteUrl")}
              disabled={isLoading}
            />
            {errors.websiteUrl && (
              <p className="text-sm text-destructive">{errors.websiteUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitterUrl">Twitter/X URL</Label>
            <Input
              id="twitterUrl"
              type="url"
              placeholder="https://twitter.com/yourtoken"
              {...register("twitterUrl")}
              disabled={isLoading}
            />
            {errors.twitterUrl && (
              <p className="text-sm text-destructive">{errors.twitterUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegramUrl">Telegram URL</Label>
            <Input
              id="telegramUrl"
              type="url"
              placeholder="https://t.me/yourtoken"
              {...register("telegramUrl")}
              disabled={isLoading}
            />
            {errors.telegramUrl && (
              <p className="text-sm text-destructive">{errors.telegramUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="discordUrl">Discord URL</Label>
            <Input
              id="discordUrl"
              type="url"
              placeholder="https://discord.gg/yourtoken"
              {...register("discordUrl")}
              disabled={isLoading}
            />
            {errors.discordUrl && (
              <p className="text-sm text-destructive">{errors.discordUrl.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings Section */}
      <Card className={enableCustomPrivateKey ? "border-red-500 border-2" : ""}>
        <CardHeader>
          <CardTitle className="text-red-600">⚠️ Advanced Settings</CardTitle>
          <CardDescription className="text-red-600">
            Only use these settings if you know what you are doing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enableCustomPrivateKey"
              {...register("enableCustomPrivateKey")}
              checked={enableCustomPrivateKey}
              onChange={(e) => setEnableCustomPrivateKey(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4"
            />
            <Label htmlFor="enableCustomPrivateKey" className="font-semibold">
              Use Custom Private Key for Token Mint
            </Label>
          </div>

          {enableCustomPrivateKey && (
            <div className="space-y-2 p-4 bg-red-50 border border-red-300 rounded-md">
              <div className="flex items-start space-x-2 mb-3">
                <span className="text-red-600 font-bold text-lg">⚠️</span>
                <div className="text-sm text-red-700">
                  <p className="font-bold mb-1">SECURITY WARNING:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Only use this if you have a specific private key you want to use</li>
                    <li>Never share your private key with anyone</li>
                    <li>Make sure you are on a secure connection</li>
                    <li>Your private key will not be stored or transmitted anywhere</li>
                  </ul>
                </div>
              </div>

              <Label htmlFor="customPrivateKey" className="font-semibold">
                Private Key (JSON Array or Base58 format)
              </Label>
              <textarea
                id="customPrivateKey"
                placeholder='Either: [1,2,3,...] (64 bytes) OR "5K..." (base58)'
                {...register("customPrivateKey")}
                disabled={isLoading}
                className={`flex min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono ${
                  errors.customPrivateKey
                    ? "border-destructive focus-visible:ring-destructive"
                    : "border-red-300 focus-visible:ring-red-500"
                }`}
              />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Accepts two formats:
                <br />
                1. JSON array: [1,2,3,4,...] (64 numbers, 0-255)
                <br />
                2. Base58: 5K... (base58-encoded string)
              </p>
              {errors.customPrivateKey && (
                <p className="text-sm text-destructive">{errors.customPrivateKey.message}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={isLoading || !isFormValid}>
        {isLoading ? "Launching..." : "Launch Token"}
      </Button>
    </form>
  );
}
