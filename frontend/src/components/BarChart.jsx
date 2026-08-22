// Simple, dependency-free bar chart. No charting library is used anywhere
// else in this app, so this stays consistent with that (plain CSS bars
// instead of pulling in recharts/chart.js just for this one page).
const BarChart = ({ title, bars }) => {
    const maxValue = Math.max(1, ...bars.map(b => b.value || 0));

    return (
        <div className="panel bar-chart">
            <h3 className="section-heading">{title}</h3>
            <div className="bar-chart__bars">
                {bars.map((bar, idx) => {
                    const heightPercent = Math.round(((bar.value || 0) / maxValue) * 100);
                    return (
                        <div key={idx} className="bar-chart__bar">
                            <span className="bar-chart__bar-value">{bar.value ?? 0}</span>
                            <div className="bar-chart__bar-track">
                                <div
                                    className={`bar-chart__bar-fill ${bar.highlight ? 'bar-chart__bar-fill--highlight' : ''}`}
                                    style={{ height: `${heightPercent}%` }}
                                />
                            </div>
                            <span className="bar-chart__bar-label">{bar.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BarChart;
