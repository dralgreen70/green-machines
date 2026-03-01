interface SwimmerCardProps {
  name: string;
  age: number;
  team: string;
  bio: string;
  accent: string;
}

export default function SwimmerCard({
  name,
  age,
  team,
  bio,
  accent,
}: SwimmerCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-lg overflow-hidden border-t-4 hover:shadow-xl transition-shadow ${accent}`}
    >
      {/* Photo placeholder */}
      <div className="bg-gradient-to-br from-green-100 to-cyan-100 h-56 flex items-center justify-center">
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-green-300 to-cyan-300 flex items-center justify-center text-5xl shadow-inner">
          🏊‍♀️
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-1">{name}</h3>
        <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            Age {age}
          </span>
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {team}
          </span>
        </div>
        <p className="text-gray-600 leading-relaxed">{bio}</p>
      </div>
    </div>
  );
}
