import React, { useState } from 'react';
import {
  DNAFeatures,
  ModelEvaluationResult,
} from '../utils/dnaEngine';
import { Printer, Copy, Check, RotateCcw } from 'lucide-react';

interface LabReportSectionProps {
  trainingFeatures: DNAFeatures[];
  unknownFeatures: DNAFeatures;
  evaluation: ModelEvaluationResult;
}

const DEFAULT_REPORT_ANSWERS = {
  genomicsApplication:
    'CpG Island & Promoter Region Identification: Machine learning classifiers trained on GC content (%) and dinucleotide frequencies are widely used in computational genomics to distinguish gene promoter regions (which are typically GC-rich CpG islands around 60%–85% GC) from non-coding intergenic regions, as well as for taxonomic classification of bacterial vs. viral genomes based on genomic GC signatures.',
  mlLimitation:
    'Loss of Positional & Motif Order Information (Bag-of-Nucleotides Limitation): Converting DNA sequences strictly into aggregate base counts (A, T, G, C) and overall GC percentage discards the exact sequential order of codons and regulatory motifs. For example, ATGCGATC and AAAATTTTCCCCGGGG have the exact same 50% GC content, yet completely different biological functions and secondary structures.',
  q1MostUsefulFeatures:
    'GC Content (%) and individual G and C counts were the most discriminative features (Information Gain ΔGini = 0.500). In the training data, Group A sequences (S1: ATGCGATC, S2: ATGCGTAC) consistently exhibit 50.0% GC content (G=2, C=2, A=2, T=2), whereas Group B sequences (S3: GCGCGTAT, S4: GCGCGCGC) exhibit elevated 75.0%–100.0% GC content (G=3–4, C=3–4). Conversely, Sequence Length (8 bp across all training sequences) provided zero discriminative split power during training.',
  q2DidModelPredictCorrectly:
    'For the unknown sequence ATGCGCGATC (A=2, T=2, G=3, C=3, Length=10 bp, GC=60.0%), a Decision Tree splitting on GC Content ≤ 62.5% (or A Count ≥ 2) predicts Group A, whereas a classifier splitting strictly on raw G Count > 2.5 or C Count > 2.5 predicts Group B. Biologically, ATGCGCGATC is a 10 bp hybrid sequence containing the exact Group A core motif (ATGCGATC) with an inserted CG dinucleotide, placing its 60.0% GC content right in the transition zone between Group A (50% GC) and Group B (75%–100% GC). This highlights why normalized ratios (GC%) are superior to raw base counts when sequence length increases from 8 bp to 10 bp.',
  q3VeryDifferentSequence:
    'If a new sequence is very different from the training data (out-of-distribution)—for example, a 500 bp gene fragment, a poly-T repeat (TTTTTTTTTT, 0% GC), or a sequence containing ambiguous bases (N)—the model will still force a binary Group A or Group B label with artificially high confidence. Because tree-based thresholds partition the feature space into infinite half-planes (e.g., GC ≤ 62.5%), any extreme low-GC outlier is blindly assigned to Group A even if it shares no biological homology with S1 or S2.',
  q4GenomicMLLimitations:
    '1) Small Sample Size & Overfitting: Training on only 4 short sequences (8 bp each) cannot capture natural evolutionary variance, mutations, or indels. 2) Length Bias in Raw Counts: Features like raw G or C counts scale linearly with sequence length, confounding classification when query sequences are longer (10 bp vs. 8 bp). 3) Neglect of Epigenetic & Structural Context: Simple tabular classifiers ignore 3D chromatin accessibility, reading frames, and long-range enhancer-promoter interactions.',
};

export const LabReportSection: React.FC<LabReportSectionProps> = ({
  trainingFeatures,
  unknownFeatures,
  evaluation,
}) => {
  const [studentName, setStudentName] = useState('Robin Virgil');
  const [studentId, setStudentId] = useState('BIO-2026-041');
  const [courseTitle, setCourseTitle] = useState('Computational Biology & Genomic Data Science');
  const [reportDate, setReportDate] = useState('2026-11-12');

  const [answers, setAnswers] = useState(DEFAULT_REPORT_ANSWERS);
  const [copiedReport, setCopiedReport] = useState(false);

  const handleResetAnswers = () => {
    setAnswers(DEFAULT_REPORT_ANSWERS);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleCopyMarkdown = () => {
    const tableLines = [
      '| Sequence ID | DNA Sequence | Group | A | T | G | C | Length (bp) | GC (%) |',
      '| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |',
      ...trainingFeatures.map(
        (f) =>
          `| ${f.id} | ${f.sequence} | ${f.group} | ${f.countA} | ${f.countT} | ${f.countG} | ${f.countC} | ${f.length} | ${f.gcContent.toFixed(1)}% |`
      ),
      `| UNKNOWN | ${unknownFeatures.sequence} | Predicted: ${evaluation.predictedGroup} | ${unknownFeatures.countA} | ${unknownFeatures.countT} | ${unknownFeatures.countG} | ${unknownFeatures.countC} | ${unknownFeatures.length} | ${unknownFeatures.gcContent.toFixed(1)}% |`,
    ].join('\n');

    const md = `# Bioinformatics Assessment Report: DNA Sequence ML Classification
Student: ${studentName} (${studentId})
Course: ${courseTitle}
Date: ${reportDate}

## 1. Extracted DNA Feature Table
${tableLines}

## 2. Machine Learning Model Result
- Selected Classifier: ${evaluation.classifierName}
- Primary Decision Rule: ${evaluation.primarySplit.featureLabel} ≤ ${evaluation.primarySplit.threshold}${evaluation.primarySplit.unit} → ${evaluation.primarySplit.leftGroup} (else ${evaluation.primarySplit.rightGroup})
- Gini Impurity Reduction (ΔGini): ${evaluation.primarySplit.infoGain.toFixed(3)}

## 3. Prediction for Unknown Sequence (${unknownFeatures.sequence})
- Extracted Features: A = ${unknownFeatures.countA}, T = ${unknownFeatures.countT}, G = ${unknownFeatures.countG}, C = ${unknownFeatures.countC}, Length = ${unknownFeatures.length} bp, GC = ${unknownFeatures.gcContent.toFixed(1)}%
- Predicted Group: ${evaluation.predictedGroup} (Confidence: ${evaluation.confidence}%)

## 4. Model Accuracy
- Training Accuracy: ${evaluation.trainingAccuracy}%
- Leave-One-Out Cross-Validation (LOOCV) Accuracy: ${evaluation.loocvAccuracy}%

## 5. One Genomics Application
${answers.genomicsApplication}

## 6. One Limitation of Using AI/ML
${answers.mlLimitation}

## 7. Think and Discuss — Critical Interpretation
### Q1: Which features were most useful?
${answers.q1MostUsefulFeatures}

### Q2: Did the model predict correctly?
${answers.q2DidModelPredictCorrectly}

### Q3: What if the sequence is very different from the training data?
${answers.q3VeryDifferentSequence}

### Q4: What are the limitations of using AI/ML for genomic analysis?
${answers.q4GenomicMLLimitations}
`;

    navigator.clipboard.writeText(md);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 lg:p-8">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Assessment Submission Report &amp; Critical Discussion
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Structured to satisfy all 6 Required Output deliverables and 4 Think &amp; Discuss rubric questions · Ready for single-PDF export
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 no-print">
          <button
            type="button"
            onClick={handleResetAnswers}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Default Analysis
          </button>
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            {copiedReport ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Copied Markdown
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Report Text
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save PDF Report
          </button>
        </div>
      </div>

      {/* Student Metadata Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-6 mb-6 border-b border-slate-200">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Student Name
          </label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="w-full px-3 py-1.5 text-sm font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-sky-600"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Student ID / Reference
          </label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full px-3 py-1.5 text-sm font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-sky-600"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Course / Activity Module
          </label>
          <input
            type="text"
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            className="w-full px-3 py-1.5 text-sm font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-sky-600"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Report Date
          </label>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="w-full px-3 py-1.5 text-sm font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-sky-600"
          />
        </div>
      </div>

      {/* SECTION A: 6 EXPECTED OUTPUT DELIVERABLES */}
      <div className="space-y-6">
        <div className="print-break-inside-avoid">
          <h3 className="text-sm font-bold text-slate-900 mb-2">
            01. Feature Table (Training Dataset &amp; Unknown Query Sequence)
          </h3>
          <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2 px-3">Seq ID</th>
                  <th className="py-2 px-3">DNA Sequence</th>
                  <th className="py-2 px-3">Assigned Group</th>
                  <th className="py-2 px-3 text-right">A Count</th>
                  <th className="py-2 px-3 text-right">T Count</th>
                  <th className="py-2 px-3 text-right">G Count</th>
                  <th className="py-2 px-3 text-right">C Count</th>
                  <th className="py-2 px-3 text-right">Length (bp)</th>
                  <th className="py-2 px-3 text-right">GC Content (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                {trainingFeatures.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="py-2 px-3 font-semibold text-slate-900">{row.id}</td>
                    <td className="py-2 px-3 text-slate-800 tracking-wider">{row.sequence}</td>
                    <td className="py-2 px-3 font-sans font-medium text-slate-700">{row.group}</td>
                    <td className="py-2 px-3 text-right">{row.countA}</td>
                    <td className="py-2 px-3 text-right">{row.countT}</td>
                    <td className="py-2 px-3 text-right">{row.countG}</td>
                    <td className="py-2 px-3 text-right">{row.countC}</td>
                    <td className="py-2 px-3 text-right">{row.length}</td>
                    <td className="py-2 px-3 text-right font-semibold">{row.gcContent.toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className="bg-sky-50/70 font-semibold text-slate-900">
                  <td className="py-2.5 px-3">UNKNOWN</td>
                  <td className="py-2.5 px-3 tracking-wider text-sky-900">{unknownFeatures.sequence}</td>
                  <td className="py-2.5 px-3 font-sans text-sky-800">
                    Predicted: {evaluation.predictedGroup}
                  </td>
                  <td className="py-2.5 px-3 text-right">{unknownFeatures.countA}</td>
                  <td className="py-2.5 px-3 text-right">{unknownFeatures.countT}</td>
                  <td className="py-2.5 px-3 text-right">{unknownFeatures.countG}</td>
                  <td className="py-2.5 px-3 text-right">{unknownFeatures.countC}</td>
                  <td className="py-2.5 px-3 text-right">{unknownFeatures.length}</td>
                  <td className="py-2.5 px-3 text-right text-sky-900">
                    {unknownFeatures.gcContent.toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Deliverables 2, 3, 4 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print-break-inside-avoid">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded">
            <div className="text-xs font-semibold text-slate-500">02. Model Result &amp; Split Rule</div>
            <div className="text-sm font-bold text-slate-900 mt-1">{evaluation.classifierName}</div>
            <p className="text-xs text-slate-600 font-mono mt-1.5 leading-relaxed">
              Primary Rule: {evaluation.primarySplit.featureLabel} ≤ {evaluation.primarySplit.threshold}
              {evaluation.primarySplit.unit} → {evaluation.primarySplit.leftGroup} (else{' '}
              {evaluation.primarySplit.rightGroup}) · ΔGini = {evaluation.primarySplit.infoGain.toFixed(3)}
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded">
            <div className="text-xs font-semibold text-slate-500">
              03. Prediction for Unknown ({unknownFeatures.sequence})
            </div>
            <div className="text-lg font-bold font-mono text-sky-700 mt-1 tabular-nums">
              {evaluation.predictedGroup}{' '}
              <span className="text-xs font-normal text-slate-600">
                ({evaluation.confidence}% confidence)
              </span>
            </div>
            <p className="text-xs text-slate-600 font-mono mt-1 leading-relaxed">
              Features: A={unknownFeatures.countA}, T={unknownFeatures.countT}, G={unknownFeatures.countG}, C=
              {unknownFeatures.countC}, Len={unknownFeatures.length}bp, GC={unknownFeatures.gcContent.toFixed(1)}%
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded">
            <div className="text-xs font-semibold text-slate-500">04. Model Accuracy</div>
            <div className="text-lg font-bold font-mono text-slate-900 mt-1 tabular-nums">
              {evaluation.trainingAccuracy}%{' '}
              <span className="text-xs font-normal text-slate-500">Training</span> ·{' '}
              {evaluation.loocvAccuracy}%{' '}
              <span className="text-xs font-normal text-slate-500">LOOCV</span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Confusion Matrix: {evaluation.confusionMatrix.trueA_predA} True A /{' '}
              {evaluation.confusionMatrix.trueB_predB} True B correctly classified on labelled cohort.
            </p>
          </div>
        </div>

        {/* Deliverables 5 & 6 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-break-inside-avoid">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5">
              05. One Genomics Application of AI/ML Sequence Classification
            </label>
            <textarea
              rows={4}
              value={answers.genomicsApplication}
              onChange={(e) => setAnswers({ ...answers, genomicsApplication: e.target.value })}
              className="w-full p-3 text-xs leading-relaxed text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:bg-white focus:border-sky-600"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5">
              06. One Key Limitation of Using AI/ML in Sequence Classification
            </label>
            <textarea
              rows={4}
              value={answers.mlLimitation}
              onChange={(e) => setAnswers({ ...answers, mlLimitation: e.target.value })}
              className="w-full p-3 text-xs leading-relaxed text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:bg-white focus:border-sky-600"
            />
          </div>
        </div>

        {/* SECTION B: THINK AND DISCUSS (4 CRITICAL INTERPRETATION QUESTIONS) */}
        <div className="pt-6 border-t border-slate-200 print-break-inside-avoid">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Think and Discuss — Critical Interpretation of Results
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive responses addressing the four discussion prompts required by the assessment guidelines
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Discussion 1: Which features were most useful?
              </label>
              <textarea
                rows={5}
                value={answers.q1MostUsefulFeatures}
                onChange={(e) => setAnswers({ ...answers, q1MostUsefulFeatures: e.target.value })}
                className="w-full p-3 text-xs leading-relaxed text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:bg-white focus:border-sky-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Discussion 2: Did the model predict correctly for {unknownFeatures.sequence}?
              </label>
              <textarea
                rows={5}
                value={answers.q2DidModelPredictCorrectly}
                onChange={(e) =>
                  setAnswers({ ...answers, q2DidModelPredictCorrectly: e.target.value })
                }
                className="w-full p-3 text-xs leading-relaxed text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:bg-white focus:border-sky-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Discussion 3: What if the sequence is very different from the training data?
              </label>
              <textarea
                rows={5}
                value={answers.q3VeryDifferentSequence}
                onChange={(e) =>
                  setAnswers({ ...answers, q3VeryDifferentSequence: e.target.value })
                }
                className="w-full p-3 text-xs leading-relaxed text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:bg-white focus:border-sky-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Discussion 4: What are the broader limitations of using AI/ML for genomic analysis?
              </label>
              <textarea
                rows={5}
                value={answers.q4GenomicMLLimitations}
                onChange={(e) =>
                  setAnswers({ ...answers, q4GenomicMLLimitations: e.target.value })
                }
                className="w-full p-3 text-xs leading-relaxed text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:bg-white focus:border-sky-600"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
