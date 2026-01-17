export default function Gallery() {
    const images = [
        "/public/images/hero-slide-1.png",
        "/public/images/hero-slide-2.png",
        "/public/images/secondary-banner.png",
        "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    ];

    return (
        <div>
            <section className="bg-gray-900 text-white py-20 px-4 text-center">
                <h1 className="text-5xl font-serif font-bold mb-4">Gallery</h1>
                <p className="text-xl text-gray-300">Glimpses of life at Route Guide</p>
            </section>

            <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {images.map((img, idx) => (
                        <div key={idx} className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100 cursor-pointer">
                            <img
                                src={img}
                                alt={`Gallery ${idx}`}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
