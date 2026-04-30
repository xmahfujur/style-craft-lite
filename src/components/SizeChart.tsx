export default function SizeChart() {
  const chartData = [
    { size: 'S', chest: '40+', length: '29', collar: '15' },
    { size: 'M', chest: '42+', length: '30', collar: '15.5' },
    { size: 'L', chest: '44+', length: '31', collar: '16' },
    { size: 'XL', chest: '46+', length: '31', collar: '16.5' },
    { size: 'XXL', chest: '48+', length: '31.5', collar: '17' },
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-3xl p-5 md:p-12 shadow-xl border border-gray-100">
          <h2 className="text-2xl md:text-3xl font-black text-center text-gray-900 mb-8 md:mb-10 uppercase tracking-tight">Size Chart</h2>
          
          <div className="overflow-x-auto custom-scrollbar pb-2">
            <table className="w-full text-left min-w-[500px] md:min-w-0">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="py-4 px-3 font-black uppercase text-gray-400 text-xs md:text-sm whitespace-nowrap">Size</th>
                  <th className="py-4 px-3 font-black uppercase text-gray-400 text-xs md:text-sm whitespace-nowrap">Chest (Inch)</th>
                  <th className="py-4 px-3 font-black uppercase text-gray-400 text-xs md:text-sm whitespace-nowrap">Length (Inch)</th>
                  <th className="py-4 px-3 font-black uppercase text-gray-400 text-xs md:text-sm whitespace-nowrap">Collar (Inch)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {chartData.map((row) => (
                  <tr key={row.size} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 md:py-5 px-3 font-black text-lg md:text-xl text-gray-900">{row.size}</td>
                    <td className="py-4 md:py-5 px-3 font-medium text-gray-600 whitespace-nowrap text-sm md:text-base">{row.chest}</td>
                    <td className="py-4 md:py-5 px-3 font-medium text-gray-600 whitespace-nowrap text-sm md:text-base">{row.length}</td>
                    <td className="py-4 md:py-5 px-3 font-medium text-gray-600 whitespace-nowrap text-sm md:text-base">{row.collar}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-10 p-6 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-amber-800 font-medium text-center">
              * European Measurement. Please check your size carefully before ordering.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
