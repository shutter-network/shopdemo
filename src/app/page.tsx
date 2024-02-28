"use client";
import { StrictMode, useEffect, useState } from "react";
import Script from "next/script";
import Metamask from "./Metamask";

export default function Home() {
  return (
    <StrictMode>
      <main className="items-center justify-between p-24">
        <Metamask></Metamask>
      </main>
    </StrictMode>
  );
}
