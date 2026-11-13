/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  CORE_ASSIGNMENT_DATASET,
  EXTENDED_RESEARCH_DATASET,
  DNASequenceRecord,
  ClassifierType,
  GroupLabel,
  evaluateDNAWorkspace,
  generateColabPythonCode,
  sanitizeSequence,
} from './utils/dnaEngine';
import { ClassifierVisualizer } from './components/ClassifierVisualizer';
import { SequenceBaseInspector } from './components/SequenceBaseInspector';
import { LabReportSection } from './components/LabReportSection';
import {
  DnaDatabaseFinder,
  CURATED_DNA_LIBRARY,
} from './components/DnaDatabaseFinder';
import {
  Download,
  Copy,
  Check,
  Plus,
  Trash2,
  RotateCcw,
  Eye,
  EyeOff,
  FileCode,
  Printer,
  Search,
} from 'lucide-react';

export default function App() {
  // Training Dataset State
  const [datasetMode, setDatasetMode] = useState<'core' | 'extended'>('core');
  const [dataset, setDataset] = useState<DNASequenceRecord[]>(CORE_ASSIGNMENT_DATASET);

  // Unknown Sequence & Raw Input State (allows typing IDs like S1, gene names, or raw DNA bases without eating keystrokes)
  const [rawInputText, setRawInputText] = useState<string>('ATGCGCGATC');
  const [unknownSequence, setUnknownSequence] = useState<string>('ATGCGCGATC');
  const [inputFeedback, setInputFeedback] = useState<string | null>(
    'Loaded assessment target sequence ATGCGCGATC (10 bp, 60.0% GC).'
  );
  const [classifierType, setClassifierType] = useState<ClassifierType>('decision_tree');

  // Add Custom Training Sequence Form State
  const [newSeqString, setNewSeqString] = useState<string>('');
  const [newSeqGroup, setNewSeqGroup] = useState<GroupLabel>('Group A');
  const [newSeqNote, setNewSeqNote] = useState<string>('');

  // UI Utility States
  const [showAssignmentSheet, setShowAssignmentSheet] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedCSV, setCopiedCSV] = useState<boolean>(false);

  // Smart resolver: resolves raw user input (DNA bases, FASTA, Sequence ID like S1, or Gene Name like Insulin/HBB)
  const resolveAndPredictInput = (inputVal: string) => {
    const trimmed = inputVal.trim();
    if (!trimmed) {
      setInputFeedback('Please enter a DNA sequence (e.g., ATGCGCGATC), sequence ID (S1–S4), or gene name.');
      return;
    }

    // 1. Check if input matches a Training Sequence ID (e.g. "S1", "S2", "S3", "S4")
    const idMatch = dataset.find(
      (item) => item.id.toLowerCase() === trimmed.toLowerCase()
    );
    if (idMatch) {
      setUnknownSequence(idMatch.sequence);
      setRawInputText(idMatch.sequence);
      setInputFeedback(
        `Found training sequence ${idMatch.id}: ${idMatch.sequence} (${idMatch.group}).`
      );
      return;
    }

    // 2. Check if input matches a Curated Gene/Motif by name or ID (e.g. "insulin", "HBB", "globin", "TP53", "TATA", "CpG")
    const libraryMatch = CURATED_DNA_LIBRARY.find(
      (item) =>
        item.id.toLowerCase() === trimmed.toLowerCase() ||
        item.name.toLowerCase().includes(trimmed.toLowerCase()) ||
        item.organism.toLowerCase().includes(trimmed.toLowerCase())
    );
    // Only trigger keyword match if the user typed non-ATGC letters (like "insulin" or "S1" or "globin")
    const hasNonDnaLetters = /[^ATGCatgc\s>0-9_-]/.test(trimmed);
    if (hasNonDnaLetters && libraryMatch) {
      setUnknownSequence(libraryMatch.sequence);
      setRawInputText(libraryMatch.sequence);
      setInputFeedback(
        `Matched "${trimmed}" → Loaded ${libraryMatch.name} (${libraryMatch.sequence.length} bp).`
      );
      return;
    }

    // 3. Handle FASTA format (strip header line starting with >)
    const lines = trimmed.split('\n');
    const bodyText =
      lines[0].startsWith('>') && lines.length > 1
        ? lines.slice(1).join('')
        : trimmed;

    const cleanDNA = sanitizeSequence(bodyText);
    if (cleanDNA.length > 0) {
      setUnknownSequence(cleanDNA);
      setRawInputText(cleanDNA);
      const ignoredCount = bodyText.replace(/\s+/g, '').length - cleanDNA.length;
      if (ignoredCount > 0) {
        setInputFeedback(
          `Extracted ${cleanDNA.length} valid DNA bases (A, T, G, C); ignored ${ignoredCount} non-DNA character(s).`
        );
      } else {
        setInputFeedback(
          `Analyzed ${cleanDNA.length} bp DNA sequence: ${cleanDNA.slice(0, 24)}${
            cleanDNA.length > 24 ? '...' : ''
          }`
        );
      }
    } else {
      setInputFeedback(
        `No valid A, T, G, C bases or matching gene found for "${trimmed}". Try ATGCGCGATC, S1, HBB, or Insulin.`
      );
    }
  };

  const handleLoadSequenceDirect = (seq: string, label?: string) => {
    const clean = sanitizeSequence(seq);
    if (!clean) return;
    setUnknownSequence(clean);
    setRawInputText(clean);
    setInputFeedback(
      label
        ? `Loaded ${label}: ${clean} (${clean.length} bp).`
        : `Loaded sequence: ${clean} (${clean.length} bp).`
    );
  };

  // Evaluate all DNA features and ML models in real time
  const { trainingFeatures, unknownFeatures, evaluation } = useMemo(
    () => evaluateDNAWorkspace(dataset, unknownSequence, classifierType),
    [dataset, unknownSequence, classifierType]
  );

  // Generate Python/Google Colab script dynamically
  const pythonScript = useMemo(
    () => generateColabPythonCode(dataset, unknownFeatures.sequence || 'ATGCGCGATC', classifierType),
    [dataset, unknownFeatures.sequence, classifierType]
  );

  const handleSelectCohort = (mode: 'core' | 'extended') => {
    setDatasetMode(mode);
    setDataset(mode === 'core' ? CORE_ASSIGNMENT_DATASET : EXTENDED_RESEARCH_DATASET);
  };

  const handleAddSequence = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeSequence(newSeqString);
    if (clean.length < 4) return;
    const nextNum = dataset.length + 1;
    const newRecord: DNASequenceRecord = {
      id: `S${nextNum}`,
      sequence: clean,
      group: newSeqGroup,
      originNote: newSeqNote.trim() || 'Custom user-added training sequence',
    };
    setDataset((prev) => [...prev, newRecord]);
    setNewSeqString('');
    setNewSeqNote('');
  };

  const handleAddSequenceFromFinder = (
    seq: string,
    group: GroupLabel,
    note: string
  ) => {
    const clean = sanitizeSequence(seq);
    if (clean.length < 4) return;
    const nextNum = dataset.length + 1;
    setDataset((prev) => [
      ...prev,
      {
        id: `S${nextNum}`,
        sequence: clean,
        group,
        originNote: note,
      },
    ]);
  };

  const handleRemoveSequence = (id: string) => {
    if (dataset.length <= 2) return;
    setDataset((prev) => prev.filter((item) => item.id !== id));
  };

  const handleExportCSV = () => {
    const headers = [
      'Sequence_ID',
      'DNA_Sequence',
      'Group',
      'A_Count',
      'T_Count',
      'G_Count',
      'C_Count',
      'Length_bp',
      'GC_Content_Percent',
    ];
    const rows = trainingFeatures.map((f) => [
      f.id,
      f.sequence,
      f.group || '',
      f.countA,
      f.countT,
      f.countG,
      f.countC,
      f.length,
      f.gcContent.toFixed(2),
    ]);
    rows.push([
      'UNKNOWN',
      unknownFeatures.sequence,
      `Predicted_${evaluation.predictedGroup.replace(' ', '_')}`,
      unknownFeatures.countA,
      unknownFeatures.countT,
      unknownFeatures.countG,
      unknownFeatures.countC,
      unknownFeatures.length,
      unknownFeatures.gcContent.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'dna_feature_table_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyCSV = () => {
    const headers = ['Sequence_ID\tDNA_Sequence\tGroup\tA\tT\tG\tC\tLength\tGC_%'];
    const rows = trainingFeatures.map(
      (f) =>
        `${f.id}\t${f.sequence}\t${f.group}\t${f.countA}\t${f.countT}\t${f.countG}\t${f.countC}\t${f.length}\t${f.gcContent.toFixed(1)}%`
    );
    rows.push(
      `UNKNOWN\t${unknownFeatures.sequence}\tPredicted: ${evaluation.predictedGroup}\t${unknownFeatures.countA}\t${unknownFeatures.countT}\t${unknownFeatures.countG}\t${unknownFeatures.countC}\t${unknownFeatures.length}\t${unknownFeatures.gcContent.toFixed(1)}%`
    );
    navigator.clipboard.writeText([...headers, ...rows].join('\n'));
    setCopiedCSV(true);
    setTimeout(() => setCopiedCSV(false), 2000);
  };

  const handleCopyPython = () => {
    navigator.clipboard.writeText(pythonScript);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadPython = () => {
    const blob = new Blob([pythonScript], { type: 'text/x-python;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'dna_ml_classifier_colab.py');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-3.5 no-print">
        <div className="max-w-[1360px] mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            SeqLab Genomics
          </a>

          {/* Zone 2: 5 concise single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#dna-finder"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Find DNA
            </a>
            <a
              href="#feature-table"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Feature Table
            </a>
            <a
              href="#ml-classifier"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              ML Classifier
            </a>
            <a
              href="#colab-script"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Colab Script
            </a>
            <a
              href="#lab-report"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Lab Report
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              Export PDF Report
            </button>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE CONTAINER */}
      <main id="top" className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* HERO & LIVE PREDICTOR SPLIT CONSOLE */}
        <section className="no-print space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left 6 Cols: Research Context & Cohort Calibration */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono text-slate-500 mb-2">
                  Computational Biology Activity · Supervised Sequence Classification
                </div>
                <h1
                  className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight"
                  style={{ textWrap: 'balance' }}
                >
                  DNA Nucleotide Feature Extraction &amp; Machine Learning Classifier
                </h1>
                <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                  Convert labelled DNA sequences from <strong>Group A</strong> (
                  <code className="font-mono text-xs text-slate-800">S1: ATGCGATC</code>,{' '}
                  <code className="font-mono text-xs text-slate-800">S2: ATGCGTAC</code>) and{' '}
                  <strong>Group B</strong> (
                  <code className="font-mono text-xs text-slate-800">S3: GCGCGTAT</code>,{' '}
                  <code className="font-mono text-xs text-slate-800">S4: GCGCGCGC</code>) into
                  numerical feature vectors (<code className="font-mono text-xs">A, T, G, C, Length, GC%</code>
                  ), train a supervised classifier, and predict any unknown sequence or gene (such as{' '}
                  <code className="font-mono text-xs font-semibold text-sky-700">ATGCGCGATC</code>).
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-700">
                    Active Training Cohort:
                  </span>
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleSelectCohort('core')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        datasetMode === 'core'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Assignment Cohort (S1–S4)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectCohort('extended')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        datasetMode === 'extended'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Extended Cohort (S1–S8)
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAssignmentSheet((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-900 transition-colors whitespace-nowrap shrink-0"
                  >
                    {showAssignmentSheet ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        Hide Original Assessment Instructions
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        View Original Assessment Instructions Sheet
                      </>
                    )}
                  </button>
                  <a
                    href="#dna-finder"
                    className="text-xs font-semibold text-sky-700 hover:text-sky-900 underline underline-offset-4 whitespace-nowrap shrink-0"
                  >
                    Open DNA Sequence &amp; Gene Finder ↓
                  </a>
                </div>
              </div>
            </div>

            {/* Right 6 Cols: Interactive Unknown Sequence Predictor Console */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Unknown Sequence Classification Probe
                    </h2>
                    <p className="text-xs text-slate-500">
                      Type DNA bases (e.g. ATGCGCGATC), sequence ID (S1–S4), or gene name (e.g. HBB, Insulin)
                    </p>
                  </div>

                  {/* Interactive Classifier Selector */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setClassifierType('decision_tree')}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                        classifierType === 'decision_tree'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Decision Tree
                    </button>
                    <button
                      type="button"
                      onClick={() => setClassifierType('random_forest')}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                        classifierType === 'random_forest'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Random Forest
                    </button>
                    <button
                      type="button"
                      onClick={() => setClassifierType('knn')}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                        classifierType === 'knn'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      k-NN (k=3)
                    </button>
                  </div>
                </div>

                {/* Sequence Input Form with Explicit Find & Predict Action */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    resolveAndPredictInput(rawInputText);
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="unknown-seq-input"
                      className="text-xs font-semibold text-slate-700"
                    >
                      Enter DNA Sequence, Gene Name, or ID:
                    </label>
                    {unknownSequence !== 'ATGCGCGATC' && (
                      <button
                        type="button"
                        onClick={() => handleLoadSequenceDirect('ATGCGCGATC', 'Assessment Target')}
                        className="inline-flex items-center gap-1 text-xs font-mono text-sky-700 hover:underline"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset to ATGCGCGATC
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="unknown-seq-input"
                      type="text"
                      value={rawInputText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRawInputText(val);
                        // If pure ATGC string, also update live immediately
                        const clean = sanitizeSequence(val);
                        if (clean.length >= 2 && /^[ATGCatgc\s]+$/.test(val)) {
                          setUnknownSequence(clean);
                          setInputFeedback(
                            `Live analysis: ${clean.length} bp DNA sequence (${clean})`
                          );
                        }
                      }}
                      placeholder="Type ATGCGCGATC, S1, HBB, or Insulin..."
                      className="flex-1 px-3.5 py-2 text-sm font-mono font-bold tracking-wider text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:bg-white focus:border-sky-600"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Find &amp; Predict DNA
                    </button>
                  </div>
                  {inputFeedback && (
                    <div className="mt-1.5 text-[11px] font-mono text-sky-800">
                      {inputFeedback}
                    </div>
                  )}
                </form>

                {/* Live Extracted Numerical Feature Readout */}
                <div className="grid grid-cols-6 gap-2 pt-1">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-center">
                    <div className="text-[11px] font-mono text-slate-500">A Count</div>
                    <div className="text-lg font-mono font-bold text-slate-900 tabular-nums">
                      {unknownFeatures.countA}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-center">
                    <div className="text-[11px] font-mono text-slate-500">T Count</div>
                    <div className="text-lg font-mono font-bold text-slate-900 tabular-nums">
                      {unknownFeatures.countT}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-center">
                    <div className="text-[11px] font-mono text-slate-500">G Count</div>
                    <div className="text-lg font-mono font-bold text-slate-900 tabular-nums">
                      {unknownFeatures.countG}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-center">
                    <div className="text-[11px] font-mono text-slate-500">C Count</div>
                    <div className="text-lg font-mono font-bold text-slate-900 tabular-nums">
                      {unknownFeatures.countC}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-center">
                    <div className="text-[11px] font-mono text-slate-500">Length</div>
                    <div className="text-lg font-mono font-bold text-slate-900 tabular-nums">
                      {unknownFeatures.length}
                    </div>
                  </div>
                  <div className="p-2.5 bg-sky-50 border border-sky-200 rounded text-center">
                    <div className="text-[11px] font-mono text-sky-800 font-semibold">GC %</div>
                    <div className="text-lg font-mono font-bold text-sky-900 tabular-nums">
                      {unknownFeatures.gcContent.toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Prediction Outcome Banner */}
              <div className="mt-5 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-mono text-slate-500">
                    MODEL PREDICTION ({evaluation.classifierName})
                  </div>
                  <div className="flex items-baseline gap-3 mt-0.5">
                    <span className="text-2xl font-mono font-bold text-slate-900">
                      {evaluation.predictedGroup}
                    </span>
                    <span className="text-xs font-mono text-emerald-700 font-semibold tabular-nums">
                      ● Confidence: {evaluation.confidence}%
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono text-xs text-slate-600 tabular-nums">
                  <div>
                    Split Rule: {evaluation.primarySplit.featureLabel} ≤{' '}
                    {evaluation.primarySplit.threshold}
                    {evaluation.primarySplit.unit}
                  </div>
                  <div className="text-slate-500">
                    Training Accuracy: {evaluation.trainingAccuracy}%
                  </div>
                </div>
              </div>

              {evaluation.oodWarning && (
                <div className="mt-3 p-2.5 bg-amber-50/80 border border-amber-200 rounded text-[11px] text-amber-900 leading-relaxed">
                  <strong>▲ Critical Interpretation Note:</strong> {evaluation.oodWarning}
                </div>
              )}
            </div>
          </div>

          {/* Collapsible Original Assessment Screenshot Reference */}
          {showAssignmentSheet && (
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">
                  Original Assessment Instructions Reference Sheet
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAssignmentSheet(false)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900"
                >
                  Close Preview
                </button>
              </div>
              <div className="bg-slate-900 rounded p-3 overflow-hidden">
                <img
                  src="/assets/aistudio/Screenshot_2026-11-04_185238_d54fc8af.png"
                  alt="Assessment Instructions to the Students for DNA Sequence Classification"
                  referrerPolicy="no-referrer"
                  className="max-h-[460px] w-auto mx-auto rounded object-contain"
                />
              </div>
            </div>
          )}

          {/* FULL-WIDTH 4-COLUMN TELEMETRY STRIP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs tracking-wider uppercase font-mono text-slate-400">
                QUERY GC COMPOSITION
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                  {unknownFeatures.gcContent.toFixed(1)}
                </span>
                <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">%</span>
              </div>
              <div className="mt-1 text-xs font-mono text-sky-700 tabular-nums">
                G={unknownFeatures.countG} bp · C={unknownFeatures.countC} bp · Total={unknownFeatures.length} bp
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs tracking-wider uppercase font-mono text-slate-400">
                PREDICTED CLASSIFICATION
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-mono font-bold text-slate-900">
                  {evaluation.predictedGroup}
                </span>
                <span className="text-xs uppercase font-mono text-slate-400 ml-2 tabular-nums">
                  ({evaluation.confidence}%)
                </span>
              </div>
              <div className="mt-1 text-xs font-mono text-emerald-700">
                ● Nominal · Active Model: {classifierType.replace('_', ' ')}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs tracking-wider uppercase font-mono text-slate-400">
                CLASSIFIER ACCURACY
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                  {evaluation.trainingAccuracy.toFixed(1)}
                </span>
                <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">% TRAIN</span>
              </div>
              <div className="mt-1 text-xs font-mono text-slate-600 tabular-nums">
                Leave-One-Out CV: {evaluation.loocvAccuracy.toFixed(1)}% ({dataset.length} samples)
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs tracking-wider uppercase font-mono text-slate-400">
                OPTIMAL DECISION BOUNDARY
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                  ≤ {evaluation.primarySplit.threshold}
                </span>
                <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">
                  {evaluation.primarySplit.unit} {evaluation.primarySplit.featureLabel}
                </span>
              </div>
              <div className="mt-1 text-xs font-mono text-slate-600 tabular-nums">
                Gini Impurity Reduction ΔG = {evaluation.primarySplit.infoGain.toFixed(3)}
              </div>
            </div>
          </div>
        </section>

        {/* DNA SEQUENCE FINDER, MOTIF SCANNER & GENBANK LOOKUP */}
        <section id="dna-finder" className="no-print scroll-mt-20">
          <DnaDatabaseFinder
            activeSequence={unknownFeatures.sequence}
            onSelectSequence={(seq, label) => handleLoadSequenceDirect(seq, label)}
            onAddToTraining={handleAddSequenceFromFinder}
          />
        </section>

        {/* SECTION 01: DOUBLE-STRAND INSPECTOR & FEATURE EXTRACTION TABLE */}
        <section id="feature-table" className="no-print space-y-6 scroll-mt-20">
          <SequenceBaseInspector
            unknownFeatures={unknownFeatures}
            onSelectPreset={(seq) => handleLoadSequenceDirect(seq, 'Preset Sequence')}
          />

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  01. Extracted DNA Numerical Feature Table
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Converts raw nucleotide strings into A, T, G, C base counts, sequence length (bp), and GC content (%)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedCSV ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Copied Table
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Table
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download CSV
                </button>
              </div>
            </div>

            {/* Feature Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Sequence ID</th>
                    <th className="py-2.5 px-3">DNA Sequence (5&apos; → 3&apos;)</th>
                    <th className="py-2.5 px-3">Labelled Group</th>
                    <th className="py-2.5 px-3 text-right">A</th>
                    <th className="py-2.5 px-3 text-right">T</th>
                    <th className="py-2.5 px-3 text-right">G</th>
                    <th className="py-2.5 px-3 text-right">C</th>
                    <th className="py-2.5 px-3 text-right">Length (bp)</th>
                    <th className="py-2.5 px-3 text-right">GC Content (%)</th>
                    <th className="py-2.5 px-3">Biochemical Note</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                  {trainingFeatures.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{item.id}</td>
                      <td className="py-2.5 px-3 font-semibold tracking-wider text-slate-900">
                        <button
                          type="button"
                          onClick={() => handleLoadSequenceDirect(item.sequence, item.id)}
                          title="Click to inspect this sequence in the predictor"
                          className="hover:text-sky-700 hover:underline text-left"
                        >
                          {item.sequence}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                        {item.group}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">{item.countA}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700">{item.countT}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700">{item.countG}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700">{item.countC}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700">{item.length}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {item.gcContent.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-500">
                        {item.originNote}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveSequence(item.id)}
                          disabled={dataset.length <= 2}
                          title="Remove sequence from training cohort"
                          className="text-slate-400 hover:text-rose-600 disabled:opacity-30 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Unknown Query Row Highlighted */}
                  <tr className="bg-sky-50/80 font-semibold text-slate-900">
                    <td className="py-3 px-3 font-bold text-sky-900">UNKNOWN</td>
                    <td className="py-3 px-3 font-bold tracking-wider text-sky-900">
                      {unknownFeatures.sequence}
                    </td>
                    <td className="py-3 px-3 font-sans font-bold text-sky-800">
                      Predicted: {evaluation.predictedGroup}
                    </td>
                    <td className="py-3 px-3 text-right">{unknownFeatures.countA}</td>
                    <td className="py-3 px-3 text-right">{unknownFeatures.countT}</td>
                    <td className="py-3 px-3 text-right">{unknownFeatures.countG}</td>
                    <td className="py-3 px-3 text-right">{unknownFeatures.countC}</td>
                    <td className="py-3 px-3 text-right">{unknownFeatures.length}</td>
                    <td className="py-3 px-3 text-right font-bold text-sky-900">
                      {unknownFeatures.gcContent.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 font-sans text-sky-800">
                      Active query sequence ({evaluation.confidence}% confidence)
                    </td>
                    <td className="py-3 px-3 text-right font-sans text-[11px] text-sky-700">
                      Active Target
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Add Custom Sequence Form */}
            <form
              onSubmit={handleAddSequence}
              className="mt-5 pt-4 border-t border-slate-200 flex flex-wrap items-end gap-3"
            >
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Add Custom Training Sequence (A, T, G, C):
                </label>
                <input
                  type="text"
                  value={newSeqString}
                  onChange={(e) => setNewSeqString(sanitizeSequence(e.target.value))}
                  placeholder="e.g. GCGCATCG"
                  className="w-full px-3 py-1.5 text-xs font-mono uppercase bg-slate-50 border border-slate-300 rounded focus:outline-none focus:bg-white focus:border-sky-600"
                />
              </div>

              <div className="w-36">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Known Group:
                </label>
                <select
                  value={newSeqGroup}
                  onChange={(e) => setNewSeqGroup(e.target.value as GroupLabel)}
                  className="w-full px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-300 rounded focus:outline-none focus:bg-white focus:border-sky-600"
                >
                  <option value="Group A">Group A</option>
                  <option value="Group B">Group B</option>
                </select>
              </div>

              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Annotation Note (optional):
                </label>
                <input
                  type="text"
                  value={newSeqNote}
                  onChange={(e) => setNewSeqNote(e.target.value)}
                  placeholder="e.g. Promoter variant"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-none focus:bg-white focus:border-sky-600"
                />
              </div>

              <button
                type="submit"
                disabled={newSeqString.length < 4}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add to Training Set
              </button>
            </form>
          </div>
        </section>

        {/* SECTION 02: MACHINE LEARNING CLASSIFIER & MULTI-MODEL COMPARISON */}
        <section id="ml-classifier" className="no-print space-y-6 scroll-mt-20">
          <ClassifierVisualizer
            trainingFeatures={trainingFeatures}
            unknownFeatures={unknownFeatures}
            evaluation={evaluation}
          />

          {/* Multi-Rule Ensemble & Distance Inspection Sub-Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Random Forest Feature Subspace Votes */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="pb-3 mb-3 border-b border-slate-200">
                <h3 className="text-base font-semibold text-slate-900">
                  Single-Feature Decision Stump Comparison (Why Feature Choice Matters)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Shows how individual nucleotide features vote on{' '}
                  <span className="font-mono font-semibold text-slate-800">
                    {unknownFeatures.sequence}
                  </span>{' '}
                  ({unknownFeatures.length} bp vs. 8 bp training sequences)
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-2">Stump ID</th>
                      <th className="py-2 px-2">Feature Evaluated</th>
                      <th className="py-2 px-2">Threshold Rule</th>
                      <th className="py-2 pl-2 text-right">Predicted Class</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {evaluation.forestVotes.map((vote) => (
                      <tr key={vote.treeId}>
                        <td className="py-2 pr-2 font-semibold text-slate-700">{vote.treeId}</td>
                        <td className="py-2 px-2 font-sans text-slate-800">{vote.focusFeature}</td>
                        <td className="py-2 px-2 text-slate-600">{vote.ruleText}</td>
                        <td className="py-2 pl-2 text-right font-semibold text-slate-900">
                          {vote.predictedGroup}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                <strong>Critical Insight for Discussion:</strong> Because{' '}
                <code className="font-mono">ATGCGCGATC</code> is 10 bp long (containing two extra bases compared to the 8 bp training sequences), its raw <code className="font-mono">G=3</code> and <code className="font-mono">C=3</code> counts cross the <code className="font-mono">&gt; 2.5 bp</code> threshold toward Group B, whereas its normalized <code className="font-mono">GC Content (60.0%)</code> and <code className="font-mono">A/T counts (A=2, T=2)</code> align with Group A (<code className="font-mono">≤ 62.5% GC</code>).
              </p>
            </div>

            {/* k-Nearest Neighbors Distance Table */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="pb-3 mb-3 border-b border-slate-200">
                <h3 className="text-base font-semibold text-slate-900">
                  Euclidean Distance to Known Training Sequences
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standardized feature-space distance from{' '}
                  <span className="font-mono font-semibold text-slate-800">
                    {unknownFeatures.sequence}
                  </span>{' '}
                  to each reference sequence
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-2">Rank</th>
                      <th className="py-2 px-2">Ref ID</th>
                      <th className="py-2 px-2">Sequence</th>
                      <th className="py-2 px-2">Known Group</th>
                      <th className="py-2 px-2 text-right">Ref GC%</th>
                      <th className="py-2 pl-2 text-right">Distance (d)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {evaluation.nearestNeighbors.map((neighbor, i) => (
                      <tr key={neighbor.id}>
                        <td className="py-2 pr-2 text-slate-500">#{i + 1}</td>
                        <td className="py-2 px-2 font-bold text-slate-900">{neighbor.id}</td>
                        <td className="py-2 px-2 text-slate-700">{neighbor.sequence}</td>
                        <td className="py-2 px-2 font-sans font-medium text-slate-800">
                          {neighbor.group}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600">
                          {neighbor.gcContent.toFixed(1)}%
                        </td>
                        <td className="py-2 pl-2 text-right font-bold text-sky-800">
                          {neighbor.distance.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                In standardized feature space, <code className="font-mono">ATGCGCGATC</code> sits closest to Group A sequences <code className="font-mono">S1 (ATGCGATC)</code> and <code className="font-mono">S2 (ATGCGTAC)</code> (ΔGC = 10%), followed by Group B sequence <code className="font-mono">S3 (GCGCGTAT)</code> (ΔGC = 15%).
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 03: PYTHON / GOOGLE COLAB IMPLEMENTATION */}
        <section id="colab-script" className="no-print bg-white border border-slate-200 rounded-lg p-6 scroll-mt-20">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                03. Python / Google Colab Classification Script
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete runnable Python code using <code className="font-mono">pandas</code> and{' '}
                <code className="font-mono">scikit-learn</code> synchronized with your active dataset and unknown sequence
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyPython}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap shrink-0"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied Python Code
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Colab Code
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownloadPython}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors whitespace-nowrap shrink-0"
              >
                <FileCode className="w-3.5 h-3.5" />
                Download .py Script
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <div className="text-xs font-mono font-semibold text-slate-600 mb-2">
                dna_ml_classifier_colab.py
              </div>
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed max-h-[420px]">
                <code>{pythonScript}</code>
              </pre>
            </div>

            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono font-semibold text-slate-600 mb-2">
                  Standard Output Console Preview
                </div>
                <pre className="p-4 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
{`=== 1. EXTRACTED DNA FEATURE TABLE ===
Sequence_ID DNA_Sequence   Group  A  T  G  C  Length  GC_Percent
${trainingFeatures
  .map(
    (f) =>
      `${f.id.padEnd(11)} ${f.sequence.padEnd(12)} ${(f.group || '').padEnd(7)} ${String(
        f.countA
      ).padStart(2)} ${String(f.countT).padStart(2)} ${String(f.countG).padStart(2)} ${String(
        f.countC
      ).padStart(2)} ${String(f.length).padStart(7)} ${f.gcContent.toFixed(1).padStart(11)}`
  )
  .join('\n')}

=== 2. MODEL TRAINING ACCURACY: ${evaluation.trainingAccuracy.toFixed(1)}% ===
Primary Learned Split:
|--- ${evaluation.primarySplit.featureLabel} <= ${evaluation.primarySplit.threshold.toFixed(2)}
|   |--- class: ${evaluation.primarySplit.leftGroup}
|--- ${evaluation.primarySplit.featureLabel} >  ${evaluation.primarySplit.threshold.toFixed(2)}
|   |--- class: ${evaluation.primarySplit.rightGroup}

=== 3. PREDICTION FOR UNKNOWN SEQUENCE (${unknownFeatures.sequence}) ===
 A  T  G  C  Length  GC_Percent
 ${unknownFeatures.countA}  ${unknownFeatures.countT}  ${unknownFeatures.countG}  ${
                    unknownFeatures.countC
                  }      ${unknownFeatures.length}        ${unknownFeatures.gcContent.toFixed(1)}

Predicted Group : ${evaluation.predictedGroup}
Confidence      : ${evaluation.confidence}%`}
                </pre>
              </div>

              <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 leading-relaxed">
                <strong>Colab Execution Tip:</strong> Paste the script above into a single cell in Google Colab and press <kbd className="px-1.5 py-0.5 font-mono bg-white border border-slate-300 rounded text-[11px]">Shift + Enter</kbd>. Both <code className="font-mono">pandas</code> and <code className="font-mono">scikit-learn</code> come pre-installed in Google Colab runtimes.
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 04: SUBMISSION REPORT & THINK AND DISCUSS */}
        <section id="lab-report" className="scroll-mt-20">
          <LabReportSection
            trainingFeatures={trainingFeatures}
            unknownFeatures={unknownFeatures}
            evaluation={evaluation}
          />
        </section>
      </main>

      {/* QUIET FOOTER */}
      <footer className="border-t border-slate-200 bg-white px-6 py-5 mt-12 no-print">
        <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            SeqLab Genomics — Computational Biology &amp; DNA Sequence ML Classification Workbench
          </div>
          <div className="flex items-center gap-4">
            <a href="#dna-finder" className="hover:text-slate-900">
              Find DNA
            </a>
            <span>·</span>
            <a href="#feature-table" className="hover:text-slate-900">
              Feature Table
            </a>
            <span>·</span>
            <a href="#ml-classifier" className="hover:text-slate-900">
              ML Classifier
            </a>
            <span>·</span>
            <a href="#colab-script" className="hover:text-slate-900">
              Colab Script
            </a>
            <span>·</span>
            <a href="#lab-report" className="hover:text-slate-900">
              PDF Lab Report
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
