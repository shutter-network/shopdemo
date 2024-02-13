'use client'
import Image from "next/image";
import Script from 'next/script';
import { ShutterOptions, ShutterProvider } from 'shutter-sdk';

async function connect() {  
    if (window.ethereum) {     
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const options = {wasmUrl: "/shutter-crypto.wasm", keyperSetManagerAddress: "0x28f748E7341b4a6D11c1D4BF42A2C70972ddB64b", inboxAddress: "0x28f748E7341b4a6D11c1D4BF42A2C70972ddB64b", keyBroadcastAddress: "0x28f748E7341b4a6D11c1D4BF42A2C70972ddB64b"};
        const provider = new ShutterProvider(options, window.ethereum.url);
        console.log(provider);
        window.provider = provider;
        return provider;

    } else {
        console.log("No wallet");  
    }
}

export function connectionInfo() {
    // while (!window.provider) {
    //     (async () => await connect());
    // }
    if (window.provider) {
        const info = window.provider.getBlock();
        return (info);
    } else {
        const info = "No connection";
        return (info);
    }
}

export default function Home() {
    return (
            <main className="flex min-h-screen flex-col items-center justify-between p-24">
                <button type="button" className="button" onClick={connect}>Connect</button>
                { connectionInfo() }
            </main>
           );
}
