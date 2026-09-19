function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Create an Account',
      description:
        'Register in seconds with your name, phone number, and farming district location.',
      icon: '👤',
    },
    {
      number: '02',
      title: 'Explore or List Products',
      description:
        'Browse available seed varieties and machinery, or publish your own crops and rental implements.',
      icon: '🔍',
    },
    {
      number: '03',
      title: 'Buy, Rent, or Sell',
      description:
        'Coordinate seed purchases, machinery rentals, and farm-gate crop sales directly with peers.',
      icon: '🤝',
    },
    {
      number: '04',
      title: 'Connect Through SmartFarm',
      description:
        'Strengthen agricultural community ties, reduce cultivation overhead, and increase harvest revenues.',
      icon: '🌾',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-gray-50/70 border-t border-gray-200 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
            Simple Workflow
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            How SmartFarm Works
          </h2>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
            A unified four-step journey connecting farmers, suppliers, and agricultural resource owners.
          </p>
        </div>

        {/* 4-Step Process Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-7 border border-gray-200 shadow-xs relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-extrabold text-emerald-600/30">
                    {step.number}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl">
                    {step.icon}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 text-xs font-semibold text-emerald-600">
                Step {step.number}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
