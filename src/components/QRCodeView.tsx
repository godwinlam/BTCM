import React, { useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, Image } from 'react-native';
import { toQR } from 'toqr';

interface QRCodeViewProps {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
}

export function generateQrSvg(
  text: string,
  bgColor = '#FFFFFF',
  fgColor = '#0B0E14',
  size = 300
): string {
  const target = text || 'http://localhost:8081/register';
  try {
    const qr = toQR(target);
    const matrixSize = Math.round(Math.sqrt(qr.length));
    const margin = 2;
    const total = matrixSize + margin * 2;
    let path = '';
    for (let y = 0; y < matrixSize; y++) {
      for (let x = 0; x < matrixSize; x++) {
        if (qr[y * matrixSize + x]) {
          path += `M${x + margin} ${y + margin}h1v1h-1z `;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="${bgColor}"/><path d="${path.trim()}" fill="${fgColor}"/></svg>`;
  } catch (err) {
    console.warn('QR generation error:', err);
    return '';
  }
}

export function generateQrDataUri(
  text: string,
  bgColor = '#FFFFFF',
  fgColor = '#0B0E14',
  size = 300
): string {
  const svg = generateQrSvg(text, bgColor, fgColor, size);
  if (!svg) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text || 'BTCM')}`;
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function QRCodeView({
  value,
  size = 180,
  bgColor = '#FFFFFF',
  fgColor = '#0B0E14',
}: QRCodeViewProps) {
  const targetValue = value || 'http://localhost:8081/register';
  const canvasRef = useRef<any>(null);

  // On Web: Draw onto HTML5 canvas with 2D context for 100% reliable pixel-perfect rendering
  useEffect(() => {
    if (Platform.OS === 'web' && canvasRef.current) {
      try {
        const canvas = canvasRef.current;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, size, size);

          const qr = toQR(targetValue);
          const matrixSize = Math.round(Math.sqrt(qr.length));
          const margin = 2;
          const totalModules = matrixSize + margin * 2;
          const cellSize = size / totalModules;

          ctx.fillStyle = fgColor;
          for (let y = 0; y < matrixSize; y++) {
            for (let x = 0; x < matrixSize; x++) {
              if (qr[y * matrixSize + x]) {
                const rx = Math.round((x + margin) * cellSize);
                const ry = Math.round((y + margin) * cellSize);
                const rw = Math.ceil(cellSize);
                const rh = Math.ceil(cellSize);
                ctx.fillRect(rx, ry, rw, rh);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Canvas QR render error:', err);
      }
    }
  }, [targetValue, size, bgColor, fgColor]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { width: size, height: size, backgroundColor: bgColor }]}>
        {React.createElement('canvas', {
          ref: canvasRef,
          width: size,
          height: size,
          style: {
            width: `${size}px`,
            height: `${size}px`,
            display: 'block',
            borderRadius: '6px',
            imageRendering: 'pixelated',
          },
        })}
      </View>
    );
  }

  // Native Mobile (iOS / Android): Render with NativeQrMatrix
  return <NativeQrMatrix value={targetValue} size={size} bgColor={bgColor} fgColor={fgColor} />;
}

function NativeQrMatrix({
  value,
  size,
  bgColor,
  fgColor,
}: {
  value: string;
  size: number;
  bgColor: string;
  fgColor: string;
}) {
  const qrData = useMemo(() => {
    const target = value || 'http://localhost:8081/register';
    try {
      const qr = toQR(target);
      const matrixSize = Math.round(Math.sqrt(qr.length));
      const margin = 2;
      const totalModules = matrixSize + margin * 2;
      const cellSize = Math.max(2, Math.floor(size / totalModules));
      const actualSize = cellSize * totalModules;

      const rows: Array<Array<{ isBlack: boolean; count: number }>> = [];
      for (let y = 0; y < matrixSize; y++) {
        const rowBlocks: Array<{ isBlack: boolean; count: number }> = [];
        let x = 0;
        while (x < matrixSize) {
          const isBlack = Boolean(qr[y * matrixSize + x]);
          let count = 1;
          while (x + count < matrixSize && Boolean(qr[y * matrixSize + (x + count)]) === isBlack) {
            count++;
          }
          rowBlocks.push({ isBlack, count });
          x += count;
        }
        rows.push(rowBlocks);
      }

      return {
        matrixSize,
        margin,
        cellSize,
        actualSize,
        rows,
      };
    } catch (err) {
      console.warn('Failed to encode QR code with toqr:', err);
      return null;
    }
  }, [value, size]);

  if (!qrData) {
    const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&data=${encodeURIComponent(value || 'BTCM')}`;
    return (
      <View style={[styles.container, { width: size, height: size, backgroundColor: bgColor }]}>
        <Image source={{ uri: fallbackUrl }} style={{ width: size, height: size }} resizeMode="contain" />
      </View>
    );
  }

  const { margin, cellSize, actualSize, rows } = qrData;
  const marginSize = margin * cellSize;

  return (
    <View
      style={[
        styles.container,
        {
          width: actualSize,
          height: actualSize,
          backgroundColor: bgColor,
        },
      ]}
    >
      <View style={{ height: marginSize, width: actualSize, backgroundColor: bgColor }} />
      {rows.map((row, y) => (
        <View key={y} style={{ flexDirection: 'row', height: cellSize, width: actualSize }}>
          <View style={{ width: marginSize, height: cellSize, backgroundColor: bgColor, flexShrink: 0 }} />
          {row.map((block, bIdx) => (
            <View
              key={bIdx}
              style={{
                width: block.count * cellSize,
                height: cellSize,
                backgroundColor: block.isBlack ? fgColor : bgColor,
                flexShrink: 0,
              }}
            />
          ))}
          <View style={{ width: marginSize, height: cellSize, backgroundColor: bgColor, flexShrink: 0 }} />
        </View>
      ))}
      <View style={{ height: marginSize, width: actualSize, backgroundColor: bgColor }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
