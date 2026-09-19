import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

function Services() {
  const { isAuthenticated } = useAuth();

  const services = [
    {
      id: 'seeds',
      title: 'Seed Buying',
      categoryBadge: 'Agricultural Inputs',
      icon: '🌱',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      description: 'Find and purchase seeds suited to your farming needs.',
      details: [
        'Certified local crop varieties and saplings',
        'Transparent quantity, variety & pricing details',
        'Direct connection with registered seed producers',
      ],
      ctaText: 'Explore Seeds',
      ctaLink: isAuthenticated ? '/dashboard' : '/register',
    },
    {
      id: 'tools',
      title: 'Tool Renting',
      categoryBadge: 'Machinery Sharing',
      icon: '🚜',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      description: 'Access farming equipment without needing to purchase it outright.',
      details: [
        'Hourly and daily rental rates',
        'Tractors, tillers, sprayers & harvesting equipment',
        'Reduce capital expenditure on machinery',
      ],
      ctaText: 'Explore Tools',
      ctaLink: isAuthenticated ? '/dashboard' : '/register',
    },
    {
      id: 'crops',
      title: 'Crop Selling',
      categoryBadge: 'Direct Harvest Linkage',
      icon: '🌾',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      description: 'List your crops and connect with people looking to purchase agricultural produce.',
      details: [
        'Specify harvest date, quantity & grade quality',
        'Fair market pricing without middleman markups',
        'Reach local markets and cooperative buyers',
      ],
      ctaText: 'Sell Your Crops',
      ctaLink: isAuthenticated ? '/dashboard' : '/register',
    },
  ];

  return (
    <section id="services" className="py-20 bg-gray-50/70 border-t border-gray-200 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
            Platform Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Our Services
          </h2>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
            Three interconnected services providing end-to-end support across sowing, field cultivation, and harvest marketing.
          </p>
        </div>

        {/* 3 Prominent Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-3xl">
                    {item.icon}
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${item.badgeColor}`}
                  >
                    {item.categoryBadge}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  {item.description}
                </p>

                <ul className="space-y-2.5 text-xs text-gray-600 border-t border-gray-100 pt-5 mb-8">
                  {item.details.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold shrink-0">✓</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to={item.ctaLink}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-center text-gray-900 bg-gray-100 hover:bg-emerald-600 hover:text-white transition-colors block"
              >
                {item.ctaText} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Services;
