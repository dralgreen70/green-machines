import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-green-600 via-green-500 to-cyan-500 text-white overflow-hidden">
      {/* Wave background */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
        <svg
          className="relative block w-[200%] h-20 wave-animation"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,60 C150,90 350,0 600,60 C850,120 1050,30 1200,60 L1200,120 L0,120 Z"
            fill="rgba(240,253,244,0.3)"
          />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
        <svg
          className="relative block w-[200%] h-16 wave-animation-slow"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,80 C200,40 400,100 600,60 C800,20 1000,80 1200,50 L1200,120 L0,120 Z"
            fill="rgba(240,253,244,0.5)"
          />
        </svg>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-20 md:py-28 text-center">
        <div className="text-6xl mb-4">🏊‍♀️</div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4 drop-shadow-lg">
          Green Machines
        </h1>
        <p className="text-xl md:text-2xl font-medium text-green-50 max-w-2xl mx-auto mb-6">
          Making waves, breaking records, and having a blast in the pool.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <a
            href="#swimmers"
            className="bg-white text-green-700 font-bold px-6 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            Meet the Swimmers
          </a>
          <Link
            href="/race"
            className="bg-green-800 text-white font-bold px-6 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-green-400"
          >
            Race Simulator
          </Link>
        </div>
      </div>
    </section>
  );
}
