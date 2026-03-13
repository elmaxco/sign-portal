import SignAgreementClient from "@/app/sign/[token]/sign-agreement-client";

type SignupPageProps = {
  params: Promise<{ token: string }>;
};

export default async function SignupPage({ params }: SignupPageProps) {
  const { token } = await params;

  return <SignAgreementClient token={token} entryMode="signup" />;
}
