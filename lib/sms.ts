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
    return `Paminnelse: signera avtalet \"${compactTitle}\": ${input.signUrl}`;
  }

  return `Signera avtal \"${compactTitle}\": ${input.signUrl}`;
}

export async function sendAgreementLinkSms(input: SendAgreementSmsInput) {
  const config = getTwilioConfig();

  if (!config) {
    throw new Error("SMS is disabled or not configured.");
  }

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
        To: input.to,
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
