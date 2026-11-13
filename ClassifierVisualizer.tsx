import React, { useState } from 'react';
import {
  DNAFeatures,
  ModelEvaluationResult,
} from '../utils/dnaEngine';

interface ClassifierVisualizerProps {
  trainingFeatures: DNAFeatures[];
  unknownFeatures: DNAFeatures;
  evaluation: ModelEvaluationResult;
}

export const ClassifierVisualizer: React.FC<ClassifierVisualizerProps> = ({
  trainingFeatures,
  unknownFeatures,
  evaluation,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const split = evaluation.primarySplit;
  const queryVal = unknownFeatures[split.featureKey];
  const queryGoesLeft = queryVal <= split.threshold;

  // Coordinate mapping for 2D Feature Space Plot (X: GC Content 0..100%, Y: Sequence Length 4..14 bp)
  const mapX = (gc: number) => 60 + (Math.min(100, Math.max(0, gc)) / 100) * 440;
  const mapY = (len: number) => 200 - ((Math.min(14, Math.max(4, len)) - 4) / 10) * 150;

  const thresholdX =
    split.featureKey === 'gcContent'
      ? mapX(split.threshold)
      : mapX(62.5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 7 Cols: Interactive CART Decision Tree & Split Path */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 mb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Decision Tree Topology &amp; Active Query Traversal
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              CART Gini impurity split trained on {trainingFeatures.length} labelled DNA sequences · Highlighted branch tracks{' '}
              <span className="font-mono font-medium text-slate-800">{unknownFeatures.sequence || 'N/A'}</span>
            </p>
          </div>
          <div className="text-xs font-mono text-slate-600 tabular-nums">
            ΔGini Gain: <span className="font-semibold text-slate-900">{split.infoGain.toFixed(3)}</span>
          </div>
        </div>

        {/* SVG Decision Tree Topology */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox="0 0 620 265"
            className="w-full h-auto min-w-[500px] select-none"
            role="img"
            aria-label="Decision Tree Classification Diagram"
          >
            {/* Background subtle coordinate grid */}
            <defs>
              <pattern id="treeGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect x="0" y="0" width="620" height="265" fill="url(#treeGrid)" rx="6" />

            {/* Left Connector Line (Root -> Left Leaf) */}
            <path
              d="M 310 86 C 310 125, 165 115, 165 154"
              fill="none"
              stroke={queryGoesLeft ? '#0284c7' : '#cbd5e1'}
              strokeWidth={queryGoesLeft ? '3' : '1.5'}
              strokeDasharray={queryGoesLeft ? 'none' : '4 4'}
            />
            {/* Right Connector Line (Root -> Right Leaf) */}
            <path
              d="M 310 86 C 310 125, 455 115, 455 154"
              fill="none"
              stroke={!queryGoesLeft ? '#0284c7' : '#cbd5e1'}
              strokeWidth={!queryGoesLeft ? '3' : '1.5'}
              strokeDasharray={!queryGoesLeft ? 'none' : '4 4'}
            />

            {/* Branch Condition Labels */}
            <g transform="translate(185, 118)">
              <rect
                x="-48"
                y="-11"
                width="96"
                height="22"
                rx="4"
                fill={queryGoesLeft ? '#e0f2fe' : '#f8fafc'}
                stroke={queryGoesLeft ? '#0284c7' : '#cbd5e1'}
                strokeWidth="1"
              />
              <text
                x="0"
                y="4"
                textAnchor="middle"
                className="text-[11px] font-mono"
                fill={queryGoesLeft ? '#0369a1' : '#64748b'}
                fontWeight={queryGoesLeft ? '600' : '400'}
              >
                True (≤ {split.threshold}
                {split.unit})
              </text>
            </g>

            <g transform="translate(435, 118)">
              <rect
                x="-48"
                y="-11"
                width="96"
                height="22"
                rx="4"
                fill={!queryGoesLeft ? '#e0f2fe' : '#f8fafc'}
                stroke={!queryGoesLeft ? '#0284c7' : '#cbd5e1'}
                strokeWidth="1"
              />
              <text
                x="0"
                y="4"
                textAnchor="middle"
                className="text-[11px] font-mono"
                fill={!queryGoesLeft ? '#0369a1' : '#64748b'}
                fontWeight={!queryGoesLeft ? '600' : '400'}
              >
                False (&gt; {split.threshold}
                {split.unit})
              </text>
            </g>

            {/* ROOT NODE */}
            <g transform="translate(190, 14)">
              <rect
                x="0"
                y="0"
                width="240"
                height="72"
                rx="6"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="1.5"
              />
              <text
                x="120"
                y="21"
                textAnchor="middle"
                className="text-[12px] font-mono"
                fill="#0f172a"
                fontWeight="700"
              >
                {split.featureLabel} ≤ {split.threshold}
                {split.unit}
              </text>
              <text
                x="120"
                y="40"
                textAnchor="middle"
                className="text-[11px] font-mono"
                fill="#475569"
              >
                gini = {split.giniBefore.toFixed(3)} · samples = {trainingFeatures.length}
              </text>
              <text
                x="120"
                y="57"
                textAnchor="middle"
                className="text-[11px] font-mono"
                fill="#0284c7"
                fontWeight="600"
              >
                Query {split.featureLabel}: {queryVal}
                {split.unit}
              </text>
            </g>

            {/* LEFT LEAF NODE */}
            <g transform="translate(45, 154)">
              <rect
                x="0"
                y="0"
                width="240"
                height="92"
                rx="6"
                fill={queryGoesLeft ? '#f0f9ff' : '#ffffff'}
                stroke={queryGoesLeft ? '#0284c7' : '#cbd5e1'}
                strokeWidth={queryGoesLeft ? '2' : '1'}
              />
              <text
                x="120"
                y="22"
                textAnchor="middle"
                className="text-[13px] font-sans"
                fill="#0f172a"
                fontWeight="700"
              >
                Predict: {split.leftGroup}
              </text>
              <text
                x="120"
                y="42"
                textAnchor="middle"
                className="text-[11px] font-mono"
                fill="#475569"
              >
                gini = {split.giniLeft.toFixed(3)} · n = {split.leftSamples.length} ({split.leftSamples.join(', ') || 'none'})
              </text>
              <text
                x="120"
                y="62"
                textAnchor="middle"
                className="text-[11px] font-mono"
                fill={queryGoesLeft ? '#0369a1' : '#94a3b8'}
                fontWeight={queryGoesLeft ? '600' : '400'}
              >
                {queryGoesLeft
                  ? `★ Active Match: ${unknownFeatures.sequence} (${queryVal}${split.unit})`
                  : 'Inactive branch for current query'}
              </text>
              <text
                x="120"
                y="80"
                textAnchor="middle"
                className="text-[10px] font-mono"
                fill="#64748b"
              >
                Typical Profile: Balanced AT/GC (~50% GC)
              </text>
            </g>

            {/* RIGHT LEAF NODE */}
            <g transform="translate(335, 154)">
              <rect
                x="0"
                y="0"
                width="240"
                height="92"
                rx="6"
                fill={!queryGoesLeft ? '#f0f9ff' : '#ffffff'}
                stroke={!queryGoesLeft ? '#0284c7' : '#cbd5e1'}
                strokeWidth={!queryGoesLeft ? '2' : '1'}
              />
              <text
                x="120"
                y="22"
                textAnchor="middle"
                className="text-[13px] font-sans"
                fill="#0f172a"
                fontWeight="700"
              >
                Predict: {split.rightGroup}
              </text>
              <text
                x="120"
                y="42"
                textAnchor="middle"
                className="text-[11px] font-mono"
                fill="#475569"
              >
                gini = {split.giniRight.toFixed(3)} · n = {split.rightSamples.length} ({split.rightSamples.join(', ') || 'none'})
              </text>
              <text
                x="120"
                y="62"
                textAnchor="middle"
                className="text-[11px] font-mono"
                fill={!queryGoesLeft ? '#0369a1' : '#94a3b8'}
                fontWeight={!queryGoesLeft ? '600' : '400'}
              >
                {!queryGoesLeft
                  ? `★ Active Match: ${unknownFeatures.sequence} (${queryVal}${split.unit})`
                  : 'Inactive branch for current query'}
              </text>
              <text
                x="120"
                y="80"
                textAnchor="middle"
                className="text-[10px] font-mono"
                fill="#64748b"
              >
                Typical Profile: GC-Enriched (75%–100% GC)
              </text>
            </g>
          </svg>
        </div>

        {/* Step-by-Step Decision Trace */}
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
          <div className="text-xs font-semibold text-slate-700">
            Active Classifier Execution Trace ({evaluation.classifierName})
          </div>
          {evaluation.decisionTrace.map((line, idx) => (
            <p key={idx} className="text-xs text-slate-600 font-mono leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Right 5 Cols: 2D Feature Space Boundary & Feature Importance */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {/* 2D Feature Space Coordinate Plot */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-baseline justify-between gap-2 pb-3 mb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Genomic Feature Space (GC% vs. Length)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Decision boundary at <span className="font-mono">GC = 62.5%</span> separating Group A and Group B
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              Query: ({unknownFeatures.gcContent}%, {unknownFeatures.length}bp)
            </span>
          </div>

          <svg
            viewBox="0 0 530 235"
            className="w-full h-auto select-none cursor-crosshair"
            role="img"
            aria-label="GC Content vs Sequence Length Feature Space Plot"
          >
            {/* Shaded Decision Regions */}
            <rect
              x="60"
              y="20"
              width={Math.max(0, thresholdX - 60)}
              height="180"
              fill="#f0f9ff"
              opacity="0.7"
            />
            <rect
              x={thresholdX}
              y="20"
              width={Math.max(0, 500 - thresholdX)}
              height="180"
              fill="#fef3c7"
              opacity="0.45"
            />

            {/* Region Labels */}
            <text x="72" y="38" className="text-[10px] font-mono" fill="#0369a1" fontWeight="600">
              GROUP A REGION (≤62.5% GC)
            </text>
            <text x="490" y="38" textAnchor="end" className="text-[10px] font-mono" fill="#b45309" fontWeight="600">
              GROUP B REGION (&gt;62.5% GC)
            </text>

            {/* Horizontal & Vertical Grid Lines */}
            {[0, 25, 50, 75, 100].map((gcTick) => {
              const x = mapX(gcTick);
              return (
                <g key={gcTick}>
                  <line x1={x} y1="20" x2={x} y2="200" stroke="#e2e8f0" strokeWidth="1" />
                  <text
                    x={x}
                    y="216"
                    textAnchor="middle"
                    className="text-[10px] font-mono"
                    fill="#64748b"
                  >
                    {gcTick}%
                  </text>
                </g>
              );
            })}

            {[6, 8, 10, 12].map((lenTick) => {
              const y = mapY(lenTick);
              return (
                <g key={lenTick}>
                  <line x1="60" y1={y} x2="500" y2={y} stroke="#e2e8f0" strokeWidth="1" />
                  <text
                    x="50"
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] font-mono"
                    fill="#64748b"
                  >
                    {lenTick}bp
                  </text>
                </g>
              );
            })}

            {/* Decision Threshold Line */}
            <line
              x1={thresholdX}
              y1="20"
              x2={thresholdX}
              y2="200"
              stroke="#0f172a"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
            <text
              x={thresholdX + 5}
              y="192"
              className="text-[10px] font-mono"
              fill="#0f172a"
              fontWeight="600"
            >
              Split: 62.5%
            </text>

            {/* Plot Known Training Sequences */}
            {trainingFeatures.map((item, idx) => {
              // Slight vertical jitter if identical coordinates so all points remain distinct
              const sameCoordIndex = trainingFeatures
                .slice(0, idx)
                .filter(
                  (prev) => prev.gcContent === item.gcContent && prev.length === item.length
                ).length;
              const cx = mapX(item.gcContent);
              const cy = mapY(item.length) - sameCoordIndex * 16;
              const isGroupA = item.group === 'Group A';
              const isHovered = hoveredId === item.id;

              return (
                <g
                  key={item.id}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 7 : 5.5}
                    fill={isGroupA ? '#0284c7' : '#d97706'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <text
                    x={cx + 8}
                    y={cy + 3}
                    className="text-[10px] font-mono"
                    fill="#0f172a"
                    fontWeight="600"
                  >
                    {item.id} ({item.gcContent}%)
                  </text>
                </g>
              );
            })}

            {/* Plot Unknown Query Sequence */}
            {(() => {
              const qx = mapX(unknownFeatures.gcContent);
              const qy = mapY(unknownFeatures.length);
              return (
                <g>
                  <line
                    x1={qx}
                    y1={qy}
                    x2={thresholdX}
                    y2={qy}
                    stroke="#0284c7"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={qx}
                    cy={qy}
                    r="8"
                    fill="#0f172a"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                  />
                  <text
                    x={qx}
                    y={qy - 12}
                    textAnchor="middle"
                    className="text-[11px] font-mono"
                    fill="#0f172a"
                    fontWeight="700"
                  >
                    QUERY ({unknownFeatures.gcContent}% GC, {unknownFeatures.length}bp)
                  </text>
                </g>
              );
            })()}

            {/* Axes */}
            <line x1="60" y1="200" x2="500" y2="200" stroke="#475569" strokeWidth="1.2" />
            <line x1="60" y1="20" x2="60" y2="200" stroke="#475569" strokeWidth="1.2" />
            <text x="280" y="231" textAnchor="middle" className="text-[10px] font-mono" fill="#475569">
              GC Content (%)
            </text>
          </svg>
        </div>

        {/* Feature Importance Ranking */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex-1">
          <div className="flex items-baseline justify-between gap-2 pb-3 mb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Feature Discriminative Importance
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Relative weight in separating Group A vs. Group B
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">Normalized %</span>
          </div>

          <div className="space-y-3">
            {evaluation.featureImportances.map((feat) => (
              <div key={feat.featureKey} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800">{feat.label}</span>
                  <div className="font-mono text-slate-500 tabular-nums">
                    <span>
                      Grp A: {feat.groupAMean}
                      {feat.unit}
                    </span>
                    <span className="mx-1.5">·</span>
                    <span>
                      Grp B: {feat.groupBMean}
                      {feat.unit}
                    </span>
                    <span className="mx-1.5">·</span>
                    <span className="font-semibold text-slate-900">{feat.importance}%</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-sky-600 transition-transform duration-150 origin-left"
                    style={{ width: `${Math.max(4, feat.importance)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
