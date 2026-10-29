export function leerConfig(env = process.env) {
  return {
    calendarPedido: env.CALENDAR_MODE === 'real' ? 'real' : 'mock',
    whatsappPedido: env.WHATSAPP_MODE === 'real' ? 'real' : 'mock',
    calendarId: env.GOOGLE_CALENDAR_ID || '',
    calendarToken: env.GOOGLE_CALENDAR_TOKEN || '',
    whatsappToken: env.WHATSAPP_TOKEN || '',
    whatsappPhoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || '',
    port: Number(env.PORT) || 3000,
  };
}
