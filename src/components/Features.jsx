function Features() {
  const features = [
    {
      title: 'Unified Agricultural Platform',
      icon: '🌐',
      description:
        'Eliminate fragmented tools. Sourcing seeds, scheduling tools, and selling harvest all happen through a single integrated portal.',
    },
    {
      title: 'Easy Product Listings',
      icon: '📝',
      description:
        'Publish agricultural inventory in minutes with structured category specifications, pricing models, and real-time photo previews.',
    },
    {
      title: 'Location-Based Discovery',
      icon: '📍',
      description:
        'Find available agricultural resources in your immediate farming district to minimize logistics, transit delays, and transport costs.',
    },
    {
      title: 'Simple User Experience',
      icon: '📱',
      description:
        'Designed with mobile-friendly interfaces, clear text, and accessible controls suitable for working in the field.',
    },
    {
      title: 'Secure Authentication',
      icon: '🔒',
      description:
        'Reliable account management powered by Google Firebase Authentication with encrypted credentials and password protection.',
    },
    {
      title: 'One Account for Multiple Activities',
      icon: '🤝',
      description:
        'No artificial divisions between buyers and sellers. Any verified user can list equipment, purchase seeds, and sell fresh produce.',
    },
  ];

  return (
    <section id="features" className="py-20 bg-white border-t border-gray-100 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
            Key Advantages
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Why SmartFarm?
          </h2>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
            Built from the ground up to solve practical daily challenges faced by farmers, agricultural cooperatives, and local producers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="p-7 rounded-2xl bg-gray-50/70 border border-gray-200/80 hover:border-emerald-500/50 hover:bg-white transition-all shadow-xs"
            >
              <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-2xl mb-5 shadow-xs">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
