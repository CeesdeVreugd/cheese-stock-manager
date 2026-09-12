declare module "jsqr" {
  interface QRCodePoint {
    x: number;
    y: number;
  }
  interface QRCode {
    data: string;
    location: {
      topLeftCorner: QRCodePoint;
      topRightCorner: QRCodePoint;
      bottomLeftCorner: QRCodePoint;
      bottomRightCorner: QRCodePoint;
    };
  }
  function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: { inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst" }
  ): QRCode | null;
  export default jsQR;
}
