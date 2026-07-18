// src/components/UseCases.tsx

'use client';

const UseCases = () => {
    const list = [
        'Confidential Notes',
        'Server Credentials',
        'SSH Keys',
        'API Keys',
        'License Keys',
        'Wifi Passwords',
        'Database Passwords',
        'Credit Card Details',
        'Cryptocurrency Keys'
    ];

    return (
        <div className="mt-8 bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-center">Common Use Cases</h2>
            <p className="text-sm text-stone-500 text-center mb-5">
                Our tool is trusted by developers, IT professionals, and privacy-conscious individuals for sharing:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
                {list.map((text) => (
                    <span
                        key={text}
                        className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700"
                    >
                        {text}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default UseCases;
