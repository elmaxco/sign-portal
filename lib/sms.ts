type SendAgreementSmsInput = {
  to: string;
  signUrl: string;
  agreementTitle: string;
  variant?: "initial" | "reminder";
};

type TwilioConfig = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
};

function getDefaultCountryCode() {
  const raw = (process.env.SMS_DEFAULT_COUNTRY_CODE || "+46").trim();

  if (!/^\+\d{1,3}$/.test(raw)) {
    throw new Error("SMS_DEFAULT_COUNTRY_CODE must be in format +<countrycode>, e.g. +46.");
  }

  return raw;
}

function normalizePhoneToE164(input: string) {
  const compact = input.replace(/[\s\-().]/g, "").trim();

  if (!compact) {
    throw new Error("Recipient phone is empty.");
  }

  let candidate = compact;

  if (candidate.startsWith("00")) {
    candidate = `+${candidate.slice(2)}`;
  } else if (!candidate.startsWith("+")) {
    const countryCode = getDefaultCountryCode();

    if (candidate.startsWith("0")) {
      candidate = `${countryCode}${candidate.slice(1)}`;
    } else if (/^\d+$/.test(candidate)) {
      candidate = `${countryCode}${candidate}`;
    }
  }

  if (!/^\+[1-9]\d{7,14}$/.test(candidate)) {
    throw new Error(
      `Invalid recipient phone format. Use E.164 (example: +46701234567). Got: ${input}`,
    );
  }

  return candidate;
}

function isSmsFeatureEnabled() {
  const raw = process.env.SMS_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function getTwilioConfig(): TwilioConfig | null {
  if (!isSmsFeatureEnabled()) {
    return null;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() || "";
  const fromNumber = process.env.TWILIO_FROM_NUMBER?.trim() || "";

  const present = [accountSid, authToken, fromNumber].filter(Boolean).length;

  if (present === 0) {
    return null;
  }

  if (present !== 3) {
    throw new Error(
      "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER must all be set to enable SMS.",
    );
  }

  return {
    accountSid,
    authToken,
    fromNumber,
  };
}

export function isSmsConfigured() {
  return getTwilioConfig() !== null;
}

function toSmsBody(input: SendAgreementSmsInput) {
  const compactTitle = (input.agreementTitle || "Avtal").trim();

  if (input.variant === "reminder") {
    return `Påminnelse: signera avtalet \"${compactTitle}\": ${input.signUrl}`;
  }

  return `Signera avtal \"${compactTitle}\": ${input.signUrl}`;
}

export async function sendAgreementLinkSms(input: SendAgreementSmsInput) {
  const config = getTwilioConfig();

  if (!config) {
    throw new Error("SMS is disabled or not configured.");
  }

  const normalizedTo = normalizePhoneToE164(input.to);

  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: config.fromNumber,
        To: normalizedTo,
        Body: toSmsBody(input),
      }).toString(),
    },
  );

  const rawBody = await response.text();
  const payload = (() => {
    try {
      return JSON.parse(rawBody) as {
        sid?: string;
        message?: string;
        code?: number;
      };
    } catch {
      return null;
    }
  })();

  if (!response.ok) {
    const details = payload?.message || rawBody || "Unknown Twilio error.";
    throw new Error(`Twilio ${response.status}: ${details}`);
  }

  if (!payload?.sid) {
    throw new Error("Twilio succeeded but response did not include message sid.");
  }

  return payload.sid;
}
