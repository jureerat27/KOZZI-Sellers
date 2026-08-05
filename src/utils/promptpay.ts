import QRCode from 'qrcode';

/**
 * Calculates CRC16 CCITT (0x1021) with initial 0xFFFF
 */
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xff;
    x ^= x >> 4;
    crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Helper to construct Tag Length Value string
 */
function formatTLV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Generates official Thailand PromptPay EMVCo Payload string
 */
export function generatePromptPayPayload(
  targetNumber: string,
  amount?: number
): string {
  const cleaned = targetNumber.replace(/[^0-9]/g, '');
  let targetTag = '';

  if (cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('066'))) {
    // Mobile Number
    let formattedPhone = cleaned;
    if (cleaned.startsWith('0')) {
      formattedPhone = '0066' + cleaned.substring(1);
    } else if (!cleaned.startsWith('0066')) {
      formattedPhone = '0066' + cleaned;
    }
    targetTag = formatTLV('01', formattedPhone);
  } else if (cleaned.length === 13) {
    // National ID or Tax ID
    targetTag = formatTLV('02', cleaned);
  } else {
    // Fallback: treat as mobile or formatted ID
    if (cleaned.length < 13) {
      const paddedPhone = cleaned.startsWith('0') ? '0066' + cleaned.substring(1) : '0066' + cleaned;
      targetTag = formatTLV('01', paddedPhone);
    } else {
      targetTag = formatTLV('02', cleaned.substring(0, 13));
    }
  }

  // Application ID for PromptPay
  const aidTag = formatTLV('00', 'A000000677010111');
  const tag29Content = `${aidTag}${targetTag}`;
  const tag29 = formatTLV('29', tag29Content);

  // Dynamic (12) if amount specified, else Static (11)
  const isDynamic = typeof amount === 'number' && amount > 0;
  const poiMethod = formatTLV('01', isDynamic ? '12' : '11');

  let rawData = `000201${poiMethod}${tag29}5303764`;

  if (isDynamic && amount) {
    const formattedAmount = amount.toFixed(2);
    rawData += formatTLV('54', formattedAmount);
  }

  rawData += '5802TH6304';

  const checksum = crc16(rawData);
  return `${rawData}${checksum}`;
}

/**
 * Generates Data URL image of PromptPay QR Code
 */
export async function generatePromptPayQRDataUrl(
  targetNumber: string,
  amount?: number
): Promise<string> {
  const payload = generatePromptPayPayload(targetNumber, amount);
  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
      color: {
        dark: '#002D62', // Deep PromptPay Navy Blue
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('Error generating PromptPay QR:', err);
    throw err;
  }
}
