import React from 'react';
import { DNAFeatures } from '../utils/dnaEngine';

interface SequenceBaseInspectorProps {
  unknownFeatures: DNAFeatures;
  onSelectPreset: (seq: string) => void;
}

const PRESET_SEQUENCES = [
  {
    label: 'Assessment Unknown (ATGCGCGATC)',
    seq: 'ATGCGCGATC',
    note: 'Required target sequence (10 bp, 60% GC)',
  },
  {
    label: 'Control S1 (ATGCGATC)',
    seq: 'ATGCGATC',
    note: 'Group A calibration reference (8 bp, 50% GC)',
  },
  {
    label: 'Control S3 (GCGCGTAT)',
    seq: 'GCGCGTAT',
    note: 'Group B calibration reference (8 bp, 75% GC)',
  },
  {
    label: 'AT-Rich Outlier (ATATATATAT)',
    seq: 'ATATATATAT',
    note: 'Out-of-distribution test (10 bp, 0% GC)',
  },
  {
    label: 'High-GC Repeat (GCGCGCGCGCGC)',
    seq: 'GCGCGCGCGCGC',
    note: 'Extended CpG motif test (12 bp, 100% GC)',
  },
];

export const SequenceBaseInspector: React.FC<SequenceBaseInspectorProps> = ({
  unknownFeatures,
  onSelectPreset,
}) => {
  const bases = unknownFeatures.sequence.split('');
  const compBases = unknownFeatures.complement.split('');

  const getBaseColorClasses = (base: string) => {
    switch (base) {
      case 'A':
        return 'bg-sky-50 border-sky-300 text-sky-900';
      case 'T':
        return 'bg-slate-100 border-slate-300 text-slate-800';
      case 'G':
        return 'bg-amber-50 border-amber-300 text-amber-900';
      case 'C':
        return 'bg-teal-50 border-teal-300 text-teal-900';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-600';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4 mb-4 border-b border-slate-200">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Double-Strand Nucleotide &amp; Hydrogen Bond Structure
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            5&apos; → 3&apos; query sequence paired with 3&apos; → 5&apos; antiparallel complement · A=T forms 2 H-bonds · G≡C forms 3 H-bonds
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-slate-600 tabular-nums">
          <span>Total H-Bonds: <strong className="text-slate-900">{unknownFeatures.hBonds}</strong></span>
          <span>·</span>
          <span>Wallace Tm: <strong className="text-slate-900">{unknownFeatures.meltingTempC} °C</strong></span>
          <span>·</span>
          <span>Purine Ratio: <strong className="text-slate-900">{unknownFeatures.purineRatio}%</strong></span>
        </div>
      </div>

      {/* Double Strand Base Ladder */}
      {bases.length > 0 ? (
        <div className="overflow-x-auto pb-2">
          <div className="inline-flex items-center gap-2 min-w-full">
            <div className="flex flex-col justify-between h-28 pr-2 text-xs font-mono font-semibold text-slate-500 shrink-0">
              <span>5&apos; →</span>
              <span className="text-[10px] text-slate-400">H-Bonds</span>
              <span>3&apos; ←</span>
            </div>

            <div className="flex items-center gap-1.5">
              {bases.map((base, idx) => {
                const comp = compBases[idx] || 'N';
                const isGC = base === 'G' || base === 'C';
                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center w-11 shrink-0"
                  >
                    <span className="text-[10px] font-mono text-slate-400 mb-1 tabular-nums">
                      #{idx + 1}
                    </span>
                    {/* Primary 5' -> 3' Base */}
                    <div
                      className={`w-10 h-9 rounded border flex items-center justify-center font-mono text-sm font-bold ${getBaseColorClasses(
                        base
                      )}`}
                    >
                      {base}
                    </div>

                    {/* Hydrogen Bond Rungs */}
                    <div className="h-7 flex flex-col items-center justify-center gap-0.5 my-0.5">
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">
                        {isGC ? '≡ 3' : '= 2'}
                      </span>
                    </div>

                    {/* Complement 3' -> 5' Base */}
                    <div
                      className={`w-10 h-9 rounded border flex items-center justify-center font-mono text-sm font-medium opacity-90 ${getBaseColorClasses(
                        comp
                      )}`}
                    >
                      {comp}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col justify-between h-28 pl-2 text-xs font-mono font-semibold text-slate-500 shrink-0">
              <span>→ 3&apos;</span>
              <span className="text-[10px] text-slate-400">bp</span>
              <span>← 5&apos;</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-6 text-center text-sm text-slate-500 font-mono">
          Enter valid DNA bases (A, T, G, C) to inspect base-pair stoichiometry.
        </div>
      )}

      {/* Quick Calibration & Out-of-Distribution Presets */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="text-xs font-medium text-slate-600 mb-2">
          Quick Test Sequences (Click to load into predictor):
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_SEQUENCES.map((preset) => {
            const isActive = unknownFeatures.sequence === preset.seq;
            return (
              <button
                key={preset.seq}
                type="button"
                onClick={() => onSelectPreset(preset.seq)}
                title={preset.note}
                className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
