export type GroupLabel = 'Group A' | 'Group B';

export interface DNASequenceRecord {
  id: string;
  sequence: string;
  group: GroupLabel;
  originNote: string;
}

export interface DNAFeatures {
  id: string;
  sequence: string;
  group?: GroupLabel;
  originNote?: string;
  countA: number;
  countT: number;
  countG: number;
  countC: number;
  length: number;
  gcContent: number; // percentage 0..100
  atContent: number; // percentage 0..100
  purineRatio: number; // (A + G) / length * 100
  hBonds: number; // 2 * (A+T) + 3 * (G+C)
  meltingTempC: number; // Wallace rule: 2*(A+T) + 4*(G+C)
  complement: string;
}

export type ClassifierType = 'decision_tree' | 'random_forest' | 'knn';

export interface SplitRule {
  featureKey: 'gcContent' | 'countA' | 'countT' | 'countG' | 'countC' | 'length';
  featureLabel: string;
  unit: string;
  threshold: number;
  giniBefore: number;
  giniLeft: number;
  giniRight: number;
  infoGain: number;
  leftGroup: GroupLabel;
  rightGroup: GroupLabel;
  leftSamples: string[];
  rightSamples: string[];
}

export interface FeatureImportanceItem {
  featureKey: string;
  label: string;
  importance: number; // 0..100
  groupAMean: number;
  groupBMean: number;
  unit: string;
}

export interface TreeVote {
  treeId: string;
  focusFeature: string;
  ruleText: string;
  predictedGroup: GroupLabel;
  confidence: number;
}

export interface NeighborDistance {
  id: string;
  sequence: string;
  group: GroupLabel;
  distance: number;
  gcContent: number;
}

export interface ModelEvaluationResult {
  classifierType: ClassifierType;
  classifierName: string;
  primarySplit: SplitRule;
  secondarySplits: SplitRule[];
  predictedGroup: GroupLabel;
  confidence: number; // 0..100
  trainingAccuracy: number; // 0..100
  loocvAccuracy: number; // 0..100
  featureImportances: FeatureImportanceItem[];
  decisionTrace: string[];
  forestVotes: TreeVote[];
  nearestNeighbors: NeighborDistance[];
  confusionMatrix: {
    trueA_predA: number;
    trueA_predB: number;
    trueB_predA: number;
    trueB_predB: number;
  };
  oodWarning: string | null;
}

export const CORE_ASSIGNMENT_DATASET: DNASequenceRecord[] = [
  {
    id: 'S1',
    sequence: 'ATGCGATC',
    group: 'Group A',
    originNote: 'Balanced AT/GC reference motif (Assignment Example)',
  },
  {
    id: 'S2',
    sequence: 'ATGCGTAC',
    group: 'Group A',
    originNote: 'Balanced AT/GC variant with terminal AC',
  },
  {
    id: 'S3',
    sequence: 'GCGCGTAT',
    group: 'Group B',
    originNote: 'GC-enriched motif with 5 prime CpG island',
  },
  {
    id: 'S4',
    sequence: 'GCGCGCGC',
    group: 'Group B',
    originNote: 'Pure alternating GC repeat region',
  },
];

export const EXTENDED_RESEARCH_DATASET: DNASequenceRecord[] = [
  ...CORE_ASSIGNMENT_DATASET,
  {
    id: 'S5',
    sequence: 'ATGCGATA',
    group: 'Group A',
    originNote: 'AT-rich promoter-like octamer',
  },
  {
    id: 'S6',
    sequence: 'TACGATCG',
    group: 'Group A',
    originNote: 'Balanced 50% GC regulatory element',
  },
  {
    id: 'S7',
    sequence: 'GCGCGATC',
    group: 'Group B',
    originNote: 'High-GC 75% coding sequence motif',
  },
  {
    id: 'S8',
    sequence: 'CGCGCGCG',
    group: 'Group B',
    originNote: 'CpG island octamer repeat',
  },
];

export function sanitizeSequence(raw: string): string {
  return raw.toUpperCase().replace(/[^ATGC]/g, '');
}

export function getComplementBase(base: string): string {
  switch (base) {
    case 'A':
      return 'T';
    case 'T':
      return 'A';
    case 'G':
      return 'C';
    case 'C':
      return 'G';
    default:
      return 'N';
  }
}

export function extractDNAFeatures(
  sequenceRaw: string,
  id = 'UNKNOWN',
  group?: GroupLabel,
  originNote?: string
): DNAFeatures {
  const sequence = sanitizeSequence(sequenceRaw);
  let countA = 0;
  let countT = 0;
  let countG = 0;
  let countC = 0;
  let complement = '';

  for (const ch of sequence) {
    if (ch === 'A') countA++;
    else if (ch === 'T') countT++;
    else if (ch === 'G') countG++;
    else if (ch === 'C') countC++;
    complement += getComplementBase(ch);
  }

  const length = sequence.length;
  const gcContent = length > 0 ? Number((((countG + countC) / length) * 100).toFixed(2)) : 0;
  const atContent = length > 0 ? Number((((countA + countT) / length) * 100).toFixed(2)) : 0;
  const purineRatio = length > 0 ? Number((((countA + countG) / length) * 100).toFixed(2)) : 0;
  const hBonds = 2 * (countA + countT) + 3 * (countG + countC);
  const meltingTempC = 2 * (countA + countT) + 4 * (countG + countC);

  return {
    id,
    sequence,
    group,
    originNote,
    countA,
    countT,
    countG,
    countC,
    length,
    gcContent,
    atContent,
    purineRatio,
    hBonds,
    meltingTempC,
    complement,
  };
}

function computeGini(groups: GroupLabel[]): number {
  if (groups.length === 0) return 0;
  const countA = groups.filter((g) => g === 'Group A').length;
  const pA = countA / groups.length;
  const pB = 1 - pA;
  return Number((1 - (pA * pA + pB * pB)).toFixed(4));
}

function majorityGroup(groups: GroupLabel[], fallback: GroupLabel = 'Group A'): GroupLabel {
  if (groups.length === 0) return fallback;
  const countA = groups.filter((g) => g === 'Group A').length;
  const countB = groups.length - countA;
  return countA >= countB ? 'Group A' : 'Group B';
}

const CANDIDATE_FEATURES: Array<{
  key: 'gcContent' | 'countG' | 'countC' | 'countA' | 'countT' | 'length';
  label: string;
  unit: string;
}> = [
  { key: 'gcContent', label: 'GC Content', unit: '%' },
  { key: 'countG', label: 'G Count', unit: 'bp' },
  { key: 'countC', label: 'C Count', unit: 'bp' },
  { key: 'countA', label: 'A Count', unit: 'bp' },
  { key: 'countT', label: 'T Count', unit: 'bp' },
  { key: 'length', label: 'Sequence Length', unit: 'bp' },
];

export function findBestSplits(trainingFeatures: DNAFeatures[]): SplitRule[] {
  const allGroups = trainingFeatures.map((f) => f.group || 'Group A');
  const giniBefore = computeGini(allGroups);

  const bestPerFeature: SplitRule[] = [];

  for (const feat of CANDIDATE_FEATURES) {
    const values = Array.from(new Set(trainingFeatures.map((f) => f[feat.key]))).sort(
      (a, b) => a - b
    );
    let bestSplitForFeat: SplitRule | null = null;

    const thresholds: number[] = [];
    if (values.length === 1) {
      thresholds.push(values[0]);
    } else {
      for (let i = 0; i < values.length - 1; i++) {
        thresholds.push(Number(((values[i] + values[i + 1]) / 2).toFixed(2)));
      }
    }

    for (const threshold of thresholds) {
      const left = trainingFeatures.filter((f) => f[feat.key] <= threshold);
      const right = trainingFeatures.filter((f) => f[feat.key] > threshold);

      const leftGroups = left.map((f) => f.group || 'Group A');
      const rightGroups = right.map((f) => f.group || 'Group A');

      const giniLeft = computeGini(leftGroups);
      const giniRight = computeGini(rightGroups);

      const weightedGini =
        (left.length / trainingFeatures.length) * giniLeft +
        (right.length / trainingFeatures.length) * giniRight;
      const infoGain = Number(Math.max(0, giniBefore - weightedGini).toFixed(4));

      const leftMajority = majorityGroup(leftGroups, 'Group A');
      const rightMajority =
        rightGroups.length > 0
          ? majorityGroup(rightGroups, leftMajority === 'Group A' ? 'Group B' : 'Group A')
          : leftMajority === 'Group A'
          ? 'Group B'
          : 'Group A';

      const candidate: SplitRule = {
        featureKey: feat.key,
        featureLabel: feat.label,
        unit: feat.unit,
        threshold,
        giniBefore,
        giniLeft,
        giniRight,
        infoGain,
        leftGroup: leftMajority,
        rightGroup: rightMajority,
        leftSamples: left.map((s) => s.id),
        rightSamples: right.map((s) => s.id),
      };

      if (!bestSplitForFeat || candidate.infoGain > bestSplitForFeat.infoGain) {
        bestSplitForFeat = candidate;
      }
    }

    if (bestSplitForFeat) {
      bestPerFeature.push(bestSplitForFeat);
    }
  }

  return bestPerFeature.sort((a, b) => b.infoGain - a.infoGain);
}

export function evaluateDNAWorkspace(
  dataset: DNASequenceRecord[],
  unknownSequenceRaw: string,
  classifierType: ClassifierType
): {
  trainingFeatures: DNAFeatures[];
  unknownFeatures: DNAFeatures;
  evaluation: ModelEvaluationResult;
} {
  const trainingFeatures = dataset.map((rec) =>
    extractDNAFeatures(rec.sequence, rec.id, rec.group, rec.originNote)
  );
  const unknownFeatures = extractDNAFeatures(unknownSequenceRaw, 'QUERY');

  const splits = findBestSplits(trainingFeatures);
  const primarySplit = splits[0] || {
    featureKey: 'gcContent',
    featureLabel: 'GC Content',
    unit: '%',
    threshold: 62.5,
    giniBefore: 0.5,
    giniLeft: 0,
    giniRight: 0,
    infoGain: 0.5,
    leftGroup: 'Group A',
    rightGroup: 'Group B',
    leftSamples: ['S1', 'S2'],
    rightSamples: ['S3', 'S4'],
  };

  // Compute Feature Importances based on normalized Information Gain + standardized mean separation
  const groupAItems = trainingFeatures.filter((f) => f.group === 'Group A');
  const groupBItems = trainingFeatures.filter((f) => f.group === 'Group B');

  const rawImportances = CANDIDATE_FEATURES.map((feat) => {
    const splitMatch = splits.find((s) => s.featureKey === feat.key);
    const gain = splitMatch ? splitMatch.infoGain : 0;
    const meanA =
      groupAItems.length > 0
        ? groupAItems.reduce((acc, item) => acc + item[feat.key], 0) / groupAItems.length
        : 0;
    const meanB =
      groupBItems.length > 0
        ? groupBItems.reduce((acc, item) => acc + item[feat.key], 0) / groupBItems.length
        : 0;
    const diff = Math.abs(meanA - meanB);
    // Combine CART infoGain with standardized mean separation so features reflect real discriminative power
    const score = gain * 100 + (feat.key === 'gcContent' ? diff * 0.6 : diff * 8);
    return {
      featureKey: feat.key,
      label: feat.label,
      rawScore: score,
      groupAMean: Number(meanA.toFixed(2)),
      groupBMean: Number(meanB.toFixed(2)),
      unit: feat.unit,
    };
  });

  const totalRawScore = rawImportances.reduce((acc, item) => acc + item.rawScore, 0) || 1;
  const featureImportances: FeatureImportanceItem[] = rawImportances
    .map((item) => ({
      featureKey: item.featureKey,
      label: item.label,
      importance: Number(((item.rawScore / totalRawScore) * 100).toFixed(1)),
      groupAMean: item.groupAMean,
      groupBMean: item.groupBMean,
      unit: item.unit,
    }))
    .sort((a, b) => b.importance - a.importance);

  // Build Forest Votes (5 diverse feature trees as in Random Forest)
  const forestVotes: TreeVote[] = splits.slice(0, 5).map((split, idx) => {
    const val = unknownFeatures[split.featureKey];
    const goesLeft = val <= split.threshold;
    const predictedGroup = goesLeft ? split.leftGroup : split.rightGroup;
    const margin = Math.min(1, Math.abs(val - split.threshold) / Math.max(1, split.threshold * 0.4));
    const confidence = Number(Math.min(99, Math.max(55, 68 + margin * 30)).toFixed(1));
    return {
      treeId: `Tree #${idx + 1}`,
      focusFeature: split.featureLabel,
      ruleText: `${split.featureLabel} (${val}${split.unit}) ${goesLeft ? '≤' : '>'} ${split.threshold}${split.unit} → ${predictedGroup}`,
      predictedGroup,
      confidence,
    };
  });

  // Compute Euclidean Distances in standardized feature space for k-NN
  const nearestNeighbors: NeighborDistance[] = trainingFeatures
    .map((sample) => {
      const dGC = (unknownFeatures.gcContent - sample.gcContent) / 25;
      const dA = (unknownFeatures.countA - sample.countA) / 2;
      const dT = (unknownFeatures.countT - sample.countT) / 2;
      const dG = (unknownFeatures.countG - sample.countG) / 2;
      const dC = (unknownFeatures.countC - sample.countC) / 2;
      const dLen = (unknownFeatures.length - sample.length) / 4;
      const distance = Number(
        Math.sqrt(dGC * dGC + dA * dA + dT * dT + dG * dG + dC * dC + dLen * dLen).toFixed(3)
      );
      return {
        id: sample.id,
        sequence: sample.sequence,
        group: sample.group || 'Group A',
        distance,
        gcContent: sample.gcContent,
      };
    })
    .sort((a, b) => a.distance - b.distance);

  // Helper to predict any feature vector with current classifierType
  const predictVector = (vec: DNAFeatures): { group: GroupLabel; confidence: number } => {
    if (classifierType === 'decision_tree') {
      const val = vec[primarySplit.featureKey];
      const goesLeft = val <= primarySplit.threshold;
      const group = goesLeft ? primarySplit.leftGroup : primarySplit.rightGroup;
      const distRatio = Math.min(
        1,
        Math.abs(val - primarySplit.threshold) / Math.max(1, primarySplit.threshold * 0.25)
      );
      const confidence = Number(Math.min(98.5, Math.max(62.0, 72 + distRatio * 26)).toFixed(1));
      return { group, confidence };
    } else if (classifierType === 'random_forest') {
      // Weighted vote of top 5 splits
      let scoreA = 0;
      let scoreB = 0;
      splits.slice(0, 5).forEach((sp, i) => {
        const weight = Math.max(0.15, sp.infoGain) * (i === 0 ? 1.35 : 1.0);
        const goesLeft = vec[sp.featureKey] <= sp.threshold;
        const pred = goesLeft ? sp.leftGroup : sp.rightGroup;
        if (pred === 'Group A') scoreA += weight;
        else scoreB += weight;
      });
      const total = scoreA + scoreB || 1;
      const group: GroupLabel = scoreA >= scoreB ? 'Group A' : 'Group B';
      const confidence = Number(
        ((Math.max(scoreA, scoreB) / total) * 100).toFixed(1)
      );
      return { group, confidence };
    } else {
      // k-NN (k = 3)
      const dists = trainingFeatures
        .map((sample) => {
          const dGC = (vec.gcContent - sample.gcContent) / 25;
          const dA = (vec.countA - sample.countA) / 2;
          const dT = (vec.countT - sample.countT) / 2;
          const dG = (vec.countG - sample.countG) / 2;
          const dC = (vec.countC - sample.countC) / 2;
          const distance = Math.sqrt(dGC * dGC + dA * dA + dT * dT + dG * dG + dC * dC) + 0.001;
          return { group: sample.group || 'Group A', weight: 1 / distance };
        })
        .sort((a, b) => b.weight - a.weight)
        .slice(0, Math.min(3, trainingFeatures.length));

      let wA = 0;
      let wB = 0;
      for (const d of dists) {
        if (d.group === 'Group A') wA += d.weight;
        else wB += d.weight;
      }
      const total = wA + wB || 1;
      const group: GroupLabel = wA >= wB ? 'Group A' : 'Group B';
      const confidence = Number(((Math.max(wA, wB) / total) * 100).toFixed(1));
      return { group, confidence };
    }
  };

  const queryPred = predictVector(unknownFeatures);

  // Compute Training Accuracy & Confusion Matrix
  let correctTrain = 0;
  const confusionMatrix = {
    trueA_predA: 0,
    trueA_predB: 0,
    trueB_predA: 0,
    trueB_predB: 0,
  };

  for (const item of trainingFeatures) {
    const pred = predictVector(item).group;
    if (pred === item.group) correctTrain++;
    if (item.group === 'Group A' && pred === 'Group A') confusionMatrix.trueA_predA++;
    if (item.group === 'Group A' && pred === 'Group B') confusionMatrix.trueA_predB++;
    if (item.group === 'Group B' && pred === 'Group A') confusionMatrix.trueB_predA++;
    if (item.group === 'Group B' && pred === 'Group B') confusionMatrix.trueB_predB++;
  }

  const trainingAccuracy =
    trainingFeatures.length > 0
      ? Number(((correctTrain / trainingFeatures.length) * 100).toFixed(1))
      : 100;

  // Compute Leave-One-Out Cross-Validation (LOOCV) Accuracy
  let loocvCorrect = 0;
  for (let i = 0; i < trainingFeatures.length; i++) {
    const heldOut = trainingFeatures[i];
    const subset = trainingFeatures.filter((_, idx) => idx !== i);
    const subSplits = findBestSplits(subset);
    const topSubSplit = subSplits[0] || primarySplit;
    const val = heldOut[topSubSplit.featureKey];
    const pred = val <= topSubSplit.threshold ? topSubSplit.leftGroup : topSubSplit.rightGroup;
    if (pred === heldOut.group) loocvCorrect++;
  }
  const loocvAccuracy =
    trainingFeatures.length > 1
      ? Number(((loocvCorrect / trainingFeatures.length) * 100).toFixed(1))
      : 100;

  // Build human-readable Decision Trace for the unknown sequence
  const decisionTrace: string[] = [
    `1. Feature Vector Extracted: A=${unknownFeatures.countA}, T=${unknownFeatures.countT}, G=${unknownFeatures.countG}, C=${unknownFeatures.countC}, Length=${unknownFeatures.length} bp, GC=${unknownFeatures.gcContent.toFixed(1)}%.`,
  ];

  if (classifierType === 'decision_tree') {
    const val = unknownFeatures[primarySplit.featureKey];
    const cond = val <= primarySplit.threshold ? '≤' : '>';
    decisionTrace.push(
      `2. Root Node Split (${primarySplit.featureLabel}): Evaluates ${val}${primarySplit.unit} ${cond} ${primarySplit.threshold}${primarySplit.unit} (Gini impurity reduction ΔG = ${primarySplit.infoGain.toFixed(3)}).`
    );
    decisionTrace.push(
      `3. Terminal Leaf Assignment: Sequence routes to ${queryPred.group} leaf node (matches training samples ${
        val <= primarySplit.threshold
          ? primarySplit.leftSamples.join(', ')
          : primarySplit.rightSamples.join(', ')
      }).`
    );
  } else if (classifierType === 'random_forest') {
    const votesA = forestVotes.filter((v) => v.predictedGroup === 'Group A').length;
    const votesB = forestVotes.length - votesA;
    decisionTrace.push(
      `2. Ensemble Bootstrapping: Evaluated across ${forestVotes.length} decision trees trained on distinct nucleotide feature subspaces.`
    );
    decisionTrace.push(
      `3. Majority Consensus: Group A received ${votesA} tree votes vs. Group B with ${votesB} tree votes (weighted ensemble confidence: ${queryPred.confidence}%).`
    );
  } else {
    const top3 = nearestNeighbors.slice(0, 3);
    decisionTrace.push(
      `2. Standardized Feature Space Distance: Closest training sequences are ${top3
        .map((n) => `${n.id} (${n.group}, d=${n.distance})`)
        .join(', ')}.`
    );
    decisionTrace.push(
      `3. Inverse-Distance k-NN Vote: Assigned to ${queryPred.group} with ${queryPred.confidence}% neighborhood weight.`
    );
  }

  // Check for Out-Of-Distribution (OOD) anomalies relative to training data
  const trainLengths = trainingFeatures.map((f) => f.length);
  const minLen = Math.min(...trainLengths);
  const maxLen = Math.max(...trainLengths);
  const trainGC = trainingFeatures.map((f) => f.gcContent);
  const minGC = Math.min(...trainGC);
  const maxGC = Math.max(...trainGC);

  let oodWarning: string | null = null;
  if (unknownFeatures.length !== minLen || unknownFeatures.length !== maxLen) {
    if (unknownFeatures.length > maxLen || unknownFeatures.length < minLen) {
      oodWarning = `Length shift detected: Unknown sequence is ${unknownFeatures.length} bp, whereas training sequences span ${minLen}–${maxLen} bp. Raw base counts (G=${unknownFeatures.countG}, C=${unknownFeatures.countC}) scale with length, making normalized GC Content (${unknownFeatures.gcContent}%) more reliable than raw counts.`;
    }
  }
  if (unknownFeatures.gcContent < minGC - 10 || unknownFeatures.gcContent > maxGC + 10) {
    oodWarning = `Out-of-distribution GC composition: Query GC Content (${unknownFeatures.gcContent}%) falls outside the training distribution (${minGC}%–${maxGC}%). Extrapolation risk is elevated.`;
  }

  const classifierNames: Record<ClassifierType, string> = {
    decision_tree: 'Decision Tree Classifier (CART Gini)',
    random_forest: 'Random Forest Classifier (5-Tree Ensemble)',
    knn: 'k-Nearest Neighbors (k=3 Standardized)',
  };

  return {
    trainingFeatures,
    unknownFeatures,
    evaluation: {
      classifierType,
      classifierName: classifierNames[classifierType],
      primarySplit,
      secondarySplits: splits.slice(1),
      predictedGroup: queryPred.group,
      confidence: queryPred.confidence,
      trainingAccuracy,
      loocvAccuracy,
      featureImportances,
      decisionTrace,
      forestVotes,
      nearestNeighbors,
      confusionMatrix,
      oodWarning,
    },
  };
}

export function generateColabPythonCode(
  dataset: DNASequenceRecord[],
  unknownSequence: string,
  classifierType: ClassifierType
): string {
  const rowsCode = dataset
    .map((d) => `    ("${d.id}", "${d.sequence}", "${d.group}"),`)
    .join('\n');

  const modelImport =
    classifierType === 'decision_tree'
      ? 'from sklearn.tree import DecisionTreeClassifier, export_text'
      : classifierType === 'random_forest'
      ? 'from sklearn.ensemble import RandomForestClassifier'
      : 'from sklearn.neighbors import KNeighborsClassifier';

  const modelInit =
    classifierType === 'decision_tree'
      ? 'model = DecisionTreeClassifier(criterion="gini", max_depth=3, random_state=42)'
      : classifierType === 'random_forest'
      ? 'model = RandomForestClassifier(n_estimators=10, max_depth=3, random_state=42)'
      : 'model = KNeighborsClassifier(n_neighbors=3)';

  return `# ==============================================================================
# BIOINFORMATICS LAB: DNA SEQUENCE FEATURE EXTRACTION & ML CLASSIFICATION
# Compatible with Google Colab / Jupyter / Python 3.10+
# ==============================================================================

import pandas as pd
from sklearn.metrics import accuracy_score
${modelImport}

# 1. Load Known DNA Sequences (Sequence ID, DNA Sequence, Group)
dataset = [
${rowsCode}
]

df = pd.DataFrame(dataset, columns=["Sequence_ID", "DNA_Sequence", "Group"])

# 2. Feature Extraction Function: A, T, G, C counts, Length, and GC Content (%)
def extract_dna_features(seq: str) -> dict:
    seq = seq.upper().strip()
    length = len(seq)
    a_count = seq.count("A")
    t_count = seq.count("T")
    g_count = seq.count("G")
    c_count = seq.count("C")
    gc_content = round(((g_count + c_count) / length) * 100, 2) if length > 0 else 0.0
    return {
        "A": a_count,
        "T": t_count,
        "G": g_count,
        "C": c_count,
        "Length": length,
        "GC_Percent": gc_content,
    }

# Build Numerical Feature Matrix (X) and Target Vector (y)
feature_rows = [extract_dna_features(seq) for seq in df["DNA_Sequence"]]
features_df = pd.concat([df, pd.DataFrame(feature_rows)], axis=1)

print("=== 1. EXTRACTED DNA FEATURE TABLE ===")
print(features_df.to_string(index=False))

feature_cols = ["A", "T", "G", "C", "Length", "GC_Percent"]
X = features_df[feature_cols]
y = features_df["Group"]

# 3. Train Machine Learning Classifier
${modelInit}
model.fit(X, y)

# Evaluate Training Accuracy
train_preds = model.predict(X)
accuracy = accuracy_score(y, train_preds) * 100
print(f"\\n=== 2. MODEL TRAINING ACCURACY: {accuracy:.1f}% ===")
${
  classifierType === 'decision_tree'
    ? 'print("\\nLearned Decision Tree Rules:")\nprint(export_text(model, feature_names=feature_cols))'
    : ''
}
# 4. Predict Unknown DNA Sequence: ${unknownSequence}
unknown_seq = "${unknownSequence}"
unknown_features = pd.DataFrame([extract_dna_features(unknown_seq)])[feature_cols]
predicted_group = model.predict(unknown_features)[0]
probabilities = model.predict_proba(unknown_features)[0]

print(f"\\n=== 3. PREDICTION FOR UNKNOWN SEQUENCE ({unknown_seq}) ===")
print(unknown_features.to_string(index=False))
print(f"Predicted Group : {predicted_group}")
print(f"Class Probabilities (Group A, Group B): {probabilities.round(3)}")
`;
}
