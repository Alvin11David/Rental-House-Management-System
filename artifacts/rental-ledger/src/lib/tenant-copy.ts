export type TenantLanguage = 'English' | 'Luganda';

export interface TenantCopy {
  languageLabel: string;
  greeting: (name: string) => string;
  heroEyebrow: string;
  heroSubtitle: string;
  homeEyebrow: string;
  balanceEyebrow: string;
  balanceUpToDate: string;
  balanceCheck: string;
  payRent: string;
  nextDue: string;
  dueToday: string;
  dueTomorrow: string;
  dueInDays: (n: number) => string;
  daysOverdue: (n: number) => string;
  dateNotRecorded: string;
  statusPillConfirmed: string;
  statusPillPending: string;
  statusPillDue: string;
  statusConfirmed: (month: string) => string;
  statusPending: (month: string) => string;
  statusMissing: (month: string) => string;
  quickReport: string;
  quickReportHint: string;
  quickMessage: string;
  quickMessageHint: string;
  quickAgreement: string;
  quickAgreementHint: string;
  quickActivity: string;
  quickActivityHint: string;
  panelPayments: string;
  panelCare: string;
  panelAgreement: string;
  panelReminders: string;
  panelMessages: string;
  seeAllReceipts: string;
  viewReceipt: string;
  repairUpdates: string;
  monthlyRent: string;
  deposit: string;
  termEnds: string;
  nextRentDue: string;
  reminderDueIn: (n: number) => string;
  reminderOverdue: (n: number) => string;
  reminderToday: string;
  remindMe: string;
  reminderChannel: (channel: string) => string;
  writeMessage: string;
  messageContext: string;
  messageGeneral: string;
  messagePayment: string;
  messageRepair: string;
  messageBodyLabel: string;
  sendMessage: string;
  sentTo: string;
  messageTrust: (unit: string) => string;
  messagesPrivacy: string;
  noMessages: string;
  noMessagesHint: string;
  reportedOn: (date: string) => string;
  noRepairs: string;
  noRepairsHint: string;
  noReceipts: string;
  noReceiptsHint: string;
  privacyTitle: string;
  privacyBody: string;
  payModalTitle: string;
  amountLabel: string;
  methodLabel: string;
  phoneLabel: string;
  referenceLabel: string;
  referencePlaceholder: string;
  payButton: (amount: string) => string;
  payTrust: string;
  processingTitle: string;
  processingHint: string;
  confirmedTitle: string;
  backHome: string;
  greetingMorning: (name: string) => string;
  greetingAfternoon: (name: string) => string;
  greetingEvening: (name: string) => string;
  statusPartial: (month: string) => string;
  paymentsEyebrow: string;
  paymentsTitle: string;
  paymentsIntro: (unit: string) => string;
  paymentsThisMonth: string;
  paymentsTotal: string;
  payCallout: string;
  repairsEyebrow: string;
  repairsTitle: string;
  repairsIntro: string;
  reportHeading: string;
  reportSubtitle: string;
  reportTitleLabel: string;
  reportTitlePlaceholder: string;
  reportDetailsLabel: string;
  reportDetailsPlaceholder: string;
  reportPhotoLabel: string;
  reportPhotoHint: string;
  reportPhotoAdd: string;
  reportPhotoPreparing: string;
  reportPhotoAttached: string;
  reportPhotoReplace: string;
  reportPhotoShow: string;
  reportRemovePhoto: string;
  reportSubmit: string;
  reportUnassigned: string;
  reportSent: string;
  repairStatusLabel: (status: string) => string;
  handledBy: (name: string) => string;
  agreementEyebrow: (unit: string) => string;
  agreementTitle: string;
  agreementIntro: string;
  signedLabel: string;
  unsignedLabel: string;
  signAgreement: string;
  agreementOnFile: string;
  agreementTerm: string;
  noAgreement: string;
  noAgreementHint: string;
  perMonth: string;
  activityEyebrow: string;
  activityTitle: string;
  activityIntro: string;
  activityEmptyTitle: string;
  activityEmptyText: string;
  activityFilterAll: string;
  activityFilterPayment: string;
  activityFilterRepair: string;
  activityFilterMessage: string;
  recordedBy: (name: string) => string;
  ctaReport: string;
  ctaMessage: string;
  ctaPay: string;
  receiptBack: string;
  receiptPrint: string;
  receiptCopy: string;
  receiptNotFound: string;
  receiptNotAvailable: string;
  settingsPhoneTitle: string;
  settingsPhoneHint: string;
  saveNumber: string;
  homeUnlinked: string;
  homeUnlinkedHint: string;
}

const english: TenantCopy = {
  languageLabel: 'Portal language',
  greeting: (name) => `Good day, ${name}.`,
  heroEyebrow: 'YOUR HOME, CLEARLY RECORDED',
  heroSubtitle: 'Your rent, your home and the things being taken care of.',
  homeEyebrow: 'YOUR HOME',
  balanceEyebrow: 'CURRENT RENT BALANCE',
  balanceUpToDate: 'Your account is up to date.',
  balanceCheck: 'If this balance looks different from your records, speak with the caretaker.',
  payRent: 'Pay rent',
  nextDue: 'Next rent due',
  dueToday: 'Due today',
  dueTomorrow: 'Due tomorrow',
  dueInDays: (n) => `In ${n} days`,
  daysOverdue: (n) => `${n} days overdue`,
  dateNotRecorded: 'Date not recorded',
  statusPillConfirmed: 'Confirmed',
  statusPillPending: 'Not confirmed yet',
  statusPillDue: 'Balance due',
  statusConfirmed: (month) => `Your payment for ${month} is confirmed.`,
  statusPending: (month) => `Your payment for ${month} is not confirmed yet — we will update you.`,
  statusMissing: (month) => `No payment for ${month} recorded yet.`,
  quickReport: 'Report a problem',
  quickReportHint: 'Tell us what needs attention',
  quickMessage: 'Send a message',
  quickMessageHint: 'Ask the caretaker or landlord',
  quickAgreement: 'Agreement summary',
  quickAgreementHint: 'Rent, deposit and dates',
  quickActivity: 'Reminders & activity',
  quickActivityHint: 'Receipts and repair updates',
  panelPayments: 'Recent payments',
  panelCare: 'Home care',
  panelAgreement: 'Your agreement',
  panelReminders: 'Reminders',
  panelMessages: 'Messages',
  seeAllReceipts: 'All receipts',
  viewReceipt: 'View receipt',
  repairUpdates: 'Repair updates',
  monthlyRent: 'Monthly rent',
  deposit: 'Security deposit',
  termEnds: 'Agreement ends',
  nextRentDue: 'Next rent due',
  reminderDueIn: (n) => `Rent is due in ${n} days`,
  reminderOverdue: (n) => `Rent was due ${n} days ago`,
  reminderToday: 'Rent is due today',
  remindMe: 'Remind me',
  reminderChannel: (channel) => `Reminder by ${channel}`,
  writeMessage: 'Write a message',
  messageContext: 'About',
  messageGeneral: 'Something else',
  messagePayment: 'Rent payment',
  messageRepair: 'A repair',
  messageBodyLabel: 'Your message',
  sendMessage: 'Send message',
  sentTo: 'Message sent to the property team. It is saved with your home.',
  messageTrust: (unit) => `Tied to ${unit} so the context is never lost.`,
  messagesPrivacy: 'Messages are tied to your unit, so the caretaker or landlord always sees the context.',
  noMessages: 'No messages yet',
  noMessagesHint: 'Messages you send or receive will appear here.',
  reportedOn: (date) => `Reported ${date}`,
  noRepairs: 'No repair reports',
  noRepairsHint: 'There are no repair updates for your home yet.',
  noReceipts: 'No receipts yet',
  noReceiptsHint: 'Your rent receipts will be shown here.',
  privacyTitle: 'Know what is on record.',
  privacyBody: 'This private view shows details for your home only. If something is incorrect, please speak with the caretaker.',
  payModalTitle: 'Pay rent',
  amountLabel: 'Amount (UGX)',
  methodLabel: 'Payment method',
  phoneLabel: 'Mobile money number',
  referenceLabel: 'Transaction reference (optional)',
  referencePlaceholder: 'e.g. 9826 4017',
  payButton: (amount) => `Pay ${amount}`,
  payTrust: 'A receipt is saved here as soon as the payment is confirmed.',
  processingTitle: 'Waiting for mobile money confirmation…',
  processingHint: 'This usually takes a moment. You can stay on this screen.',
  confirmedTitle: 'Payment confirmed',
  backHome: 'Back to my home',
  greetingMorning: (name) => `Good morning, ${name}.`,
  greetingAfternoon: (name) => `Good afternoon, ${name}.`,
  greetingEvening: (name) => `Good evening, ${name}.`,
  statusPartial: (month) => `Part of ${month}'s rent is recorded — the balance is still due.`,
  paymentsEyebrow: 'YOUR RENT RECORD',
  paymentsTitle: 'My payments',
  paymentsIntro: (unit) => `These entries belong to ${unit} only.`,
  paymentsThisMonth: 'Paid this month',
  paymentsTotal: 'Total on record',
  payCallout: 'Pay by MTN MoMo or Airtel Money. Your receipt is saved here as soon as the payment is confirmed.',
  repairsEyebrow: 'YOUR HOME',
  repairsTitle: 'My repairs',
  repairsIntro: 'Send a report to the property team and follow its progress here.',
  reportHeading: 'Report a problem',
  reportSubtitle: 'Tell us what needs attention and we’ll follow it up.',
  reportTitleLabel: 'What needs attention?',
  reportTitlePlaceholder: 'e.g. Kitchen tap is leaking',
  reportDetailsLabel: 'Add a few details',
  reportDetailsPlaceholder: 'Tell us what happened and where…',
  reportPhotoLabel: 'Photo',
  reportPhotoHint: 'Optional · JPG or PNG · up to 10 MB',
  reportPhotoAdd: 'Add a photo',
  reportPhotoPreparing: 'Preparing photo…',
  reportPhotoAttached: 'Photo attached',
  reportPhotoReplace: 'Tap to replace',
  reportPhotoShow: 'Show us the problem',
  reportRemovePhoto: 'Remove photo',
  reportSubmit: 'Send to caretaker',
  reportUnassigned: 'A home must be assigned to this tenant before a repair can be reported.',
  reportSent: 'Repair request sent to the property team',
  repairStatusLabel: (status) => ({ reported: 'Received', assigned: 'Assigned', in_progress: 'In progress', done: 'Completed' }[status] ?? status.replaceAll('_', ' ')),
  handledBy: (name) => `Handled by ${name}`,
  agreementEyebrow: (unit) => `YOUR HOME · UNIT ${unit}`,
  agreementTitle: 'My agreement',
  agreementIntro: 'A clear reference for your rent and tenancy dates.',
  signedLabel: 'Signed',
  unsignedLabel: 'Awaiting signature',
  signAgreement: 'Sign agreement',
  agreementOnFile: 'Agreement summary on file',
  agreementTerm: 'Agreement term',
  noAgreement: 'No agreement summary yet',
  noAgreementHint: 'Your agreement details will appear here once they are recorded.',
  perMonth: '/ month',
  activityEyebrow: 'YOUR HOME',
  activityTitle: 'Receipts and updates',
  activityIntro: 'Only activity connected with your home appears here.',
  activityEmptyTitle: 'You are up to date',
  activityEmptyText: 'Relevant payments and repair updates will appear here.',
  activityFilterAll: 'All activity',
  activityFilterPayment: 'Rent payments',
  activityFilterRepair: 'Repairs',
  activityFilterMessage: 'Messages',
  recordedBy: (name) => `Recorded by ${name}`,
  ctaReport: 'Report a problem',
  ctaMessage: 'Write a message',
  ctaPay: 'Pay rent',
  receiptBack: 'Back to my payments',
  receiptPrint: 'Print receipt',
  receiptCopy: 'Copy share link',
  receiptNotFound: 'Receipt not found',
  receiptNotAvailable: 'Receipt not available',
  settingsPhoneTitle: 'My phone number',
  settingsPhoneHint: 'Used for rent reminders and receipts. Lists show it masked.',
  saveNumber: 'Save number',
  homeUnlinked: 'Your home is not linked yet',
  homeUnlinkedHint: 'Ask the property team to connect your tenant record to a unit, then your rent, receipts and updates will appear here.',
};

const luganda: TenantCopy = {
  languageLabel: 'Olulimi lw’ekitundu',
  greeting: (name) => `Wasuze otya, ${name}.`,
  heroEyebrow: 'ENNYUMBA YO, EBIRI KU KALATALI',
  heroSubtitle: 'Eby’ennyumba yo, ssente z’obupangisa n’okulabirira.',
  homeEyebrow: 'ENNYUMBA YO',
  balanceEyebrow: 'EBBANANSI Y’OBUPANGISA',
  balanceUpToDate: 'Byonna bisasuddwa.',
  balanceCheck: 'Bw’oba obona enjawulo ku ebyo by’owandiika, yogera ne mukuumi w’ennyumba.',
  payRent: 'Sasula obupangisa',
  nextDue: 'Obupangisa obuddako',
  dueToday: 'Luwanika leero',
  dueTomorrow: 'Luwanika enkya',
  dueInDays: (n) => `Mu nnaku ${n} ezijja`,
  daysOverdue: (n) => `Ennaku ${n} ziwedde`,
  dateNotRecorded: 'Olunaku lw’okuliwanika tewandiikiddwa',
  statusPillConfirmed: 'Kukakasiddwa',
  statusPillPending: 'Tekukakasiddwa',
  statusPillDue: 'Ebbanansi kisigadde',
  statusConfirmed: (month) => `Ekisale ky’omwezi ${month} kikakasiddwa.`,
  statusPending: (month) => `Ekisale ky’omwezi ${month} tekinnakakasibwa — tujja kukutegeeza.`,
  statusMissing: (month) => `Tewali kisale kya mwezi ${month} kiwandiikiddwa.`,
  quickReport: 'Tegeeza ekisobo',
  quickReportHint: 'Tubuulire ekyetaaga okuddaabirizibwa',
  quickMessage: 'Wandiika obubaka',
  quickMessageHint: 'Yogera ne mukuumi oba nnannyini nnyumba',
  quickAgreement: 'Endagaano yo',
  quickAgreementHint: 'Ssente, depoziti ne nnaku',
  quickActivity: 'Okujjukiza n’ebikoleddwa',
  quickActivityHint: 'Risiti n’ebipya by’okuddaabiriza',
  panelPayments: 'Ebisale ebipya',
  panelCare: 'Okulabirira ennyumba',
  panelAgreement: 'Endagaano yo',
  panelReminders: 'Okujjukiza',
  panelMessages: 'Obubaka',
  seeAllReceipts: 'Risiti zonna',
  viewReceipt: 'Laba risiti',
  repairUpdates: 'Ebipya by’okuddaabiriza',
  monthlyRent: 'Obupangisa obwa buli mwezi',
  deposit: 'Depoziti',
  termEnds: 'Endagaano ekoma',
  nextRentDue: 'Obupangisa obuddako',
  reminderDueIn: (n) => `Obupangisa buwanikira mu nnaku ${n}`,
  reminderOverdue: (n) => `Obupangisa bwali buwanikira ennaku ${n} eziyise`,
  reminderToday: 'Obupangisa buwanikira leero',
  remindMe: 'Njijukiza',
  reminderChannel: (channel) => `Okujjukiza ku ${channel}`,
  writeMessage: 'Wandiika obubaka',
  messageContext: 'Kikwata ku',
  messageGeneral: 'Ebikwata ku bulijjo',
  messagePayment: 'Ssente z’obupangisa',
  messageRepair: 'Okuddaabiriza',
  messageBodyLabel: 'Obubaka bwo',
  sendMessage: 'Wereza obubaka',
  sentTo: 'Obubaka buweerezeddwa eri abalabirizi b’ennyumba. Buterekebwa n’ennyumba yo.',
  messageTrust: (unit) => `Bukwata ku ${unit} obutafiirwa mbeera.`,
  messagesPrivacy: 'Obubaka bukwata ku kifo kyo, mukuumi oba nnannyini nnyumba buli kiseera alumanya embeera.',
  noMessages: 'Tewali bubaka bujja',
  noMessagesHint: 'Obubaka bw’oweereza oba obw’ofuna bujja kulabikira wano.',
  reportedOn: (date) => `Yategezeddwa ${date}`,
  noRepairs: 'Tewali kuddaabiriza',
  noRepairsHint: 'Tewali bipya by’okuddaabiriza ku nnyumba yo kati.',
  noReceipts: 'Tewali risiti',
  noReceiptsHint: 'Risiti z’obupangisa bujja kulabikira wano.',
  privacyTitle: 'Manya ekyawandiikiddwa.',
  privacyBody: 'Ekitundu kino ky’ekyama kiraga ebikwata ku nnyumba yo yokka. Bwe wabaawo ekikyamu, yogera ne mukuumi w’ennyumba.',
  payModalTitle: 'Sasula obupangisa',
  amountLabel: 'Ssemuundi (UGX)',
  methodLabel: 'Engeri y’okusasulira',
  phoneLabel: 'Namba ya ssimu ey’okusasulira',
  referenceLabel: 'Namba y’olukalala (tekyetaagisa)',
  referencePlaceholder: 'oy. 9826 4017',
  payButton: (amount) => `Sasula ${amount}`,
  payTrust: 'Risiti eterekebwawo amangu nga ssente zikakasiddwa.',
  processingTitle: 'Tulindirira okukakasa okuva ku ssimu…',
  processingHint: 'Kino kye kiseera kitono. Osobola okusigala ku ddaala lino.',
  confirmedTitle: 'Ekisale kikakasiddwa',
  backHome: 'Dda ewuwo',
  greetingMorning: (name) => `Wasuze otya, ${name}.`,
  greetingAfternoon: (name) => `Osiibye otya, ${name}.`,
  greetingEvening: (name) => `Osiibye otya nno, ${name}.`,
  statusPartial: (month) => `Ekitundu ky’ekisale kya ${month} kiwandiikiddwa — ebbanansi kisigadde.`,
  paymentsEyebrow: 'EBIWANDIIKO BYO EBIKWATA KU BUPANGISA',
  paymentsTitle: 'Ebisale byange',
  paymentsIntro: (unit) => `Ebiwandiiko bino bikwata ku ${unit} yokka.`,
  paymentsThisMonth: 'Kyasasuddwa omwezi guno',
  paymentsTotal: 'Kyonna ku kalata',
  payCallout: 'Sasula ne MTN MoMo oba Airtel Money. Risiti eterekebwawo amangu nga ssente zikakasiddwa.',
  repairsEyebrow: 'ENNYUMBA YO',
  repairsTitle: 'Okuddaabiriza kwange',
  repairsIntro: 'Weereza ekiwandiiko eri abalabirizi b’ennyumba era okolere ku mumbe wano.',
  reportHeading: 'Tegeeza ekisobo',
  reportSubtitle: 'Tubuulire ekyetaaga okuddaabirizibwa, tunakukolera.',
  reportTitleLabel: 'Kiki ekiteetaaga okuddaabirizibwa?',
  reportTitlePlaceholder: 'oy. Amazzi gaveera mu kitchen',
  reportDetailsLabel: 'Yongerako ebikwata ku nsonga',
  reportDetailsPlaceholder: 'Tubuulire ekyabaawo ne wabaawo…',
  reportPhotoLabel: 'Ekifaananyi',
  reportPhotoHint: 'Kya kukyaala · JPG oba PNG · okutuuka ku 10 MB',
  reportPhotoAdd: 'Yongerako ekifaananyi',
  reportPhotoPreparing: 'Tutegeka ekifaananyi…',
  reportPhotoAttached: 'Ekifaananyi kikwiddwa',
  reportPhotoReplace: 'Nyiga okukyusa',
  reportPhotoShow: 'Tulage obuzibu',
  reportRemovePhoto: 'Ggyamu ekifaananyi',
  reportSubmit: 'Weereza eri omukuumi',
  reportUnassigned: 'Ennyumba erina okuteebwa eri omupangisa oyo ng’ekisobo tekinnategezeddwa.',
  reportSent: 'Ekiwandiiko ky’okuddaabiriza kiweerezeddwa eri abalabirizi b’ennyumba',
  repairStatusLabel: (status) => ({ reported: 'Kituuse', assigned: 'Kiteebeddwa', in_progress: 'Kiddaabirizibwa', done: 'Kiwedde' }[status] ?? status.replaceAll('_', ' ')),
  handledBy: (name) => `Kikolebwa ${name}`,
  agreementEyebrow: (unit) => `ENNYUMBA YO · EKITUNDU ${unit}`,
  agreementTitle: 'Endagaano yange',
  agreementIntro: 'Ekiwandiiko ekilaga obupangisa bwo ne nnaku z’ennyumba.',
  signedLabel: 'Kukakasiddwa',
  unsignedLabel: 'Tewannakakasibwa',
  signAgreement: 'Kakasa endagaano',
  agreementOnFile: 'Endagaano eri ku kalata',
  agreementTerm: 'Ekiseera ky’endagaano',
  noAgreement: 'Tewali ndagaano nnno',
  noAgreementHint: 'Ebikwata ku ndagaano yo bijja kulabikira wano nga biwandiikiddwa.',
  perMonth: '/ omwezi',
  activityEyebrow: 'ENNYUMBA YO',
  activityTitle: 'Risiti n’ebipya',
  activityIntro: 'Ebikwata ku nnyumba yo yokka bijja kulabikira wano.',
  activityEmptyTitle: 'Byonna biri bulungi',
  activityEmptyText: 'Ebisale n’ebipya by’okuddaabiriza bijja kulabikira wano.',
  activityFilterAll: 'Ebikoleddwa byonna',
  activityFilterPayment: 'Ebisale',
  activityFilterRepair: 'Okuddaabiriza',
  activityFilterMessage: 'Obubaka',
  recordedBy: (name) => `Kyawandiikibwa ${name}`,
  ctaReport: 'Tegeeza ekisobo',
  ctaMessage: 'Wandiika obubaka',
  ctaPay: 'Sasula obupangisa',
  receiptBack: 'Dda ku bisale byange',
  receiptPrint: 'Fulumya risiti',
  receiptCopy: 'Koppa link',
  receiptNotFound: 'Risiti tezuliibwamu',
  receiptNotAvailable: 'Risiti teyinzokukozesebwa',
  settingsPhoneTitle: 'Namba yange ey’essimu',
  settingsPhoneHint: 'Kozesebwa ku kujjukiza n’eriisiti. Olukalala lulaga namba ezikisiddwako.',
  saveNumber: 'Tereka namba',
  homeUnlinked: 'Ennyumba yo tennateebwawo',
  homeUnlinkedHint: 'Saba abalabirizi b’ennyumba okuteeka ekiwandiiko kyo ku nnyumba, olwo obupangisa, risiti n’ebipya bijja kulabikira wano.',
};

export const tenantCopy = (language: TenantLanguage): TenantCopy => (language === 'Luganda' ? luganda : english);

export const readTenantLanguage = (): TenantLanguage =>
  (typeof localStorage !== 'undefined' && localStorage.getItem('ledger-language')) === 'Luganda' ? 'Luganda' : 'English';

export const readReminderChannel = (): 'SMS' | 'WhatsApp' => {
  try {
    const stored = JSON.parse(localStorage.getItem('ledger-notification-channels') || '["sms"]');
    return Array.isArray(stored) && stored.includes('whatsapp') ? 'WhatsApp' : 'SMS';
  } catch {
    return 'SMS';
  }
};
