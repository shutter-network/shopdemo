'use client'
import { StrictMode, useEffect, useState } from "react";
import Image from "next/image";
import Script from 'next/script';
import Metamask from './Metamask';
import Encryptor from './Encryptor';


export default function Home() {
    return (
            <StrictMode>
            <main className="items-center justify-between p-24">
            <Metamask>
            <Encryptor />
            </Metamask>
            </main>
            </StrictMode>
           );
}
