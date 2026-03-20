# Checklista – Fixa innan inlämning

Lista över förbättringar och buggar att åtgärda innan projektet lämnas in.

**Status:** Alla punkter är åtgärdade (2025-03-19).

---

## 🔴 Buggar (prioritet hög)

- [x] **Reset API vid avbryt** – När användaren klickar "Avbryt och starta om" under pågående signering fungerar inte reset om timeout inte inträffat. `app/api/agreements/reset/route.ts`
- [x] **agreement_not_found** – TIC-callback kan skicka `bankid=agreement_not_found` men klienten visar bara generiskt fel. Lägg till tydlig hantering i `sign-agreement-client.tsx`
- [x] **Bilagor kan krascha** – `agreement.attachments.find()` kan kasta om `attachments` är undefined. `app/api/agreements/attachments/download/route.ts`
- [x] **Lifecycle API saknar fält** – Klienten förväntar sig `signedAt` och `signProvider` men API returnerar dem inte. `app/api/agreements/lifecycle/route.ts`

---

## 🟠 UX-problem

- [x] **Demo-länk 404** – "Testa gratis" pekar på `/signup/demo-token` som inte finns. Skapa demo-avtal eller byt till `/sign/start`
- [x] **Footer-länkar fungerar inte** – Guides, Driftstatus, API-dokumentation, Kundcase är bara text. Lägg till riktiga länkar eller ta bort
- [x] **CTA-text fel** – "Prata med sälj" länkar till offertformulär. Byt text till "Begär offert" eller länka till kontakt
- [ ] **Statusmeddelanden skrivs över** – Admin använder en status-sträng; nya meddelanden ersätter gamla. Överväg toast/notifieringar
- [x] **alert() vid validering** – `app/sign/start/page.tsx` använder `alert()` för fel. Byt till inline felmeddelande

---

## 🟡 Felhantering & laddning

- [x] **Global error boundary** – Lägg till `app/error.tsx` för snyggare felhantering
- [x] **Laddnings-UI för sign-sida** – Visa skeleton/spinner istället för bara "Laddar avtal..."
- [x] **Svenska felmeddelanden** – Rate limit och vissa API-fel är på engelska. Översätt till svenska

---

## 🟢 Tillgänglighet (a11y)

- [x] **Fokus-stilar** – Lägg till `focus:ring` på knappar, länkar och inputs
- [x] **Formulärlabels** – Säkerställ `id`/`htmlFor` på offertformuläret
- [x] **Preview-modal** – Lägg till focus trap, Escape-stängning och `aria-modal`
- [ ] **Cookie-banner fokus** – Flytta fokus till bannern när den visas
- [x] **Statusmeddelanden** – Lägg till `role="status"` och `aria-live="polite"`
- [x] **Nav aria-label** – Lägg till `aria-label="Huvudnavigering"` i sticky-header

---

## 📱 Mobil

- [ ] **Admin-tabeller** – Testa på små skärmar; överväg enkolumnslayout
- [ ] **Cookie-banner** – Testa på 320px bredd
- [ ] **Sign preview-modal** – Säkerställ att stäng-knappen alltid är nåbar

---

## ✅ Validering

- [x] **E-post** – Validera format i offert-API
- [x] **Org.nr** – Validera svenskt format (XXXXXX-XXXX)
- [x] **Telefon** – Grundläggande validering (längd, tecken)
- [ ] **Länk-URL:er i admin** – Visa inline-fel för ogiltiga URL:er

---

## 🔒 Säkerhet (om tid finns)

- [ ] **Rate limiting på TIC start** – Begränsa antal förfrågningar per IP/token
- [ ] **Rate limiting på agreements/by-token** – Minska risk för token-enumeration
- [ ] **HTTPS** – Dokumentera att Basic Auth kräver HTTPS i produktion

---

## 📝 Kodkvalitet & konsistens

- [x] **Svenska i admin** – Byt "Title", "Content", "Create" till svenska
- [ ] **Delade hjälpfunktioner** – Flytta `isImageAttachment`, `formatDateTime`, `getAbsoluteBaseUrl` till gemensamma moduler
- [x] **Fel vs framgång** – Visa fel i rött och framgång i grönt i statusmeddelanden
- [x] **README** – Uppdatera med beskrivning av `/sign` vs `/signup`

---

## Snabbfixar (enklast att göra först)

1. Byt "Prata med sälj" till "Begär offert" på CTA-knappen
2. Fixa demo-länken (t.ex. till `/sign/start`)
3. Lägg till `agreement.attachments?.find()` i download-route
4. Översätt rate limit-meddelande till svenska
5. Lägg till `aria-label` på nav
6. Lägg till `focus:ring` på viktiga knappar

---

*Skapad: 2025-03-19*
