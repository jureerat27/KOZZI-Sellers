export function formatCurrency(amount: number | undefined | null): string {
  const num = Number(amount) || 0;
  return num.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    const str = String(dateStr);
    const clean = str.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const [year, month, day] = parts;
      return `${day}-${month}-${year}`;
    }
    return str;
  } catch {
    return String(dateStr || '');
  }
}

export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    const hr = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${d}-${m}-${y} ${hr}:${min} น.`;
  } catch {
    return String(dateStr || '');
  }
}

const THAI_NUMBERS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const THAI_UNITS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

function convertGroupToThaiText(numberStr: string): string {
  let result = '';
  const len = numberStr.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(numberStr[i], 10);
    const unitPos = len - i - 1;

    if (digit !== 0) {
      if (unitPos === 1 && digit === 1) {
        // '1' at tens place -> 'สิบ'
        result += 'สิบ';
      } else if (unitPos === 1 && digit === 2) {
        // '2' at tens place -> 'ยี่สิบ'
        result += 'ยี่สิบ';
      } else if (unitPos === 0 && digit === 1 && len > 1 && parseInt(numberStr[len - 2], 10) !== 0) {
        // '1' at ones place when preceding digit is non-zero -> 'เอ็ด'
        result += 'เอ็ด';
      } else {
        result += THAI_NUMBERS[digit] + THAI_UNITS[unitPos];
      }
    }
  }

  return result;
}

export function bahtText(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'ศูนย์บาทถ้วน';

  const num = Math.abs(Number(amount));
  if (num === 0) return 'ศูนย์บาทถ้วน';

  const fixed = num.toFixed(2);
  const [bahtPart, satangPart] = fixed.split('.');

  let bahtStr = '';
  
  // Handle numbers with million units
  const bahtNumber = parseInt(bahtPart, 10);
  if (bahtNumber === 0) {
    bahtStr = 'ศูนย์';
  } else {
    // Break into groups of 6 digits (millions)
    let tempBaht = bahtPart;
    const groups: string[] = [];
    while (tempBaht.length > 0) {
      const take = Math.min(6, tempBaht.length);
      const chunk = tempBaht.slice(tempBaht.length - take);
      tempBaht = tempBaht.slice(0, tempBaht.length - take);
      groups.unshift(chunk);
    }

    for (let i = 0; i < groups.length; i++) {
      const groupText = convertGroupToThaiText(groups[i]);
      if (groupText) {
        bahtStr += groupText;
        if (i < groups.length - 1) {
          bahtStr += 'ล้าน';
        }
      }
    }
  }

  const satangNumber = parseInt(satangPart, 10);

  if (satangNumber === 0) {
    return `${bahtStr}บาทถ้วน`;
  } else {
    const satangStr = convertGroupToThaiText(satangPart);
    if (bahtNumber === 0) {
      return `${satangStr}สตางค์`;
    }
    return `${bahtStr}บาท${satangStr}สตางค์`;
  }
}

export function generateNextVoucherNumber(dateStr: string, existingExpenses: { voucherNumber?: string; date?: string }[]): string {
  const cleanDate = (dateStr || new Date().toISOString().split('T')[0]).split('T')[0];
  const parts = cleanDate.split('-');
  let yearMonth = '';
  if (parts.length >= 2) {
    yearMonth = `${parts[0]}${parts[1]}`;
  } else {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    yearMonth = `${y}${m}`;
  }

  const prefix = `PV-${yearMonth}-`;
  
  // Find highest sequence for this prefix
  let maxSeq = 0;
  for (const exp of existingExpenses) {
    if (exp.voucherNumber && exp.voucherNumber.startsWith(prefix)) {
      const seqStr = exp.voucherNumber.replace(prefix, '');
      const seqNum = parseInt(seqStr, 10);
      if (!isNaN(seqNum) && seqNum > maxSeq) {
        maxSeq = seqNum;
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
}
