// src/components/FeatureCards.tsx

'use client';

const FeatureCards = () => {
    const list = [
        {
            icon: 'icon-[solar--eye-scan-bold]',
            title: 'Read once',
            text: 'Gone forever after viewing'
        },
        {
            icon: 'icon-[solar--shield-bold]',
            title: 'Zero-knowledge',
            text: 'AES-256-GCM in your browser'
        },
        {
            icon: 'icon-[solar--lock-keyhole-bold]',
            title: 'Optional passphrase',
            text: 'Adds a second decryption factor'
        },
        {
            icon: 'icon-[solar--clock-circle-bold]',
            title: 'Self-expiring',
            text: 'Auto-deleted after the TTL'
        },
        {
            icon: 'icon-[mdi--anonymous]',
            title: 'Anonymous',
            text: 'No IP logs or tracking'
        },
        {
            icon: 'icon-[solar--bolt-bold]',
            title: 'No Sign-up',
            text: 'Start sharing instantly'
        }
    ];

    return (
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {list.map(({ icon, title, text }) => (
                <div
                    key={title}
                    className="flex flex-row sm:flex-col items-start sm:items-center gap-3 sm:gap-0 text-left sm:text-center"
                >
                    <span className={`${icon} text-2xl sm:text-3xl text-sky-600 sm:block sm:mb-2 shrink-0 sm:mx-auto`}></span>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-sm">{title}</h3>
                        <p className="text-xs text-stone-500 mt-0.5 sm:mt-1">{text}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default FeatureCards;
