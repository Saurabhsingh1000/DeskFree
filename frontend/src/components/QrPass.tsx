import { useMemo } from 'react';

interface QrPassProps {
  code: string;
  seatNumber: string;
  roomName: string;
}

// Deterministic 21x21 QR-like matrix generator with finder patterns
function generateQrMatrix(text: string): boolean[][] {
  const size = 21;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Finder pattern helper (7x7 with inner 3x3)
  const placeFinderPattern = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[row + r][col + c] = true;
        }
      }
    }
  };

  // 3 standard QR finder patterns
  placeFinderPattern(0, 0);
  placeFinderPattern(0, size - 7);
  placeFinderPattern(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Hash-based deterministic data fill
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  let bitIndex = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finder patterns
      if (
        (r < 8 && c < 8) ||
        (r < 8 && c >= size - 8) ||
        (r >= size - 8 && c < 8) ||
        r === 6 || c === 6
      ) {
        continue;
      }
      const val = (Math.sin(hash + bitIndex * 13.37) * 10000) % 1;
      matrix[r][c] = Math.abs(val) > 0.45;
      bitIndex++;
    }
  }

  return matrix;
}

export default function QrPass({ code, seatNumber, roomName }: QrPassProps) {
  const matrix = useMemo(() => generateQrMatrix(`${code}:${seatNumber}:${roomName}`), [code, seatNumber, roomName]);
  const cellSize = 6;
  const viewBoxSize = matrix.length * cellSize;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white text-slate-900 rounded-2xl shadow-xl">
      <div className="w-36 h-36 relative flex items-center justify-center">
        <svg
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          className="w-full h-full"
          shapeRendering="crispEdges"
        >
          {matrix.map((row, r) =>
            row.map((active, c) =>
              active ? (
                <rect
                  key={`${r}-${c}`}
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill="#0f172a"
                />
              ) : null
            )
          )}
        </svg>
      </div>
      <div className="mt-2 text-center">
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500 font-bold">
          PASS ID: {code.slice(0, 10).toUpperCase()}
        </span>
        <p className="text-[11px] font-semibold text-slate-700 mt-0.5">
          Scan at desk terminal to check-in
        </p>
      </div>
    </div>
  );
}
