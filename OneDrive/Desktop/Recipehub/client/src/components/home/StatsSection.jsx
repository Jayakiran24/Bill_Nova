export default function StatsSection() {
  return (
    <section className="bg-black py-16 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* About Card */}
        <div className="bg-[#151515] rounded-3xl p-8 flex flex-col justify-center min-h-[280px]">
          <h2 className="text-white text-4xl font-bold leading-tight mb-6">
            Our Growing <br /> Kitchen
          </h2>

          <p className="text-[#b5a89b] text-base leading-7">
            We're on a mission to democratize fine dining. By connecting top
            talent with passionate foodies, we've created a movement that
            celebrates quality above all else.
          </p>
        </div>

        {/* Right Side Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Master Chefs */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-300 rounded-3xl flex flex-col items-center justify-center min-h-[180px]">
            <h3 className="text-5xl font-bold text-[#3a1700]">500+</h3>
            <p className="uppercase tracking-widest text-xs text-[#5a2800] mt-2">
              Master Chefs
            </p>
          </div>

          {/* Global Recipes */}
          <div className="bg-[#151515] rounded-3xl flex flex-col items-center justify-center min-h-[180px]">
            <h3 className="text-5xl font-bold text-[#f3c3a2]">12k+</h3>
            <p className="uppercase tracking-widest text-xs text-[#a89b90] mt-2">
              Global Recipes
            </p>
          </div>

          {/* Happy Foodies */}
          <div className="bg-[#151515] rounded-3xl flex flex-col items-center justify-center min-h-[180px]">
            <h3 className="text-5xl font-bold text-yellow-400">50k+</h3>
            <p className="uppercase tracking-widest text-xs text-[#a89b90] mt-2">
              Happy Foodies
            </p>
          </div>

          {/* Cities */}
          <div className="bg-[#151515] rounded-3xl p-6 flex flex-col justify-between min-h-[180px]">
            <div>
              <h3 className="text-white text-2xl font-bold mb-3">
                Available in 40+ Cities
              </h3>

              <p className="text-[#a89b90] text-sm leading-6">
                Expanding our flavor footprint across the globe, one city at a
                time.
              </p>
            </div>

            <div className="flex justify-end">
              <div className="w-14 h-14 rounded-full bg-[#2a211d] flex items-center justify-center text-2xl">
                🌍
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
