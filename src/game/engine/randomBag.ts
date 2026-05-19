import { PIECE_KINDS } from "../pieces/pieces";
import type { PieceKind } from "../types";

export class RandomBag {
  private bag: PieceKind[] = [];

  next(): PieceKind {
    if (this.bag.length === 0) {
      this.bag = [...PIECE_KINDS];
      this.shuffle();
    }

    const piece = this.bag.shift();
    if (!piece) {
      throw new Error("Random bag failed to produce a piece.");
    }

    return piece;
  }

  private shuffle(): void {
    for (let index = this.bag.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [this.bag[index], this.bag[swapIndex]] = [this.bag[swapIndex], this.bag[index]];
    }
  }
}
