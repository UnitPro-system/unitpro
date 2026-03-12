// components/ui/DynamicFont.tsx
"use client";

import React from "react";

export default function DynamicFont({ font }: { font?: string }) {
  if (!font) return null;

  const formattedFont = font.replace(/\s+/g, "+");
  const fontUrl = `https://fonts.googleapis.com/css2?family=${formattedFont}:wght@300;400;600;700&display=swap`;

  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @import url('${fontUrl}');
      .custom-font-wrapper {
        font-family: '${font}', sans-serif !important;
      }
    `}} />
  );
}