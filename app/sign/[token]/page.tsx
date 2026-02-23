import SignAgreementClient from "./sign-agreement-client";

type SignPageProps = {
  params: Promise<{ token: string }>;
};

export default async function SignAgreementPage({ params }: SignPageProps) {
  const { token } = await params;
  return <SignAgreementClient token={token} />;
}
