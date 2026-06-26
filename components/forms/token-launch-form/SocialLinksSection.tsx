"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { TokenFormSchemaType } from "./schema";
import { Link, Globe } from "lucide-react";
import { XLogo, TelegramLogo, DiscordLogo } from "@/components/icons";

interface SocialLinksSectionProps {
  register: UseFormRegister<TokenFormSchemaType>;
  errors: FieldErrors<TokenFormSchemaType>;
  isLoading: boolean;
}

export function SocialLinksSection({ register, errors, isLoading }: SocialLinksSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Link className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Social Links</CardTitle>
        </div>
        <CardDescription>Optional social media links for your token</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="websiteUrl" className="flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Website URL
            </Label>
            <Input id="websiteUrl" type="url" placeholder="https://your-website.com" {...register("websiteUrl")} disabled={isLoading} />
            {errors.websiteUrl && <p className="text-sm text-destructive">{errors.websiteUrl.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="twitterUrl" className="flex items-center gap-1.5">
              <XLogo className="h-4 w-4 text-muted-foreground" />
              Twitter/X URL
            </Label>
            <Input id="twitterUrl" type="url" placeholder="https://twitter.com/yourtoken" {...register("twitterUrl")} disabled={isLoading} />
            {errors.twitterUrl && <p className="text-sm text-destructive">{errors.twitterUrl.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="telegramUrl" className="flex items-center gap-1.5">
              <TelegramLogo className="h-4 w-4 text-muted-foreground" />
              Telegram URL
            </Label>
            <Input id="telegramUrl" type="url" placeholder="https://t.me/yourtoken" {...register("telegramUrl")} disabled={isLoading} />
            {errors.telegramUrl && <p className="text-sm text-destructive">{errors.telegramUrl.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="discordUrl" className="flex items-center gap-1.5">
              <DiscordLogo className="h-4 w-4 text-muted-foreground" />
              Discord URL
            </Label>
            <Input id="discordUrl" type="url" placeholder="https://discord.gg/yourtoken" {...register("discordUrl")} disabled={isLoading} />
            {errors.discordUrl && <p className="text-sm text-destructive">{errors.discordUrl.message}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
