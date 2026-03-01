import Hero from "@/components/Hero";
import SwimmerCard from "@/components/SwimmerCard";
import SwimmerCounter from "@/components/SwimmerCounter";
import TimesDisplay from "@/components/TimesDisplay";
import RequestSwimmer from "@/components/RequestSwimmer";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />

      <SwimmerCounter />

      {/* Swimmer profiles */}
      <section id="swimmers" className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-8">
          Meet the Swimmers
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <SwimmerCard
            name="Mady"
            age={14}
            team="Green Machines"
            bio="Mady is a fierce competitor who thrives in sprint freestyle and butterfly events. Known for her explosive starts and powerful underwaters, she's always chasing her next personal best. When she's not in the pool, she's dreaming about the pool."
            accent="border-green-500"
          />
          <SwimmerCard
            name="Lilly"
            age={12}
            team="Green Machines"
            bio="Lilly is a versatile swimmer with a natural gift for backstroke and breaststroke. Her smooth technique and relentless work ethic make her a standout in every race. She brings energy and determination to every practice and meet."
            accent="border-cyan-500"
          />
        </div>
      </section>

      {/* Times & Progressions */}
      <section className="max-w-5xl mx-auto px-4 pb-12">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-8">
          Times & Progression
        </h2>
        <div className="space-y-12">
          <div className="bg-gray-50 rounded-2xl p-6 md:p-8 border border-gray-100">
            <TimesDisplay swimmerId={1} swimmerName="Mady" />
          </div>
          <div className="bg-gray-50 rounded-2xl p-6 md:p-8 border border-gray-100">
            <TimesDisplay swimmerId={2} swimmerName="Lilly" />
          </div>
        </div>
      </section>

      {/* Request a Swimmer */}
      <section className="max-w-xl mx-auto px-4 pb-12">
        <RequestSwimmer />
      </section>
    </main>
  );
}
