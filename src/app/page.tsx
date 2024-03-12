"use client";
import { StrictMode, useEffect, useState } from "react";
import Script from "next/script";
import Wallet from "./Wallet";

export default function Home() {
  return (
    <StrictMode>
      <main className="items-center justify-between p-24">
        <Wallet></Wallet>
      </main>
    </StrictMode>
  );
}
