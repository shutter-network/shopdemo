import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'shutter on OPTIMISM Demo',
        short_name: "sh_OP",
        description: "Browser wallet app to send shutterized (encrypted) transactions on a custom OPTIMISM testnet (deployed on Sepolia).",
        start_url: '/',
        display: 'standalone',
        background_color: '#cfcfcf',
        theme_color: '#cfcfcf',
        icons: [
            {
                "src": "/icon-192.png",
                "sizes": "192x192",
                "type": "image/png"
            },
            {
                "src": "/icon-512.png",
                "sizes": "512x512",
                "type": "image/png"
            },
        ],
    }
}
