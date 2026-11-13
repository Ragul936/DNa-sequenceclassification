import React, { useState } from 'react';
import { Search, Dna, ArrowRight, Sparkles, Check, AlertCircle, Loader2 } from 'lucide-react';
import { extractDNAFeatures, sanitizeSequence } from '../utils/dnaEngine';

export interface CuratedDNASequence {
  id: string;
  name: string;
  organism: string;
  category: 'Assessment' | 'Human Gene' | 'Regulatory Motif' | 'Pathogen / Microbial';
  sequence: string;
  expectedGroupHint: string;
  description: string;
}

export const CURATED_DNA_LIBRARY: CuratedDNASequence[] = [
  {
    id: 'ASSESS-UNK',
    name: 'Assessment Unknown Target (ATGCGCGATC)',
    organism: 'Synthetic Assessment Probe',
    category: 'Assessment',
    sequence: 'ATGCGCGATC',
    expectedGroupHint: '10 bp · 60.0% GC · Contains ATG start + GATC motif',
    description: 'The exact unknown sequence from the student assessment instructions.',
  },
  {
    id: 'ASSESS-S1',
    name: 'Known Sequence S1 (ATGCGATC)',
    organism: 'Reference Cohort — Group A',
    category: 'Assessment',
    sequence: 'ATGCGATC',
    expectedGroupHint: '8 bp · 50.0% GC · Group A Reference',
    description: 'Balanced AT/GC octamer containing the Sau3AI restriction motif (GATC).',
  },
  {
    id: 'ASSESS-S2',
    name: 'Known Sequence S2 (ATGCGTAC)',
    organism: 'Reference Cohort — Group A',
    category: 'Assessment',
    sequence: 'ATGCGTAC',
    expectedGroupHint: '8 bp · 50.0% GC · Group A Reference',
    description: 'Balanced AT/GC octamer with terminal GTAC RsaI site.',
  },
  {
    id: 'ASSESS-S3',
    name: 'Known Sequence S3 (GCGCGTAT)',
    organism: 'Reference Cohort — Group B',
    category: 'Assessment',
    sequence: 'GCGCGTAT',
    expectedGroupHint: '8 bp · 75.0% GC · Group B Reference',
    description: 'GC-rich octamer starting with alternating CpG dinucleotide repeat.',
  },
  {
    id: 'ASSESS-S4',
    name: 'Known Sequence S4 (GCGCGCGC)',
    organism: 'Reference Cohort — Group B',
    category: 'Assessment',
    sequence: 'GCGCGCGC',
    expectedGroupHint: '8 bp · 100.0% GC · Group B Reference',
    description: 'Pure GC octamer repeat characteristic of high-density CpG islands.',
  },
  {
    id: 'HBB-CDS',
    name: 'Human Beta-Globin (HBB) Start Exon',
    organism: 'Homo sapiens (Chr 11)',
    category: 'Human Gene',
    sequence: 'ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAAC',
    expectedGroupHint: '60 bp · 58.3% GC · Hemoglobin Subunit Beta',
    description: 'Coding start region of human beta-globin where codon 6 mutation causes sickle-cell anemia.',
  },
  {
    id: 'INS-FRAG',
    name: 'Human Insulin (INS) B-Chain Coding Motif',
    organism: 'Homo sapiens (Chr 11p15.5)',
    category: 'Human Gene',
    sequence: 'ATGGCCCTGTGGATGCGCCTCCTGCCCCTGCTGGCGCTGCTGGCCCTCTGGGGACCTGAC',
    expectedGroupHint: '60 bp · 71.7% GC · High-GC Signal Peptide',
    description: 'GC-enriched preproinsulin signal peptide coding sequence.',
  },
  {
    id: 'TP53-DBD',
    name: 'TP53 Tumor Suppressor Hotspot Region',
    organism: 'Homo sapiens (Chr 17)',
    category: 'Human Gene',
    sequence: 'ATGCGTGTTTGTGCCTGTCCTGGGAGAGACCGGCGCACAGAGGAAGAGAATCTCCGCAAG',
    expectedGroupHint: '60 bp · 60.0% GC · DNA-Binding Domain',
    description: 'Conserved exon region of the p53 guardian of the genome.',
  },
  {
    id: 'TATA-PROM',
    name: 'Eukaryotic Core TATA-Box Promoter Element',
    organism: 'Consensus Eukaryotic Promoter',
    category: 'Regulatory Motif',
    sequence: 'TATAAAAGGCGCGCCATGCGATC',
    expectedGroupHint: '23 bp · 47.8% GC · AT-Rich Transcription Start',
    description: 'Core RNA Polymerase II TFIID binding motif upstream of transcription start site.',
  },
  {
    id: 'CPG-ISLAND',
    name: 'Vertebrate CpG Island Methylation Hotspot',
    organism: 'Homo sapiens Promoter Region',
    category: 'Regulatory Motif',
    sequence: 'GCGCGCGCGCGCGATCGCGCGCGC',
    expectedGroupHint: '24 bp · 91.7% GC · High-GC Epigenetic Element',
    description: 'Dense CpG dinucleotide cluster associated with housekeeping gene promoters.',
  },
  {
    id: 'ECOLI-LACZ',
    name: 'E. coli lac Operon Operator (lacO)',
    organism: 'Escherichia coli K-12',
    category: 'Pathogen / Microbial',
    sequence: 'AATTGTGAGCGGATAACAATTTCACACAGGAAACAGCTATGACCATGATTACGGATTCAC',
    expectedGroupHint: '60 bp · 40.0% GC · Bacterial Operon Control',
    description: 'Classic Jacob-Monod lactose repressor binding site and start codon.',
  },
];

interface BiologicalMotifHit {
  name: string;
  pattern: string;
  functionDesc: string;
  positions: number[]; // 1-based start indices
}

export function scanBiologicalMotifs(seq: string): BiologicalMotifHit[] {
  const clean = sanitizeSequence(seq);
  if (!clean) return [];

  const catalog = [
    {
      name: 'Start Codon (ATG)',
      pattern: 'ATG',
      functionDesc: 'Translation initiation codon (Methionine)',
    },
    {
      name: 'Sau3AI / Dam Methylation Site (GATC)',
      pattern: 'GATC',
      functionDesc: 'Palindromic restriction & DNA methylation recognition motif',
    },
    {
      name: 'CpG Dinucleotide (CG)',
      pattern: 'CG',
      functionDesc: 'Epigenetic cytosine methylation target site',
    },
    {
      name: 'BssHII GC-Repeat Motif (GCGC)',
      pattern: 'GCGC',
      functionDesc: 'High-GC restriction & Z-DNA forming repeat',
    },
    {
      name: 'TATA Core Element (TATA)',
      pattern: 'TATA',
      functionDesc: 'AT-rich promoter melting motif',
    },
    {
      name: 'Stop Codons (TAA / TAG / TGA)',
      pattern: 'STOP',
      functionDesc: 'Translation termination signal',
    },
  ];

  const results: BiologicalMotifHit[] = [];

  for (const item of catalog) {
    const positions: number[] = [];
    if (item.pattern === 'STOP') {
      for (let i = 0; i <= clean.length - 3; i++) {
        const sub = clean.slice(i, i + 3);
        if (sub === 'TAA' || sub === 'TAG' || sub === 'TGA') {
          positions.push(i + 1);
        }
      }
    } else {
      const patLen = item.pattern.length;
      for (let i = 0; i <= clean.length - patLen; i++) {
        if (clean.slice(i, i + patLen) === item.pattern) {
          positions.push(i + 1);
        }
      }
    }
    if (positions.length > 0) {
      results.push({
        name: item.name,
        pattern: item.pattern === 'STOP' ? 'TAA/TAG/TGA' : item.pattern,
        functionDesc: item.functionDesc,
        positions,
      });
    }
  }

  return results;
}

interface DnaDatabaseFinderProps {
  activeSequence: string;
  onSelectSequence: (sequence: string, label?: string) => void;
  onAddToTraining: (sequence: string, group: 'Group A' | 'Group B', note: string) => void;
}

export const DnaDatabaseFinder: React.FC<DnaDatabaseFinderProps> = ({
  activeSequence,
  onSelectSequence,
  onAddToTraining,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customMotifSearch, setCustomMotifSearch] = useState('GATC');
  const [ncbiLoading, setNcbiLoading] = useState(false);
  const [ncbiError, setNcbiError] = useState<string | null>(null);
  const [ncbiResults, setNcbiResults] = useState<CuratedDNASequence[]>([]);
  const [addedToastId, setAddedToastId] = useState<string | null>(null);

  // Filter local curated library by search query (matches name, ID, organism, or DNA subsequence!)
  const filteredLibrary = [...ncbiResults, ...CURATED_DNA_LIBRARY].filter((item) => {
    const matchesCat =
      selectedCategory === 'All' || item.category === selectedCategory;
    if (!searchQuery.trim()) return matchesCat;

    const q = searchQuery.trim().toLowerCase();
    const qCleanDNA = sanitizeSequence(searchQuery);
    const matchesText =
      item.name.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      item.organism.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      (qCleanDNA.length >= 3 && item.sequence.includes(qCleanDNA));

    return matchesCat && matchesText;
  });

  // Live NCBI GenBank Entrez Search when user wants to fetch external genes from NCBI
  const handleSearchNCBI = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchQuery.trim();
    if (!term) return;

    setNcbiLoading(true);
    setNcbiError(null);

    try {
      // 1. ESearch to find nucleotide IDs matching the query
      const esearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=nuccore&term=${encodeURIComponent(
        term + ' AND 20:600[SLEN]'
      )}&retmax=3&retmode=json`;
      const searchRes = await fetch(esearchUrl);
      if (!searchRes.ok) throw new Error('NCBI ESearch request failed');
      const searchData = await searchRes.json();
      const idList: string[] = searchData?.esearchresult?.idlist || [];

      if (idList.length === 0) {
        setNcbiError(
          `No short reference sequences found in NCBI GenBank for "${term}". Showing local genomic library matches below.`
        );
        setNcbiLoading(false);
        return;
      }

      // 2. EFetch FASTA sequences for those IDs
      const efetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=${idList.join(
        ','
      )}&rettype=fasta&retmode=text`;
      const fastaRes = await fetch(efetchUrl);
      if (!fastaRes.ok) throw new Error('NCBI FASTA fetch failed');
      const fastaText = await fastaRes.text();

      const entries = fastaText
        .split('>')
        .map((chunk) => chunk.trim())
        .filter(Boolean);

      const parsed: CuratedDNASequence[] = entries
        .map((entry, idx) => {
          const lines = entry.split('\n');
          const header = lines[0] || `NCBI_${idList[idx]}`;
          const rawSeq = lines.slice(1).join('');
          const cleanSeq = sanitizeSequence(rawSeq).slice(0, 80); // Keep concise 80 bp window for clear inspection
          const feats = extractDNAFeatures(cleanSeq);
          const accession = header.split(' ')[0] || `NCBI-${idx + 1}`;
          const title = header.slice(accession.length).trim() || term;

          return {
            id: accession,
            name: title.slice(0, 65),
            organism: 'NCBI GenBank Live Record',
            category: 'Human Gene' as const,
            sequence: cleanSeq,
            expectedGroupHint: `${feats.length} bp · ${feats.gcContent.toFixed(1)}% GC · NCBI GenBank`,
            description: `Fetched live from NCBI Nucleotide database (Accession ${accession}, first ${feats.length} bp window).`,
          };
        })
        .filter((item) => item.sequence.length >= 6);

      if (parsed.length === 0) {
        setNcbiError('Retrieved records contained no standard ATGC sequence window.');
      } else {
        setNcbiResults(parsed);
      }
    } catch {
      setNcbiError(
        'Live NCBI lookup is unavailable in this network environment. Use the built-in Genomic Sequence Library below.'
      );
    } finally {
      setNcbiLoading(false);
    }
  };

  // Scan biological motifs in the currently active unknown sequence
  const detectedMotifs = scanBiologicalMotifs(activeSequence);

  // Check custom sub-sequence motif positions in activeSequence
  const cleanCustomMotif = sanitizeSequence(customMotifSearch);
  const customMotifPositions: number[] = [];
  if (cleanCustomMotif.length > 0 && activeSequence.length >= cleanCustomMotif.length) {
    for (let i = 0; i <= activeSequence.length - cleanCustomMotif.length; i++) {
      if (activeSequence.slice(i, i + cleanCustomMotif.length) === cleanCustomMotif) {
        customMotifPositions.push(i + 1);
      }
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Dna className="w-5 h-5 text-sky-600" />
            DNA Sequence Finder, Motif Scanner &amp; GenBank Lookup
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Find DNA sequences by gene name, sequence ID (S1–S4), or nucleotide pattern · Scan active sequence for restriction sites &amp; codons
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {['All', 'Assessment', 'Human Gene', 'Regulatory Motif', 'Pathogen / Microbial'].map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Searchable DNA Database & Live NCBI Fetch */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handleSearchNCBI} className="flex flex-wrap sm:flex-nowrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by gene (e.g. HBB, Insulin, TP53), ID (S1, S4), or DNA bases (ATGC)..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:bg-white focus:border-sky-600"
              />
            </div>
            <button
              type="submit"
              disabled={ncbiLoading || !searchQuery.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-40 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              {ncbiLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Searching GenBank...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Search NCBI GenBank
                </>
              )}
            </button>
          </form>

          {ncbiError && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{ncbiError}</span>
            </div>
          )}

          {/* Results List */}
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {filteredLibrary.length > 0 ? (
              filteredLibrary.map((item) => {
                const isLoaded = activeSequence === item.sequence;
                const feats = extractDNAFeatures(item.sequence);
                const predictedGroupByGC: 'Group A' | 'Group B' =
                  feats.gcContent <= 62.5 ? 'Group A' : 'Group B';

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-lg border transition-colors ${
                      isLoaded
                        ? 'bg-sky-50/70 border-sky-300'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{item.name}</span>
                          <span className="text-[11px] font-mono text-slate-500">
                            · {item.organism}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{item.description}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onSelectSequence(item.sequence, item.name)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 ${
                            isLoaded
                              ? 'bg-sky-700 text-white'
                              : 'bg-slate-900 text-white hover:bg-slate-800'
                          }`}
                        >
                          {isLoaded ? (
                            <>
                              <Check className="w-3 h-3" />
                              Loaded in Predictor
                            </>
                          ) : (
                            <>
                              Predict DNA
                              <ArrowRight className="w-3 h-3" />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onAddToTraining(item.sequence, predictedGroupByGC, item.name);
                            setAddedToastId(item.id);
                            setTimeout(() => setAddedToastId(null), 1800);
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded transition-colors whitespace-nowrap shrink-0"
                        >
                          {addedToastId === item.id ? 'Added!' : `+ Train (${predictedGroupByGC})`}
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="text-slate-800 font-semibold break-all">
                        5&apos;-
                        {item.sequence.length > 44
                          ? `${item.sequence.slice(0, 44)}...`
                          : item.sequence}
                        -3&apos;
                      </span>
                      <span className="text-sky-800 tabular-nums">
                        {item.expectedGroupHint}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
                No matching sequences in local library for &ldquo;{searchQuery}&rdquo;. Click{' '}
                <strong>Search NCBI GenBank</strong> above to query external biological databases, or enter raw A, T, G, C bases.
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Cols: Sub-Sequence Pattern & Biological Motif Finder inside Active DNA */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="border-b border-slate-200 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900">
                Find Motif / Sub-Sequence in Active DNA
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Locate exact base-pair coordinates inside{' '}
                <span className="font-mono font-semibold text-slate-800">
                  {activeSequence || 'N/A'}
                </span>
              </p>
            </div>

            {/* Custom Motif Input */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Find Nucleotide Sub-Sequence (e.g. ATG, GATC, CG, GCGC):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customMotifSearch}
                  onChange={(e) => setCustomMotifSearch(sanitizeSequence(e.target.value))}
                  placeholder="Type bases e.g. GATC"
                  className="flex-1 px-3 py-1.5 text-xs font-mono font-bold uppercase bg-white border border-slate-300 rounded focus:outline-none focus:border-sky-600"
                />
                <span className="text-xs font-mono text-slate-600 tabular-nums shrink-0">
                  {cleanCustomMotif
                    ? `${customMotifPositions.length} match${
                        customMotifPositions.length === 1 ? '' : 'es'
                      }`
                    : 'Enter bases'}
                </span>
              </div>
            </div>

            {/* Highlighted Sequence Ribbon */}
            <div className="p-3 bg-white border border-slate-200 rounded">
              <div className="text-[11px] font-mono text-slate-500 mb-1.5 flex items-center justify-between">
                <span>Highlighted Base Map (5&apos; → 3&apos;)</span>
                {customMotifPositions.length > 0 && (
                  <span className="text-sky-700 font-semibold">
                    Found at bp: {customMotifPositions.join(', ')}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 font-mono text-xs">
                {activeSequence.split('').map((base, idx) => {
                  const pos1 = idx + 1;
                  const isHighlighted =
                    cleanCustomMotif.length > 0 &&
                    customMotifPositions.some(
                      (startPos) =>
                        pos1 >= startPos && pos1 < startPos + cleanCustomMotif.length
                    );
                  return (
                    <span
                      key={idx}
                      title={`Position ${pos1} bp: ${base}`}
                      className={`inline-flex flex-col items-center justify-center w-6 h-8 rounded border text-xs font-bold transition-colors ${
                        isHighlighted
                          ? 'bg-sky-600 text-white border-sky-700'
                          : 'bg-slate-50 text-slate-800 border-slate-200'
                      }`}
                    >
                      <span>{base}</span>
                      <span
                        className={`text-[8px] leading-none ${
                          isHighlighted ? 'text-sky-100' : 'text-slate-400'
                        }`}
                      >
                        {pos1}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Automated Biological Motif Scanner Results */}
            <div className="space-y-1.5 pt-1">
              <div className="text-xs font-semibold text-slate-700">
                Detected Functional Motifs in {activeSequence}:
              </div>
              {detectedMotifs.length > 0 ? (
                <div className="space-y-1.5">
                  {detectedMotifs.map((m) => (
                    <div
                      key={m.name}
                      onClick={() => setCustomMotifSearch(m.pattern.split('/')[0])}
                      className="p-2 bg-white border border-slate-200 rounded text-xs cursor-pointer hover:border-sky-400 transition-colors"
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-slate-900">{m.name}</span>
                        <span className="text-sky-700 font-semibold tabular-nums">
                          bp {m.positions.join(', ')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{m.functionDesc}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic">
                  No canonical start codons or restriction sites detected in current sequence.
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-2.5 leading-relaxed">
            <strong>Biological Homology Note:</strong> Notice that the unknown sequence{' '}
            <code className="font-mono">ATGCGCGATC</code> begins with the exact{' '}
            <code className="font-mono">ATG</code> start codon (bp 1–3) and ends with the exact{' '}
            <code className="font-mono">GATC</code> restriction motif (bp 7–10) found in Group A&apos;s{' '}
            <code className="font-mono">S1 (ATGCGATC)</code>, with a single inserted{' '}
            <code className="font-mono">CG</code> dinucleotide at bp 5–6.
          </div>
        </div>
      </div>
    </div>
  );
};
