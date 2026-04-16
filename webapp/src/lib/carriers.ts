export interface Carrier {
  id: string;
  name: string;
  gateway: string;
}

export const SMS_CARRIERS: Carrier[] = [
  { id: 'att', name: 'AT&T', gateway: 'txt.att.net' },
  { id: 'verizon', name: 'Verizon', gateway: 'vtext.com' },
  { id: 'tmobile', name: 'T-Mobile', gateway: 'tmomail.net' },
  { id: 'sprint', name: 'Sprint', gateway: 'messaging.sprintpcs.com' },
  { id: 'uscellular', name: 'US Cellular', gateway: 'email.uscc.net' },
  { id: 'cricket', name: 'Cricket', gateway: 'sms.cricketwireless.net' },
  { id: 'metropcs', name: 'Metro PCS', gateway: 'mymetropcs.com' },
  { id: 'boost', name: 'Boost Mobile', gateway: 'sms.myboost.com' },
  { id: 'googlefi', name: 'Google Fi', gateway: 'msg.fi.google.com' },
  { id: 'mint', name: 'Mint Mobile', gateway: 'tmomail.net' },
  { id: 'visible', name: 'Visible', gateway: 'vtext.com' },
  { id: 'xfinity', name: 'Xfinity Mobile', gateway: 'vtext.com' },
  { id: 'consumer', name: 'Consumer Cellular', gateway: 'mailmymobile.net' },
  { id: 'republic', name: 'Republic Wireless', gateway: 'text.republicwireless.com' },
];

export function getCarrierGateway(carrierId: string): string | null {
  const carrier = SMS_CARRIERS.find((c) => c.id === carrierId);
  return carrier ? carrier.gateway : null;
}

export function buildSmsEmail(phone: string, carrierId: string): string | null {
  const gateway = getCarrierGateway(carrierId);
  if (!gateway) return null;

  // Strip non-digits from phone number
  const cleaned = phone.replace(/\D/g, '');
  // Remove leading 1 for US numbers
  const number = cleaned.startsWith('1') && cleaned.length === 11
    ? cleaned.slice(1)
    : cleaned;

  if (number.length !== 10) return null;

  return `${number}@${gateway}`;
}
