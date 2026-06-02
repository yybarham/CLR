import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  readonly TUBE_SIZE = 4;

  readonly COLORS = [
    '#FF0000',
    '#FFFF00',
    '#0000FF',
    '#00FF00',
    '#FF9800',
    '#2196F3',
    '#3F51B5',
    '#795548',
    '#95E1D3',
    '#9C27B0',
    '#9D4EDD',
    '#4CAF50',
  ];
  
  readonly DIFFICULTY_LEVELS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  tubes: string[][] = [];

  moveHistory: string[][][] = [];

  selectedIndex: number | null = null;

  moves = 0;

  won = false;

  difficulty: number = 12;

  isCurrentSolvable = true;

  solutionPath: string[][][] = [];

  ngOnInit(): void {
    this.newGame();
    this.verifySolvable();
  }

  newGame(difficulty?: number): void {
    if (difficulty) this.difficulty = difficulty;

    this.moves = 0;

    this.won = false;

    this.selectedIndex = null;

    this.tubes = this.generateLevel(this.difficulty);

    this.moveHistory = [];

    this.solutionPath = [];

    this.saveGame();
  }

  restartGame(): void {
    const saved = localStorage.getItem('colorSortGame');

    if (saved) {
      this.tubes = JSON.parse(saved);

      this.moves = 0;

      this.won = false;

      this.selectedIndex = null;

      this.moveHistory = [];

      this.solutionPath = [];
    } else {
      this.newGame();
    }
  }

  private saveGame(): void {
    localStorage.setItem('colorSortGame', JSON.stringify(this.tubes));
  }

  private generateLevel(numColors: number): string[][] {
    let tubes: string[][] = [];

    let attempts = 0;

    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const pool: string[] = [];

      for (let c = 0; c < numColors; c++) {
        for (let s = 0; s < this.TUBE_SIZE; s++) pool.push(this.COLORS[c]);
      }

      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      tubes = [];

      for (let i = 0; i < numColors; i++) {
        tubes.push(pool.slice(i * this.TUBE_SIZE, (i + 1) * this.TUBE_SIZE));
      }

      // Add empty tubes at the end

      tubes.push([], []);

      // Check if solvable

      if (this.isSolvable(tubes)) {
        return tubes;
      }

      attempts++;
    }

    alert(
      'Failed to generate a solvable level after multiple attempts. Please try again.',
    );

    return tubes; // Return last attempt if max tries exceeded
  }

  private isSolvable(initialTubes: string[][]): boolean {
    const TUBE_SIZE = this.TUBE_SIZE;

    const MAX_STATES = 30000;

    const serialize = (tubes: string[][]): string =>
      tubes
        .map((t) => t.join(','))
        .sort()
        .join('|');

    const isWon = (tubes: string[][]): boolean =>
      tubes.every(
        (t) =>
          t.length === 0 ||
          (t.length === TUBE_SIZE && t.every((c) => c === t[0])),
      );

    const visited = new Set<string>([serialize(initialTubes)]);

    const stack: string[][][] = [initialTubes.map((t) => [...t])];

    while (stack.length > 0) {
      if (visited.size > MAX_STATES) return true; // Limit reached — assume solvable

      const state = stack.pop()!;

      if (isWon(state)) return true;

      for (let from = 0; from < state.length; from++) {
        const src = state[from];

        if (src.length === 0) continue;

        // Skip tubes that are already fully sorted

        if (src.length === TUBE_SIZE && src.every((c) => c === src[0]))
          continue;

        const topColor = src[src.length - 1];

        const isAllSameColor = src.every((c) => c === topColor);

        for (let to = 0; to < state.length; to++) {
          if (from === to) continue;

          const dst = state[to];

          if (dst.length >= TUBE_SIZE) continue;

          if (dst.length > 0 && dst[dst.length - 1] !== topColor) continue;

          // Skip pouring a uniform tube into an empty slot (pointless move)

          if (dst.length === 0 && isAllSameColor) continue;

          const next = state.map((t) => [...t]);

          const s = next[from],
            d = next[to];

          while (
            s.length > 0 &&
            s[s.length - 1] === topColor &&
            d.length < TUBE_SIZE
          ) {
            d.push(s.pop()!);
          }

          const key = serialize(next);

          if (!visited.has(key)) {
            visited.add(key);

            stack.push(next);
          }
        }
      }
    }

    return false; // All reachable states explored — no solution exists
  }

  private getPouredCount(tube: string[], color: string): number {
    let count = 0;

    for (let i = tube.length - 1; i >= 0 && tube[i] === color; i--) {
      count++;
    }

    return count;
  }

  onTubeClick(index: number): void {
    if (this.won) return;

    if (this.selectedIndex === null) {
      if (this.tubes[index].length > 0) this.selectedIndex = index;
    } else if (this.selectedIndex === index) {
      this.selectedIndex = null;
    } else if (this.canPour(this.selectedIndex, index)) {
      this.moveHistory.push(JSON.parse(JSON.stringify(this.tubes)));

      this.pour(this.selectedIndex, index);

      this.moves++;

      this.selectedIndex = null;

      this.solutionPath = [];

      if (this.checkWin()) this.won = true;
    } else if (this.tubes[index].length > 0) {
      this.selectedIndex = index;
    } else {
      this.selectedIndex = null;
    }
  }

  isValidTarget(index: number): boolean {
    if (this.selectedIndex === null || this.selectedIndex === index)
      return false;

    return this.canPour(this.selectedIndex, index);
  }

  get gridColumns(): string {
    return `repeat(${Math.ceil(this.tubes.length / 2)}, auto)`;
  }

  undo(): void {
    if (this.moveHistory.length > 0) {
      this.tubes = this.moveHistory.pop()!;

      this.moves--;

      this.selectedIndex = null;

      this.won = false;
    }
  }

  private canPour(from: number, to: number): boolean {
    const src = this.tubes[from];

    const dst = this.tubes[to];

    if (src.length === 0 || dst.length >= this.TUBE_SIZE) return false;

    return dst.length === 0 || src[src.length - 1] === dst[dst.length - 1];
  }

  private pour(from: number, to: number): void {
    const src = this.tubes[from];

    const dst = this.tubes[to];

    const topColor = src[src.length - 1];

    while (
      src.length > 0 &&
      src[src.length - 1] === topColor &&
      dst.length < this.TUBE_SIZE
    ) {
      dst.push(src.pop()!);
    }
  }

  private checkWin(): boolean {
    return this.tubes.every(
      (t) =>
        t.length === 0 ||
        (t.length === this.TUBE_SIZE && t.every((c) => c === t[0])),
    );
  }

  getSlots(tube: string[]): (string | null)[] {
    return Array.from(
      { length: this.TUBE_SIZE },
      (_, i) => tube[this.TUBE_SIZE - 1 - i] ?? null,
    );
  }

  isSolved(tube: string[]): boolean {
    return tube.length === this.TUBE_SIZE && tube.every((c) => c === tube[0]);
  }

  showNext(): void {
    if (this.won) return;

    if (this.solutionPath.length === 0) {
      this.solutionPath = this.findSolution(
        JSON.parse(JSON.stringify(this.tubes)),
      );

      if (this.solutionPath.length === 0) {
        alert('No solution found from current state. Try undoing some moves.');

        return;
      }
    }

    this.moveHistory.push(JSON.parse(JSON.stringify(this.tubes)));

    this.tubes = this.solutionPath.shift()!;

    this.moves++;

    this.selectedIndex = null;

    if (this.checkWin()) this.won = true;
  }

  private findSolution(initialTubes: string[][]): string[][][] {
    const TUBE_SIZE = this.TUBE_SIZE;

    const MAX_STATES = 50000;

    const serialize = (tubes: string[][]): string =>
      tubes
        .map((t) => t.join(','))
        .sort()
        .join('|');

    const isWon = (tubes: string[][]): boolean =>
      tubes.every(
        (t) =>
          t.length === 0 ||
          (t.length === TUBE_SIZE && t.every((c) => c === t[0])),
      );

    const startKey = serialize(initialTubes);

    const parent = new Map<string, string>([[startKey, '']]);

    const stateMap = new Map<string, string[][]>([
      [startKey, initialTubes.map((t) => [...t])],
    ]);

    const queue: string[][][] = [initialTubes.map((t) => [...t])];

    while (queue.length > 0) {
      if (stateMap.size > MAX_STATES) return [];

      const state = queue.shift()!;

      const stateKey = serialize(state);

      if (isWon(state)) {
        const path: string[][][] = [];

        let key = stateKey;

        while (parent.get(key) !== '') {
          path.unshift(stateMap.get(key)!);

          key = parent.get(key)!;
        }

        return path;
      }

      for (let from = 0; from < state.length; from++) {
        const src = state[from];

        if (src.length === 0) continue;

        if (src.length === TUBE_SIZE && src.every((c) => c === src[0]))
          continue;

        const topColor = src[src.length - 1];

        const isAllSameColor = src.every((c) => c === topColor);

        for (let to = 0; to < state.length; to++) {
          if (from === to) continue;

          const dst = state[to];

          if (dst.length >= TUBE_SIZE) continue;

          if (dst.length > 0 && dst[dst.length - 1] !== topColor) continue;

          if (dst.length === 0 && isAllSameColor) continue;

          const next = state.map((t) => [...t]);

          const s = next[from],
            d = next[to];

          while (
            s.length > 0 &&
            s[s.length - 1] === topColor &&
            d.length < TUBE_SIZE
          ) {
            d.push(s.pop()!);
          }

          const key = serialize(next);

          if (!parent.has(key)) {
            parent.set(key, stateKey);

            stateMap.set(key, next);

            queue.push(next);
          }
        }
      }
    }

    return []; // No solution found
  }

  verifySolvable(): void {
    this.isCurrentSolvable = this.isSolvable(
      JSON.parse(JSON.stringify(this.tubes)),
    );

    this.LBL = this.isCurrentSolvable
      ? '✓ Puzzle is solvable!'
      : '✗ Puzzle appears unsolvable. Try restarting.';
  }

  LBL = '';

  closeWinPopup(): void {
    this.won = false;
  }
}
