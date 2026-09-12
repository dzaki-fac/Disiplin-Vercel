/** Rencana latihan GEMASTIK 9 minggu — diimpor ke akun yang sedang login. */

export interface GemastikPlanItem {
  week: number
  title: string
}

export const GEMASTIK_WEEK_NAMES: Record<string, string> = {
  '1': 'Minggu 1 — Bitmask',
  '2': 'Minggu 2 — Fundamental',
  '3': 'Minggu 3 — Greedy + Data Structure',
  '4': 'Minggu 4 — Graph Fundamental',
  '5': 'Minggu 5 — Graph Intermediate',
  '6': 'Minggu 6 — DP',
  '7': 'Minggu 7 — Advanced',
  '8': 'Minggu 8 — Problem Solving',
  '9': 'Minggu 9 — Final Preparation',
}

export const GEMASTIK_PLAN: GemastikPlanItem[] = [
  // Minggu 1 — Bitmask
  { week: 1, title: 'Senin: Bit Operation' },
  { week: 1, title: 'Selasa: Bit Manipulation + latihan' },
  { week: 1, title: 'Rabu: Subset Enumeration' },
  { week: 1, title: 'Kamis: Subset Enumeration + latihan' },
  { week: 1, title: 'Jumat: Bitmask DP dasar' },
  { week: 1, title: 'Sabtu: Bitmask DP + latihan' },
  { week: 1, title: 'Minggu: Virtual Contest + upsolve' },

  // Minggu 2 — Fundamental
  { week: 2, title: 'Senin: Prefix Sum + Difference Array' },
  { week: 2, title: 'Selasa: Two Pointers' },
  { week: 2, title: 'Rabu: Sliding Window' },
  { week: 2, title: 'Kamis: Binary Search' },
  { week: 2, title: 'Jumat: Binary Search on Answer' },
  { week: 2, title: 'Sabtu: Mixed Problem' },
  { week: 2, title: 'Minggu: Virtual Contest + upsolve' },

  // Minggu 3 — Greedy + Data Structure
  { week: 3, title: 'Senin: Sorting + Greedy dasar' },
  { week: 3, title: 'Selasa: Greedy problem' },
  { week: 3, title: 'Rabu: Map + Set' },
  { week: 3, title: 'Kamis: Frequency / Counting' },
  { week: 3, title: 'Jumat: Priority Queue' },
  { week: 3, title: 'Sabtu: Mixed Problem' },
  { week: 3, title: 'Minggu: Virtual Contest + upsolve' },

  // Minggu 4 — Graph Fundamental
  { week: 4, title: 'Senin: DFS' },
  { week: 4, title: 'Selasa: BFS' },
  { week: 4, title: 'Rabu: Grid + Flood Fill' },
  { week: 4, title: 'Kamis: Connected Components' },
  { week: 4, title: 'Jumat: DSU' },
  { week: 4, title: 'Sabtu: Mixed Graph' },
  { week: 4, title: 'Minggu: Virtual Contest + upsolve' },

  // Minggu 5 — Graph Intermediate
  { week: 5, title: 'Senin: Shortest Path' },
  { week: 5, title: 'Selasa: Dijkstra' },
  { week: 5, title: 'Rabu: MST' },
  { week: 5, title: 'Kamis: Kruskal + DSU' },
  { week: 5, title: 'Jumat: Topological Sort + DAG' },
  { week: 5, title: 'Sabtu: Mixed Graph' },
  { week: 5, title: 'Minggu: Virtual Contest + upsolve' },

  // Minggu 6 — DP
  { week: 6, title: 'Senin: DP 1D' },
  { week: 6, title: 'Selasa: DP 2D' },
  { week: 6, title: 'Rabu: 0/1 Knapsack' },
  { week: 6, title: 'Kamis: Unbounded Knapsack' },
  { week: 6, title: 'Jumat: LCS + LIS' },
  { week: 6, title: 'Sabtu: Mixed DP' },
  { week: 6, title: 'Minggu: Virtual Contest + upsolve' },

  // Minggu 7 — Advanced
  { week: 7, title: 'Senin: Bitmask DP' },
  { week: 7, title: 'Selasa: Subset DP' },
  { week: 7, title: 'Rabu: LCA' },
  { week: 7, title: 'Kamis: SCC' },
  { week: 7, title: 'Jumat: DP State Machine' },
  { week: 7, title: 'Sabtu: Mixed Advanced' },
  { week: 7, title: 'Minggu: Virtual Contest + upsolve' },

  // Minggu 8 — Problem Solving (jangan pilih berdasarkan tag, target 1100-1400)
  { week: 8, title: 'Senin: 4-5 soal random (1100-1400, tanpa lihat tag)' },
  { week: 8, title: 'Selasa: 4-5 soal random (1100-1400, tanpa lihat tag)' },
  { week: 8, title: 'Rabu: Virtual Contest' },
  { week: 8, title: 'Kamis: Upsolve contest' },
  { week: 8, title: 'Jumat: 4-5 soal random (1100-1400, tanpa lihat tag)' },
  { week: 8, title: 'Sabtu: Virtual Contest' },
  { week: 8, title: 'Minggu: Review kesalahan' },

  // Minggu 9 — Final Preparation
  { week: 9, title: 'Senin: Virtual Contest 3-4 jam' },
  { week: 9, title: 'Selasa: Upsolve' },
  { week: 9, title: 'Rabu: Mixed Problem 1200-1500' },
  { week: 9, title: 'Kamis: Virtual Contest 3-4 jam' },
  { week: 9, title: 'Jumat: Upsolve' },
  { week: 9, title: 'Sabtu: Simulasi GEMASTIK' },
  { week: 9, title: 'Minggu: Review semua kesalahan' },
]
