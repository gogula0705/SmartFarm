function About() {
  return (
    <section id="about" className="py-20 bg-white border-t border-gray-100 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
            Our Purpose
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            About SmartFarm
          </h2>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
            SmartFarm is designed as a unified agricultural platform to reduce fragmentation between essential farming services and make them straightforward to access.
          </p>
        </div>

        {/* Narrative & Solution Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-bold">
              🌱
            </div>
            <h3 className="text-xl font-bold text-gray-900">1. Seed Buying</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Find verified, high-germination seed varieties tailored to regional soil and climate conditions, directly from trusted local growers and suppliers.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold">
              🚜
            </div>
            <h3 className="text-xl font-bold text-gray-900">2. Tool Renting</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Rent specialized farm machinery and implements by the hour or day, lowering operational costs and eliminating heavy capital debt for modern mechanization.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl font-bold">
              🌾
            </div>
            <h3 className="text-xl font-bold text-gray-900">3. Crop Selling</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              List harvested yields with clear quality grading and transparent pricing, connecting producers directly with wholesale and retail buyers.
            </p>
          </div>
        </div>

        {/* Unified Mission Statement Box */}
        <div className="mt-12 p-8 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center max-w-4xl mx-auto">
          <h4 className="text-lg font-bold text-emerald-900 mb-2">
            One Unified Platform for the Entire Community
          </h4>
          <p className="text-sm text-emerald-800 leading-relaxed">
            Unlike traditional systems that divide users into rigid buyer or seller roles, SmartFarm empowers every registered member to both supply surplus resources and acquire what their farm needs to thrive.
          </p>
        </div>
      </div>
    </section>
  );
}

export default About;
