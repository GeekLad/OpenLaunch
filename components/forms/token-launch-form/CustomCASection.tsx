"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { TokenFormSchemaType } from "./schema";

interface CustomCASectionProps {
  register: UseFormRegister<TokenFormSchemaType>;
  errors: FieldErrors<TokenFormSchemaType>;
  isLoading: boolean;
  enableCustomPrivateKey: boolean;
  setEnableCustomPrivateKey: (enabled: boolean) => void;
}

export function CustomCASection({
  register,
  errors,
  isLoading,
  enableCustomPrivateKey,
  setEnableCustomPrivateKey,
}: CustomCASectionProps) {
  return (
    <Card className={enableCustomPrivateKey ? "border-red-500 border-2" : ""}>
      <CardHeader>
        <CardTitle className="text-red-600">⚠️ Custom CA</CardTitle>
        <CardDescription className="text-red-600">
          Use a custom keypair for the token mint address. Warning: requires secure key management.
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
          <Label htmlFor="enableCustomPrivateKey" className="font-semibold">Use Custom Private Key for Token Mint</Label>
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

            <Label htmlFor="customPrivateKey" className="font-semibold">Private Key (JSON Array or Base58 format)</Label>
            <textarea
              id="customPrivateKey"
              placeholder='Either: [1,2,3,...] (64 bytes) OR "5K..." (base58)'
              {...register("customPrivateKey")}
              disabled={isLoading}
              className={`flex min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono ${
                errors.customPrivateKey ? "border-destructive focus-visible:ring-destructive" : "border-red-300 focus-visible:ring-red-500"
              }`}
            />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Accepts two formats:<br />
              1. JSON array: [1,2,3,4,...] (64 numbers, 0-255)<br />
              2. Base58: 5K... (base58-encoded string)
            </p>
            {errors.customPrivateKey && <p className="text-sm text-destructive">{errors.customPrivateKey.message}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
