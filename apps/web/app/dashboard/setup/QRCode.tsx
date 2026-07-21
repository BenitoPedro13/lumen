"use client";

import { QRCodeSVG } from "qrcode.react";

export function QRCode({ value }: { value: string }) {
  return <QRCodeSVG value={value} size={200} marginSize={2} />;
}
